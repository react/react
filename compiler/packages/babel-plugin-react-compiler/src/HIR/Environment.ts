/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as t from '@babel/types';
import {ZodError, z} from 'zod/v4';
import {fromZodError} from 'zod-validation-error/v4';
import {
  CompilerDiagnostic,
  CompilerError,
  CompilerErrorDetail,
  ErrorCategory,
} from '../CompilerError';
import {
  CompilerOutputMode,
  Logger,
  ProgramContext,
  formatDetailForLogging,
} from '../Entrypoint';
import {Err, Ok, Result} from '../Utils/Result';
import {
  DEFAULT_GLOBALS,
  DEFAULT_SHAPES,
  Global,
  GlobalRegistry,
  getReanimatedModuleType,
  installTypeConfig,
} from './Globals';
import {
  BlockId,
  BuiltInType,
  Effect,
  FunctionType,
  GeneratedSource,
  HIRFunction,
  IdentifierId,
  NonLocalBinding,
  PolyType,
  ScopeId,
  SourceLocation,
  Type,
  ValidatedIdentifier,
  ValueKind,
  getHookKindForType,
  makeBlockId,
  makeIdentifierId,
  makeIdentifierName,
  makeScopeId,
} from './HIR';
import {
  BuiltInMixedReadonlyId,
  DefaultMutatingHook,
  DefaultNonmutatingHook,
  FunctionSignature,
  ShapeRegistry,
  addHook,
} from './ObjectShape';
import {Scope as BabelScope, NodePath} from '@babel/traverse';
import {TypeSchema} from './TypeSchema';
import {FlowTypeEnv} from '../Flood/Types';
import {defaultModuleTypeProvider} from './DefaultModuleTypeProvider';
import {assertExhaustive} from '../Utils/utils';

export const ExternalFunctionSchema = z.object({
  // Source for the imported module that exports the `importSpecifierName` functions
  source: z.string(),

  // Unique name for the feature flag test condition, eg `isForgetEnabled_ProjectName`
  importSpecifierName: z.string(),
});

export const InstrumentationSchema = z
  .object({
    fn: ExternalFunctionSchema,
    gating: ExternalFunctionSchema.nullable(),
    globalGating: z.string().nullable(),
  })
  .refine(
    opts => opts.gating != null || opts.globalGating != null,
    'Expected at least one of gating or globalGating',
  );

export type ExternalFunction = z.infer<typeof ExternalFunctionSchema>;

export const MacroSchema = z.string();

export type CompilerMode = 'all_features' | 'no_inferred_memo';

export type Macro = z.infer<typeof MacroSchema>;

const HookSchema = z.object({
  /*
   * The effect of arguments to this hook. Describes whether the hook may or may
   * not mutate arguments, etc.
   */
  effectKind: z.nativeEnum(Effect),

  /*
   * The kind of value returned by the hook. Allows indicating that a hook returns
   * a primitive or already-frozen value, which can allow more precise memoization
   * of callers.
   */
  valueKind: z.nativeEnum(ValueKind),

  /*
   * Specifies whether hook arguments may be aliased by other arguments or by the
   * return value of the function. Defaults to false. When enabled, this allows the
   * compiler to avoid memoizing arguments.
   */
  noAlias: z.boolean().default(false),

  /*
   * Specifies whether the hook returns data that is composed of:
   * - undefined
   * - null
   * - boolean
   * - number
   * - string
   * - arrays whose items are also transitiveMixed
   * - objects whose values are also transitiveMixed
   *
   * Many state management and data-fetching APIs return data that meets
   * this criteria since this is JSON + undefined. Forget can compile
   * hooks that return transitively mixed data more optimally because it
   * can make inferences about some method calls (especially array methods
   * like `data.items.map(...)` since these builtin types have few built-in
   * methods.
   */
  transitiveMixedData: z.boolean().default(false),
});

export type Hook = z.infer<typeof HookSchema>;

/*
 * TODO(mofeiZ): User defined global types (with corresponding shapes).
 * User defined global types should have inline ObjectShapes instead of directly
 * using ObjectShapes.ShapeRegistry, as a user-provided ShapeRegistry may be
 * accidentally be not well formed.
 * i.e.
 *   missing required shapes (BuiltInArray for [] and BuiltInObject for {})
 *   missing some recursive Object / Function shapeIds
 */

export const EnvironmentConfigSchema = z.object({
  customHooks: z.map(z.string(), HookSchema).default(new Map()),

  /**
   * A function that, given the name of a module, can optionally return a description
   * of that module's type signature.
   */
  moduleTypeProvider: z.nullable(z.any()).default(null),

  /**
   * A list of functions which the application compiles as macros, where
   * the compiler must ensure they are not compiled to rename the macro or separate the
   * "function" from its argument.
   *
   * For example, Meta has some APIs such as `featureflag("name-of-feature-flag")` which
   * are rewritten by a plugin. Assigning `featureflag` to a temporary would break the
   * plugin since it looks specifically for the name of the function being invoked, not
   * following aliases.
   */
  customMacros: z.nullable(z.array(MacroSchema)).default(null),

  /**
   * Enable a check that resets the memoization cache when the source code of
   * the file changes. This is intended to support hot module reloading (HMR),
   * where the same runtime component instance will be reused across different
   * versions of the component source.
   *
   * When set to
   * - true:  code for HMR support is always generated, regardless of NODE_ENV
   *          or `globalThis.__DEV__`
   * - false: code for HMR support is not generated
   * - null:  (default) code for HMR support is conditionally generated dependent
   *          on `NODE_ENV` and `globalThis.__DEV__` at the time of compilation.
   */
  enableResetCacheOnSourceFileChanges: z.nullable(z.boolean()).default(null),

  /**
   * Enable using information from existing useMemo/useCallback to understand when a value is done
   * being mutated. With this mode enabled, Forget will still discard the actual useMemo/useCallback
   * calls and may memoize slightly differently. However, it will assume that the values produced
   * are not subsequently modified, guaranteeing that the value will be memoized.
   *
   * By preserving guarantees about when values are memoized, this option preserves any existing
   * behavior that depends on referential equality in the original program. Notably, this preserves
   * existing effect behavior (how often effects fire) for effects that rely on referential equality.
   *
   * When disabled, Forget will not only prune useMemo and useCallback calls but also completely ignore
   * them, not using any information from them to guide compilation. Therefore, disabling this flag
   * will produce output that mimics the result from removing all memoization.
   *
   * Our recommendation is to first try running your application with this flag enabled, then attempt
   * to disable this flag and see what changes or breaks. This will mostly likely be effects that
   * depend on referential equality, which can be refactored (TODO guide for this).
   *
   * NOTE: this mode treats freeze as a transitive operation for function expressions. This means
   * that if a useEffect or useCallback references a function value, that function value will be
   * considered frozen, and in turn all of its referenced variables will be considered frozen as well.
   */
  enablePreserveExistingMemoizationGuarantees: z.boolean().default(true),

  /**
   * Validates that all useMemo/useCallback values are also memoized by Forget. This mode can be
   * used with or without @enablePreserveExistingMemoizationGuarantees.
   *
   * With enablePreserveExistingMemoizationGuarantees, this validation enables automatically and
   * verifies that Forget was able to preserve manual memoization semantics under that mode's
   * additional assumptions about the input.
   *
   * With enablePreserveExistingMemoizationGuarantees off, this validation ignores manual memoization
   * when determining program behavior, and only uses information from useMemo/useCallback to check
   * that the memoization was preserved. This can be useful for determining where referential equalities
   * may change under Forget.
   */
  validatePreserveExistingMemoizationGuarantees: z.boolean().default(true),

  /**
   * Validate that dependencies supplied to manual memoization calls are exhaustive.
   */
  validateExhaustiveMemoizationDependencies: z.boolean().default(true),

  /**
   * Validate that dependencies supplied to effect hooks are exhaustive.
   * Can be:
   * - 'off': No validation (default)
   * - 'all': Validate and report both missing and extra dependencies
   * - 'missing-only': Only report missing dependencies
   * - 'extra-only': Only report extra/unnecessary dependencies
   */
  validateExhaustiveEffectDependencies: z
    .enum(['off', 'all', 'missing-only', 'extra-only'])
    .default('off'),

  // 🌲
  enableForest: z.boolean().default(false),

  /**
   * Allows specifying a function that can populate HIR with type information from
   * Flow
   */
  flowTypeProvider: z.nullable(z.any()).default(null),

  /**
   * Enables inference of optional dependency chains. Without this flag
   * a property chain such as `props?.items?.foo` will infer as a dep on
   * just `props`. With this flag enabled, we'll infer that full path as
   * the dependency.
   */
  enableOptionalDependencies: z.boolean().default(true),

  enableNameAnonymousFunctions: z.boolean().default(false),

  /*
   * Enable validation of hooks to partially check that the component honors the rules of hooks.
   * When disabled, the component is assumed to follow the rules (though the Babel plugin looks
   * for suppressions of the lint rule).
   */
  validateHooksUsage: z.boolean().default(true),

  // Validate that ref values (`ref.current`) are not accessed during render.
  validateRefAccessDuringRender: z.boolean().default(true),

  /*
   * Validates that setState is not unconditionally called during render, as it can lead to
   * infinite loops.
   */
  validateNoSetStateInRender: z.boolean().default(true),

  /**
   * When enabled, changes the behavior of validateNoSetStateInRender to recommend
   * using useKeyedState instead of the manual pattern for resetting state.
   */
  enableUseKeyedState: z.boolean().default(false),

  /**
   * Validates that setState is not called synchronously within an effect (useEffect and friends).
   * Scheduling a setState (with an event listener, subscription, etc) is valid.
   */
  validateNoSetStateInEffects: z.boolean().default(false),

  /**
   * Validates that effects are not used to calculate derived data which could instead be computed
   * during render.
   */
  validateNoDerivedComputationsInEffects: z.boolean().default(false),

  /**
   * Experimental: Validates that effects are not used to calculate derived data which could instead be computed
   * during render. Generates a custom error message for each type of violation.
   */
  validateNoDerivedComputationsInEffects_exp: z.boolean().default(false),

  /**
   * Validates against creating JSX within a try block and recommends using an error boundary
   * instead.
   */
  validateNoJSXInTryStatements: z.boolean().default(false),

  /**
   * Validates against dynamically creating components during render.
   */
  validateStaticComponents: z.boolean().default(false),

  /**
   * Validates that there are no capitalized calls other than those allowed by the allowlist.
   * Calls to capitalized functions are often functions that used to be components and may
   * have lingering hook calls, which makes those calls risky to memoize.
   *
   * You can specify a list of capitalized calls to allowlist using this option. React Compiler
   * always includes its known global functions, including common functions like Boolean and String,
   * in this allowlist. You can enable this validation with no additional allowlisted calls by setting
   * this option to the empty array.
   */
  validateNoCapitalizedCalls: z.nullable(z.array(z.string())).default(null),
  validateBlocklistedImports: z.nullable(z.array(z.string())).default(null),

  /**
   * Validates that AST nodes generated during codegen have proper source locations.
   * This is useful for debugging issues with source maps and Istanbul coverage.
   * When enabled, the compiler will error if important source locations are missing in the generated AST.
   */
  validateSourceLocations: z.boolean().default(false),

  /**
   * Validate against impure functions called during render
   */
  validateNoImpureFunctionsInRender: z.boolean().default(false),

  /**
   * Validate against passing mutable functions to hooks
   */
  validateNoFreezingKnownMutableFunctions: z.boolean().default(false),

  /*
   * When enabled, the compiler assumes that hooks follow the Rules of React:
   * - Hooks may memoize computation based on any of their parameters, thus
   *   any arguments to a hook are assumed frozen after calling the hook.
   * - Hooks may memoize the result they return, thus the return value is
   *   assumed frozen.
   */
  enableAssumeHooksFollowRulesOfReact: z.boolean().default(true),

  /**
   * When enabled, the compiler assumes that any values are not subsequently
   * modified after they are captured by a function passed to React. For example,
   * if a value `x` is referenced inside a function expression passed to `useEffect`,
   * then this flag will assume that `x` is not subusequently modified.
   */
  enableTransitivelyFreezeFunctionExpressions: z.boolean().default(true),
  enableEmitHookGuards: ExternalFunctionSchema.nullable().default(null),

  /**
   * Enables function outlinining, where anonymous functions that do not close over
   * local variables can be extracted into top-level helper functions.
   */
  enableFunctionOutlining: z.boolean().default(true),

  /**
   * If enabled, this will outline nested JSX into a separate component.
   *
   * This will enable the compiler to memoize the separate component, giving us
   * the same behavior as compiling _within_ the callback.
   *
   * ```
   * function Component(countries, onDelete) {
   *   const name = useFoo();
   *   return countries.map(() => {
   *     return (
   *       <Foo>
   *         <Bar>{name}</Bar>
   *         <Button onclick={onDelete}>delete</Button>
   *       </Foo>
   *     );
   *   });
   * }
   * ```
   *
   * will be transpiled to:
   *
   * ```
   * function Component(countries, onDelete) {
   *   const name = useFoo();
   *   return countries.map(() => {
   *     return (
   *       <Temp name={name} onDelete={onDelete} />
   *     );
   *   });
   * }
   *
   * function Temp({name, onDelete}) {
   *   return (
   *     <Foo>
   *       <Bar>{name}</Bar>
   *       <Button onclick={onDelete}>delete</Button>
   *     </Foo>
   *   );
   * }
   *
   * Both, `Component` and `Temp` will then be memoized by the compiler.
   *
   * With this change, when `countries` is updated by adding one single value,
   * only the newly added value is re-rendered and not the entire list.
   */
  enableJsxOutlining: z.boolean().default(false),

  /*
   * Enables instrumentation codegen. This emits a dev-mode only call to an
   * instrumentation function, for components and hooks that Forget compiles.
   * For example:
   *   instrumentForget: {
   *     import: {
   *       source: 'react-compiler-runtime',
   *       importSpecifierName: 'useRenderCounter',
   *      }
   *   }
   *
   * produces:
   *   import {useRenderCounter} from 'react-compiler-runtime';
   *
   *   function Component(props) {
   *     if (__DEV__) {
   *        useRenderCounter("Component", "/filepath/filename.js");
   *     }
   *     // ...
   *   }
   *
   */
  enableEmitInstrumentForget: InstrumentationSchema.nullable().default(null),

  // Enable validation of mutable ranges
  assertValidMutableRanges: z.boolean().default(false),

  /**
   * [TESTING ONLY] Throw an unknown exception during compilation to
   * simulate unexpected exceptions e.g. errors from babel functions.
   */
  throwUnknownException__testonly: z.boolean().default(false),

  /**
   * The react native re-animated library uses custom Babel transforms that
   * requires the calls to library API remain unmodified.
   *
   * If this flag is turned on, the React compiler will use custom type
   * definitions for reanimated library to make it's Babel plugin work
   * with the compiler.
   */
  enableCustomTypeDefinitionForReanimated: z.boolean().default(false),

  /**
   * If enabled, this will treat objects named as `ref` or if their names end with the substring `Ref`,
   * and contain a property named `current`, as React refs.
   *
   * ```
   * const ref = useMyRef();
   * const myRef = useMyRef2();
   * useEffect(() => {
   *   ref.current = ...;
   *   myRef.current = ...;
   * })
   * ```
   *
   * Here the variables `ref` and `myRef` will be typed as Refs.
   */
  enableTreatRefLikeIdentifiersAsRefs: z.boolean().default(true),

  /**
   * Treat identifiers as SetState type if both
   * - they are named with a "set-" prefix
   * - they are called somewhere
   */
  enableTreatSetIdentifiersAsStateSetters: z.boolean().default(false),

  /**
   * If enabled, will validate useMemos that don't return any values:
   *
   * Valid:
   *   useMemo(() => foo, [foo]);
   *   useMemo(() => { return foo }, [foo]);
   * Invalid:
   *   useMemo(() => { ... }, [...]);
   */
  validateNoVoidUseMemo: z.boolean().default(true),

  /**
   * When enabled, allows setState calls in effects based on valid patterns involving refs:
   * - Allow setState where the value being set is derived from a ref. This is useful where
   *   state needs to take into account layer information, and a layout effect reads layout
   *   data from a ref and sets state.
   * - Allow conditionally calling setState after manually comparing previous/new values
   *   for changes via a ref. Relying on effect deps is insufficient for non-primitive values,
   *   so a ref is generally required to manually track previous values and compare prev/next
   *   for meaningful changes before setting state.
   */
  enableAllowSetStateFromRefsInEffects: z.boolean().default(true),

  /**
   * When enabled, provides verbose error messages for setState calls within effects,
   * presenting multiple possible fixes to the user/agent since we cannot statically
   * determine which specific use-case applies:
   * 1. Non-local derived data - requires restructuring state ownership
   * 2. Derived event pattern - detecting when a prop changes
   * 3. Force update / external sync - should use useSyncExternalStore
   */
  enableVerboseNoSetStateInEffect: z.boolean().default(false),
});

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

export type PartialEnvironmentConfig = Partial<EnvironmentConfig>;

export type ReactFunctionType = 'Component' | 'Hook' | 'Other';

export function printFunctionType(type: ReactFunctionType): string {
  switch (type) {
    case 'Component': {
      return 'component';
    }
    case 'Hook': {
      return 'hook';
    }
    default: {
      return 'function';
    }
  }
}

export class Environment {
  #globals: GlobalRegistry;
  #shapes: ShapeRegistry;
  #moduleTypes: Map<string, Global | null> = new Map();
  #nextIdentifer: number = 0;
  #nextBlock: number = 0;
  #nextScope: number = 0;
  #scope: BabelScope;
  #outlinedFunctions: Array<{
    fn: HIRFunction;
    type: ReactFunctionType | null;
  }> = [];
  logger: Logger | null;
  filename: string | null;
  code: string | null;
  config: EnvironmentConfig;
  fnType: ReactFunctionType;
  outputMode: CompilerOutputMode;
  programContext: ProgramContext;

  #contextIdentifiers: Set<t.Identifier>;
  #hoistedIdentifiers: Set<t.Identifier>;
  parentFunction: NodePath<t.Function>;

  #flowTypeEnvironment: FlowTypeEnv | null;

  /**
   * Accumulated compilation errors. Passes record errors here instead of
   * throwing, so the pipeline can continue and report all errors at once.
   */
  #errors: CompilerError = new CompilerError();

  constructor(
    scope: BabelScope,
    fnType: ReactFunctionType,
    outputMode: CompilerOutputMode,
    config: EnvironmentConfig,
    contextIdentifiers: Set<t.Identifier>,
    parentFunction: NodePath<t.Function>, // the outermost function being compiled
    logger: Logger | null,
    filename: string | null,
    code: string | null,
    programContext: ProgramContext,
  ) {
    this.#scope = scope;
    this.fnType = fnType;
    this.outputMode = outputMode;
    this.config = config;
    this.filename = filename;
    this.code = code;
    this.logger = logger;
    this.programContext = programContext;
    this.#shapes = new Map(DEFAULT_SHAPES);
    this.#globals = new Map(DEFAULT_GLOBALS);

    for (const [hookName, hook] of this.config.customHooks) {
      CompilerError.invariant(!this.#globals.has(hookName), {
        reason: `[Globals] Found existing definition in global registry for custom hook ${hookName}`,
        loc: GeneratedSource,
      });
      this.#globals.set(
        hookName,
        addHook(this.#shapes, {
          positionalParams: [],
          restParam: hook.effectKind,
          returnType: hook.transitiveMixedData
            ? {kind: 'Object', shapeId: BuiltInMixedReadonlyId}
            : {kind: 'Poly'},
          returnValueKind: hook.valueKind,
          calleeEffect: Effect.Read,
          hookKind: 'Custom',
          noAlias: hook.noAlias,
        }),
      );
    }

    if (config.enableCustomTypeDefinitionForReanimated) {
      const reanimatedModuleType = getReanimatedModuleType(this.#shapes);
      this.#moduleTypes.set(REANIMATED_MODULE_NAME, reanimatedModuleType);
    }

    this.parentFunction = parentFunction;
    this.#contextIdentifiers = contextIdentifiers;
    this.#hoistedIdentifiers = new Set();

    if (config.flowTypeProvider != null) {
      this.#flowTypeEnvironment = new FlowTypeEnv();
      CompilerError.invariant(code != null, {
        reason:
          'Expected Environment to be initialized with source code when a Flow type provider is specified',
        loc: GeneratedSource,
      });
      this.#flowTypeEnvironment.init(this, code);
    } else {
      this.#flowTypeEnvironment = null;
    }
  }

  get typeContext(): FlowTypeEnv {
    CompilerError.invariant(this.#flowTypeEnvironment != null, {
      reason: 'Flow type environment not initialized',
      loc: GeneratedSource,
    });
    return this.#flowTypeEnvironment;
  }

  get enableDropManualMemoization(): boolean {
    switch (this.outputMode) {
      case 'lint': {
        // linting drops to be more compatible with compiler analysis
        return true;
      }
      case 'client':
      case 'ssr': {
        return true;
      }
      default: {
        assertExhaustive(
          this.outputMode,
          `Unexpected output mode '${this.outputMode}'`,
        );
      }
    }
  }

  get enableMemoization(): boolean {
    switch (this.outputMode) {
      case 'client':
      case 'lint': {
        // linting also enables memoization so that we can check if manual memoization is preserved
        return true;
      }
      case 'ssr': {
        return false;
      }
      default: {
        assertExhaustive(
          this.outputMode,
          `Unexpected output mode '${this.outputMode}'`,
        );
      }
    }
  }

  get enableValidations(): boolean {
    switch (this.outputMode) {
      case 'client':
      case 'lint':
      case 'ssr': {
        return true;
      }
      default: {
        assertExhaustive(
          this.outputMode,
          `Unexpected output mode '${this.outputMode}'`,
        );
      }
    }
  }

  get nextIdentifierId(): IdentifierId {
    return makeIdentifierId(this.#nextIdentifer++);
  }

  get nextBlockId(): BlockId {
    return makeBlockId(this.#nextBlock++);
  }

  get nextScopeId(): ScopeId {
    return makeScopeId(this.#nextScope++);
  }

  get scope(): BabelScope {
    return this.#scope;
  }

  logErrors(errors: Result<void, CompilerError>): void {
    if (errors.isOk() || this.logger == null) {
      return;
    }
    for (const error of errors.unwrapErr().details) {
      this.logger.logEvent(this.filename, {
        kind: 'CompileError',
        detail: formatDetailForLogging(error),
        fnLoc: null,
      });
    }
  }

  /**
   * Record a single diagnostic or error detail on this environment.
   * If the error is an Invariant, it is immediately thrown since invariants
   * represent internal bugs that cannot be recovered from.
   * Otherwise, the error is accumulated and optionally logged.
   */
  recordError(error: CompilerDiagnostic | CompilerErrorDetail): void {
    if (error.category === ErrorCategory.Invariant) {
      const compilerError = new CompilerError();
      if (error instanceof CompilerDiagnostic) {
        compilerError.pushDiagnostic(error);
      } else {
        compilerError.pushErrorDetail(error);
      }
      throw compilerError;
    }
    if (error instanceof CompilerDiagnostic) {
      this.#errors.pushDiagnostic(error);
    } else {
      this.#errors.pushErrorDetail(error);
    }
  }

  /**
   * Record all diagnostics from a CompilerError onto this environment.
   */
  recordErrors(error: CompilerError): void {
    for (const detail of error.details) {
      this.recordError(detail);
    }
  }

  /**
   * Returns true if any errors have been recorded during compilation.
   */
  hasErrors(): boolean {
    return this.#errors.hasAnyErrors();
  }

  /**
   * Returns the accumulated CompilerError containing all recorded diagnostics.
   */
  aggregateErrors(): CompilerError {
    return this.#errors;
  }

  isContextIdentifier(node: t.Identifier): boolean {
    return this.#contextIdentifiers.has(node);
  }

  isHoistedIdentifier(node: t.Identifier): boolean {
    return this.#hoistedIdentifiers.has(node);
  }

  generateGloballyUniqueIdentifierName(
    name: string | null,
  ): ValidatedIdentifier {
    const identifierNode = this.#scope.generateUidIdentifier(name ?? undefined);
    return makeIdentifierName(identifierNode.name);
  }

  outlineFunction(fn: HIRFunction, type: ReactFunctionType | null): void {
    this.#outlinedFunctions.push({fn, type});
  }

  getOutlinedFunctions(): Array<{
    fn: HIRFunction;
    type: ReactFunctionType | null;
  }> {
    return this.#outlinedFunctions;
  }

  #resolveModuleType(moduleName: string, loc: SourceLocation): Global | null {
    let moduleType = this.#moduleTypes.get(moduleName);
    if (moduleType === undefined) {
      /*
       * NOTE: Zod doesn't work when specifying a function as a default, so we have to
       * fallback to the default value here
       */
      const moduleTypeProvider =
        this.config.moduleTypeProvider ?? defaultModuleTypeProvider;
      if (moduleTypeProvider == null) {
        return null;
      }
      if (typeof moduleTypeProvider !== 'function') {
        CompilerError.throwInvalidConfig({
          reason: `Expected a function for \`moduleTypeProvider\``,
          loc,
        });
      }
      const unparsedModuleConfig = moduleTypeProvider(moduleName);
      if (unparsedModuleConfig != null) {
        const parsedModuleConfig = TypeSchema.safeParse(unparsedModuleConfig);
        if (!parsedModuleConfig.success) {
          CompilerError.throwInvalidConfig({
            reason: `Could not parse module type, the configured \`moduleTypeProvider\` function returned an invalid module description`,
            description: parsedModuleConfig.error.toString(),
            loc,
          });
        }
        const moduleConfig = parsedModuleConfig.data;
        moduleType = installTypeConfig(
          this.#globals,
          this.#shapes,
          moduleConfig,
          moduleName,
          loc,
        );
      } else {
        moduleType = null;
      }
      this.#moduleTypes.set(moduleName, moduleType);
    }
    return moduleType;
  }

  getGlobalDeclaration(
    binding: NonLocalBinding,
    loc: SourceLocation,
  ): Global | null {
    switch (binding.kind) {
      case 'ModuleLocal': {
        // don't resolve module locals
        return isHookName(binding.name) ? this.#getCustomHookType() : null;
      }
      case 'Global': {
        return (
          this.#globals.get(binding.name) ??
          (isHookName(binding.name) ? this.#getCustomHookType() : null)
        );
      }
      case 'ImportSpecifier': {
        if (this.#isKnownReactModule(binding.module)) {
          /**
           * For `import {imported as name} from "..."` form, we use the `imported`
           * name rather than the local alias. Because we don't have definitions for
           * every React builtin hook yet, we also check to see if the imported name
           * is hook-like (whereas the fall-through below is checking if the aliased
           * name is hook-like)
           */
          return (
            this.#globals.get(binding.imported) ??
            (isHookName(binding.imported) || isHookName(binding.name)
              ? this.#getCustomHookType()
              : null)
          );
        } else {
          const moduleType = this.#resolveModuleType(binding.module, loc);
          if (moduleType !== null) {
            const importedType = this.getPropertyType(
              moduleType,
              binding.imported,
            );
            if (importedType != null) {
              /*
               * Check that hook-like export names are hook types, and non-hook names are non-hook types.
               * The user-assigned alias isn't decidable by the type provider, so we ignore that for the check.
               * Thus we allow `import {fooNonHook as useFoo} from ...` because the name and type both say
               * that it's not a hook.
               */
              const expectHook = isHookName(binding.imported);
              const isHook = getHookKindForType(this, importedType) != null;
              if (expectHook !== isHook) {
                CompilerError.throwInvalidConfig({
                  reason: `Invalid type configuration for module`,
                  description: `Expected type for \`import {${binding.imported}} from '${binding.module}'\` ${expectHook ? 'to be a hook' : 'not to be a hook'} based on the exported name`,
                  loc,
                });
              }
              return importedType;
            }
          }

          /**
           * For modules we don't own, we look at whether the original name or import alias
           * are hook-like. Both of the following are likely hooks so we would return a hook
           * type for both:
           *
           * `import {useHook as foo} ...`
           * `import {foo as useHook} ...`
           */
          return isHookName(binding.imported) || isHookName(binding.name)
            ? this.#getCustomHookType()
            : null;
        }
      }
      case 'ImportDefault':
      case 'ImportNamespace': {
        if (this.#isKnownReactModule(binding.module)) {
          // only resolve imports to modules we know about
          return (
            this.#globals.get(binding.name) ??
            (isHookName(binding.name) ? this.#getCustomHookType() : null)
          );
        } else {
          const moduleType = this.#resolveModuleType(binding.module, loc);
          if (moduleType !== null) {
            let importedType: Type | null = null;
            if (binding.kind === 'ImportDefault') {
              const defaultType = this.getPropertyType(moduleType, 'default');
              if (defaultType !== null) {
                importedType = defaultType;
              }
            } else {
              importedType = moduleType;
            }
            if (importedType !== null) {
              /*
               * Check that the hook-like modules are defined as types, and non hook-like modules are not typed as hooks.
               * So `import Foo from 'useFoo'` is expected to be a hook based on the module name
               */
              const expectHook = isHookName(binding.module);
              const isHook = getHookKindForType(this, importedType) != null;
              if (expectHook !== isHook) {
                CompilerError.throwInvalidConfig({
                  reason: `Invalid type configuration for module`,
                  description: `Expected type for \`import ... from '${binding.module}'\` ${expectHook ? 'to be a hook' : 'not to be a hook'} based on the module name`,
                  loc,
                });
              }
              return importedType;
            }
          }
          return isHookName(binding.name) ? this.#getCustomHookType() : null;
        }
      }
    }
  }

  #isKnownReactModule(moduleName: string): boolean {
    return (
      moduleName.toLowerCase() === 'react' ||
      moduleName.toLowerCase() === 'react-dom'
    );
  }
  static knownReactModules: ReadonlyArray<string> = ['react', 'react-dom'];

  getFallthroughPropertyType(
    receiver: Type,
    _property: Type,
  ): BuiltInType | PolyType | null {
    let shapeId = null;
    if (receiver.kind === 'Object' || receiver.kind === 'Function') {
      shapeId = receiver.shapeId;
    }

    if (shapeId !== null) {
      const shape = this.#shapes.get(shapeId);

      CompilerError.invariant(shape !== undefined, {
        reason: `[HIR] Forget internal error: cannot resolve shape ${shapeId}`,
        loc: GeneratedSource,
      });
      return shape.properties.get('*') ?? null;
    }
    return null;
  }

  getPropertyType(
    receiver: Type,
    property: string | number,
  ): BuiltInType | PolyType | null {
    let shapeId = null;
    if (receiver.kind === 'Object' || receiver.kind === 'Function') {
      shapeId = receiver.shapeId;
    }
    if (shapeId !== null) {
      /*
       * If an object or function has a shapeId, it must have been assigned
       * by Forget (and be present in a builtin or user-defined registry)
       */
      const shape = this.#shapes.get(shapeId);
      CompilerError.invariant(shape !== undefined, {
        reason: `[HIR] Forget internal error: cannot resolve shape ${shapeId}`,
        loc: GeneratedSource,
      });
      if (typeof property === 'string') {
        return (
          shape.properties.get(property) ??
          shape.properties.get('*') ??
          (isHookName(property) ? this.#getCustomHookType() : null)
        );
      } else {
        return shape.properties.get('*') ?? null;
      }
    } else if (typeof property === 'string' && isHookName(property)) {
      return this.#getCustomHookType();
    }
    return null;
  }

  getFunctionSignature(type: FunctionType): FunctionSignature | null {
    const {shapeId} = type;
    if (shapeId !== null) {
      const shape = this.#shapes.get(shapeId);
      CompilerError.invariant(shape !== undefined, {
        reason: `[HIR] Forget internal error: cannot resolve shape ${shapeId}`,
        loc: GeneratedSource,
      });
      return shape.functionType;
    }
    return null;
  }

  addHoistedIdentifier(node: t.Identifier): void {
    this.#contextIdentifiers.add(node);
    this.#hoistedIdentifiers.add(node);
  }

  #getCustomHookType(): Global {
    if (this.config.enableAssumeHooksFollowRulesOfReact) {
      return DefaultNonmutatingHook;
    } else {
      return DefaultMutatingHook;
    }
  }
}

const REANIMATED_MODULE_NAME = 'react-native-reanimated';

// From https://github.com/facebook/react/blob/main/packages/eslint-plugin-react-hooks/src/RulesOfHooks.js#LL18C1-L23C2
export function isHookName(name: string): boolean {
  return /^use[A-Z0-9]/.test(name);
}

export function parseEnvironmentConfig(
  partialConfig: PartialEnvironmentConfig,
): Result<EnvironmentConfig, ZodError<PartialEnvironmentConfig>> {
  const config = EnvironmentConfigSchema.safeParse(partialConfig);
  if (config.success) {
    return Ok(config.data);
  } else {
    return Err(config.error);
  }
}

export function validateEnvironmentConfig(
  partialConfig: PartialEnvironmentConfig,
): EnvironmentConfig {
  const config = EnvironmentConfigSchema.safeParse(partialConfig);
  if (config.success) {
    return config.data;
  }

  CompilerError.throwInvalidConfig({
    reason:
      'Could not validate environment config. Update React Compiler config to fix the error',
    description: `${fromZodError(config.error)}`,
    loc: null,
    suggestions: null,
  });
}

export function tryParseExternalFunction(
  maybeExternalFunction: any,
): ExternalFunction {
  const externalFunction = ExternalFunctionSchema.safeParse(
    maybeExternalFunction,
  );
  if (externalFunction.success) {
    return externalFunction.data;
  }

  CompilerError.throwInvalidConfig({
    reason:
      'Could not parse external function. Update React Compiler config to fix the error',
    description: `${fromZodError(externalFunction.error)}`,
    loc: null,
    suggestions: null,
  });
}

export const DEFAULT_EXPORT = 'default';
