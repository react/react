/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {NodePath} from '@babel/core';
import * as t from '@babel/types';
import {
  CompilerDiagnostic,
  CompilerError,
  CompilerErrorDetail,
  ErrorCategory,
} from '../CompilerError';
import {CompileErrorDetail} from './Options';
import {ExternalFunction, ReactFunctionType} from '../HIR/Environment';
import {CodegenFunction} from '../ReactiveScopes';
import {isComponentDeclaration} from '../Utils/ComponentDeclaration';
import {isHookDeclaration} from '../Utils/HookDeclaration';
import {assertExhaustive} from '../Utils/utils';
import {insertGatedFunctionDeclaration} from './Gating';
import {
  addImportsToProgram,
  ProgramContext,
  validateRestrictedImports,
} from './Imports';
import {
  CompilerOutputMode,
  CompilerReactTarget,
  ParsedPluginOptions,
  PluginOptions,
} from './Options';
import {compileFn} from './Pipeline';
import {
  filterSuppressionsThatAffectFunction,
  findProgramSuppressions,
  suppressionsToCompilerError,
} from './Suppression';
import {GeneratedSource} from '../HIR';
import {Err, Ok, Result} from '../Utils/Result';

export type CompilerPass = {
  opts: ParsedPluginOptions;
  filename: string | null;
  comments: Array<t.CommentBlock | t.CommentLine>;
  code: string | null;
};
export const OPT_IN_DIRECTIVES = new Set(['use forget', 'use memo']);
export const OPT_OUT_DIRECTIVES = new Set(['use no forget', 'use no memo']);
const DYNAMIC_GATING_DIRECTIVE = new RegExp('^use memo if\\(([^\\)]*)\\)$');

export function tryFindDirectiveEnablingMemoization(
  directives: Array<t.Directive>,
  opts: ParsedPluginOptions,
): Result<t.Directive | null, CompilerError> {
  const optIn = directives.find(directive =>
    OPT_IN_DIRECTIVES.has(directive.value.value),
  );
  if (optIn != null) {
    return Ok(optIn);
  }
  const dynamicGating = findDirectivesDynamicGating(directives, opts);
  if (dynamicGating.isOk()) {
    return Ok(dynamicGating.unwrap()?.directive ?? null);
  } else {
    return Err(dynamicGating.unwrapErr());
  }
}

export function findDirectiveDisablingMemoization(
  directives: Array<t.Directive>,
  {customOptOutDirectives}: PluginOptions,
): t.Directive | null {
  if (customOptOutDirectives != null) {
    return (
      directives.find(
        directive =>
          customOptOutDirectives.indexOf(directive.value.value) !== -1,
      ) ?? null
    );
  }
  return (
    directives.find(directive =>
      OPT_OUT_DIRECTIVES.has(directive.value.value),
    ) ?? null
  );
}
function findDirectivesDynamicGating(
  directives: Array<t.Directive>,
  opts: ParsedPluginOptions,
): Result<
  {
    gating: ExternalFunction;
    directive: t.Directive;
  } | null,
  CompilerError
> {
  if (opts.dynamicGating === null) {
    return Ok(null);
  }
  const errors = new CompilerError();
  const result: Array<{directive: t.Directive; match: string}> = [];

  for (const directive of directives) {
    const maybeMatch = DYNAMIC_GATING_DIRECTIVE.exec(directive.value.value);
    if (maybeMatch != null && maybeMatch[1] != null) {
      if (t.isValidIdentifier(maybeMatch[1])) {
        result.push({directive, match: maybeMatch[1]});
      } else {
        errors.push({
          reason: `Dynamic gating directive is not a valid JavaScript identifier`,
          description: `Found '${directive.value.value}'`,
          category: ErrorCategory.Gating,
          loc: directive.loc ?? null,
          suggestions: null,
        });
      }
    }
  }
  if (errors.hasAnyErrors()) {
    return Err(errors);
  } else if (result.length > 1) {
    const error = new CompilerError();
    error.push({
      reason: `Multiple dynamic gating directives found`,
      description: `Expected a single directive but found [${result
        .map(r => r.directive.value.value)
        .join(', ')}]`,
      category: ErrorCategory.Gating,
      loc: result[0].directive.loc ?? null,
      suggestions: null,
    });
    return Err(error);
  } else if (result.length === 1) {
    return Ok({
      gating: {
        source: opts.dynamicGating.source,
        importSpecifierName: result[0].match,
      },
      directive: result[0].directive,
    });
  } else {
    return Ok(null);
  }
}

function isError(err: unknown): boolean {
  return !(err instanceof CompilerError) || err.hasErrors();
}

function isConfigError(err: unknown): boolean {
  if (err instanceof CompilerError) {
    return err.details.some(detail => detail.category === ErrorCategory.Config);
  }
  return false;
}

export type BabelFn =
  | NodePath<t.FunctionDeclaration>
  | NodePath<t.FunctionExpression>
  | NodePath<t.ArrowFunctionExpression>;

export type CompileResult = {
  /**
   * Distinguishes existing functions that were compiled ('original') from
   * functions which were outlined. Only original functions need to be gated
   * if gating mode is enabled.
   */
  kind: 'original' | 'outlined';
  originalFn: BabelFn;
  compiledFn: CodegenFunction;
};

/**
 * Format a CompilerDiagnostic or CompilerErrorDetail class instance
 * into a plain object for logEvent(). This ensures the logged value
 * has all fields as direct properties (no getters, no nested `options`).
 */
export function formatDetailForLogging(
  detail: CompilerDiagnostic | CompilerErrorDetail,
): CompileErrorDetail {
  if (detail instanceof CompilerDiagnostic) {
    return {
      category: detail.category,
      reason: detail.reason,
      description: detail.description ?? null,
      severity: detail.severity,
      suggestions: detail.suggestions ?? null,
      details: detail.options.details.map(d => {
        if (d.kind === 'error') {
          const loc = d.loc != null && typeof d.loc !== 'symbol' ? d.loc : null;
          return {kind: d.kind, loc, message: d.message};
        } else {
          return {kind: d.kind, loc: null, message: d.message};
        }
      }),
    };
  } else {
    const loc =
      detail.loc != null && typeof detail.loc !== 'symbol' ? detail.loc : null;
    return {
      category: detail.category,
      reason: detail.reason,
      description: detail.description ?? null,
      severity: detail.severity,
      suggestions: detail.suggestions ?? null,
      loc,
    };
  }
}

function logError(
  err: unknown,
  context: {
    opts: PluginOptions;
    filename: string | null;
  },
  fnLoc: t.SourceLocation | null,
): void {
  if (context.opts.logger) {
    if (err instanceof CompilerError) {
      for (const detail of err.details) {
        context.opts.logger.logEvent(context.filename, {
          kind: 'CompileError',
          fnLoc,
          detail: formatDetailForLogging(detail),
        });
      }
    } else {
      let stringifiedError;
      if (err instanceof Error) {
        stringifiedError = err.stack ?? err.message;
      } else {
        stringifiedError = err?.toString() ?? '[ null ]';
      }

      context.opts.logger.logEvent(context.filename, {
        kind: 'PipelineError',
        fnLoc,
        data: stringifiedError,
      });
    }
  }
}
function handleError(
  err: unknown,
  context: {
    opts: PluginOptions;
    filename: string | null;
  },
  fnLoc: t.SourceLocation | null,
): void {
  logError(err, context, fnLoc);
  if (
    context.opts.panicThreshold === 'all_errors' ||
    (context.opts.panicThreshold === 'critical_errors' && isError(err)) ||
    isConfigError(err) // Always throws regardless of panic threshold
  ) {
    throw err;
  }
}

export function createNewFunctionNode(
  originalFn: BabelFn,
  compiledFn: CodegenFunction,
): t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression {
  let transformedFn:
    | t.FunctionDeclaration
    | t.ArrowFunctionExpression
    | t.FunctionExpression;
  switch (originalFn.node.type) {
    case 'FunctionDeclaration': {
      const fn: t.FunctionDeclaration = {
        type: 'FunctionDeclaration',
        id: compiledFn.id,
        loc: originalFn.node.loc ?? null,
        async: compiledFn.async,
        generator: compiledFn.generator,
        params: compiledFn.params,
        body: compiledFn.body,
      };
      transformedFn = fn;
      break;
    }
    case 'ArrowFunctionExpression': {
      const fn: t.ArrowFunctionExpression = {
        type: 'ArrowFunctionExpression',
        loc: originalFn.node.loc ?? null,
        async: compiledFn.async,
        generator: compiledFn.generator,
        params: compiledFn.params,
        expression: originalFn.node.expression,
        body: compiledFn.body,
      };
      transformedFn = fn;
      break;
    }
    case 'FunctionExpression': {
      const fn: t.FunctionExpression = {
        type: 'FunctionExpression',
        id: compiledFn.id,
        loc: originalFn.node.loc ?? null,
        async: compiledFn.async,
        generator: compiledFn.generator,
        params: compiledFn.params,
        body: compiledFn.body,
      };
      transformedFn = fn;
      break;
    }
    default: {
      assertExhaustive(
        originalFn.node,
        `Creating unhandled function: ${originalFn.node}`,
      );
    }
  }
  // Avoid visiting the new transformed version
  return transformedFn;
}

function insertNewOutlinedFunctionNode(
  program: NodePath<t.Program>,
  originalFn: BabelFn,
  compiledFn: CodegenFunction,
): BabelFn {
  switch (originalFn.type) {
    case 'FunctionDeclaration': {
      return originalFn.insertAfter(
        createNewFunctionNode(originalFn, compiledFn),
      )[0]!;
    }
    /**
     * We can't just append the outlined function as a sibling of the original function if it is an
     * (Arrow)FunctionExpression parented by a VariableDeclaration, as this would cause its parent
     * to become a SequenceExpression instead which breaks a bunch of assumptions elsewhere in the
     * plugin.
     *
     * To get around this, we always synthesize a new FunctionDeclaration for the outlined function
     * and insert it as a true sibling to the original function.
     */
    case 'ArrowFunctionExpression':
    case 'FunctionExpression': {
      const fn: t.FunctionDeclaration = {
        type: 'FunctionDeclaration',
        id: compiledFn.id,
        loc: originalFn.node.loc ?? null,
        async: compiledFn.async,
        generator: compiledFn.generator,
        params: compiledFn.params,
        body: compiledFn.body,
      };
      const insertedFuncDecl = program.pushContainer('body', [fn])[0]!;
      CompilerError.invariant(insertedFuncDecl.isFunctionDeclaration(), {
        reason: 'Expected inserted function declaration',
        description: `Got: ${insertedFuncDecl}`,
        loc: insertedFuncDecl.node?.loc ?? GeneratedSource,
      });
      return insertedFuncDecl;
    }
    default: {
      assertExhaustive(
        originalFn,
        `Inserting unhandled function: ${originalFn}`,
      );
    }
  }
}

const DEFAULT_ESLINT_SUPPRESSIONS = [
  'react-hooks/exhaustive-deps',
  'react-hooks/rules-of-hooks',
];

function isFilePartOfSources(
  sources: Array<string> | ((filename: string) => boolean),
  filename: string,
): boolean {
  if (typeof sources === 'function') {
    return sources(filename);
  }

  for (const prefix of sources) {
    if (filename.indexOf(prefix) !== -1) {
      return true;
    }
  }

  return false;
}

/**
 * When `sources` is provided as an array, entries are matched as unanchored
 * substrings of the file's absolute path (see `isFilePartOfSources`). This is a
 * footgun: a bare prefix can accidentally match an ancestor of the project root
 * (common in CI/containers, where the checkout root is often named after the
 * app), silently expanding the "opt-in" allowlist to match every file in the
 * build — including `node_modules` dependencies.
 *
 * This emits a non-fatal warning (via `logger`) for a file that is in scope
 * when either footgun is detected. It never changes which files are compiled.
 */
function warnAboutSourcesFootguns(
  sources: Array<string> | ((filename: string) => boolean),
  filename: string,
  pass: CompilerPass,
): void {
  const logger = pass.opts.logger;
  if (typeof sources === 'function' || logger == null) {
    return;
  }
  const warn = (reason: string, description: string): void => {
    logger.logEvent(filename, {
      kind: 'CompileDiagnostic',
      fnLoc: null,
      detail: {
        category: ErrorCategory.Config,
        reason,
        description,
        loc: null,
      },
    });
  };

  /**
   * A `sources` entry without a path separator is matched as a bare substring
   * of the absolute path and can match unintended files.
   */
  for (const prefix of sources) {
    if (
      filename.indexOf(prefix) !== -1 &&
      !prefix.includes('/') &&
      !prefix.includes('\\')
    ) {
      warn(
        `The \`sources\` entry '${prefix}' has no path separator`,
        `\`sources\` array entries are matched as unanchored substrings of the ` +
          `absolute file path, so '${prefix}' can match unintended files. Anchor ` +
          `the entry to a path segment (e.g. '/${prefix}/src/') or use the ` +
          `function form of \`sources\` for full control.`,
      );
    }
  }

  /**
   * The default `sources` filter excludes `node_modules`, but supplying an array
   * replaces the default entirely. Compiling a dependency is almost never the
   * intent and usually signals that a prefix over-matched (e.g. matched the
   * checkout root).
   */
  if (filename.indexOf('node_modules') !== -1) {
    warn(
      'React Compiler is compiling a `node_modules` file',
      `The \`sources\` array matched a file under \`node_modules\` ('${filename}'). ` +
        `Providing \`sources\` as an array replaces the default filter, which ` +
        `excludes \`node_modules\`. If this is unintended, anchor your prefixes ` +
        `to a path segment that cannot coincide with the build root, or use the ` +
        `function form of \`sources\` (re-adding a \`node_modules\` check).`,
    );
  }
}

/**
 * Main entrypoint for React Compiler.
 *
 * @param program The Babel program node to compile
 * @param pass Compiler configuration and context
 * @returns Compilation results or null if compilation was skipped
 */
export function compileProgram(
  program: NodePath<t.Program>,
  pass: CompilerPass,
): void {
  /**
   * This is directly invoked by the react-compiler babel plugin, so exceptions
   * thrown by this function will fail the babel build.
   * - call `handleError` if your error is recoverable.
   *   Unless the error is a warning / info diagnostic, compilation of a function
   *   / entire file should also be skipped.
   * - throw an exception if the error is fatal / not recoverable.
   *   Examples of this are invalid compiler configs or failure to codegen outlined
   *   functions *after* already emitting optimized components / hooks that invoke
   *   the outlined functions.
   */
  if (shouldSkipCompilation(program, pass)) {
    return;
  }
  const restrictedImportsErr = validateRestrictedImports(
    program,
    pass.opts.environment,
  );
  if (restrictedImportsErr) {
    handleError(restrictedImportsErr, pass, null);
    return;
  }
  /*
   * Record lint errors and critical errors as depending on Forget's config,
   * we may still need to run Forget's analysis on every function (even if we
   * have already encountered errors) for reporting.
   */
  const suppressions = findProgramSuppressions(
    pass.comments,
    /*
     * If the compiler is validating hooks rules and exhaustive memo dependencies, we don't need to check
     * for React ESLint suppressions
     */
    pass.opts.environment.validateExhaustiveMemoizationDependencies &&
      pass.opts.environment.validateHooksUsage
      ? null
      : (pass.opts.eslintSuppressionRules ?? DEFAULT_ESLINT_SUPPRESSIONS),
    // Always bail on Flow suppressions
    pass.opts.flowSuppressions,
  );

  const programContext = new ProgramContext({
    program: program,
    opts: pass.opts,
    filename: pass.filename,
    code: pass.code,
    suppressions,
    hasModuleScopeOptOut:
      findDirectiveDisablingMemoization(program.node.directives, pass.opts) !=
      null,
  });

  const queue: Array<CompileSource> = findFunctionsToCompile(
    program,
    pass,
    programContext,
  );
  const compiledFns: Array<CompileResult> = [];

  // outputMode takes precedence if specified
  const outputMode: CompilerOutputMode =
    pass.opts.outputMode ?? (pass.opts.noEmit ? 'lint' : 'client');
  while (queue.length !== 0) {
    const current = queue.shift()!;
    const compiled = processFn(
      current.fn,
      current.fnType,
      programContext,
      outputMode,
    );

    if (compiled != null) {
      for (const outlined of compiled.outlined) {
        CompilerError.invariant(outlined.fn.outlined.length === 0, {
          reason: 'Unexpected nested outlined functions',
          loc: outlined.fn.loc,
        });
        const fn = insertNewOutlinedFunctionNode(
          program,
          current.fn,
          outlined.fn,
        );
        fn.skip();
        programContext.alreadyCompiled.add(fn.node);
        if (outlined.type !== null) {
          queue.push({
            kind: 'outlined',
            fn,
            fnType: outlined.type,
          });
        }
      }
      compiledFns.push({
        kind: current.kind,
        originalFn: current.fn,
        compiledFn: compiled,
      });
    }
  }

  // Avoid modifying the program if we find a program level opt-out
  if (programContext.hasModuleScopeOptOut) {
    if (compiledFns.length > 0) {
      const error = new CompilerError();
      error.pushErrorDetail(
        new CompilerErrorDetail({
          reason:
            'Unexpected compiled functions when module scope opt-out is present',
          category: ErrorCategory.Invariant,
          loc: null,
        }),
      );
      handleError(error, programContext, null);
    }
    return;
  }

  // Insert React Compiler generated functions into the Babel AST
  applyCompiledFunctions(program, compiledFns, pass, programContext);
}

type CompileSource = {
  kind: 'original' | 'outlined';
  fn: BabelFn;
  fnType: ReactFunctionType;
};
/**
 * Find all React components and hooks that need to be compiled
 *
 * @returns An array of React functions from @param program to transform
 */
function findFunctionsToCompile(
  program: NodePath<t.Program>,
  pass: CompilerPass,
  programContext: ProgramContext,
): Array<CompileSource> {
  const queue: Array<CompileSource> = [];
  const traverseFunction = (fn: BabelFn, pass: CompilerPass): void => {
    // In 'all' mode, compile only top level functions
    if (
      pass.opts.compilationMode === 'all' &&
      fn.scope.getProgramParent() !== fn.scope.parent
    ) {
      return;
    }

    const fnType = getReactFunctionType(fn, pass);

    if (fnType === null || programContext.alreadyCompiled.has(fn.node)) {
      return;
    }

    /*
     * We may be generating a new FunctionDeclaration node, so we must skip over it or this
     * traversal will loop infinitely.
     * Ensure we avoid visiting the original function again.
     */
    programContext.alreadyCompiled.add(fn.node);
    fn.skip();

    queue.push({kind: 'original', fn, fnType});
  };

  // Main traversal to compile with Forget
  program.traverse(
    {
      ClassDeclaration(node: NodePath<t.ClassDeclaration>) {
        /*
         * Don't visit functions defined inside classes, because they
         * can reference `this` which is unsafe for compilation
         */
        node.skip();
      },

      ClassExpression(node: NodePath<t.ClassExpression>) {
        /*
         * Don't visit functions defined inside classes, because they
         * can reference `this` which is unsafe for compilation
         */
        node.skip();
      },

      FunctionDeclaration: traverseFunction,

      FunctionExpression: traverseFunction,

      ArrowFunctionExpression: traverseFunction,
    },
    {
      ...pass,
      opts: {...pass.opts, ...pass.opts},
      filename: pass.filename ?? null,
    },
  );
  return queue;
}

/**
 * Try to compile a source function, taking into account all local suppressions,
 * opt-ins, and opt-outs.
 *
 * Errors encountered during compilation are either logged (if recoverable) or
 * thrown (if non-recoverable).
 *
 * @returns the compiled function or null if the function was skipped (due to
 * config settings and/or outputs)
 */
function processFn(
  fn: BabelFn,
  fnType: ReactFunctionType,
  programContext: ProgramContext,
  outputMode: CompilerOutputMode,
): null | CodegenFunction {
  let directives: {
    optIn: t.Directive | null;
    optOut: t.Directive | null;
  };
  if (fn.node.body.type !== 'BlockStatement') {
    directives = {
      optIn: null,
      optOut: null,
    };
  } else {
    const optIn = tryFindDirectiveEnablingMemoization(
      fn.node.body.directives,
      programContext.opts,
    );
    if (optIn.isErr()) {
      /**
       * If parsing opt-in directive fails, it's most likely that React Compiler
       * was not tested or rolled out on this function. In that case, we handle
       * the error and fall back to the safest option which is to not optimize
       * the function.
       */
      handleError(optIn.unwrapErr(), programContext, fn.node.loc ?? null);
      return null;
    }
    directives = {
      optIn: optIn.unwrapOr(null),
      optOut: findDirectiveDisablingMemoization(
        fn.node.body.directives,
        programContext.opts,
      ),
    };
  }

  let compiledFn: CodegenFunction;
  const compileResult = tryCompileFunction(
    fn,
    fnType,
    programContext,
    outputMode,
  );
  if (compileResult.kind === 'error') {
    if (directives.optOut != null) {
      logError(compileResult.error, programContext, fn.node.loc ?? null);
    } else {
      handleError(compileResult.error, programContext, fn.node.loc ?? null);
    }
    return null;
  } else {
    compiledFn = compileResult.compiledFn;
  }

  /**
   * If 'use no forget/memo' is present and we still ran the code through the
   * compiler for validation, log a skip event and don't mutate the babel AST.
   * This allows us to flag if there is an unused 'use no forget/memo'
   * directive.
   */
  if (
    programContext.opts.ignoreUseNoForget === false &&
    directives.optOut != null
  ) {
    programContext.logEvent({
      kind: 'CompileSkip',
      fnLoc: fn.node.body.loc ?? null,
      reason: `Skipped due to '${directives.optOut.value.value}' directive.`,
      loc: directives.optOut.loc ?? null,
    });
    return null;
  }
  programContext.logEvent({
    kind: 'CompileSuccess',
    fnLoc: fn.node.loc ?? null,
    fnName: compiledFn.id?.name ?? null,
    memoSlots: compiledFn.memoSlotsUsed,
    memoBlocks: compiledFn.memoBlocks,
    memoValues: compiledFn.memoValues,
    prunedMemoBlocks: compiledFn.prunedMemoBlocks,
    prunedMemoValues: compiledFn.prunedMemoValues,
  });

  if (programContext.hasModuleScopeOptOut) {
    return null;
  } else if (programContext.opts.outputMode === 'lint') {
    return null;
  } else if (
    programContext.opts.compilationMode === 'annotation' &&
    directives.optIn == null
  ) {
    /**
     * If no opt-in directive is found and the compiler is configured in
     * annotation mode, don't insert the compiled function.
     */
    return null;
  } else {
    return compiledFn;
  }
}

function tryCompileFunction(
  fn: BabelFn,
  fnType: ReactFunctionType,
  programContext: ProgramContext,
  outputMode: CompilerOutputMode,
):
  | {kind: 'compile'; compiledFn: CodegenFunction}
  | {kind: 'error'; error: unknown} {
  /**
   * Note that Babel does not attach comment nodes to nodes; they are dangling off of the
   * Program node itself. We need to figure out whether an eslint suppression range
   * applies to this function first.
   */
  const suppressionsInFunction = filterSuppressionsThatAffectFunction(
    programContext.suppressions,
    fn,
  );
  if (suppressionsInFunction.length > 0) {
    return {
      kind: 'error',
      error: suppressionsToCompilerError(suppressionsInFunction),
    };
  }

  try {
    const result = compileFn(
      fn,
      programContext.opts.environment,
      fnType,
      outputMode,
      programContext,
      programContext.opts.logger,
      programContext.filename,
      programContext.code,
    );
    if (result.isOk()) {
      return {kind: 'compile', compiledFn: result.unwrap()};
    } else {
      return {kind: 'error', error: result.unwrapErr()};
    }
  } catch (err) {
    /**
     * A pass incorrectly threw instead of recording the error.
     * Log for detection in development.
     */
    if (
      err instanceof CompilerError &&
      err.details.every(detail => detail.category !== ErrorCategory.Invariant)
    ) {
      programContext.logEvent({
        kind: 'CompileUnexpectedThrow',
        fnLoc: fn.node.loc ?? null,
        data: err.toString(),
      });
    }
    return {kind: 'error', error: err};
  }
}

/**
 * Applies React Compiler generated functions to the babel AST by replacing
 * existing functions in place or inserting new declarations.
 */
function applyCompiledFunctions(
  program: NodePath<t.Program>,
  compiledFns: Array<CompileResult>,
  pass: CompilerPass,
  programContext: ProgramContext,
): void {
  let referencedBeforeDeclared = null;
  for (const result of compiledFns) {
    const {kind, originalFn, compiledFn} = result;
    const transformedFn = createNewFunctionNode(originalFn, compiledFn);
    programContext.alreadyCompiled.add(transformedFn);

    let dynamicGating: ExternalFunction | null = null;
    if (originalFn.node.body.type === 'BlockStatement') {
      const result = findDirectivesDynamicGating(
        originalFn.node.body.directives,
        pass.opts,
      );
      if (result.isOk()) {
        dynamicGating = result.unwrap()?.gating ?? null;
      }
    }
    const functionGating = dynamicGating ?? pass.opts.gating;
    if (kind === 'original' && functionGating != null) {
      referencedBeforeDeclared ??=
        getFunctionReferencedBeforeDeclarationAtTopLevel(program, compiledFns);
      insertGatedFunctionDeclaration(
        originalFn,
        transformedFn,
        programContext,
        functionGating,
        referencedBeforeDeclared.has(result),
      );
    } else {
      originalFn.replaceWith(transformedFn);
    }
  }

  // Forget compiled the component, we need to update existing imports of useMemoCache
  if (compiledFns.length > 0) {
    // Codegen may have registered `_c` for a function that was later discarded.
    const anyAppliedUsesMemo = compiledFns.some(
      result => result.compiledFn.memoSlotsUsed > 0,
    );
    if (!anyAppliedUsesMemo) {
      programContext.removeMemoCacheImport();
    }
    addImportsToProgram(program, programContext);
  }
}

function shouldSkipCompilation(
  program: NodePath<t.Program>,
  pass: CompilerPass,
): boolean {
  if (pass.opts.sources) {
    if (pass.filename === null) {
      const error = new CompilerError();
      error.pushErrorDetail(
        new CompilerErrorDetail({
          reason: `Expected a filename but found none.`,
          description:
            "When the 'sources' config options is specified, the React compiler will only compile files with a name",
          category: ErrorCategory.Config,
          loc: null,
        }),
      );
      handleError(error, pass, null);
      return true;
    }

    if (!isFilePartOfSources(pass.opts.sources, pass.filename)) {
      return true;
    }

    warnAboutSourcesFootguns(pass.opts.sources, pass.filename, pass);
  }

  if (
    hasMemoCacheFunctionImport(
      program,
      getReactCompilerRuntimeModule(pass.opts.target),
    )
  ) {
    return true;
  }
  return false;
}

function getReactFunctionType(
  fn: BabelFn,
  pass: CompilerPass,
): ReactFunctionType | null {
  if (fn.node.body.type === 'BlockStatement') {
    const optInDirectives = tryFindDirectiveEnablingMemoization(
      fn.node.body.directives,
      pass.opts,
    );
    if (optInDirectives.unwrapOr(null) != null) {
      return getComponentOrHookLike(fn) ?? 'Other';
    }
  }

  // Component and hook declarations are known components/hooks
  let componentSyntaxType: ReactFunctionType | null = null;
  if (fn.isFunctionDeclaration()) {
    if (isComponentDeclaration(fn.node)) {
      componentSyntaxType = 'Component';
    } else if (isHookDeclaration(fn.node)) {
      componentSyntaxType = 'Hook';
    }
  }

  switch (pass.opts.compilationMode) {
    case 'annotation': {
      // opt-ins are checked above
      return null;
    }
    case 'infer': {
      // Check if this is a component or hook-like function
      return componentSyntaxType ?? getComponentOrHookLike(fn);
    }
    case 'syntax': {
      return componentSyntaxType;
    }
    case 'all': {
      return getComponentOrHookLike(fn) ?? 'Other';
    }
    default: {
      assertExhaustive(
        pass.opts.compilationMode,
        `Unexpected compilationMode \`${pass.opts.compilationMode}\``,
      );
    }
  }
}

/**
 * Returns true if the program contains an `import {c} from "<moduleName>"` declaration,
 * regardless of the local name of the 'c' specifier and the presence of other specifiers
 * in the same declaration.
 */
function hasMemoCacheFunctionImport(
  program: NodePath<t.Program>,
  moduleName: string,
): boolean {
  let hasUseMemoCache = false;
  program.traverse({
    ImportSpecifier(path) {
      const imported = path.get('imported');
      let importedName: string | null = null;
      if (imported.isIdentifier()) {
        importedName = imported.node.name;
      } else if (imported.isStringLiteral()) {
        importedName = imported.node.value;
      }
      if (
        importedName === 'c' &&
        path.parentPath.isImportDeclaration() &&
        path.parentPath.get('source').node.value === moduleName
      ) {
        hasUseMemoCache = true;
      }
    },
  });
  return hasUseMemoCache;
}

function isHookName(s: string): boolean {
  return /^use[A-Z0-9]/.test(s);
}

/*
 * We consider hooks to be a hook name identifier or a member expression
 * containing a hook name.
 */

function isHook(path: NodePath<t.Expression | t.PrivateName>): boolean {
  if (path.isIdentifier()) {
    return isHookName(path.node.name);
  } else if (
    path.isMemberExpression() &&
    !path.node.computed &&
    isHook(path.get('property'))
  ) {
    const obj = path.get('object').node;
    const isPascalCaseNameSpace = /^[A-Z].*/;
    return obj.type === 'Identifier' && isPascalCaseNameSpace.test(obj.name);
  } else {
    return false;
  }
}

/*
 * Checks if the node is a React component name. React component names must
 * always start with an uppercase letter.
 */

function isComponentName(path: NodePath<t.Expression>): boolean {
  return path.isIdentifier() && /^[A-Z]/.test(path.node.name);
}

function isReactAPI(
  path: NodePath<t.Expression | t.PrivateName | t.V8IntrinsicIdentifier>,
  functionName: string,
): boolean {
  const node = path.node;
  return (
    (node.type === 'Identifier' && node.name === functionName) ||
    (node.type === 'MemberExpression' &&
      node.object.type === 'Identifier' &&
      node.object.name === 'React' &&
      node.property.type === 'Identifier' &&
      node.property.name === functionName)
  );
}

/*
 * Checks if the node is a callback argument of forwardRef. This render function
 * should follow the rules of hooks.
 */

function isForwardRefCallback(path: NodePath<t.Expression>): boolean {
  return !!(
    path.parentPath.isCallExpression() &&
    path.parentPath.get('callee').isExpression() &&
    isReactAPI(path.parentPath.get('callee'), 'forwardRef')
  );
}

/*
 * Checks if the node is a callback argument of React.memo. This anonymous
 * functional component should follow the rules of hooks.
 */

function isMemoCallback(path: NodePath<t.Expression>): boolean {
  return (
    path.parentPath.isCallExpression() &&
    path.parentPath.get('callee').isExpression() &&
    isReactAPI(path.parentPath.get('callee'), 'memo')
  );
}

function isValidPropsAnnotation(
  annot: t.TypeAnnotation | t.TSTypeAnnotation | t.Noop | null | undefined,
): boolean {
  if (annot == null) {
    return true;
  } else if (annot.type === 'TSTypeAnnotation') {
    switch (annot.typeAnnotation.type) {
      case 'TSArrayType':
      case 'TSBigIntKeyword':
      case 'TSBooleanKeyword':
      case 'TSConstructorType':
      case 'TSFunctionType':
      case 'TSLiteralType':
      case 'TSNeverKeyword':
      case 'TSNumberKeyword':
      case 'TSStringKeyword':
      case 'TSSymbolKeyword':
      case 'TSTupleType':
        return false;
    }
    return true;
  } else if (annot.type === 'TypeAnnotation') {
    switch (annot.typeAnnotation.type) {
      case 'ArrayTypeAnnotation':
      case 'BooleanLiteralTypeAnnotation':
      case 'BooleanTypeAnnotation':
      case 'EmptyTypeAnnotation':
      case 'FunctionTypeAnnotation':
      case 'NumberLiteralTypeAnnotation':
      case 'NumberTypeAnnotation':
      case 'StringLiteralTypeAnnotation':
      case 'StringTypeAnnotation':
      case 'SymbolTypeAnnotation':
      case 'ThisTypeAnnotation':
      case 'TupleTypeAnnotation':
        return false;
    }
    return true;
  } else if (annot.type === 'Noop') {
    return true;
  } else {
    assertExhaustive(annot, `Unexpected annotation node \`${annot}\``);
  }
}

function isValidComponentParams(
  params: Array<NodePath<t.Identifier | t.Pattern | t.RestElement>>,
): boolean {
  if (params.length === 0) {
    return true;
  } else if (params.length > 0 && params.length <= 2) {
    if (!isValidPropsAnnotation(params[0].node.typeAnnotation)) {
      return false;
    }

    if (params.length === 1) {
      return !params[0].isRestElement();
    } else if (params[1].isIdentifier()) {
      // check if second param might be a ref
      const {name} = params[1].node;
      return name.includes('ref') || name.includes('Ref');
    } else {
      /**
       * Otherwise, avoid helper functions that take more than one argument.
       * Helpers are _usually_ named with lowercase, but some code may
       * violate this rule
       */
      return false;
    }
  }
  return false;
}

/*
 * Adapted from the ESLint rule at
 * https://github.com/facebook/react/blob/main/packages/eslint-plugin-react-hooks/src/RulesOfHooks.js#L90-L103
 */
function getComponentOrHookLike(
  node: NodePath<
    t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression
  >,
): ReactFunctionType | null {
  const functionName = getFunctionName(node);
  // Check if the name is component or hook like:
  if (functionName !== null && isComponentName(functionName)) {
    let isComponent =
      callsHooksOrCreatesJsx(node) &&
      isValidComponentParams(node.get('params')) &&
      !returnsNonNode(node);
    return isComponent ? 'Component' : null;
  } else if (functionName !== null && isHook(functionName)) {
    // Hooks have hook invocations or JSX, but can take any # of arguments
    return callsHooksOrCreatesJsx(node) ? 'Hook' : null;
  }

  /*
   * Otherwise for function or arrow function expressions, check if they
   * appear as the argument to React.forwardRef() or React.memo():
   */
  if (node.isFunctionExpression() || node.isArrowFunctionExpression()) {
    if (isForwardRefCallback(node) || isMemoCallback(node)) {
      // As an added check we also look for hook invocations or JSX
      return callsHooksOrCreatesJsx(node) ? 'Component' : null;
    }
  }
  return null;
}

function skipNestedFunctions(
  node: NodePath<
    t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression
  >,
) {
  return (
    fn: NodePath<
      t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression
    >,
  ): void => {
    if (fn.node !== node.node) {
      fn.skip();
    }
  };
}

function callsHooksOrCreatesJsx(
  node: NodePath<
    t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression
  >,
): boolean {
  let invokesHooks = false;
  let createsJsx = false;

  node.traverse({
    JSX() {
      createsJsx = true;
    },
    CallExpression(call) {
      const callee = call.get('callee');
      if (callee.isExpression() && isHook(callee)) {
        invokesHooks = true;
      }
    },
    ArrowFunctionExpression: skipNestedFunctions(node),
    FunctionExpression: skipNestedFunctions(node),
    FunctionDeclaration: skipNestedFunctions(node),
  });

  return invokesHooks || createsJsx;
}

function isNonNode(node?: t.Expression | null): boolean {
  if (!node) {
    return true;
  }
  switch (node.type) {
    case 'ObjectExpression':
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
    case 'BigIntLiteral':
    case 'ClassExpression':
    case 'NewExpression': // technically `new Array()` is legit, but unlikely
      return true;
  }
  return false;
}

function returnsNonNode(
  node: NodePath<
    t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression
  >,
): boolean {
  let returnsNonNode = false;
  if (
    // node.traverse#ArrowFunctionExpression isn't called for the root node
    node.type === 'ArrowFunctionExpression' &&
    node.node.body.type !== 'BlockStatement'
  ) {
    returnsNonNode = isNonNode(node.node.body);
  }

  node.traverse({
    ReturnStatement(ret) {
      returnsNonNode = isNonNode(ret.node.argument);
    },
    // Skip traversing all nested functions and their return statements
    ArrowFunctionExpression: skipNestedFunctions(node),
    FunctionExpression: skipNestedFunctions(node),
    FunctionDeclaration: skipNestedFunctions(node),
    ObjectMethod: node => node.skip(),
  });

  return returnsNonNode;
}

/*
 * Gets the static name of a function AST node. For function declarations it is
 * easy. For anonymous function expressions it is much harder. If you search for
 * `IsAnonymousFunctionDefinition()` in the ECMAScript spec you'll find places
 * where JS gives anonymous function expressions names. We roughly detect the
 * same AST nodes with some exceptions to better fit our use case.
 */

function getFunctionName(
  path: NodePath<
    t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression
  >,
): NodePath<t.Expression> | null {
  if (path.isFunctionDeclaration()) {
    const id = path.get('id');
    if (id.isIdentifier()) {
      return id;
    }
    return null;
  }
  let id: NodePath<t.LVal | t.Expression | t.PrivateName> | null = null;
  const parent = path.parentPath;
  if (parent.isVariableDeclarator() && parent.get('init').node === path.node) {
    // const useHook = () => {};
    id = parent.get('id');
  } else if (
    parent.isAssignmentExpression() &&
    parent.get('right').node === path.node &&
    parent.get('operator') === '='
  ) {
    // useHook = () => {};
    id = parent.get('left');
  } else if (
    parent.isProperty() &&
    parent.get('value').node === path.node &&
    !parent.get('computed') &&
    parent.get('key').isLVal()
  ) {
    /*
     * {useHook: () => {}}
     * {useHook() {}}
     */
    id = parent.get('key');
  } else if (
    parent.isAssignmentPattern() &&
    parent.get('right').node === path.node &&
    !parent.get('computed')
  ) {
    /*
     * const {useHook = () => {}} = {};
     * ({useHook = () => {}} = {});
     *
     * Kinda clowny, but we'd said we'd follow spec convention for
     * `IsAnonymousFunctionDefinition()` usage.
     */
    id = parent.get('left');
  }
  if (id !== null && (id.isIdentifier() || id.isMemberExpression())) {
    return id;
  } else {
    return null;
  }
}

function getFunctionReferencedBeforeDeclarationAtTopLevel(
  program: NodePath<t.Program>,
  fns: Array<CompileResult>,
): Set<CompileResult> {
  const fnNames = new Map<string, {id: t.Identifier; fn: CompileResult}>(
    fns
      .map<[NodePath<t.Expression> | null, CompileResult]>(fn => [
        getFunctionName(fn.originalFn),
        fn,
      ])
      .filter(
        (entry): entry is [NodePath<t.Identifier>, CompileResult] =>
          !!entry[0] && entry[0].isIdentifier(),
      )
      .map(entry => [entry[0].node.name, {id: entry[0].node, fn: entry[1]}]),
  );
  const referencedBeforeDeclaration = new Set<CompileResult>();

  program.traverse({
    TypeAnnotation(path) {
      path.skip();
    },
    TSTypeAnnotation(path) {
      path.skip();
    },
    TypeAlias(path) {
      path.skip();
    },
    TSTypeAliasDeclaration(path) {
      path.skip();
    },
    Identifier(id) {
      const fn = fnNames.get(id.node.name);
      // We're not tracking this identifier.
      if (!fn) {
        return;
      }

      /*
       * We've reached the declaration, hoisting is no longer possible, stop
       * checking for this component name.
       */
      if (id.node === fn.id) {
        fnNames.delete(id.node.name);
        return;
      }

      const scope = id.scope.getFunctionParent();
      /*
       * A null scope means there's no function scope, which means we're at the
       * top level scope.
       */
      if (scope === null && id.isReferencedIdentifier()) {
        referencedBeforeDeclaration.add(fn.fn);
      }
    },
  });

  return referencedBeforeDeclaration;
}

export function getReactCompilerRuntimeModule(
  target: CompilerReactTarget,
): string {
  if (target === '19') {
    return 'react/compiler-runtime'; // from react namespace
  } else if (target === '17' || target === '18') {
    return 'react-compiler-runtime'; // npm package
  } else {
    CompilerError.invariant(
      target != null &&
        target.kind === 'donotuse_meta_internal' &&
        typeof target.runtimeModule === 'string',
      {
        reason: 'Expected target to already be validated',
        loc: GeneratedSource,
      },
    );
    return target.runtimeModule;
  }
}
