/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import prettyFormat from 'pretty-format';
import {
  CompilerDiagnostic,
  CompilerError,
  CompilerSuggestionOperation,
  Effect,
  SourceLocation,
} from '..';
import {CompilerSuggestion, ErrorCategory} from '../CompilerError';
import {
  areEqualPaths,
  BlockId,
  DependencyPath,
  FinishMemoize,
  GeneratedSource,
  HIRFunction,
  Identifier,
  IdentifierId,
  InstructionKind,
  isEffectEventFunctionType,
  isPrimitiveType,
  isStableType,
  isSubPath,
  isSubPathIgnoringOptionals,
  isUseEffectHookType,
  isUseInsertionEffectHookType,
  isUseLayoutEffectHookType,
  isUseRefType,
  LoadGlobal,
  ManualMemoDependency,
  Place,
  StartMemoize,
} from '../HIR';
import {
  eachInstructionLValue,
  eachInstructionValueLValue,
  eachInstructionValueOperand,
  eachTerminalOperand,
} from '../HIR/visitors';
import {retainWhere} from '../Utils/utils';

const DEBUG = false;

/**
 * Validates that existing manual memoization is exhaustive and does not
 * have extraneous dependencies. The goal of the validation is to ensure
 * that auto-memoization will not substantially change the behavior of
 * the program:
 * - If the manual dependencies were non-exhaustive (missing important deps)
 *   then auto-memoization will include those dependencies, and cause the
 *   value to update *more* frequently.
 * - If the manual dependencies had extraneous deps, then auto memoization
 *   will remove them and cause the value to update *less* frequently.
 *
 * The implementation compares the manual dependencies against the values
 * actually used within the memoization function
 * - For each value V referenced in the memo function, either:
 *   - If the value is non-reactive *and* a known stable type, then the
 *     value may optionally be specified as an exact dependency.
 *   - Otherwise, report an error unless there is a manual dependency that will
 *     invalidate whenever V invalidates. If `x.y.z` is referenced, there must
 *     be a manual dependency for `x.y.z`, `x.y`, or `x`. Note that we assume
 *     no interior mutability, ie we assume that any changes to inner paths must
 *     always cause the other path to change as well.
 * - Any dependencies that do not correspond to a value referenced in the memo
 *   function are considered extraneous and throw an error
 *
 * ## TODO: Invalid, Complex Deps
 *
 * Handle cases where the user deps were not simple identifiers + property chains.
 * We try to detect this in ValidateUseMemo but we miss some cases. The problem
 * is that invalid forms can be value blocks or function calls that don't get
 * removed by DCE, leaving a structure like:
 *
 * StartMemoize
 * t0 = <value to memoize>
 * ...non-DCE'd code for manual deps...
 * FinishMemoize decl=t0
 *
 * When we go to compute the dependencies, we then think that the user's manual dep
 * logic is part of what the memo computation logic.
 */
export function validateExhaustiveDependencies(fn: HIRFunction): void {
  const env = fn.env;
  const reactive = collectReactiveIdentifiersHIR(fn);

  const temporaries: Map<IdentifierId, Temporary> = new Map();
  for (const param of fn.params) {
    const place = param.kind === 'Identifier' ? param : param.place;
    temporaries.set(place.identifier.id, {
      kind: 'Local',
      identifier: place.identifier,
      path: [],
      context: false,
      loc: place.loc,
    });
  }
  let startMemo: StartMemoize | null = null;

  function onStartMemoize(
    value: StartMemoize,
    dependencies: Set<InferredDependency>,
    locals: Set<IdentifierId>,
  ): void {
    CompilerError.invariant(startMemo == null, {
      reason: 'Unexpected nested memo calls',
      loc: value.loc,
    });
    startMemo = value;
    dependencies.clear();
    locals.clear();
  }
  function onFinishMemoize(
    value: FinishMemoize,
    dependencies: Set<InferredDependency>,
    locals: Set<IdentifierId>,
  ): void {
    CompilerError.invariant(
      startMemo != null && startMemo.manualMemoId === value.manualMemoId,
      {
        reason: 'Found FinishMemoize without corresponding StartMemoize',
        loc: value.loc,
      },
    );
    if (env.config.validateExhaustiveMemoizationDependencies) {
      visitCandidateDependency(value.decl, temporaries, dependencies, locals);
      const inferred: Array<InferredDependency> = Array.from(dependencies);

      const diagnostic = validateDependencies(
        inferred,
        startMemo.deps ?? [],
        reactive,
        startMemo.depsLoc,
        ErrorCategory.MemoDependencies,
        'all',
      );
      if (diagnostic != null) {
        fn.env.recordError(diagnostic);
        startMemo.hasInvalidDeps = true;
      }
    }

    dependencies.clear();
    locals.clear();
    startMemo = null;
  }

  collectDependencies(
    fn,
    temporaries,
    {
      onStartMemoize,
      onFinishMemoize,
      onEffect: (inferred, manual, manualMemoLoc) => {
        if (env.config.validateExhaustiveEffectDependencies === 'off') {
          return;
        }
        if (DEBUG) {
          console.log(Array.from(inferred, printInferredDependency));
          console.log(Array.from(manual, printInferredDependency));
        }
        const manualDeps: Array<ManualMemoDependency> = [];
        for (const dep of manual) {
          if (dep.kind === 'Local') {
            manualDeps.push({
              root: {
                kind: 'NamedLocal',
                constant: false,
                value: {
                  effect: Effect.Read,
                  identifier: dep.identifier,
                  kind: 'Identifier',
                  loc: dep.loc,
                  reactive: reactive.has(dep.identifier.id),
                },
              },
              path: dep.path,
              loc: dep.loc,
            });
          } else {
            manualDeps.push({
              root: {
                kind: 'Global',
                identifierName: dep.binding.name,
              },
              path: [],
              loc: GeneratedSource,
            });
          }
        }
        const effectReportMode =
          typeof env.config.validateExhaustiveEffectDependencies === 'string'
            ? env.config.validateExhaustiveEffectDependencies
            : 'all';
        const diagnostic = validateDependencies(
          Array.from(inferred),
          manualDeps,
          reactive,
          manualMemoLoc,
          ErrorCategory.EffectExhaustiveDependencies,
          effectReportMode,
        );
        if (diagnostic != null) {
          fn.env.recordError(diagnostic);
        }
      },
    },
    false, // isFunctionExpression
  );
}

function validateDependencies(
  inferred: Array<InferredDependency>,
  manualDependencies: Array<ManualMemoDependency>,
  reactive: Set<IdentifierId>,
  manualMemoLoc: SourceLocation | null,
  category:
    | ErrorCategory.MemoDependencies
    | ErrorCategory.EffectExhaustiveDependencies,
  exhaustiveDepsReportMode: 'all' | 'missing-only' | 'extra-only',
): CompilerDiagnostic | null {
  // Sort dependencies by name and path, with shorter/non-optional paths first
  inferred.sort((a, b) => {
    if (a.kind === 'Global' && b.kind == 'Global') {
      return a.binding.name.localeCompare(b.binding.name);
    } else if (a.kind == 'Local' && b.kind == 'Local') {
      CompilerError.invariant(
        a.identifier.name != null &&
          a.identifier.name.kind === 'named' &&
          b.identifier.name != null &&
          b.identifier.name.kind === 'named',
        {
          reason: 'Expected dependencies to be named variables',
          loc: a.loc,
        },
      );
      if (a.identifier.id !== b.identifier.id) {
        return a.identifier.name.value.localeCompare(b.identifier.name.value);
      }
      if (a.path.length !== b.path.length) {
        // if a's path is shorter this returns a negative, sorting a first
        return a.path.length - b.path.length;
      }
      for (let i = 0; i < a.path.length; i++) {
        const aProperty = a.path[i];
        const bProperty = b.path[i];
        const aOptional = aProperty.optional ? 0 : 1;
        const bOptional = bProperty.optional ? 0 : 1;
        if (aOptional !== bOptional) {
          // sort non-optionals first
          return aOptional - bOptional;
        } else if (aProperty.property !== bProperty.property) {
          return String(aProperty.property).localeCompare(
            String(bProperty.property),
          );
        }
      }
      return 0;
    } else {
      const aName =
        a.kind === 'Global' ? a.binding.name : a.identifier.name?.value;
      const bName =
        b.kind === 'Global' ? b.binding.name : b.identifier.name?.value;
      if (aName != null && bName != null) {
        return aName.localeCompare(bName);
      }
      return 0;
    }
  });
  // remove redundant inferred dependencies
  retainWhere(inferred, (dep, ix) => {
    const match = inferred.findIndex(prevDep => {
      return (
        isEqualTemporary(prevDep, dep) ||
        (prevDep.kind === 'Local' &&
          dep.kind === 'Local' &&
          prevDep.identifier.id === dep.identifier.id &&
          isSubPath(prevDep.path, dep.path))
      );
    });
    // only retain entries that don't have a prior match
    return match === -1 || match >= ix;
  });
  // Validate that all manual dependencies belong there
  if (DEBUG) {
    console.log('manual');
    console.log(
      manualDependencies
        .map(x => '  ' + printManualMemoDependency(x))
        .join('\n'),
    );
    console.log('inferred');
    console.log(
      inferred.map(x => '  ' + printInferredDependency(x)).join('\n'),
    );
  }
  const matched: Set<ManualMemoDependency> = new Set();
  const missing: Array<Extract<InferredDependency, {kind: 'Local'}>> = [];
  const extra: Array<ManualMemoDependency> = [];
  for (const inferredDependency of inferred) {
    if (inferredDependency.kind === 'Global') {
      for (const manualDependency of manualDependencies) {
        if (
          manualDependency.root.kind === 'Global' &&
          manualDependency.root.identifierName ===
            inferredDependency.binding.name
        ) {
          matched.add(manualDependency);
          extra.push(manualDependency);
        }
      }
      continue;
    }
    CompilerError.invariant(inferredDependency.kind === 'Local', {
      reason: 'Unexpected function dependency',
      loc: inferredDependency.loc,
    });
    /**
     * Skip effect event functions as they are not valid dependencies
     */
    if (isEffectEventFunctionType(inferredDependency.identifier)) {
      continue;
    }
    let hasMatchingManualDependency = false;
    for (const manualDependency of manualDependencies) {
      if (
        manualDependency.root.kind === 'NamedLocal' &&
        manualDependency.root.value.identifier.id ===
          inferredDependency.identifier.id &&
        (areEqualPaths(manualDependency.path, inferredDependency.path) ||
          isSubPathIgnoringOptionals(
            manualDependency.path,
            inferredDependency.path,
          ))
      ) {
        hasMatchingManualDependency = true;
        matched.add(manualDependency);
      }
    }
    if (
      hasMatchingManualDependency ||
      isOptionalDependency(inferredDependency, reactive)
    ) {
      continue;
    }

    missing.push(inferredDependency);
  }

  for (const dep of manualDependencies) {
    if (matched.has(dep)) {
      continue;
    }
    if (dep.root.kind === 'NamedLocal' && dep.root.constant) {
      CompilerError.invariant(
        !dep.root.value.reactive && isPrimitiveType(dep.root.value.identifier),
        {
          reason: 'Expected constant-folded dependency to be non-reactive',
          loc: dep.root.value.loc,
        },
      );
      /*
       * Constant primitives can get constant-folded, which means we won't
       * see a LoadLocal for the value within the memo function.
       */
      continue;
    }
    extra.push(dep);
  }

  // Filter based on report mode
  const filteredMissing =
    exhaustiveDepsReportMode === 'extra-only' ? [] : missing;
  const filteredExtra =
    exhaustiveDepsReportMode === 'missing-only' ? [] : extra;

  if (filteredMissing.length !== 0 || filteredExtra.length !== 0) {
    let suggestion: CompilerSuggestion | null = null;
    if (
      manualMemoLoc != null &&
      typeof manualMemoLoc !== 'symbol' &&
      manualMemoLoc.start.index != null &&
      manualMemoLoc.end.index != null
    ) {
      suggestion = {
        description: 'Update dependencies',
        range: [manualMemoLoc.start.index, manualMemoLoc.end.index],
        op: CompilerSuggestionOperation.Replace,
        text: `[${inferred
          .filter(
            dep =>
              dep.kind === 'Local' &&
              !isOptionalDependency(dep, reactive) &&
              !isEffectEventFunctionType(dep.identifier),
          )
          .map(printInferredDependency)
          .join(', ')}]`,
      };
    }
    const diagnostic = createDiagnostic(
      category,
      filteredMissing,
      filteredExtra,
      suggestion,
    );
    for (const dep of filteredMissing) {
      let reactiveStableValueHint = '';
      if (isStableType(dep.identifier)) {
        reactiveStableValueHint =
          '. Refs, setState functions, and other "stable" values generally do not need to be added ' +
          'as dependencies, but this variable may change over time to point to different values';
      }
      diagnostic.withDetails({
        kind: 'error',
        message: `Missing dependency \`${printInferredDependency(dep)}\`${reactiveStableValueHint}`,
        loc: dep.loc,
      });
    }
    for (const dep of filteredExtra) {
      if (dep.root.kind === 'Global') {
        diagnostic.withDetails({
          kind: 'error',
          message:
            `Unnecessary dependency \`${printManualMemoDependency(dep)}\`. ` +
            'Values declared outside of a component/hook should not be listed as ' +
            'dependencies as the component will not re-render if they change',
          loc: dep.loc ?? manualMemoLoc,
        });
      } else {
        const root = dep.root.value;
        const matchingInferred = inferred.find(
          (
            inferredDep,
          ): inferredDep is Extract<InferredDependency, {kind: 'Local'}> => {
            return (
              inferredDep.kind === 'Local' &&
              inferredDep.identifier.id === root.identifier.id &&
              isSubPathIgnoringOptionals(inferredDep.path, dep.path)
            );
          },
        );
        if (
          matchingInferred != null &&
          isEffectEventFunctionType(matchingInferred.identifier)
        ) {
          diagnostic.withDetails({
            kind: 'error',
            message:
              `Functions returned from \`useEffectEvent\` must not be included in the dependency array. ` +
              `Remove \`${printManualMemoDependency(dep)}\` from the dependencies.`,
            loc: dep.loc ?? manualMemoLoc,
          });
        } else if (
          matchingInferred != null &&
          !isOptionalDependency(matchingInferred, reactive)
        ) {
          diagnostic.withDetails({
            kind: 'error',
            message:
              `Overly precise dependency \`${printManualMemoDependency(dep)}\`, ` +
              `use \`${printInferredDependency(matchingInferred)}\` instead`,
            loc: dep.loc ?? manualMemoLoc,
          });
        } else {
          /**
           * Else this dependency doesn't correspond to anything referenced in the memo function,
           * or is an optional dependency so we don't want to suggest adding it
           */
          diagnostic.withDetails({
            kind: 'error',
            message: `Unnecessary dependency \`${printManualMemoDependency(dep)}\``,
            loc: dep.loc ?? manualMemoLoc,
          });
        }
      }
    }
    if (suggestion != null) {
      diagnostic.withDetails({
        kind: 'hint',
        message: `Inferred dependencies: \`${suggestion.text}\``,
      });
    }
    return diagnostic;
  }
  return null;
}

function addDependency(
  dep: Temporary,
  dependencies: Set<InferredDependency>,
  locals: Set<IdentifierId>,
): void {
  if (dep.kind === 'Aggregate') {
    for (const x of dep.dependencies) {
      addDependency(x, dependencies, locals);
    }
  } else if (dep.kind === 'Global') {
    dependencies.add(dep);
  } else if (!locals.has(dep.identifier.id)) {
    dependencies.add(dep);
  }
}

function visitCandidateDependency(
  place: Place,
  temporaries: Map<IdentifierId, Temporary>,
  dependencies: Set<InferredDependency>,
  locals: Set<IdentifierId>,
): void {
  const dep = temporaries.get(place.identifier.id);
  if (dep != null) {
    addDependency(dep, dependencies, locals);
  }
}

/**
 * This function determines the dependencies of the given function relative to
 * its external context. Dependencies are collected eagerly, the first time an
 * external variable is referenced, as opposed to trying to delay or aggregate
 * calculation of dependencies until they are later "used".
 *
 * For example, in
 *
 * ```
 * function f() {
 *   let x = y; // we record a dependency on `y` here
 *   ...
 *   use(x); // as opposed to trying to delay that dependency until here
 * }
 * ```
 *
 * That said, LoadLocal/LoadContext does not immediately take a dependency,
 * we store the dependency in a temporary and set it as used when that temporary
 * is referenced as an operand.
 *
 * As we proceed through the function we track local variables that it creates
 * and don't consider later references to these variables as dependencies.
 *
 * For function expressions we first collect the function's dependencies by
 * calling this function recursively, _without_ taking into account whether
 * the "external" variables it accesses are actually external or just locals
 * in the parent. We then prune any locals and immediately consider any
 * remaining externals that it accesses as a dependency:
 *
 * ```
 * function Component() {
 *   const local = ...;
 *   const f = () => { return [external, local] };
 * }
 * ```
 *
 * Here we calculate `f` as having dependencies `external, `local` and save
 * this into `temporaries`. We then also immediately take these as dependencies
 * at the Component scope, at which point we filter out `local` as a local variable,
 * leaving just a dependency on `external`.
 *
 * When calling this function on a top-level component or hook, the collected dependencies
 * will only contain the globals that it accesses which isn't useful. Instead, passing
 * onStartMemoize/onFinishMemoize callbacks allows looking at the dependencies within
 * blocks of manual memoization.
 */
function collectDependencies(
  fn: HIRFunction,
  temporaries: Map<IdentifierId, Temporary>,
  callbacks: {
    onStartMemoize: (
      startMemo: StartMemoize,
      dependencies: Set<InferredDependency>,
      locals: Set<IdentifierId>,
    ) => void;
    onFinishMemoize: (
      finishMemo: FinishMemoize,
      dependencies: Set<InferredDependency>,
      locals: Set<IdentifierId>,
    ) => void;
    onEffect: (
      inferred: Set<InferredDependency>,
      manual: Set<InferredDependency>,
      manualMemoLoc: SourceLocation | null,
    ) => void;
  } | null,
  isFunctionExpression: boolean,
): Extract<Temporary, {kind: 'Aggregate'}> {
  const optionals = findOptionalPlaces(fn);
  if (DEBUG) {
    console.log(prettyFormat(optionals));
  }
  const locals: Set<IdentifierId> = new Set();
  if (isFunctionExpression) {
    for (const param of fn.params) {
      const place = param.kind === 'Identifier' ? param : param.place;
      locals.add(place.identifier.id);
    }
  }

  const dependencies: Set<InferredDependency> = new Set();
  function visit(place: Place): void {
    visitCandidateDependency(place, temporaries, dependencies, locals);
  }
  for (const block of fn.body.blocks.values()) {
    for (const phi of block.phis) {
      const deps: Array<InferredDependency> = [];
      for (const operand of phi.operands.values()) {
        const dep = temporaries.get(operand.identifier.id);
        if (dep == null) {
          continue;
        }
        if (dep.kind === 'Aggregate') {
          deps.push(...dep.dependencies);
        } else {
          deps.push(dep);
        }
      }
      if (deps.length === 0) {
        continue;
      } else if (deps.length === 1) {
        temporaries.set(phi.place.identifier.id, deps[0]!);
      } else {
        temporaries.set(phi.place.identifier.id, {
          kind: 'Aggregate',
          dependencies: new Set(deps),
        });
      }
    }

    for (const instr of block.instructions) {
      const {lvalue, value} = instr;
      switch (value.kind) {
        case 'LoadGlobal': {
          temporaries.set(lvalue.identifier.id, {
            kind: 'Global',
            binding: value.binding,
          });
          break;
        }
        case 'LoadContext':
        case 'LoadLocal': {
          const temp = temporaries.get(value.place.identifier.id);
          if (temp != null) {
            if (temp.kind === 'Local') {
              const local: Temporary = {...temp, loc: value.place.loc};
              temporaries.set(lvalue.identifier.id, local);
            } else {
              temporaries.set(lvalue.identifier.id, temp);
            }
            if (locals.has(value.place.identifier.id)) {
              locals.add(lvalue.identifier.id);
            }
          }
          break;
        }
        case 'DeclareLocal': {
          const local: Temporary = {
            kind: 'Local',
            identifier: value.lvalue.place.identifier,
            path: [],
            context: false,
            loc: value.lvalue.place.loc,
          };
          temporaries.set(value.lvalue.place.identifier.id, local);
          locals.add(value.lvalue.place.identifier.id);
          break;
        }
        case 'StoreLocal': {
          if (value.lvalue.place.identifier.name == null) {
            const temp = temporaries.get(value.value.identifier.id);
            if (temp != null) {
              temporaries.set(value.lvalue.place.identifier.id, temp);
            }
            break;
          }
          visit(value.value);
          if (value.lvalue.kind !== InstructionKind.Reassign) {
            const local: Temporary = {
              kind: 'Local',
              identifier: value.lvalue.place.identifier,
              path: [],
              context: false,
              loc: value.lvalue.place.loc,
            };
            temporaries.set(value.lvalue.place.identifier.id, local);
            locals.add(value.lvalue.place.identifier.id);
          }
          break;
        }
        case 'DeclareContext': {
          const local: Temporary = {
            kind: 'Local',
            identifier: value.lvalue.place.identifier,
            path: [],
            context: true,
            loc: value.lvalue.place.loc,
          };
          temporaries.set(value.lvalue.place.identifier.id, local);
          break;
        }
        case 'StoreContext': {
          visit(value.value);
          if (value.lvalue.kind !== InstructionKind.Reassign) {
            const local: Temporary = {
              kind: 'Local',
              identifier: value.lvalue.place.identifier,
              path: [],
              context: true,
              loc: value.lvalue.place.loc,
            };
            temporaries.set(value.lvalue.place.identifier.id, local);
            locals.add(value.lvalue.place.identifier.id);
          }
          break;
        }
        case 'Destructure': {
          visit(value.value);
          if (value.lvalue.kind !== InstructionKind.Reassign) {
            for (const lvalue of eachInstructionValueLValue(value)) {
              const local: Temporary = {
                kind: 'Local',
                identifier: lvalue.identifier,
                path: [],
                context: false,
                loc: lvalue.loc,
              };
              temporaries.set(lvalue.identifier.id, local);
              locals.add(lvalue.identifier.id);
            }
          }
          break;
        }
        case 'PropertyLoad': {
          if (
            typeof value.property === 'number' ||
            (isUseRefType(value.object.identifier) &&
              value.property === 'current')
          ) {
            visit(value.object);
            break;
          }
          const object = temporaries.get(value.object.identifier.id);
          if (object != null && object.kind === 'Local') {
            const optional = optionals.get(value.object.identifier.id) ?? false;
            const local: Temporary = {
              kind: 'Local',
              identifier: object.identifier,
              context: object.context,
              path: [
                ...object.path,
                {
                  optional,
                  property: value.property,
                  loc: value.loc,
                },
              ],
              loc: value.loc,
            };
            temporaries.set(lvalue.identifier.id, local);
          }
          break;
        }
        case 'FunctionExpression':
        case 'ObjectMethod': {
          const functionDeps = collectDependencies(
            value.loweredFunc.func,
            temporaries,
            null,
            true, // isFunctionExpression
          );
          temporaries.set(lvalue.identifier.id, functionDeps);
          addDependency(functionDeps, dependencies, locals);
          break;
        }
        case 'StartMemoize': {
          const onStartMemoize = callbacks?.onStartMemoize;
          if (onStartMemoize != null) {
            onStartMemoize(value, dependencies, locals);
          }
          break;
        }
        case 'FinishMemoize': {
          const onFinishMemoize = callbacks?.onFinishMemoize;
          if (onFinishMemoize != null) {
            onFinishMemoize(value, dependencies, locals);
          }
          break;
        }
        case 'ArrayExpression': {
          const arrayDeps: Set<InferredDependency> = new Set();
          for (const item of value.elements) {
            if (item.kind === 'Hole') {
              continue;
            }
            const place = item.kind === 'Identifier' ? item : item.place;
            // Visit with alternative deps/locals to record manual dependencies
            visitCandidateDependency(place, temporaries, arrayDeps, new Set());
            // Visit normally to propagate inferred dependencies upward
            visit(place);
          }
          temporaries.set(lvalue.identifier.id, {
            kind: 'Aggregate',
            dependencies: arrayDeps,
            loc: value.loc,
          });
          break;
        }
        case 'CallExpression':
        case 'MethodCall': {
          const receiver =
            value.kind === 'CallExpression' ? value.callee : value.property;

          const onEffect = callbacks?.onEffect;
          if (onEffect != null && isEffectHook(receiver.identifier)) {
            const [fn, deps] = value.args;
            if (fn?.kind === 'Identifier' && deps?.kind === 'Identifier') {
              const fnDeps = temporaries.get(fn.identifier.id);
              const manualDeps = temporaries.get(deps.identifier.id);
              if (
                fnDeps?.kind === 'Aggregate' &&
                manualDeps?.kind === 'Aggregate'
              ) {
                onEffect(
                  fnDeps.dependencies,
                  manualDeps.dependencies,
                  manualDeps.loc ?? null,
                );
              }
            }
          }

          // Ignore the method itself
          for (const operand of eachInstructionValueOperand(value)) {
            if (
              value.kind === 'MethodCall' &&
              operand.identifier.id === value.property.identifier.id
            ) {
              continue;
            }
            visit(operand);
          }
          break;
        }
        default: {
          for (const operand of eachInstructionValueOperand(value)) {
            visit(operand);
          }
          for (const lvalue of eachInstructionLValue(instr)) {
            locals.add(lvalue.identifier.id);
          }
        }
      }
    }
    for (const operand of eachTerminalOperand(block.terminal)) {
      if (optionals.has(operand.identifier.id)) {
        continue;
      }
      visit(operand);
    }
  }
  return {kind: 'Aggregate', dependencies};
}

function printInferredDependency(dep: InferredDependency): string {
  switch (dep.kind) {
    case 'Global': {
      return dep.binding.name;
    }
    case 'Local': {
      CompilerError.invariant(
        dep.identifier.name != null && dep.identifier.name.kind === 'named',
        {
          reason: 'Expected dependencies to be named variables',
          loc: dep.loc,
        },
      );
      return `${dep.identifier.name.value}${dep.path.map(p => (p.optional ? '?' : '') + '.' + p.property).join('')}`;
    }
  }
}

function printManualMemoDependency(dep: ManualMemoDependency): string {
  let identifierName: string;
  if (dep.root.kind === 'Global') {
    identifierName = dep.root.identifierName;
  } else {
    const name = dep.root.value.identifier.name;
    CompilerError.invariant(name != null && name.kind === 'named', {
      reason: 'Expected manual dependencies to be named variables',
      loc: dep.root.value.loc,
    });
    identifierName = name.value;
  }
  return `${identifierName}${dep.path.map(p => (p.optional ? '?' : '') + '.' + p.property).join('')}`;
}

function isEqualTemporary(a: Temporary, b: Temporary): boolean {
  switch (a.kind) {
    case 'Aggregate': {
      return false;
    }
    case 'Global': {
      return b.kind === 'Global' && a.binding.name === b.binding.name;
    }
    case 'Local': {
      return (
        b.kind === 'Local' &&
        a.identifier.id === b.identifier.id &&
        areEqualPaths(a.path, b.path)
      );
    }
  }
}

type Temporary =
  | {kind: 'Global'; binding: LoadGlobal['binding']}
  | {
      kind: 'Local';
      identifier: Identifier;
      path: DependencyPath;
      context: boolean;
      loc: SourceLocation;
    }
  | {
      kind: 'Aggregate';
      dependencies: Set<InferredDependency>;
      loc?: SourceLocation;
    };
type InferredDependency = Extract<Temporary, {kind: 'Local' | 'Global'}>;

function collectReactiveIdentifiersHIR(fn: HIRFunction): Set<IdentifierId> {
  const reactive = new Set<IdentifierId>();
  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      for (const lvalue of eachInstructionLValue(instr)) {
        if (lvalue.reactive) {
          reactive.add(lvalue.identifier.id);
        }
      }
      for (const operand of eachInstructionValueOperand(instr.value)) {
        if (operand.reactive) {
          reactive.add(operand.identifier.id);
        }
      }
    }
    for (const operand of eachTerminalOperand(block.terminal)) {
      if (operand.reactive) {
        reactive.add(operand.identifier.id);
      }
    }
  }
  return reactive;
}

export function findOptionalPlaces(
  fn: HIRFunction,
): Map<IdentifierId, boolean> {
  const optionals = new Map<IdentifierId, boolean>();
  const visited: Set<BlockId> = new Set();
  for (const [, block] of fn.body.blocks) {
    if (visited.has(block.id)) {
      continue;
    }
    if (block.terminal.kind === 'optional') {
      visited.add(block.id);
      const optionalTerminal = block.terminal;
      let testBlock = fn.body.blocks.get(block.terminal.test)!;
      const queue: Array<boolean | null> = [block.terminal.optional];
      loop: while (true) {
        visited.add(testBlock.id);
        const terminal = testBlock.terminal;
        switch (terminal.kind) {
          case 'branch': {
            const isOptional = queue.pop();
            CompilerError.invariant(isOptional !== undefined, {
              reason:
                'Expected an optional value for each optional test condition',
              loc: terminal.test.loc,
            });
            if (isOptional != null) {
              optionals.set(terminal.test.identifier.id, isOptional);
            }
            if (terminal.fallthrough === optionalTerminal.fallthrough) {
              // found it
              const consequent = fn.body.blocks.get(terminal.consequent)!;
              const last = consequent.instructions.at(-1);
              if (last !== undefined && last.value.kind === 'StoreLocal') {
                if (isOptional != null) {
                  optionals.set(last.value.value.identifier.id, isOptional);
                }
              }
              break loop;
            } else {
              testBlock = fn.body.blocks.get(terminal.fallthrough)!;
            }
            break;
          }
          case 'optional': {
            queue.push(terminal.optional);
            testBlock = fn.body.blocks.get(terminal.test)!;
            break;
          }
          case 'logical':
          case 'ternary': {
            queue.push(null);
            testBlock = fn.body.blocks.get(terminal.test)!;
            break;
          }

          case 'sequence': {
            // Do we need sequence?? In any case, don't push to queue bc there is no corresponding branch terminal
            testBlock = fn.body.blocks.get(terminal.block)!;
            break;
          }
          case 'maybe-throw': {
            testBlock = fn.body.blocks.get(terminal.continuation)!;
            break;
          }
          default: {
            CompilerError.invariant(false, {
              reason: `Unexpected terminal in optional`,
              message: `Unexpected ${terminal.kind} in optional`,
              loc: terminal.loc,
            });
          }
        }
      }
      CompilerError.invariant(queue.length === 0, {
        reason:
          'Expected a matching number of conditional blocks and branch points',
        loc: block.terminal.loc,
      });
    }
  }
  return optionals;
}

function isOptionalDependency(
  inferredDependency: Extract<InferredDependency, {kind: 'Local'}>,
  reactive: Set<IdentifierId>,
): boolean {
  return (
    !reactive.has(inferredDependency.identifier.id) &&
    (isStableType(inferredDependency.identifier) ||
      isPrimitiveType(inferredDependency.identifier))
  );
}

function createDiagnostic(
  category:
    | ErrorCategory.MemoDependencies
    | ErrorCategory.EffectExhaustiveDependencies,
  missing: Array<InferredDependency>,
  extra: Array<ManualMemoDependency>,
  suggestion: CompilerSuggestion | null,
): CompilerDiagnostic {
  let reason: string;
  let description: string;

  function joinMissingExtraDetail(
    missingString: string,
    extraString: string,
    joinStr: string,
  ): string {
    return [
      missing.length !== 0 ? missingString : null,
      extra.length !== 0 ? extraString : null,
    ]
      .filter(Boolean)
      .join(joinStr);
  }

  switch (category) {
    case ErrorCategory.MemoDependencies: {
      reason = `Found ${joinMissingExtraDetail('missing', 'extra', '/')} memoization dependencies`;
      description = joinMissingExtraDetail(
        'Missing dependencies can cause a value to update less often than it should, resulting in stale UI',
        'Extra dependencies can cause a value to update more often than it should, resulting in performance' +
          ' problems such as excessive renders or effects firing too often',
        '. ',
      );
      break;
    }
    case ErrorCategory.EffectExhaustiveDependencies: {
      reason = `Found ${joinMissingExtraDetail('missing', 'extra', '/')} effect dependencies`;
      description = joinMissingExtraDetail(
        'Missing dependencies can cause an effect to fire less often than it should',
        'Extra dependencies can cause an effect to fire more often than it should, resulting' +
          ' in performance problems such as excessive renders and side effects',
        '. ',
      );
      break;
    }
    default: {
      CompilerError.invariant(false, {
        reason: `Unexpected error category: ${category}`,
        loc: GeneratedSource,
      });
    }
  }

  return CompilerDiagnostic.create({
    category,
    reason,
    description,
    suggestions: suggestion != null ? [suggestion] : null,
  });
}

export function isEffectHook(identifier: Identifier): boolean {
  return (
    isUseEffectHookType(identifier) ||
    isUseLayoutEffectHookType(identifier) ||
    isUseInsertionEffectHookType(identifier)
  );
}
