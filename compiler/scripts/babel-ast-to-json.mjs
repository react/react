import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;
import fs from "fs";
import path from "path";
import fg from "fast-glob";
const { globSync } = fg;

const FIXTURE_DIR = process.argv[2]; // source dir with JS/TS files
const OUTPUT_DIR = process.argv[3]; // output dir for JSON files

if (!FIXTURE_DIR || !OUTPUT_DIR) {
  console.error(
    "Usage: node babel-ast-to-json.mjs <fixtures-dir> <output-dir>"
  );
  process.exit(1);
}

// Find all fixture source files
const fixtures = globSync("**/*.{js,ts,tsx,jsx}", { cwd: FIXTURE_DIR });

function getScopeKind(babelScope) {
  const blockType = babelScope.block.type;
  switch (blockType) {
    case "Program":
      return "program";
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "ArrowFunctionExpression":
    case "ObjectMethod":
    case "ClassMethod":
    case "ClassPrivateMethod":
      return "function";
    case "BlockStatement":
      return "block";
    case "ForStatement":
    case "ForInStatement":
    case "ForOfStatement":
      return "for";
    case "ClassDeclaration":
    case "ClassExpression":
      return "class";
    case "SwitchStatement":
      return "switch";
    case "CatchClause":
      return "catch";
    default:
      return "block";
  }
}

function getBindingKind(babelKind) {
  switch (babelKind) {
    case "var":
      return "var";
    case "let":
      return "let";
    case "const":
      return "const";
    case "param":
      return "param";
    case "module":
      return "module";
    case "hoisted":
      return "hoisted";
    case "local":
      return "local";
    default:
      return "unknown";
  }
}

function getImportData(binding) {
  if (binding.path.isImportSpecifier()) {
    const imported = binding.path.node.imported;
    return {
      source: binding.path.parent.source.value,
      kind: "named",
      imported: imported.type === "StringLiteral" ? imported.value : imported.name,
    };
  } else if (binding.path.isImportDefaultSpecifier()) {
    return {
      source: binding.path.parent.source.value,
      kind: "default",
    };
  } else if (binding.path.isImportNamespaceSpecifier()) {
    return {
      source: binding.path.parent.source.value,
      kind: "namespace",
    };
  }
  return null;
}

function collectScopeInfo(ast) {
  const scopeMap = new Map(); // Babel scope -> ScopeId
  const bindingMap = new Map(); // Babel binding -> BindingId
  const scopes = [];
  const bindings = [];
  const nodeToScope = {};
  const nodeToScopeEnd = {};
  const referenceToBinding = {};
  const refNodeIdToBinding = {};
  const nodeIdToScope = {};
  let nextScopeId = 0;
  let nextBindingId = 0;
  let nextNodeId = 1;

  function getOrAssignNodeId(node) {
    if (node._nodeId == null) {
      node._nodeId = nextNodeId++;
    }
    return node._nodeId;
  }

  function mapRef(start, bindingId, node) {
    referenceToBinding[String(start)] = bindingId;
    const nodeId = getOrAssignNodeId(node);
    refNodeIdToBinding[String(nodeId)] = bindingId;
  }

  function ensureScope(babelScope) {
    if (scopeMap.has(babelScope)) return scopeMap.get(babelScope);

    // Ensure parent is registered first (preorder: parent gets lower ID)
    if (babelScope.parent) {
      ensureScope(babelScope.parent);
    }

    const id = nextScopeId++;
    scopeMap.set(babelScope, id);

    const parentId = babelScope.parent ? scopeMap.get(babelScope.parent) : null;
    const kind = getScopeKind(babelScope);
    const bindingsMap = {};

    // Register all bindings in this scope
    for (const [name, binding] of Object.entries(babelScope.bindings)) {
      if (!bindingMap.has(binding)) {
        const bid = nextBindingId++;
        bindingMap.set(binding, bid);
        const declarationNodeId = getOrAssignNodeId(binding.identifier);
        const bindingData = {
          id: bid,
          name,
          kind: getBindingKind(binding.kind),
          scope: id,
          declarationType: binding.path.node.type,
          declarationStart: binding.identifier.start,
          declarationNodeId,
        };

        // Import bindings
        if (binding.kind === "module") {
          bindingData.import = getImportData(binding);
        }

        bindings.push(bindingData);
      }
      bindingsMap[name] = bindingMap.get(binding);
    }

    scopes.push({
      id,
      parent: parentId,
      kind,
      bindings: bindingsMap,
    });

    // Record node_to_scope and node_to_scope_end
    const blockNode = babelScope.block;
    if (blockNode.start != null) {
      nodeToScope[String(blockNode.start)] = id;
      if (blockNode.end != null) {
        nodeToScopeEnd[String(blockNode.start)] = blockNode.end;
      }
      const scopeNodeId = getOrAssignNodeId(blockNode);
      nodeIdToScope[String(scopeNodeId)] = id;
    }

    return id;
  }

  traverse(ast, {
    enter(path) {
      ensureScope(path.scope);
    },
    Identifier(path) {
      getOrAssignNodeId(path.node);
      if (!path.isReferencedIdentifier()) return;
      const binding = path.scope.getBinding(path.node.name);
      if (binding && bindingMap.has(binding) && path.node.start != null) {
        mapRef(path.node.start, bindingMap.get(binding), path.node);
      }
    },
    JSXIdentifier(path) {
      getOrAssignNodeId(path.node);
    },
    AssignmentExpression(path) {
      const left = path.get("left");
      if (left.isLVal()) {
        mapLValToBindings(left, bindingMap);
      }
    },
    UpdateExpression(path) {
      const argument = path.get("argument");
      if (argument.isLVal()) {
        mapLValToBindings(argument, bindingMap);
      }
    },
  });

  // Map identifiers in assignment targets (LVal positions) to their bindings.
  function mapLValToBindings(lvalPath, bindingMap) {
    const node = lvalPath.node;
    if (!node) return;
    switch (node.type) {
      case "Identifier": {
        const binding = lvalPath.scope.getBinding(node.name);
        if (binding && bindingMap.has(binding) && node.start != null) {
          mapRef(node.start, bindingMap.get(binding), node);
        }
        break;
      }
      case "ArrayPattern": {
        for (const element of lvalPath.get("elements")) {
          if (element.node) mapLValToBindings(element, bindingMap);
        }
        break;
      }
      case "ObjectPattern": {
        for (const property of lvalPath.get("properties")) {
          if (property.isObjectProperty()) {
            mapLValToBindings(property.get("value"), bindingMap);
          } else if (property.isRestElement()) {
            mapLValToBindings(property, bindingMap);
          }
        }
        break;
      }
      case "AssignmentPattern": {
        mapLValToBindings(lvalPath.get("left"), bindingMap);
        break;
      }
      case "RestElement": {
        mapLValToBindings(lvalPath.get("argument"), bindingMap);
        break;
      }
      default:
        break;
    }
  }

  // Record declaration identifiers in reference_to_binding and refNodeIdToBinding
  for (const [binding, bid] of bindingMap) {
    if (binding.identifier && binding.identifier.start != null) {
      mapRef(binding.identifier.start, bid, binding.identifier);
    }
  }

  const result = {
    scopes,
    bindings,
    nodeToScope,
    referenceToBinding,
    programScope: 0,
  };
  // Only include new fields when non-empty, matching Rust skip_serializing_if
  if (Object.keys(nodeToScopeEnd).length > 0) {
    result.nodeToScopeEnd = nodeToScopeEnd;
  }
  if (Object.keys(refNodeIdToBinding).length > 0) {
    result.refNodeIdToBinding = refNodeIdToBinding;
  }
  if (Object.keys(nodeIdToScope).length > 0) {
    result.nodeIdToScope = nodeIdToScope;
  }
  return result;
}

function renameIdentifiers(ast, scopeInfo) {
  traverse(ast, {
    Identifier(path) {
      const nodeId = path.node._nodeId;
      if (nodeId != null && String(nodeId) in scopeInfo.refNodeIdToBinding) {
        const bindingId = scopeInfo.refNodeIdToBinding[String(nodeId)];
        const binding = scopeInfo.bindings[bindingId];
        path.node.name = `${path.node.name}_${binding.scope}_${bindingId}`;
      }
    },
  });
}

let parsed = 0;
let errors = 0;

for (const fixture of fixtures) {
  const input = fs.readFileSync(path.join(FIXTURE_DIR, fixture), "utf8");
  const isFlow = input.includes("@flow");

  const plugins = isFlow ? ["flow", "jsx"] : ["typescript", "jsx"];
  // Default to module unless there's an indicator it should be script
  const sourceType = "module";

  try {
    const ast = parse(input, {
      sourceFilename: fixture,
      plugins,
      sourceType,
      allowReturnOutsideFunction: true,
      errorRecovery: true,
    });

    // Collect scope info first — this assigns _nodeId to Identifier nodes
    const scopeInfo = collectScopeInfo(ast);

    // Serialize AST after scope collection so _nodeId fields are included
    const outPath = path.join(OUTPUT_DIR, fixture + ".json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(ast, null, 2));

    // Write scope info
    const scopeOutPath = path.join(OUTPUT_DIR, fixture + ".scope.json");
    fs.writeFileSync(scopeOutPath, JSON.stringify(scopeInfo, null, 2));

    // Create renamed AST for scope resolution verification
    renameIdentifiers(ast, scopeInfo);
    const renamedOutPath = path.join(OUTPUT_DIR, fixture + ".renamed.json");
    fs.writeFileSync(renamedOutPath, JSON.stringify(ast, null, 2));

    parsed++;
  } catch (e) {
    // Parse errors are expected for some fixtures
    const outPath = path.join(OUTPUT_DIR, fixture + ".parse-error");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, e.message);
    errors++;
  }
}

console.log(
  `Parsed ${parsed} fixtures, ${errors} parse errors, ${fixtures.length} total`
);
