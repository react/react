/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {NodePath} from '@babel/core';
import type * as t from '@babel/types';

export interface ScopeData {
  id: number;
  parent: number | null;
  kind: string;
  bindings: Record<string, number>;
}

export interface BindingData {
  id: number;
  name: string;
  kind: string;
  scope: number;
  declarationType: string;
  declarationStart?: number;
  declarationNodeId?: number;
  import?: ImportBindingData;
}

export interface ImportBindingData {
  source: string;
  kind: string;
  imported?: string;
}

export interface ScopeInfo {
  scopes: Array<ScopeData>;
  bindings: Array<BindingData>;
  nodeToScope: Record<number, number>;
  nodeToScopeEnd: Record<number, number>;
  referenceToBinding: Record<number, number>;
  refNodeIdToBinding: Record<number, number>;
  nodeIdToScope: Record<number, number>;
  programScope: number;
}

/**
 * Recursively map identifier references inside a pattern (including destructuring)
 * to a binding. Only maps identifiers that match the binding name.
 */
function mapPatternIdentifiers(
  path: NodePath,
  bindingId: number,
  bindingName: string,
  mapRef: (start: number, bindingId: number, node: t.Node) => void,
): void {
  if (path.isIdentifier()) {
    if (path.node.name === bindingName) {
      const start = path.node.start;
      if (start != null) {
        mapRef(start, bindingId, path.node);
      }
    }
  } else if (path.isArrayPattern()) {
    for (const element of path.get('elements')) {
      if (element.node != null) {
        mapPatternIdentifiers(
          element as NodePath,
          bindingId,
          bindingName,
          mapRef,
        );
      }
    }
  } else if (path.isObjectPattern()) {
    for (const prop of path.get('properties')) {
      if (prop.isRestElement()) {
        mapPatternIdentifiers(
          prop.get('argument'),
          bindingId,
          bindingName,
          mapRef,
        );
      } else if (prop.isObjectProperty()) {
        mapPatternIdentifiers(
          prop.get('value') as NodePath,
          bindingId,
          bindingName,
          mapRef,
        );
      }
    }
  } else if (path.isAssignmentPattern()) {
    mapPatternIdentifiers(
      path.get('left') as NodePath,
      bindingId,
      bindingName,
      mapRef,
    );
  } else if (path.isRestElement()) {
    mapPatternIdentifiers(path.get('argument'), bindingId, bindingName, mapRef);
  } else if (path.isMemberExpression()) {
    // MemberExpression in LVal position (e.g., a.b = ...)
    const obj = path.get('object');
    if (obj.isIdentifier() && obj.node.name === bindingName) {
      const start = obj.node.start;
      if (start != null) {
        mapRef(start, bindingId, obj.node);
      }
    }
  }
}

/**
 * Extract scope information from a Babel Program path.
 *
 * The goal here is to serialize only the core scope data structure — scopes,
 * bindings, and the mappings that link AST positions to them — and leave all
 * interesting analysis to the Rust side. Babel already computes scope/binding
 * resolution during parsing, so we extract that work rather than re-implement
 * it. But any *derived* information (source locations of identifiers, whether
 * a reference is a JSXIdentifier, which variables are captured across function
 * boundaries, etc.) is intentionally omitted: the Rust compiler can recover it
 * by walking the parsed AST it already has.
 *
 * Keeping this serialization layer thin makes the JS/Rust boundary easier to
 * reason about and avoids shipping redundant data across FFI.
 */
export function extractScopeInfo(program: NodePath<t.Program>): ScopeInfo {
  const scopes: Array<ScopeData> = [];
  const bindings: Array<BindingData> = [];
  const nodeToScope: Record<number, number> = {};
  const nodeToScopeEnd: Record<number, number> = {};
  const referenceToBinding: Record<number, number> = {};
  const refNodeIdToBinding: Record<number, number> = {};
  const nodeIdToScope: Record<number, number> = {};

  let nextNodeId = 1;
  function getOrAssignNodeId(node: t.Node): number {
    const n = node as any;
    if (n._nodeId == null) {
      n._nodeId = nextNodeId++;
    }
    return n._nodeId;
  }

  function mapRef(start: number, bindingId: number, node: t.Node): void {
    referenceToBinding[start] = bindingId;
    const nodeId = getOrAssignNodeId(node);
    refNodeIdToBinding[nodeId] = bindingId;
  }

  // Map from Babel scope uid to our scope id
  const scopeUidToId = new Map<string, number>();

  // Helper to register a scope and its bindings
  function registerScope(
    babelScope: {
      uid: number;
      parent: {uid: number} | null;
      bindings: Record<string, any>;
    },
    path: NodePath | null,
  ): void {
    const uid = String(babelScope.uid);
    if (scopeUidToId.has(uid)) return;

    const scopeId = scopes.length;
    scopeUidToId.set(uid, scopeId);

    // Determine parent scope id
    let parentId: number | null = null;
    if (babelScope.parent) {
      const parentUid = String(babelScope.parent.uid);
      if (scopeUidToId.has(parentUid)) {
        parentId = scopeUidToId.get(parentUid)!;
      }
    }

    // Determine scope kind
    const kind = path != null ? getScopeKind(path) : 'program';

    // Collect bindings declared in this scope
    const scopeBindings: Record<string, number> = {};
    const ownBindings = babelScope.bindings;
    for (const name of Object.keys(ownBindings)) {
      const babelBinding = ownBindings[name];
      if (!babelBinding) continue;

      const bindingId = bindings.length;
      scopeBindings[name] = bindingId;

      const bindingData: BindingData = {
        id: bindingId,
        name,
        kind: getBindingKind(babelBinding),
        scope: scopeId,
        declarationType: babelBinding.path.node.type,
        declarationStart: babelBinding.identifier.start ?? undefined,
        declarationNodeId: getOrAssignNodeId(babelBinding.identifier),
      };

      // Check for import bindings
      if (babelBinding.kind === 'module') {
        const importData = getImportData(babelBinding);
        if (importData) {
          bindingData.import = importData;
        }
      }

      bindings.push(bindingData);

      // Map identifier references to bindings.
      // Position-0 entries are handled by mapRef's collision detection —
      // see the comment above pos0BindingId for details.
      for (const ref of babelBinding.referencePaths) {
        const start = ref.node.start;
        if (start != null) {
          mapRef(start, bindingId, ref.node);
        }
      }

      // Map constant violations (LHS of assignments like `a = b`, `a++`, `for (a of ...)`)
      for (const violation of babelBinding.constantViolations) {
        if (violation.isAssignmentExpression()) {
          const left = violation.get('left');
          mapPatternIdentifiers(
            left,
            bindingId,
            babelBinding.identifier.name,
            mapRef,
          );
        } else if (violation.isUpdateExpression()) {
          const arg = violation.get('argument');
          if (arg.isIdentifier()) {
            const start = arg.node.start;
            if (start != null) {
              mapRef(start, bindingId, arg.node);
            }
          }
        } else if (
          violation.isForOfStatement() ||
          violation.isForInStatement()
        ) {
          const left = violation.get('left');
          mapPatternIdentifiers(
            left,
            bindingId,
            babelBinding.identifier.name,
            mapRef,
          );
        } else if (violation.isFunctionDeclaration()) {
          // Function redeclarations: `function x() {} function x() {}`
          // Map the function name identifier to the binding
          const funcId = (violation.node as any).id;
          if (funcId?.start != null) {
            mapRef(funcId.start, bindingId, funcId);
          }
        }
      }

      // Map the binding identifier itself
      const bindingStart = babelBinding.identifier.start;
      if (bindingStart != null) {
        mapRef(bindingStart, bindingId, babelBinding.identifier);
      }
    }

    // Map AST node to scope.
    // Skip zero-width nodes (e.g., synthetic IIFEs from Hermes match desugar
    // where start === end === 0) — they would collide with real scopes at position 0.
    // The Rust compiler handles missing entries via parent-based scope lookup.
    if (path != null) {
      const nodeStart = path.node.start;
      const nodeEnd = path.node.end;
      if (nodeStart != null && nodeEnd != null && nodeEnd > nodeStart) {
        nodeToScope[nodeStart] = scopeId;
        nodeToScopeEnd[nodeStart] = nodeEnd;
      }
      const scopeNodeId = getOrAssignNodeId(path.node);
      nodeIdToScope[scopeNodeId] = scopeId;
    }

    scopes.push({
      id: scopeId,
      parent: parentId,
      kind,
      bindings: scopeBindings,
    });
  }

  // Register the program scope first (program.traverse doesn't visit the Program node itself)
  registerScope(program.scope as any, program);

  // Collect all child scopes by traversing the program
  program.traverse({
    enter(path) {
      registerScope(path.scope as any, path);
    },
  });

  // Add JSX intrinsic element names to referenceToBinding when they match a
  // local binding. The TS compiler's gatherCapturedContext explicitly traverses
  // JSX elements and looks up bindings for their tag names, but Babel does NOT
  // include JSX intrinsic tag names in binding.referencePaths. We replicate the
  // TS behavior by adding these references here so the Rust compiler's context
  // capture correctly detects them.
  program.traverse({
    JSXOpeningElement(path) {
      const name = path.get('name');
      if (!name.isJSXIdentifier()) {
        return;
      }
      const tagName = name.node.name;
      const binding = path.scope.getBinding(tagName);
      if (binding != null) {
        const bindingScopeUid = String((binding.scope as any).uid);
        const bindingScopeId = scopeUidToId.get(bindingScopeUid);
        if (bindingScopeId != null) {
          const scopeData = scopes.find(s => s.id === bindingScopeId);
          if (scopeData != null && tagName in scopeData.bindings) {
            const start = name.node.start;
            if (start != null) {
              // mapRef also populates refNodeIdToBinding, the only map the
              // Rust side consumes (referenceToBinding is deprecated there).
              mapRef(start, scopeData.bindings[tagName], name.node);
            }
          }
        }
      }
    },
  });

  // Babel's scope crawl does not collect every identifier that
  // isReferencedIdentifier() classifies as a reference (observed: Flow
  // FunctionTypeParam names resolving to value bindings are missing from
  // binding.referencePaths under @babel/core's traversal). The TS compiler's
  // FindContextIdentifiers and BuildHIR hoisting don't use referencePaths —
  // they re-traverse Identifier nodes and call isReferencedIdentifier()
  // directly, so they DO see these references. Replicate that view by mapping
  // any referenced identifier the crawl missed.
  program.traverse({
    Identifier(path: NodePath<t.Identifier>) {
      if (!path.isReferencedIdentifier()) {
        return;
      }
      const node = path.node as any;
      const start = node.start;
      if (start == null) {
        return;
      }
      if (node._nodeId != null && refNodeIdToBinding[node._nodeId] != null) {
        return;
      }
      const binding = path.scope.getBinding(path.node.name);
      if (binding == null) {
        return;
      }
      const bindingScopeUid = String((binding.scope as any).uid);
      const bindingScopeId = scopeUidToId.get(bindingScopeUid);
      if (bindingScopeId == null) {
        return;
      }
      const scopeData = scopes.find(s => s.id === bindingScopeId);
      if (scopeData != null && path.node.name in scopeData.bindings) {
        mapRef(start, scopeData.bindings[path.node.name], node);
      }
    },
  });

  // Assign _nodeId to ALL Identifier and JSXIdentifier nodes in the AST,
  // not just those that resolve to bindings. This ensures global references
  // (Array, Error, etc.) also have _nodeId set, letting the Rust compiler
  // distinguish "no binding found via node-ID = global" from "no node-ID at all".
  program.traverse({
    Identifier(path: NodePath<t.Identifier>) {
      getOrAssignNodeId(path.node);
    },
    JSXIdentifier(path: NodePath<t.JSXIdentifier>) {
      getOrAssignNodeId(path.node);
    },
  });

  // Program scope should always be id 0
  const programScopeUid = String((program.scope as any).uid);
  const programScopeId = scopeUidToId.get(programScopeUid) ?? 0;

  return {
    scopes,
    bindings,
    nodeToScope,
    nodeToScopeEnd,
    referenceToBinding,
    refNodeIdToBinding,
    nodeIdToScope,
    programScope: programScopeId,
  };
}

function getScopeKind(path: NodePath): string {
  if (path.isProgram()) return 'program';
  if (path.isFunction()) return 'function';
  if (
    path.isForStatement() ||
    path.isForInStatement() ||
    path.isForOfStatement()
  )
    return 'for';
  if (path.isClassDeclaration() || path.isClassExpression()) return 'class';
  if (path.isSwitchStatement()) return 'switch';
  if (path.isCatchClause()) return 'catch';
  return 'block';
}

function getBindingKind(binding: {kind: string; path: NodePath}): string {
  switch (binding.kind) {
    case 'var':
      return 'var';
    case 'let':
      return 'let';
    case 'const':
      return 'const';
    case 'param':
      return 'param';
    case 'module':
      return 'module';
    case 'hoisted':
      return 'hoisted';
    case 'local':
      return 'local';
    default:
      return 'unknown';
  }
}

function getImportData(binding: {
  path: NodePath;
}): ImportBindingData | undefined {
  const decl = binding.path;
  if (
    !decl.isImportSpecifier() &&
    !decl.isImportDefaultSpecifier() &&
    !decl.isImportNamespaceSpecifier()
  ) {
    return undefined;
  }

  const importDecl = decl.parentPath;
  if (!importDecl?.isImportDeclaration()) {
    return undefined;
  }

  const source = importDecl.node.source.value;

  if (decl.isImportDefaultSpecifier()) {
    return {source, kind: 'default'};
  }
  if (decl.isImportNamespaceSpecifier()) {
    return {source, kind: 'namespace'};
  }
  if (decl.isImportSpecifier()) {
    const imported = decl.node.imported;
    const importedName =
      imported.type === 'Identifier' ? imported.name : imported.value;
    return {source, kind: 'named', imported: importedName};
  }
  return undefined;
}
