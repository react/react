/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '../CompilerError';
import {
  DeclarationId,
  Environment,
  GeneratedSource,
  Identifier,
  InstructionId,
  Pattern,
  Place,
  ReactiveFunction,
  ReactiveInstruction,
  ReactiveScopeBlock,
  ReactiveStatement,
  ReactiveTerminal,
  ReactiveTerminalStatement,
  ReactiveValue,
  ScopeId,
  getHookKind,
  isMutableEffect,
} from '../HIR';
import {assertExhaustive, getOrInsertDefault} from '../Utils/utils';
import {getPlaceScope, ReactiveScope} from '../HIR/HIR';
import {
  ReactiveFunctionTransform,
  ReactiveFunctionVisitor,
  Transformed,
  eachReactiveValueOperand,
  visitReactiveFunction,
} from './visitors';
import {printPlace} from '../HIR/PrintHIR';
import {getFunctionCallSignature} from '../Inference/InferMutationAliasingEffects';

/*
 * This pass prunes reactive scopes that are not necessary to bound downstream computation.
 * Specifically, the pass identifies the set of identifiers which may "escape". Values can
 * escape in one of two ways:
 * * They are directly returned by the function and/or transitively aliased by a return
 *    value.
 * * They are passed as input to a hook. This is because any value passed to a hook may
 *    have its referenced ultimately stored by React (ie, be aliased by an external value).
 *    For example, the closure passed to useEffect escapes.
 *
 * Example to build intuition:
 *
 * ```javascript
 * function Component(props) {
 *    const a = {}; // not aliased or returned: *not* memoized
 *    const b = {}; // aliased by c, which is returned: memoized
 *    const c = [b]; // directly returned: memoized
 *    return c;
 * }
 * ```
 *
 * However, this logic alone is insufficient for two reasons:
 * - Statically memoizing JSX elements *may* be inefficient compared to using dynamic
 *    memoization with `React.memo()`. Static memoization may be JIT'd and can look at
 *    the precise props w/o dynamic iteration, but incurs potentially large code-size
 *    overhead. Dynamic memoization with `React.memo()` incurs potentially increased
 *    runtime overhead for smaller code size. We plan to experiment with both variants
 *    for JSX.
 * - Because we merge values whose mutations _interleave_ into a single scope, there
 *    can be cases where a non-escaping value needs to be memoized anyway to avoid breaking
 *    a memoization input. As a rule, for any scope that has a memoized output, all of that
 *    scope's transitive dependencies must also be memoized _even if they don't escape_.
 *    Failing to memoize them would cause the scope to invalidate more often than necessary
 *    and break downstream memoization.
 *
 * Example of this second case:
 *
 * ```javascript
 * function Component(props) {
 *    // a can be independently memoized but it doesn't escape, so naively we may think its
 *    // safe to not memoize. but not memoizing would break caching of b, which does
 *    // escape.
 *    const a = [props.a];
 *
 *    // b and c are interleaved and grouped into a single scope,
 *    // but they are independent values. c does not escape, but
 *    // we need to ensure that a is memoized or else b will invalidate
 *    // on every render since a is a dependency.
 *    const b = [];
 *    const c = {};
 *    c.a = a;
 *    b.push(props.b);
 *
 *    return b;
 * }
 * ```
 *
 * ## Algorithm
 *
 * 1. First we build up a graph, a mapping of IdentifierId to a node describing all the
 *     scopes and inputs involved in creating that identifier. Individual nodes are marked
 *     as definitely aliased, conditionally aliased, or unaliased:
 *       a. Arrays, objects, function calls all produce a new value and are always marked as aliased
 *       b. Conditional and logical expressions (and a few others) are conditinally aliased,
 *          depending on whether their result value is aliased.
 *       c. JSX is always unaliased (though its props children may be)
 * 2. The same pass which builds the graph also stores the set of returned identifiers and set of
 *     identifiers passed as arguments to hooks.
 * 3. We traverse the graph starting from the returned identifiers and mark reachable dependencies
 *     as escaping, based on the combination of the parent node's type and its children (eg a
 *     conditional node with an aliased dep promotes to aliased).
 * 4. Finally we prune scopes whose outputs weren't marked.
 */
export function pruneNonEscapingScopes(fn: ReactiveFunction): void {
  /*
   * First build up a map of which instructions are involved in creating which values,
   * and which values are returned.
   */
  const state = new State(fn.env);
  for (const param of fn.params) {
    if (param.kind === 'Identifier') {
      state.declare(param.identifier.declarationId);
    } else {
      state.declare(param.place.identifier.declarationId);
    }
  }
  visitReactiveFunction(fn, new CollectDependenciesVisitor(fn.env, state), []);

  /*
   * Then walk outward from the returned values and find all captured operands.
   * This forms the set of identifiers which should be memoized.
   */
  const memoized = computeMemoizedIdentifiers(state);

  // Prune scopes that do not declare/reassign any escaping values
  visitReactiveFunction(fn, new PruneScopesTransform(), memoized);
}

export type MemoizationOptions = {
  memoizeJsxElements: boolean;
  forceMemoizePrimitives: boolean;
};

// Describes how to determine whether a value should be memoized, relative to dependees and dependencies
enum MemoizationLevel {
  // The value should be memoized if it escapes
  Memoized = 'Memoized',
  /*
   * Values that are memoized if their dependencies are memoized (used for logical/ternary and
   * other expressions that propagate dependencies wo changing them)
   */
  Conditional = 'Conditional',
  /*
   * Values that cannot be compared with Object.is, but which by default don't need to be memoized
   * unless forced
   */
  Unmemoized = 'Unmemoized',
  // The value will never be memoized: used for values that can be cheaply compared w Object.is
  Never = 'Never',
}

/*
 * Given an identifier that appears as an lvalue multiple times with different memoization levels,
 * determines the final memoization level.
 */
function joinAliases(
  kind1: MemoizationLevel,
  kind2: MemoizationLevel,
): MemoizationLevel {
  if (
    kind1 === MemoizationLevel.Memoized ||
    kind2 === MemoizationLevel.Memoized
  ) {
    return MemoizationLevel.Memoized;
  } else if (
    kind1 === MemoizationLevel.Conditional ||
    kind2 === MemoizationLevel.Conditional
  ) {
    return MemoizationLevel.Conditional;
  } else if (
    kind1 === MemoizationLevel.Unmemoized ||
    kind2 === MemoizationLevel.Unmemoized
  ) {
    return MemoizationLevel.Unmemoized;
  } else {
    return MemoizationLevel.Never;
  }
}

// A node in the graph describing the memoization level of a given identifier as well as its dependencies and scopes.
type IdentifierNode = {
  level: MemoizationLevel;
  memoized: boolean;
  dependencies: Set<DeclarationId>;
  scopes: Set<ScopeId>;
  seen: boolean;
};

// A scope node describing its dependencies
type ScopeNode = {
  dependencies: Array<DeclarationId>;
  seen: boolean;
};

// Stores the identifier and scope graphs, set of returned identifiers, etc
class State {
  env: Environment;
  /*
   * Maps lvalues for LoadLocal to the identifier being loaded, to resolve indirections
   * in subsequent lvalues/rvalues.
   *
   * NOTE: this pass uses DeclarationId rather than IdentifierId because the pass is not
   * aware of control-flow, only data flow via mutation. Instead of precisely modeling
   * control flow, we analyze all values that may flow into a particular program variable,
   * and then whether that program variable may escape (if so, the values flowing in may
   * escape too). Thus we use DeclarationId to captures all values that may flow into
   * a particular program variable, regardless of control flow paths.
   *
   * In the future when we convert to HIR everywhere this pass can account for control
   * flow and use SSA ids.
   */
  definitions: Map<DeclarationId, DeclarationId> = new Map();

  identifiers: Map<DeclarationId, IdentifierNode> = new Map();
  scopes: Map<ScopeId, ScopeNode> = new Map();
  escapingValues: Set<DeclarationId> = new Set();

  constructor(env: Environment) {
    this.env = env;
  }

  // Declare a new identifier, used for function id and params
  declare(id: DeclarationId): void {
    this.identifiers.set(id, {
      level: MemoizationLevel.Never,
      memoized: false,
      dependencies: new Set(),
      scopes: new Set(),
      seen: false,
    });
  }

  /*
   * Associates the identifier with its scope, if there is one and it is active for the given instruction id:
   * - Records the scope and its dependencies
   * - Associates the identifier with this scope
   */
  visitOperand(
    id: InstructionId,
    place: Place,
    identifier: DeclarationId,
  ): void {
    const scope = getPlaceScope(id, place);
    if (scope !== null) {
      let node = this.scopes.get(scope.id);
      if (node === undefined) {
        node = {
          dependencies: [...scope.dependencies].map(
            dep => dep.identifier.declarationId,
          ),
          seen: false,
        };
        this.scopes.set(scope.id, node);
      }
      const identifierNode = this.identifiers.get(identifier);
      CompilerError.invariant(identifierNode !== undefined, {
        reason: 'Expected identifier to be initialized',
        description: `[${id}] operand=${printPlace(place)} for identifier declaration ${identifier}`,
        loc: place.loc,
      });
      identifierNode.scopes.add(scope.id);
    }
  }
}

/*
 * Given a state derived from visiting the function, walks the graph from the returned nodes
 * to determine which other values should be memoized. Returns a set of all identifiers
 * that should be memoized.
 */
function computeMemoizedIdentifiers(state: State): Set<DeclarationId> {
  const memoized = new Set<DeclarationId>();

  // Visit an identifier, optionally forcing it to be memoized
  function visit(id: DeclarationId, forceMemoize: boolean = false): boolean {
    const node = state.identifiers.get(id);
    CompilerError.invariant(node !== undefined, {
      reason: `Expected a node for all identifiers, none found for \`${id}\``,
      loc: GeneratedSource,
    });
    if (node.seen) {
      return node.memoized;
    }
    node.seen = true;

    /*
     * Note: in case of cycles we temporarily mark the identifier as non-memoized,
     * this is reset later after processing dependencies
     */
    node.memoized = false;

    // Visit dependencies, determine if any of them are memoized
    let hasMemoizedDependency = false;
    for (const dep of node.dependencies) {
      const isDepMemoized = visit(dep);
      hasMemoizedDependency ||= isDepMemoized;
    }

    if (
      node.level === MemoizationLevel.Memoized ||
      (node.level === MemoizationLevel.Conditional &&
        (hasMemoizedDependency || forceMemoize)) ||
      (node.level === MemoizationLevel.Unmemoized && forceMemoize)
    ) {
      node.memoized = true;
      memoized.add(id);
      for (const scope of node.scopes) {
        forceMemoizeScopeDependencies(scope);
      }
    }
    return node.memoized;
  }

  // Force all the scope's optionally-memoizeable dependencies (not "Never") to be memoized
  function forceMemoizeScopeDependencies(id: ScopeId): void {
    const node = state.scopes.get(id);
    CompilerError.invariant(node !== undefined, {
      reason: 'Expected a node for all scopes',
      loc: GeneratedSource,
    });
    if (node.seen) {
      return;
    }
    node.seen = true;

    for (const dep of node.dependencies) {
      visit(dep, true);
    }
    return;
  }

  // Walk from the "roots" aka returned identifiers.
  for (const value of state.escapingValues) {
    visit(value);
  }

  return memoized;
}

type LValueMemoization = {
  place: Place;
  level: MemoizationLevel;
};

function computePatternLValues(pattern: Pattern): Array<LValueMemoization> {
  const lvalues: Array<LValueMemoization> = [];
  switch (pattern.kind) {
    case 'ArrayPattern': {
      for (const item of pattern.items) {
        if (item.kind === 'Identifier') {
          lvalues.push({place: item, level: MemoizationLevel.Conditional});
        } else if (item.kind === 'Spread') {
          lvalues.push({place: item.place, level: MemoizationLevel.Memoized});
        }
      }
      break;
    }
    case 'ObjectPattern': {
      for (const property of pattern.properties) {
        if (property.kind === 'ObjectProperty') {
          lvalues.push({
            place: property.place,
            level: MemoizationLevel.Conditional,
          });
        } else {
          lvalues.push({
            place: property.place,
            level: MemoizationLevel.Memoized,
          });
        }
      }
      break;
    }
    default: {
      assertExhaustive(
        pattern,
        `Unexpected pattern kind \`${(pattern as any).kind}\``,
      );
    }
  }
  return lvalues;
}

/*
 * Populates the input state with the set of returned identifiers and information about each
 * identifier's and scope's dependencies.
 */
class CollectDependenciesVisitor extends ReactiveFunctionVisitor<
  Array<ReactiveScope>
> {
  env: Environment;
  state: State;
  options: MemoizationOptions;

  constructor(env: Environment, state: State) {
    super();
    this.env = env;
    this.state = state;
    this.options = {
      memoizeJsxElements: !this.env.config.enableForest,
      forceMemoizePrimitives:
        this.env.config.enableForest ||
        this.env.config.enablePreserveExistingMemoizationGuarantees,
    };
  }

  /*
   * Given a value, returns a description of how it should be memoized:
   * - lvalues: optional extra places that are lvalue-like in the sense of
   *   aliasing the rvalues
   * - rvalues: places that are aliased by the instruction's lvalues.
   * - level: the level of memoization to apply to this value
   */
  computeMemoizationInputs(
    value: ReactiveValue,
    lvalue: Place | null,
  ): {
    // can optionally return a custom set of lvalues per instruction
    lvalues: Array<LValueMemoization>;
    rvalues: Array<Place>;
  } {
    const env = this.env;
    const options = this.options;

    switch (value.kind) {
      case 'ConditionalExpression': {
        return {
          // Only need to memoize if the rvalues are memoized
          lvalues:
            lvalue !== null
              ? [{place: lvalue, level: MemoizationLevel.Conditional}]
              : [],
          rvalues: [
            // Conditionals do not alias their test value.
            ...this.computeMemoizationInputs(value.consequent, null).rvalues,
            ...this.computeMemoizationInputs(value.alternate, null).rvalues,
          ],
        };
      }
      case 'LogicalExpression': {
        return {
          // Only need to memoize if the rvalues are memoized
          lvalues:
            lvalue !== null
              ? [{place: lvalue, level: MemoizationLevel.Conditional}]
              : [],
          rvalues: [
            ...this.computeMemoizationInputs(value.left, null).rvalues,
            ...this.computeMemoizationInputs(value.right, null).rvalues,
          ],
        };
      }
      case 'SequenceExpression': {
        for (const instr of value.instructions) {
          this.visitValueForMemoization(instr.id, instr.value, instr.lvalue);
        }
        return {
          // Only need to memoize if the rvalues are memoized
          lvalues:
            lvalue !== null
              ? [{place: lvalue, level: MemoizationLevel.Conditional}]
              : [],
          /*
           * Only the final value of the sequence is a true rvalue:
           * values from the sequence's instructions are evaluated
           * as separate nodes
           */
          rvalues: this.computeMemoizationInputs(value.value, null).rvalues,
        };
      }
      case 'JsxExpression': {
        const operands: Array<Place> = [];
        if (value.tag.kind === 'Identifier') {
          operands.push(value.tag);
        }
        for (const prop of value.props) {
          if (prop.kind === 'JsxAttribute') {
            operands.push(prop.place);
          } else {
            operands.push(prop.argument);
          }
        }
        if (value.children !== null) {
          for (const child of value.children) {
            operands.push(child);
          }
        }
        const level = options.memoizeJsxElements
          ? MemoizationLevel.Memoized
          : MemoizationLevel.Unmemoized;
        return {
          /*
           * JSX elements themselves are not memoized unless forced to
           * avoid breaking downstream memoization
           */
          lvalues: lvalue !== null ? [{place: lvalue, level}] : [],
          rvalues: operands,
        };
      }
      case 'JsxFragment': {
        const level = options.memoizeJsxElements
          ? MemoizationLevel.Memoized
          : MemoizationLevel.Unmemoized;
        return {
          /*
           * JSX elements themselves are not memoized unless forced to
           * avoid breaking downstream memoization
           */
          lvalues: lvalue !== null ? [{place: lvalue, level}] : [],
          rvalues: value.children,
        };
      }
      case 'NextPropertyOf':
      case 'StartMemoize':
      case 'FinishMemoize':
      case 'Debugger':
      case 'ComputedDelete':
      case 'PropertyDelete':
      case 'LoadGlobal':
      case 'MetaProperty':
      case 'TemplateLiteral':
      case 'Primitive':
      case 'JSXText':
      case 'BinaryExpression':
      case 'UnaryExpression': {
        if (options.forceMemoizePrimitives) {
          /**
           * Because these instructions produce primitives we usually don't consider
           * them as escape points: they are known to copy, not return references.
           * However if we're forcing memoization of primitives then we mark these
           * instructions as needing memoization and walk their rvalues to ensure
           * any scopes transitively reachable from the rvalues are considered for
           * memoization. Note: we may still prune primitive-producing scopes if
           * they don't ultimately escape at all.
           */
          const level = MemoizationLevel.Conditional;
          return {
            lvalues: lvalue !== null ? [{place: lvalue, level}] : [],
            rvalues: [...eachReactiveValueOperand(value)],
          };
        }
        const level = MemoizationLevel.Never;
        return {
          // All of these instructions return a primitive value and never need to be memoized
          lvalues: lvalue !== null ? [{place: lvalue, level}] : [],
          rvalues: [],
        };
      }
      case 'Await':
      case 'TypeCastExpression': {
        return {
          // Indirection for the inner value, memoized if the value is
          lvalues:
            lvalue !== null
              ? [{place: lvalue, level: MemoizationLevel.Conditional}]
              : [],
          rvalues: [value.value],
        };
      }
      case 'IteratorNext': {
        return {
          // Indirection for the inner value, memoized if the value is
          lvalues:
            lvalue !== null
              ? [{place: lvalue, level: MemoizationLevel.Conditional}]
              : [],
          rvalues: [value.iterator, value.collection],
        };
      }
      case 'GetIterator': {
        return {
          // Indirection for the inner value, memoized if the value is
          lvalues:
            lvalue !== null
              ? [{place: lvalue, level: MemoizationLevel.Conditional}]
              : [],
          rvalues: [value.collection],
        };
      }
      case 'LoadLocal': {
        return {
          // Indirection for the inner value, memoized if the value is
          lvalues:
            lvalue !== null
              ? [{place: lvalue, level: MemoizationLevel.Conditional}]
              : [],
          rvalues: [value.place],
        };
      }
      case 'LoadContext': {
        return {
          // Should never be pruned
          lvalues:
            lvalue !== null
              ? [{place: lvalue, level: MemoizationLevel.Conditional}]
              : [],
          rvalues: [value.place],
        };
      }
      case 'DeclareContext': {
        const lvalues = [
          {place: value.lvalue.place, level: MemoizationLevel.Memoized},
        ];
        if (lvalue !== null) {
          lvalues.push({place: lvalue, level: MemoizationLevel.Unmemoized});
        }
        return {
          lvalues,
          rvalues: [],
        };
      }

      case 'DeclareLocal': {
        const lvalues = [
          {place: value.lvalue.place, level: MemoizationLevel.Unmemoized},
        ];
        if (lvalue !== null) {
          lvalues.push({place: lvalue, level: MemoizationLevel.Unmemoized});
        }
        return {
          lvalues,
          rvalues: [],
        };
      }
      case 'PrefixUpdate':
      case 'PostfixUpdate': {
        const lvalues = [
          {place: value.lvalue, level: MemoizationLevel.Conditional},
        ];
        if (lvalue !== null) {
          lvalues.push({place: lvalue, level: MemoizationLevel.Conditional});
        }
        return {
          // Indirection for the inner value, memoized if the value is
          lvalues,
          rvalues: [value.value],
        };
      }
      case 'StoreLocal': {
        const lvalues = [
          {place: value.lvalue.place, level: MemoizationLevel.Conditional},
        ];
        if (lvalue !== null) {
          lvalues.push({place: lvalue, level: MemoizationLevel.Conditional});
        }
        return {
          // Indirection for the inner value, memoized if the value is
          lvalues,
          rvalues: [value.value],
        };
      }
      case 'StoreContext': {
        // Should never be pruned
        const lvalues = [
          {place: value.lvalue.place, level: MemoizationLevel.Memoized},
        ];
        if (lvalue !== null) {
          lvalues.push({place: lvalue, level: MemoizationLevel.Conditional});
        }

        return {
          lvalues,
          rvalues: [value.value],
        };
      }
      case 'StoreGlobal': {
        const lvalues = [];
        if (lvalue !== null) {
          lvalues.push({place: lvalue, level: MemoizationLevel.Unmemoized});
        }

        return {
          lvalues,
          rvalues: [value.value],
        };
      }
      case 'Destructure': {
        // Indirection for the inner value, memoized if the value is
        const lvalues = [];
        if (lvalue !== null) {
          lvalues.push({place: lvalue, level: MemoizationLevel.Conditional});
        }
        lvalues.push(...computePatternLValues(value.lvalue.pattern));
        return {
          lvalues: lvalues,
          rvalues: [value.value],
        };
      }
      case 'ComputedLoad':
      case 'PropertyLoad': {
        const level = MemoizationLevel.Conditional;
        return {
          // Indirection for the inner value, memoized if the value is
          lvalues: lvalue !== null ? [{place: lvalue, level}] : [],
          /*
           * Only the object is aliased to the result, and the result only needs to be
           * memoized if the object is
           */
          rvalues: [value.object],
        };
      }
      case 'ComputedStore': {
        /*
         * The object being stored to acts as an lvalue (it aliases the value), but
         * the computed key is not aliased
         */
        const lvalues = [
          {place: value.object, level: MemoizationLevel.Conditional},
        ];
        if (lvalue !== null) {
          lvalues.push({place: lvalue, level: MemoizationLevel.Conditional});
        }
        return {
          lvalues,
          rvalues: [value.value],
        };
      }
      case 'OptionalExpression': {
        // Indirection for the inner value, memoized if the value is
        const lvalues = [];
        if (lvalue !== null) {
          lvalues.push({place: lvalue, level: MemoizationLevel.Conditional});
        }
        return {
          lvalues: lvalues,
          rvalues: [
            ...this.computeMemoizationInputs(value.value, null).rvalues,
          ],
        };
      }
      case 'TaggedTemplateExpression': {
        const signature = getFunctionCallSignature(
          env,
          value.tag.identifier.type,
        );
        let lvalues = [];
        if (lvalue !== null) {
          lvalues.push({place: lvalue, level: MemoizationLevel.Memoized});
        }
        if (signature?.noAlias === true) {
          return {
            lvalues,
            rvalues: [],
          };
        }
        const operands = [...eachReactiveValueOperand(value)];
        lvalues.push(
          ...operands
            .filter(operand => isMutableEffect(operand.effect, operand.loc))
            .map(place => ({place, level: MemoizationLevel.Memoized})),
        );
        return {
          lvalues,
          rvalues: operands,
        };
      }
      case 'CallExpression': {
        const signature = getFunctionCallSignature(
          env,
          value.callee.identifier.type,
        );
        let lvalues = [];
        if (lvalue !== null) {
          lvalues.push({place: lvalue, level: MemoizationLevel.Memoized});
        }
        if (signature?.noAlias === true) {
          return {
            lvalues,
            rvalues: [],
          };
        }
        const operands = [...eachReactiveValueOperand(value)];
        lvalues.push(
          ...operands
            .filter(operand => isMutableEffect(operand.effect, operand.loc))
            .map(place => ({place, level: MemoizationLevel.Memoized})),
        );
        return {
          lvalues,
          rvalues: operands,
        };
      }
      case 'MethodCall': {
        const signature = getFunctionCallSignature(
          env,
          value.property.identifier.type,
        );
        let lvalues = [];
        if (lvalue !== null) {
          lvalues.push({place: lvalue, level: MemoizationLevel.Memoized});
        }
        if (signature?.noAlias === true) {
          return {
            lvalues,
            rvalues: [],
          };
        }
        const operands = [...eachReactiveValueOperand(value)];
        lvalues.push(
          ...operands
            .filter(operand => isMutableEffect(operand.effect, operand.loc))
            .map(place => ({place, level: MemoizationLevel.Memoized})),
        );
        return {
          lvalues,
          rvalues: operands,
        };
      }
      case 'RegExpLiteral':
      case 'ObjectMethod':
      case 'FunctionExpression':
      case 'ArrayExpression':
      case 'NewExpression':
      case 'ObjectExpression':
      case 'PropertyStore': {
        /*
         * All of these instructions may produce new values which must be memoized if
         * reachable from a return value. Any mutable rvalue may alias any other rvalue
         */
        const operands = [...eachReactiveValueOperand(value)];
        const lvalues = operands
          .filter(operand => isMutableEffect(operand.effect, operand.loc))
          .map(place => ({place, level: MemoizationLevel.Memoized}));
        if (lvalue !== null) {
          lvalues.push({place: lvalue, level: MemoizationLevel.Memoized});
        }
        return {
          lvalues,
          rvalues: operands,
        };
      }
      case 'UnsupportedNode': {
        const lvalues = [];
        if (lvalue !== null) {
          lvalues.push({place: lvalue, level: MemoizationLevel.Never});
        }
        return {
          lvalues,
          rvalues: [],
        };
      }
      default: {
        assertExhaustive(
          value,
          `Unexpected value kind \`${(value as any).kind}\``,
        );
      }
    }
  }

  visitValueForMemoization(
    id: InstructionId,
    value: ReactiveValue,
    lvalue: Place | null,
  ): void {
    const state = this.state;
    // Determe the level of memoization for this value and the lvalues/rvalues
    const aliasing = this.computeMemoizationInputs(value, lvalue);

    // Associate all the rvalues with the instruction's scope if it has one
    for (const operand of aliasing.rvalues) {
      const operandId =
        state.definitions.get(operand.identifier.declarationId) ??
        operand.identifier.declarationId;
      state.visitOperand(id, operand, operandId);
    }

    // Add the operands as dependencies of all lvalues.
    for (const {place: lvalue, level} of aliasing.lvalues) {
      const lvalueId =
        state.definitions.get(lvalue.identifier.declarationId) ??
        lvalue.identifier.declarationId;
      let node = state.identifiers.get(lvalueId);
      if (node === undefined) {
        node = {
          level: MemoizationLevel.Never,
          memoized: false,
          dependencies: new Set(),
          scopes: new Set(),
          seen: false,
        };
        state.identifiers.set(lvalueId, node);
      }
      node.level = joinAliases(node.level, level);
      /*
       * This looks like NxM iterations but in practice all instructions with multiple
       * lvalues have only a single rvalue
       */
      for (const operand of aliasing.rvalues) {
        const operandId =
          state.definitions.get(operand.identifier.declarationId) ??
          operand.identifier.declarationId;
        if (operandId === lvalueId) {
          continue;
        }
        node.dependencies.add(operandId);
      }

      state.visitOperand(id, lvalue, lvalueId);
    }

    if (value.kind === 'LoadLocal' && lvalue !== null) {
      state.definitions.set(
        lvalue.identifier.declarationId,
        value.place.identifier.declarationId,
      );
    } else if (value.kind === 'CallExpression' || value.kind === 'MethodCall') {
      let callee =
        value.kind === 'CallExpression' ? value.callee : value.property;
      if (getHookKind(state.env, callee.identifier) != null) {
        const signature = getFunctionCallSignature(
          this.env,
          callee.identifier.type,
        );
        /*
         * Hook values are assumed to escape by default since they can be inputs
         * to reactive scopes in the hook. However if the hook is annotated as
         * noAlias we know that the arguments cannot escape and don't need to
         * be memoized.
         */
        if (signature && signature.noAlias === true) {
          return;
        }
        for (const operand of value.args) {
          const place = operand.kind === 'Spread' ? operand.place : operand;
          state.escapingValues.add(place.identifier.declarationId);
        }
      }
    }
  }

  override visitInstruction(
    instruction: ReactiveInstruction,
    _scopes: Array<ReactiveScope>,
  ): void {
    this.visitValueForMemoization(
      instruction.id,
      instruction.value,
      instruction.lvalue,
    );
  }

  override visitTerminal(
    stmt: ReactiveTerminalStatement<ReactiveTerminal>,
    scopes: Array<ReactiveScope>,
  ): void {
    this.traverseTerminal(stmt, scopes);
    if (stmt.terminal.kind === 'return') {
      this.state.escapingValues.add(
        stmt.terminal.value.identifier.declarationId,
      );

      /*
       * If the return is within a scope, then those scopes must be evaluated
       * with the return and should be considered dependencies of the returned
       * value.
       *
       * This ensures that if those scopes have dependencies that those deps
       * are also memoized.
       */
      const identifierNode = this.state.identifiers.get(
        stmt.terminal.value.identifier.declarationId,
      );
      CompilerError.invariant(identifierNode !== undefined, {
        reason: 'Expected identifier to be initialized',
        loc: stmt.terminal.loc,
      });
      for (const scope of scopes) {
        identifierNode.scopes.add(scope.id);
      }
    }
  }

  override visitScope(
    scope: ReactiveScopeBlock,
    scopes: Array<ReactiveScope>,
  ): void {
    /*
     * If a scope reassigns any variables, set the chain of active scopes as a dependency
     * of those variables. This ensures that if the variable escapes that we treat the
     * reassignment scopes — and importantly their dependencies — as needing memoization.
     */
    for (const reassignment of scope.scope.reassignments) {
      const identifierNode = this.state.identifiers.get(
        reassignment.declarationId,
      );
      CompilerError.invariant(identifierNode !== undefined, {
        reason: 'Expected identifier to be initialized',
        loc: reassignment.loc,
      });
      for (const scope of scopes) {
        identifierNode.scopes.add(scope.id);
      }
      identifierNode.scopes.add(scope.scope.id);
    }

    this.traverseScope(scope, [...scopes, scope.scope]);
  }
}

// Prune reactive scopes that do not have any memoized outputs
class PruneScopesTransform extends ReactiveFunctionTransform<
  Set<DeclarationId>
> {
  prunedScopes: Set<ScopeId> = new Set();
  /**
   * Track reassignments so we can correctly set `pruned` flags for
   * inlined useMemos.
   */
  reassignments: Map<DeclarationId, Set<Identifier>> = new Map();

  override transformScope(
    scopeBlock: ReactiveScopeBlock,
    state: Set<DeclarationId>,
  ): Transformed<ReactiveStatement> {
    this.visitScope(scopeBlock, state);

    /**
     * Scopes may initially appear "empty" because the value being memoized
     * is early-returned from within the scope. For now we intentionaly keep
     * these scopes, and let them get pruned later by PruneUnusedScopes
     * _after_ handling the early-return case in PropagateEarlyReturns.
     *
     * Also keep the scope if an early return was created by some earlier pass,
     * which may happen in alternate compiler configurations.
     */
    if (
      (scopeBlock.scope.declarations.size === 0 &&
        scopeBlock.scope.reassignments.size === 0) ||
      scopeBlock.scope.earlyReturnValue !== null
    ) {
      return {kind: 'keep'};
    }

    const hasMemoizedOutput =
      Array.from(scopeBlock.scope.declarations.values()).some(decl =>
        state.has(decl.identifier.declarationId),
      ) ||
      Array.from(scopeBlock.scope.reassignments).some(identifier =>
        state.has(identifier.declarationId),
      );
    if (hasMemoizedOutput) {
      return {kind: 'keep'};
    } else {
      this.prunedScopes.add(scopeBlock.scope.id);
      return {
        kind: 'replace-many',
        value: scopeBlock.instructions,
      };
    }
  }

  /**
   * If we pruned the scope for a non-escaping value, we know it doesn't
   * need to be memoized. Remove associated `Memoize` instructions so that
   * we don't report false positives on "missing" memoization of these values.
   */
  override transformInstruction(
    instruction: ReactiveInstruction,
    state: Set<DeclarationId>,
  ): Transformed<ReactiveStatement> {
    this.traverseInstruction(instruction, state);

    const value = instruction.value;
    if (value.kind === 'StoreLocal' && value.lvalue.kind === 'Reassign') {
      // Complex cases of useMemo inlining result in a temporary that is reassigned
      const ids = getOrInsertDefault(
        this.reassignments,
        value.lvalue.place.identifier.declarationId,
        new Set(),
      );
      ids.add(value.value.identifier);
    } else if (
      value.kind === 'LoadLocal' &&
      value.place.identifier.scope != null &&
      instruction.lvalue != null &&
      instruction.lvalue.identifier.scope == null
    ) {
      /*
       * Simpler cases result in a direct assignment to the original lvalue, with a
       * LoadLocal
       */
      const ids = getOrInsertDefault(
        this.reassignments,
        instruction.lvalue.identifier.declarationId,
        new Set(),
      );
      ids.add(value.place.identifier);
    } else if (value.kind === 'FinishMemoize') {
      let decls;
      if (value.decl.identifier.scope == null) {
        /**
         * If the manual memo was a useMemo that got inlined, iterate through
         * all reassignments to the iife temporary to ensure they're memoized.
         */
        decls = this.reassignments.get(value.decl.identifier.declarationId) ?? [
          value.decl.identifier,
        ];
      } else {
        decls = [value.decl.identifier];
      }

      if (
        [...decls].every(
          decl => decl.scope == null || this.prunedScopes.has(decl.scope.id),
        )
      ) {
        value.pruned = true;
      }
    }

    return {kind: 'keep'};
  }
}
