/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {NodePath} from '@babel/core';
import * as t from '@babel/types';
import {Scope as BabelScope} from '@babel/traverse';

import {CompilerError, ErrorCategory} from '../CompilerError';
import {
  EnvironmentConfig,
  GeneratedSource,
  NonLocalImportSpecifier,
} from '../HIR';
import {getOrInsertWith} from '../Utils/utils';
import {ExternalFunction, isHookName} from '../HIR/Environment';
import {Err, Ok, Result} from '../Utils/Result';
import {LoggerEvent, ParsedPluginOptions} from './Options';
import {getReactCompilerRuntimeModule} from './Program';
import {SuppressionRange} from './Suppression';

export function validateRestrictedImports(
  path: NodePath<t.Program>,
  {validateBlocklistedImports}: EnvironmentConfig,
): CompilerError | null {
  if (
    validateBlocklistedImports == null ||
    validateBlocklistedImports.length === 0
  ) {
    return null;
  }
  const error = new CompilerError();
  const restrictedImports = new Set(validateBlocklistedImports);
  path.traverse({
    ImportDeclaration(importDeclPath) {
      if (restrictedImports.has(importDeclPath.node.source.value)) {
        error.push({
          category: ErrorCategory.Todo,
          reason: 'Bailing out due to blocklisted import',
          description: `Import from module ${importDeclPath.node.source.value}`,
          loc: importDeclPath.node.loc ?? null,
        });
      }
    },
  });
  if (error.hasAnyErrors()) {
    return error;
  } else {
    return null;
  }
}

type ProgramContextOptions = {
  program: NodePath<t.Program>;
  suppressions: Array<SuppressionRange>;
  opts: ParsedPluginOptions;
  filename: string | null;
  code: string | null;
  hasModuleScopeOptOut: boolean;
  hasModuleScopeOptIn: boolean;
};
export class ProgramContext {
  /**
   * Program and environment context
   */
  scope: BabelScope;
  opts: ParsedPluginOptions;
  filename: string | null;
  code: string | null;
  reactRuntimeModule: string;
  suppressions: Array<SuppressionRange>;
  hasModuleScopeOptOut: boolean;
  /**
   * True when a module-level opt-in directive (e.g. `'use memo'`) is present.
   * In annotation mode this makes every component/hook in the module behave as
   * if it had an individual function-level opt-in directive.
   */
  hasModuleScopeOptIn: boolean;

  /*
   * This is a hack to work around what seems to be a Babel bug. Babel doesn't
   * consistently respect the `skip()` function to avoid revisiting a node within
   * a pass, so we use this set to track nodes that we have compiled.
   */
  alreadyCompiled: WeakSet<object> | Set<object> = new (WeakSet ?? Set)();
  // known generated or referenced identifiers in the program
  knownReferencedNames: Set<string> = new Set();
  // generated imports
  imports: Map<string, Map<string, NonLocalImportSpecifier>> = new Map();

  constructor({
    program,
    suppressions,
    opts,
    filename,
    code,
    hasModuleScopeOptOut,
    hasModuleScopeOptIn,
  }: ProgramContextOptions) {
    this.scope = program.scope;
    this.opts = opts;
    this.filename = filename;
    this.code = code;
    this.reactRuntimeModule = getReactCompilerRuntimeModule(opts.target);
    this.suppressions = suppressions;
    this.hasModuleScopeOptOut = hasModuleScopeOptOut;
    this.hasModuleScopeOptIn = hasModuleScopeOptIn;
  }

  isHookName(name: string): boolean {
    return isHookName(name);
  }

  hasReference(name: string): boolean {
    return (
      this.knownReferencedNames.has(name) ||
      this.scope.hasBinding(name) ||
      this.scope.hasGlobal(name) ||
      this.scope.hasReference(name)
    );
  }

  newUid(name: string): string {
    /**
     * Don't call babel's generateUid for known hook imports, as
     * InferTypes might eventually type `HookKind` based on callee naming
     * convention and `_useFoo` is not named as a hook.
     *
     * Local uid generation is susceptible to check-before-use bugs since we're
     * checking for naming conflicts / references long before we actually insert
     * the import. (see similar logic in HIRBuilder:resolveBinding)
     */
    let uid;
    if (this.isHookName(name)) {
      uid = name;
      let i = 0;
      while (this.hasReference(uid)) {
        this.knownReferencedNames.add(uid);
        uid = `${name}_${i++}`;
      }
    } else if (!this.hasReference(name)) {
      uid = name;
    } else {
      uid = this.scope.generateUid(name);
    }
    this.knownReferencedNames.add(uid);
    return uid;
  }

  addMemoCacheImport(): NonLocalImportSpecifier {
    return this.addImportSpecifier(
      {
        source: this.reactRuntimeModule,
        importSpecifierName: 'c',
      },
      '_c',
    );
  }

  removeMemoCacheImport(): void {
    const moduleImports = this.imports.get(this.reactRuntimeModule);
    if (moduleImports == null) {
      return;
    }
    moduleImports.delete('c');
    if (moduleImports.size === 0) {
      this.imports.delete(this.reactRuntimeModule);
    }
  }

  /**
   *
   * @param externalFunction
   * @param nameHint if defined, will be used as the name of the import specifier
   * @returns
   */
  addImportSpecifier(
    {source: module, importSpecifierName: specifier}: ExternalFunction,
    nameHint?: string,
  ): NonLocalImportSpecifier {
    const maybeBinding = this.imports.get(module)?.get(specifier);
    if (maybeBinding != null) {
      return {...maybeBinding};
    }

    const binding: NonLocalImportSpecifier = {
      kind: 'ImportSpecifier',
      name: this.newUid(nameHint ?? specifier),
      module,
      imported: specifier,
    };
    getOrInsertWith(this.imports, module, () => new Map()).set(specifier, {
      ...binding,
    });
    return binding;
  }

  addNewReference(name: string): void {
    this.knownReferencedNames.add(name);
  }

  assertGlobalBinding(
    name: string,
    localScope?: BabelScope,
  ): Result<void, CompilerError> {
    const scope = localScope ?? this.scope;
    if (!scope.hasReference(name) && !scope.hasBinding(name)) {
      return Ok(undefined);
    }
    const error = new CompilerError();
    error.push({
      category: ErrorCategory.Todo,
      reason: 'Encountered conflicting global in generated program',
      description: `Conflict from local binding ${name}`,
      loc: scope.getBinding(name)?.path.node.loc ?? null,
      suggestions: null,
    });
    return Err(error);
  }

  logEvent(event: LoggerEvent): void {
    if (this.opts.logger != null) {
      this.opts.logger.logEvent(this.filename, event);
    }
  }
}

function getExistingImports(
  program: NodePath<t.Program>,
): Map<string, NodePath<t.ImportDeclaration>> {
  const existingImports = new Map<string, NodePath<t.ImportDeclaration>>();
  program.traverse({
    ImportDeclaration(path) {
      if (isNonNamespacedImport(path)) {
        existingImports.set(path.node.source.value, path);
      }
    },
  });
  return existingImports;
}

export function addImportsToProgram(
  path: NodePath<t.Program>,
  programContext: ProgramContext,
): void {
  const existingImports = getExistingImports(path);
  const stmts: Array<t.ImportDeclaration | t.VariableDeclaration> = [];
  const sortedModules = [...programContext.imports.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  for (const [moduleName, importsMap] of sortedModules) {
    for (const [specifierName, loweredImport] of importsMap) {
      /**
       * Assert that the import identifier hasn't already be declared in the program.
       * Note: we use getBinding here since `Scope.hasBinding` pessimistically returns true
       * for all allocated uids (from `Scope.getUid`)
       */
      CompilerError.invariant(
        path.scope.getBinding(loweredImport.name) == null,
        {
          reason:
            'Encountered conflicting import specifiers in generated program',
          description: `Conflict from import ${loweredImport.module}:(${loweredImport.imported} as ${loweredImport.name})`,
          loc: GeneratedSource,
        },
      );
      CompilerError.invariant(
        loweredImport.module === moduleName &&
          loweredImport.imported === specifierName,
        {
          reason:
            'Found inconsistent import specifier. This is an internal bug.',
          description: `Expected import ${moduleName}:${specifierName} but found ${loweredImport.module}:${loweredImport.imported}`,
          loc: GeneratedSource,
        },
      );
    }
    const sortedImport: Array<NonLocalImportSpecifier> = [
      ...importsMap.values(),
    ].sort(({imported: a}, {imported: b}) => a.localeCompare(b));
    const importSpecifiers = sortedImport.map(specifier => {
      return t.importSpecifier(
        t.identifier(specifier.name),
        t.identifier(specifier.imported),
      );
    });

    /**
     * If an existing import of this module exists (ie `import { ... } from
     * '<moduleName>'`), inject new imported specifiers into the list of
     * destructured variables.
     */
    const maybeExistingImports = existingImports.get(moduleName);
    if (maybeExistingImports != null) {
      maybeExistingImports.pushContainer('specifiers', importSpecifiers);
    } else {
      if (path.node.sourceType === 'module') {
        stmts.push(
          t.importDeclaration(importSpecifiers, t.stringLiteral(moduleName)),
        );
      } else {
        stmts.push(
          t.variableDeclaration('const', [
            t.variableDeclarator(
              t.objectPattern(
                sortedImport.map(specifier => {
                  return t.objectProperty(
                    t.identifier(specifier.imported),
                    t.identifier(specifier.name),
                  );
                }),
              ),
              t.callExpression(t.identifier('require'), [
                t.stringLiteral(moduleName),
              ]),
            ),
          ]),
        );
      }
    }
  }
  path.unshiftContainer('body', stmts);
}

/*
 * Matches `import { ... } from <moduleName>;`
 * but not `import * as React from <moduleName>;`
 *         `import type { Foo } from <moduleName>;`
 */
function isNonNamespacedImport(
  importDeclPath: NodePath<t.ImportDeclaration>,
): boolean {
  return (
    importDeclPath
      .get('specifiers')
      .every(specifier => specifier.isImportSpecifier()) &&
    importDeclPath.node.importKind !== 'type' &&
    importDeclPath.node.importKind !== 'typeof'
  );
}
