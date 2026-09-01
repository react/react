/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerDiagnostic} from '../CompilerError';
import {
  FunctionExpression,
  GeneratedSource,
  Hole,
  IdentifierId,
  ObjectMethod,
  Place,
  SourceLocation,
  SpreadPattern,
  ValueKind,
  ValueReason,
} from '../HIR';
import {FunctionSignature} from '../HIR/ObjectShape';
import {printSourceLocation} from '../HIR/PrintHIR';

/**
 * `AliasingEffect` describes a set of "effects" that an instruction/terminal has on one or
 * more values in a program. These effects include mutation of values, freezing values,
 * tracking data flow between values, and other specialized cases.
 */
export type AliasingEffect =
  /**
   * Marks the given value and its direct aliases as frozen.
   *
   * Captured values are *not* considered frozen, because we cannot be sure that a previously
   * captured value will still be captured at the point of the freeze.
   *
   * For example:
   * const x = {};
   * const y = [x];
   * y.pop(); // y dosn't contain x anymore!
   * freeze(y);
   * mutate(x); // safe to mutate!
   *
   * The exception to this is FunctionExpressions - since it is impossible to change which
   * value a function closes over[1] we can transitively freeze functions and their captures.
   *
   * [1] Except for `let` values that are reassigned and closed over by a function, but we
   * handle this explicitly with StoreContext/LoadContext.
   */
  | {kind: 'Freeze'; value: Place; reason: ValueReason}
  /**
   * Mutate the value and any direct aliases (not captures). Errors if the value is not mutable.
   */
  | {kind: 'Mutate'; value: Place; reason?: MutationReason | null}
  /**
   * Mutate the value and any direct aliases (not captures), but only if the value is known mutable.
   * This should be rare.
   *
   * TODO: this is only used for IteratorNext, but even then MutateTransitiveConditionally is more
   * correct for iterators of unknown types.
   */
  | {kind: 'MutateConditionally'; value: Place}
  /**
   * Mutate the value, any direct aliases, and any transitive captures. Errors if the value is not mutable.
   */
  | {kind: 'MutateTransitive'; value: Place}
  /**
   * Mutates any of the value, its direct aliases, and its transitive captures that are mutable.
   */
  | {kind: 'MutateTransitiveConditionally'; value: Place}
  /**
   * Records information flow from `from` to `into` in cases where local mutation of the destination
   * will *not* mutate the source:
   *
   * - Capture a -> b and Mutate(b) X=> (does not imply) Mutate(a)
   * - Capture a -> b and MutateTransitive(b) => (does imply) Mutate(a)
   *
   * Example: `array.push(item)`. Information from item is captured into array, but there is not a
   * direct aliasing, and local mutations of array will not modify item.
   */
  | {kind: 'Capture'; from: Place; into: Place}
  /**
   * Records information flow from `from` to `into` in cases where local mutation of the destination
   * *will* mutate the source:
   *
   * - Alias a -> b and Mutate(b) => (does imply) Mutate(a)
   * - Alias a -> b and MutateTransitive(b) => (does imply) Mutate(a)
   *
   * Example: `c = identity(a)`. We don't know what `identity()` returns so we can't use Assign.
   * But we have to assume that it _could_ be returning its input, such that a local mutation of
   * c could be mutating a.
   */
  | {kind: 'Alias'; from: Place; into: Place}

  /**
   * Indicates the potential for information flow from `from` to `into`. This is used for a specific
   * case: functions with unknown signatures. If the compiler sees a call such as `foo(x)`, it has to
   * consider several possibilities (which may depend on the arguments):
   * - foo(x) returns a new mutable value that does not capture any information from x.
   * - foo(x) returns a new mutable value that *does* capture information from x.
   * - foo(x) returns x itself, ie foo is the identity function
   *
   * The same is true of functions that take multiple arguments: `cond(a, b, c)` could conditionally
   * return b or c depending on the value of a.
   *
   * To represent this case, MaybeAlias represents the fact that an aliasing relationship could exist.
   * Any mutations that flow through this relationship automatically become conditional.
   */
  | {kind: 'MaybeAlias'; from: Place; into: Place}

  /**
   * Records direct assignment: `into = from`.
   */
  | {kind: 'Assign'; from: Place; into: Place}
  /**
   * Creates a value of the given type at the given place
   */
  | {kind: 'Create'; into: Place; value: ValueKind; reason: ValueReason}
  /**
   * Creates a new value with the same kind as the starting value.
   */
  | {kind: 'CreateFrom'; from: Place; into: Place}
  /**
   * Immutable data flow, used for escape analysis. Does not influence mutable range analysis:
   */
  | {kind: 'ImmutableCapture'; from: Place; into: Place}
  /**
   * Calls the function at the given place with the given arguments either captured or aliased,
   * and captures/aliases the result into the given place.
   */
  | {
      kind: 'Apply';
      receiver: Place;
      function: Place;
      mutatesFunction: boolean;
      args: Array<Place | SpreadPattern | Hole>;
      into: Place;
      signature: FunctionSignature | null;
      loc: SourceLocation;
    }
  /**
   * Constructs a function value with the given captures. The mutability of the function
   * will be determined by the mutability of the capture values when evaluated.
   */
  | {
      kind: 'CreateFunction';
      captures: Array<Place>;
      function: FunctionExpression | ObjectMethod;
      into: Place;
    }
  /**
   * Mutation of a value known to be immutable
   */
  | {kind: 'MutateFrozen'; place: Place; error: CompilerDiagnostic}
  /**
   * Mutation of a global
   */
  | {
      kind: 'MutateGlobal';
      place: Place;
      error: CompilerDiagnostic;
    }
  /**
   * Indicates a side-effect that is not safe during render
   */
  | {kind: 'Impure'; place: Place; error: CompilerDiagnostic}
  /**
   * Indicates that a given place is accessed during render. Used to distingush
   * hook arguments that are known to be called immediately vs those used for
   * event handlers/effects, and for JSX values known to be called during render
   * (tags, children) vs those that may be events/effect (other props).
   */
  | {
      kind: 'Render';
      place: Place;
    };

export type MutationReason = {kind: 'AssignCurrentProperty'};

export function hashEffect(effect: AliasingEffect): string {
  switch (effect.kind) {
    case 'Apply': {
      return [
        effect.kind,
        effect.receiver.identifier.id,
        effect.function.identifier.id,
        effect.mutatesFunction,
        effect.args
          .map(a => {
            if (a.kind === 'Hole') {
              return '';
            } else if (a.kind === 'Identifier') {
              return a.identifier.id;
            } else {
              return `...${a.place.identifier.id}`;
            }
          })
          .join(','),
        effect.into.identifier.id,
      ].join(':');
    }
    case 'CreateFrom':
    case 'ImmutableCapture':
    case 'Assign':
    case 'Alias':
    case 'Capture':
    case 'MaybeAlias': {
      return [
        effect.kind,
        effect.from.identifier.id,
        effect.into.identifier.id,
      ].join(':');
    }
    case 'Create': {
      return [
        effect.kind,
        effect.into.identifier.id,
        effect.value,
        effect.reason,
      ].join(':');
    }
    case 'Freeze': {
      return [effect.kind, effect.value.identifier.id, effect.reason].join(':');
    }
    case 'Impure':
    case 'Render': {
      return [effect.kind, effect.place.identifier.id].join(':');
    }
    case 'MutateFrozen':
    case 'MutateGlobal': {
      return [
        effect.kind,
        effect.place.identifier.id,
        effect.error.severity,
        effect.error.reason,
        effect.error.description,
        printSourceLocation(effect.error.primaryLocation() ?? GeneratedSource),
      ].join(':');
    }
    case 'Mutate':
    case 'MutateConditionally':
    case 'MutateTransitive':
    case 'MutateTransitiveConditionally': {
      return [effect.kind, effect.value.identifier.id].join(':');
    }
    case 'CreateFunction': {
      return [
        effect.kind,
        effect.into.identifier.id,
        // return places are a unique way to identify functions themselves
        effect.function.loweredFunc.func.returns.identifier.id,
        effect.captures.map(p => p.identifier.id).join(','),
      ].join(':');
    }
  }
}

export type AliasingSignature = {
  receiver: IdentifierId;
  params: Array<IdentifierId>;
  rest: IdentifierId | null;
  returns: IdentifierId;
  effects: Array<AliasingEffect>;
  temporaries: Array<Place>;
};
