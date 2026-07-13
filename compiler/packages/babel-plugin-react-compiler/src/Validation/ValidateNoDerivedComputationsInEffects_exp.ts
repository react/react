/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Result} from '../Utils/Result';
import {CompilerDiagnostic, CompilerError, Effect} from '..';
import {ErrorCategory} from '../CompilerError';
import {
  BlockId,
  FunctionExpression,
  HIRFunction,
  IdentifierId,
  isSetStateType,
  isUseEffectHookType,
  Place,
  CallExpression,
  Instruction,
  isUseStateType,
  BasicBlock,
  isUseRefType,
  SourceLocation,
  ArrayExpression,
} from '../HIR';
import {eachInstructionLValue, eachInstructionOperand} from '../HIR/visitors';
import {isMutable} from '../ReactiveScopes/InferReactiveScopeVariables';
import {assertExhaustive} from '../Utils/utils';

type TypeOfValue = 'ignored' | 'fromProps' | 'fromState' | 'fromPropsAndState';

type DerivationMetadata = {
  typeOfValue: TypeOfValue;
  place: Place;
  sourcesIds: Set<IdentifierId>;
  isStateSource: boolean;
};

type EffectMetadata = {
  effect: HIRFunction;
  dependencies: ArrayExpression;
};

type ValidationContext = {
  readonly functions: Map<IdentifierId, FunctionExpression>;
  readonly candidateDependencies: Map<IdentifierId, ArrayExpression>;
  readonly errors: CompilerError;
  readonly derivationCache: DerivationCache;
  readonly effectsCache: Map<IdentifierId, EffectMetadata>;
  readonly setStateLoads: Map<IdentifierId, IdentifierId | null>;
  readonly setStateUsages: Map<IdentifierId, Set<SourceLocation>>;
};

const MAX_FIXPOINT_ITERATIONS = 100;

class DerivationCache {
  hasChanges: boolean = false;
  cache: Map<IdentifierId, DerivationMetadata> = new Map();
  private previousCache: Map<IdentifierId, DerivationMetadata> | null = null;

  takeSnapshot(): void {
    this.previousCache = new Map();
    for (const [key, value] of this.cache.entries()) {
      this.previousCache.set(key, {
        place: value.place,
        sourcesIds: new Set(value.sourcesIds),
        typeOfValue: value.typeOfValue,
        isStateSource: value.isStateSource,
      });
    }
  }

  checkForChanges(): void {
    if (this.previousCache === null) {
      this.hasChanges = true;
      return;
    }

    for (const [key, value] of this.cache.entries()) {
      const previousValue = this.previousCache.get(key);
      if (
        previousValue === undefined ||
        !this.isDerivationEqual(previousValue, value)
      ) {
        this.hasChanges = true;
        return;
      }
    }

    if (this.cache.size !== this.previousCache.size) {
      this.hasChanges = true;
      return;
    }

    this.hasChanges = false;
  }

  snapshot(): boolean {
    const hasChanges = this.hasChanges;
    this.hasChanges = false;
    return hasChanges;
  }

  addDerivationEntry(
    derivedVar: Place,
    sourcesIds: Set<IdentifierId>,
    typeOfValue: TypeOfValue,
    isStateSource: boolean,
  ): void {
    let finalIsSource = isStateSource;
    if (!finalIsSource) {
      for (const sourceId of sourcesIds) {
        const sourceMetadata = this.cache.get(sourceId);
        if (
          sourceMetadata?.isStateSource &&
          sourceMetadata.place.identifier.name?.kind !== 'named'
        ) {
          finalIsSource = true;
          break;
        }
      }
    }

    this.cache.set(derivedVar.identifier.id, {
      place: derivedVar,
      sourcesIds: sourcesIds,
      typeOfValue: typeOfValue ?? 'ignored',
      isStateSource: finalIsSource,
    });
  }

  private isDerivationEqual(
    a: DerivationMetadata,
    b: DerivationMetadata,
  ): boolean {
    if (a.typeOfValue !== b.typeOfValue) {
      return false;
    }
    if (a.sourcesIds.size !== b.sourcesIds.size) {
      return false;
    }
    for (const id of a.sourcesIds) {
      if (!b.sourcesIds.has(id)) {
        return false;
      }
    }
    return true;
  }
}

function isNamedIdentifier(place: Place): place is Place & {
  identifier: {name: NonNullable<Place['identifier']['name']>};
} {
  return (
    place.identifier.name !== null && place.identifier.name.kind === 'named'
  );
}

/**
 * Validates that useEffect is not used for derived computations which could/should
 * be performed in render.
 *
 * See https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state
 *
 * Example:
 *
 * ```
 * // 🔴 Avoid: redundant state and unnecessary Effect
 * const [fullName, setFullName] = useState('');
 * useEffect(() => {
 *   setFullName(firstName + ' ' + lastName);
 * }, [firstName, lastName]);
 * ```
 *
 * Instead use:
 *
 * ```
 * // ✅ Good: calculated during rendering
 * const fullName = firstName + ' ' + lastName;
 * ```
 */
export function validateNoDerivedComputationsInEffects_exp(
  fn: HIRFunction,
): Result<void, CompilerError> {
  const functions: Map<IdentifierId, FunctionExpression> = new Map();
  const candidateDependencies: Map<IdentifierId, ArrayExpression> = new Map();
  const derivationCache = new DerivationCache();
  const errors = new CompilerError();
  const effectsCache: Map<IdentifierId, EffectMetadata> = new Map();

  const setStateLoads: Map<IdentifierId, IdentifierId> = new Map();
  const setStateUsages: Map<IdentifierId, Set<SourceLocation>> = new Map();

  const context: ValidationContext = {
    functions,
    candidateDependencies,
    errors,
    derivationCache,
    effectsCache,
    setStateLoads,
    setStateUsages,
  };

  if (fn.fnType === 'Hook') {
    for (const param of fn.params) {
      if (param.kind === 'Identifier') {
        context.derivationCache.cache.set(param.identifier.id, {
          place: param,
          sourcesIds: new Set(),
          typeOfValue: 'fromProps',
          isStateSource: true,
        });
      }
    }
  } else if (fn.fnType === 'Component') {
    const props = fn.params[0];
    if (props != null && props.kind === 'Identifier') {
      context.derivationCache.cache.set(props.identifier.id, {
        place: props,
        sourcesIds: new Set(),
        typeOfValue: 'fromProps',
        isStateSource: true,
      });
    }
  }

  let isFirstPass = true;
  let iterationCount = 0;
  do {
    context.derivationCache.takeSnapshot();

    for (const block of fn.body.blocks.values()) {
      recordPhiDerivations(block, context);
      for (const instr of block.instructions) {
        recordInstructionDerivations(instr, context, isFirstPass);
      }
    }

    context.derivationCache.checkForChanges();
    isFirstPass = false;
    iterationCount++;
    CompilerError.invariant(iterationCount < MAX_FIXPOINT_ITERATIONS, {
      reason:
        '[ValidateNoDerivedComputationsInEffects] Fixpoint iteration failed to converge.',
      description: `Fixpoint iteration exceeded ${MAX_FIXPOINT_ITERATIONS} iterations while tracking derivations. This suggests a cyclic dependency in the derivation cache.`,
      loc: fn.loc,
    });
  } while (context.derivationCache.snapshot());

  for (const [, effect] of effectsCache) {
    validateEffect(effect.effect, effect.dependencies, context);
  }

  return errors.asResult();
}

function recordPhiDerivations(
  block: BasicBlock,
  context: ValidationContext,
): void {
  for (const phi of block.phis) {
    let typeOfValue: TypeOfValue = 'ignored';
    let sourcesIds: Set<IdentifierId> = new Set();
    for (const operand of phi.operands.values()) {
      const operandMetadata = context.derivationCache.cache.get(
        operand.identifier.id,
      );

      if (operandMetadata === undefined) {
        continue;
      }

      typeOfValue = joinValue(typeOfValue, operandMetadata.typeOfValue);
      sourcesIds.add(operand.identifier.id);
    }

    if (typeOfValue !== 'ignored') {
      context.derivationCache.addDerivationEntry(
        phi.place,
        sourcesIds,
        typeOfValue,
        false,
      );
    }
  }
}

function joinValue(
  lvalueType: TypeOfValue,
  valueType: TypeOfValue,
): TypeOfValue {
  if (lvalueType === 'ignored') return valueType;
  if (valueType === 'ignored') return lvalueType;
  if (lvalueType === valueType) return lvalueType;
  return 'fromPropsAndState';
}

function getRootSetState(
  key: IdentifierId,
  loads: Map<IdentifierId, IdentifierId | null>,
  visited: Set<IdentifierId> = new Set(),
): IdentifierId | null {
  if (visited.has(key)) {
    return null;
  }
  visited.add(key);

  const parentId = loads.get(key);

  if (parentId === undefined) {
    return null;
  }

  if (parentId === null) {
    return key;
  }

  return getRootSetState(parentId, loads, visited);
}

function maybeRecordSetState(
  instr: Instruction,
  loads: Map<IdentifierId, IdentifierId | null>,
  usages: Map<IdentifierId, Set<SourceLocation>>,
): void {
  for (const operand of eachInstructionLValue(instr)) {
    if (
      instr.value.kind === 'LoadLocal' &&
      loads.has(instr.value.place.identifier.id)
    ) {
      loads.set(operand.identifier.id, instr.value.place.identifier.id);
    } else {
      if (isSetStateType(operand.identifier)) {
        // this is a root setState
        loads.set(operand.identifier.id, null);
      }
    }

    const rootSetState = getRootSetState(operand.identifier.id, loads);
    if (rootSetState !== null && usages.get(rootSetState) === undefined) {
      usages.set(rootSetState, new Set([operand.loc]));
    }
  }
}

function recordInstructionDerivations(
  instr: Instruction,
  context: ValidationContext,
  isFirstPass: boolean,
): void {
  maybeRecordSetState(instr, context.setStateLoads, context.setStateUsages);

  let typeOfValue: TypeOfValue = 'ignored';
  let isSource: boolean = false;
  const sources: Set<IdentifierId> = new Set();
  const {lvalue, value} = instr;
  if (value.kind === 'FunctionExpression') {
    context.functions.set(lvalue.identifier.id, value);
    for (const [, block] of value.loweredFunc.func.body.blocks) {
      recordPhiDerivations(block, context);
      for (const instr of block.instructions) {
        recordInstructionDerivations(instr, context, isFirstPass);
      }
    }
  } else if (value.kind === 'CallExpression' || value.kind === 'MethodCall') {
    const callee =
      value.kind === 'CallExpression' ? value.callee : value.property;
    if (
      isUseEffectHookType(callee.identifier) &&
      value.args.length === 2 &&
      value.args[0].kind === 'Identifier' &&
      value.args[1].kind === 'Identifier'
    ) {
      const effectFunction = context.functions.get(value.args[0].identifier.id);
      const deps = context.candidateDependencies.get(
        value.args[1].identifier.id,
      );
      if (effectFunction != null && deps != null) {
        context.effectsCache.set(value.args[0].identifier.id, {
          effect: effectFunction.loweredFunc.func,
          dependencies: deps,
        });
      }
    } else if (isUseStateType(lvalue.identifier)) {
      typeOfValue = 'fromState';
      context.derivationCache.addDerivationEntry(
        lvalue,
        new Set(),
        typeOfValue,
        true,
      );
      return;
    }
  } else if (value.kind === 'ArrayExpression') {
    context.candidateDependencies.set(lvalue.identifier.id, value);
  }

  for (const operand of eachInstructionOperand(instr)) {
    if (context.setStateLoads.has(operand.identifier.id)) {
      const rootSetStateId = getRootSetState(
        operand.identifier.id,
        context.setStateLoads,
      );
      if (rootSetStateId !== null) {
        context.setStateUsages.get(rootSetStateId)?.add(operand.loc);
      }
    }

    const operandMetadata = context.derivationCache.cache.get(
      operand.identifier.id,
    );

    if (operandMetadata === undefined) {
      continue;
    }

    typeOfValue = joinValue(typeOfValue, operandMetadata.typeOfValue);
    sources.add(operand.identifier.id);
  }

  if (typeOfValue === 'ignored') {
    return;
  }

  for (const lvalue of eachInstructionLValue(instr)) {
    context.derivationCache.addDerivationEntry(
      lvalue,
      sources,
      typeOfValue,
      isSource,
    );
  }

  if (value.kind === 'FunctionExpression') {
    /*
     * We don't want to record effect mutations of FunctionExpressions the mutations will happen in the
     * function body and we will record them there.
     */
    return;
  }

  for (const operand of eachInstructionOperand(instr)) {
    switch (operand.effect) {
      case Effect.Capture:
      case Effect.Store:
      case Effect.ConditionallyMutate:
      case Effect.ConditionallyMutateIterator:
      case Effect.Mutate: {
        if (isMutable(instr, operand)) {
          if (context.derivationCache.cache.has(operand.identifier.id)) {
            const operandMetadata = context.derivationCache.cache.get(
              operand.identifier.id,
            );

            if (operandMetadata !== undefined) {
              operandMetadata.typeOfValue = joinValue(
                typeOfValue,
                operandMetadata.typeOfValue,
              );
            }
          } else {
            context.derivationCache.addDerivationEntry(
              operand,
              sources,
              typeOfValue,
              false,
            );
          }
        }
        break;
      }
      case Effect.Freeze:
      case Effect.Read: {
        // no-op
        break;
      }
      case Effect.Unknown: {
        CompilerError.invariant(false, {
          reason: 'Unexpected unknown effect',
          loc: operand.loc,
        });
      }
      default: {
        assertExhaustive(
          operand.effect,
          `Unexpected effect kind \`${operand.effect}\``,
        );
      }
    }
  }
}

type TreeNode = {
  name: string;
  typeOfValue: TypeOfValue;
  isSource: boolean;
  children: Array<TreeNode>;
};

function buildTreeNode(
  sourceId: IdentifierId,
  context: ValidationContext,
  visited: Set<string> = new Set(),
): Array<TreeNode> {
  const sourceMetadata = context.derivationCache.cache.get(sourceId);
  if (!sourceMetadata) {
    return [];
  }

  if (sourceMetadata.isStateSource && isNamedIdentifier(sourceMetadata.place)) {
    return [
      {
        name: sourceMetadata.place.identifier.name.value,
        typeOfValue: sourceMetadata.typeOfValue,
        isSource: sourceMetadata.isStateSource,
        children: [],
      },
    ];
  }

  const children: Array<TreeNode> = [];

  const namedSiblings: Set<string> = new Set();
  for (const childId of sourceMetadata.sourcesIds) {
    CompilerError.invariant(childId !== sourceId, {
      reason:
        'Unexpected self-reference: a value should not have itself as a source',
      loc: sourceMetadata.place.loc,
    });

    const childNodes = buildTreeNode(
      childId,
      context,
      new Set([
        ...visited,
        ...(isNamedIdentifier(sourceMetadata.place)
          ? [sourceMetadata.place.identifier.name.value]
          : []),
      ]),
    );
    if (childNodes) {
      for (const childNode of childNodes) {
        if (!namedSiblings.has(childNode.name)) {
          children.push(childNode);
          namedSiblings.add(childNode.name);
        }
      }
    }
  }

  if (
    isNamedIdentifier(sourceMetadata.place) &&
    !visited.has(sourceMetadata.place.identifier.name.value)
  ) {
    return [
      {
        name: sourceMetadata.place.identifier.name.value,
        typeOfValue: sourceMetadata.typeOfValue,
        isSource: sourceMetadata.isStateSource,
        children: children,
      },
    ];
  }

  return children;
}

function renderTree(
  node: TreeNode,
  indent: string = '',
  isLast: boolean = true,
  propsSet: Set<string>,
  stateSet: Set<string>,
): string {
  const prefix = indent + (isLast ? '└── ' : '├── ');
  const childIndent = indent + (isLast ? '    ' : '│   ');

  let result = `${prefix}${node.name}`;

  if (node.isSource) {
    let typeLabel: string;
    if (node.typeOfValue === 'fromProps') {
      propsSet.add(node.name);
      typeLabel = 'Prop';
    } else if (node.typeOfValue === 'fromState') {
      stateSet.add(node.name);
      typeLabel = 'State';
    } else {
      propsSet.add(node.name);
      stateSet.add(node.name);
      typeLabel = 'Prop and State';
    }
    result += ` (${typeLabel})`;
  }

  if (node.children.length > 0) {
    result += '\n';
    node.children.forEach((child, index) => {
      const isLastChild = index === node.children.length - 1;
      result += renderTree(child, childIndent, isLastChild, propsSet, stateSet);
      if (index < node.children.length - 1) {
        result += '\n';
      }
    });
  }

  return result;
}

function getFnLocalDeps(
  fn: FunctionExpression | undefined,
): Set<IdentifierId> | undefined {
  if (!fn) {
    return undefined;
  }

  const deps: Set<IdentifierId> = new Set();

  for (const [, block] of fn.loweredFunc.func.body.blocks) {
    for (const instr of block.instructions) {
      if (instr.value.kind === 'LoadLocal') {
        deps.add(instr.value.place.identifier.id);
      }
    }
  }

  return deps;
}

function validateEffect(
  effectFunction: HIRFunction,
  dependencies: ArrayExpression,
  context: ValidationContext,
): void {
  const seenBlocks: Set<BlockId> = new Set();

  const effectDerivedSetStateCalls: Array<{
    value: CallExpression;
    id: IdentifierId;
    sourceIds: Set<IdentifierId>;
    typeOfValue: TypeOfValue;
  }> = [];

  const effectSetStateUsages: Map<
    IdentifierId,
    Set<SourceLocation>
  > = new Map();

  // Consider setStates in the effect's dependency array as being part of effectSetStateUsages
  for (const dep of dependencies.elements) {
    if (dep.kind === 'Identifier') {
      const root = getRootSetState(dep.identifier.id, context.setStateLoads);
      if (root !== null) {
        effectSetStateUsages.set(root, new Set([dep.loc]));
      }
    }
  }

  let cleanUpFunctionDeps: Set<IdentifierId> | undefined;

  const globals: Set<IdentifierId> = new Set();
  for (const block of effectFunction.body.blocks.values()) {
    /*
     * if the block is in an effect and is of type return then its an effect's cleanup function
     * if the cleanup function depends on a value from which effect-set state is derived then
     * we can't validate
     */
    if (
      block.terminal.kind === 'return' &&
      block.terminal.returnVariant === 'Explicit'
    ) {
      cleanUpFunctionDeps = getFnLocalDeps(
        context.functions.get(block.terminal.value.identifier.id),
      );
    }
    for (const pred of block.preds) {
      if (!seenBlocks.has(pred)) {
        // skip if block has a back edge
        return;
      }
    }

    for (const instr of block.instructions) {
      // Early return if any instruction is deriving a value from a ref
      if (isUseRefType(instr.lvalue.identifier)) {
        return;
      }

      maybeRecordSetState(instr, context.setStateLoads, effectSetStateUsages);

      for (const operand of eachInstructionOperand(instr)) {
        if (context.setStateLoads.has(operand.identifier.id)) {
          const rootSetStateId = getRootSetState(
            operand.identifier.id,
            context.setStateLoads,
          );
          if (rootSetStateId !== null) {
            effectSetStateUsages.get(rootSetStateId)?.add(operand.loc);
          }
        }
      }

      if (
        instr.value.kind === 'CallExpression' &&
        isSetStateType(instr.value.callee.identifier) &&
        instr.value.args.length === 1 &&
        instr.value.args[0].kind === 'Identifier'
      ) {
        const calleeMetadata = context.derivationCache.cache.get(
          instr.value.callee.identifier.id,
        );

        /*
         * If the setState comes from a source other than local state skip
         * since the fix is not to calculate in render
         */
        if (calleeMetadata?.typeOfValue != 'fromState') {
          continue;
        }

        const argMetadata = context.derivationCache.cache.get(
          instr.value.args[0].identifier.id,
        );

        if (argMetadata !== undefined) {
          effectDerivedSetStateCalls.push({
            value: instr.value,
            id: instr.value.callee.identifier.id,
            sourceIds: argMetadata.sourcesIds,
            typeOfValue: argMetadata.typeOfValue,
          });
        }
      } else if (instr.value.kind === 'CallExpression') {
        const calleeMetadata = context.derivationCache.cache.get(
          instr.value.callee.identifier.id,
        );

        if (
          calleeMetadata !== undefined &&
          (calleeMetadata.typeOfValue === 'fromProps' ||
            calleeMetadata.typeOfValue === 'fromPropsAndState')
        ) {
          // If the callee is a prop we can't confidently say that it should be derived in render
          return;
        }

        if (globals.has(instr.value.callee.identifier.id)) {
          // If the callee is a global we can't confidently say that it should be derived in render
          return;
        }
      } else if (instr.value.kind === 'LoadGlobal') {
        globals.add(instr.lvalue.identifier.id);
        for (const operand of eachInstructionOperand(instr)) {
          globals.add(operand.identifier.id);
        }
      }
    }
    seenBlocks.add(block.id);
  }

  for (const derivedSetStateCall of effectDerivedSetStateCalls) {
    const rootSetStateCall = getRootSetState(
      derivedSetStateCall.id,
      context.setStateLoads,
    );

    if (
      rootSetStateCall !== null &&
      effectSetStateUsages.has(rootSetStateCall) &&
      context.setStateUsages.has(rootSetStateCall) &&
      effectSetStateUsages.get(rootSetStateCall)!.size ===
        context.setStateUsages.get(rootSetStateCall)!.size - 1
    ) {
      const propsSet = new Set<string>();
      const stateSet = new Set<string>();

      const rootNodesMap = new Map<string, TreeNode>();
      for (const id of derivedSetStateCall.sourceIds) {
        const nodes = buildTreeNode(id, context);
        for (const node of nodes) {
          if (!rootNodesMap.has(node.name)) {
            rootNodesMap.set(node.name, node);
          }
        }
      }
      const rootNodes = Array.from(rootNodesMap.values());

      const trees = rootNodes.map((node, index) =>
        renderTree(
          node,
          '',
          index === rootNodes.length - 1,
          propsSet,
          stateSet,
        ),
      );

      for (const dep of derivedSetStateCall.sourceIds) {
        if (cleanUpFunctionDeps !== undefined && cleanUpFunctionDeps.has(dep)) {
          return;
        }
      }

      const propsArr = Array.from(propsSet);
      const stateArr = Array.from(stateSet);

      let rootSources = '';
      if (propsArr.length > 0) {
        rootSources += `Props: [${propsArr.join(', ')}]`;
      }
      if (stateArr.length > 0) {
        if (rootSources) rootSources += '\n';
        rootSources += `State: [${stateArr.join(', ')}]`;
      }

      const description = `Using an effect triggers an additional render which can hurt performance and user experience, potentially briefly showing stale values to the user

This setState call is setting a derived value that depends on the following reactive sources:

${rootSources}

Data Flow Tree:
${trees.join('\n')}

See: https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state`;

      context.errors.pushDiagnostic(
        CompilerDiagnostic.create({
          description: description,
          category: ErrorCategory.EffectDerivationsOfState,
          reason:
            'You might not need an effect. Derive values in render, not effects.',
        }).withDetails({
          kind: 'error',
          loc: derivedSetStateCall.value.callee.loc,
          message: 'This should be computed during render, not in an effect',
        }),
      );
    }
  }
}
