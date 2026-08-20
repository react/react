/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Ids are base 32 strings whose binary representation corresponds to the
// position of a node in a tree.

// Every time the tree forks into multiple children, we add additional bits to
// the left of the sequence that represent the position of the child within the
// current level of children.
//
//      00101       00010001011010101
//      ╰─┬─╯       ╰───────┬───────╯
//   Fork 5 of 20       Parent id
//
// The leading 0s are important. In the above example, you only need 3 bits to
// represent slot 5. However, you need 5 bits to represent all the forks at
// the current level, so we must account for the empty bits at the end.
//
// For this same reason, slots are 1-indexed instead of 0-indexed. Otherwise,
// the zeroth id at a level would be indistinguishable from its parent.
//
// If a node has only one child, and does not materialize an id (i.e. does not
// contain a useId hook), then we don't need to allocate any space in the
// sequence. It's treated as a transparent indirection. For example, these two
// trees produce the same ids:
//
// <>                          <>
//   <Indirection>               <A />
//     <A />                     <B />
//   </Indirection>            </>
//   <B />
// </>
//
// However, we cannot skip any node that materializes an id. Otherwise, a parent
// id that does not fork would be indistinguishable from its child id. For
// example, this tree does not fork, but the parent and child must have
// different ids.
//
// <Parent>
//   <Child />
// </Parent>
//
// To handle this scenario, every time we materialize an id, we allocate a
// new level with a single slot. You can think of this as a fork with only one
// prong, or an array of children with length 1.
//
// It's possible for the size of the sequence to exceed 32 bits, the max
// size for bitwise operations. When this happens, we make more room by
// converting the right part of the id to a string and storing it in an overflow
// variable. We use a base 32 string representation, because 32 is the largest
// power of 2 that is supported by toString(). We want the base to be large so
// that the resulting ids are compact, and we want the base to be a power of 2
// because every log2(base) bits corresponds to a single character, i.e. every
// log2(32) = 5 bits. That means we can lop bits off the end 5 at a time without
// affecting the final result.

import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';

import {getIsHydrating} from './ReactFiberHydrationContext';
import {clz32} from './clz32';
import {Forked, NoFlags} from './ReactFiberFlags';

export type TreeContext = {
  id: number,
  overflow: string,
};

// TODO: Use the unified fiber stack module instead of this local one?
// Intentionally not using it yet to derisk the initial implementation, because
// the way we push/pop these values is a bit unusual. If there's a mistake, I'd
// rather the ids be wrong than crash the whole reconciler.
const forkStack: Array<any> = [];
let forkStackIndex: number = 0;
let treeForkProvider: Fiber | null = null;
let treeForkCount: number = 0;

const idStack: Array<any> = [];
let idStackIndex: number = 0;
let treeContextProvider: Fiber | null = null;
let treeContextId: number = 1;
let treeContextOverflow: string = '';

export function isForkedChild(workInProgress: Fiber): boolean {
  warnIfNotHydrating();
  return (workInProgress.flags & Forked) !== NoFlags;
}

export function getForksAtLevel(workInProgress: Fiber): number {
  warnIfNotHydrating();
  return treeForkCount;
}

export function getTreeId(): string {
  const overflow = treeContextOverflow;
  const idWithLeadingBit = treeContextId;
  const id = idWithLeadingBit & ~getLeadingBit(idWithLeadingBit);
  return id.toString(32) + overflow;
}

export function pushTreeFork(
  workInProgress: Fiber,
  totalChildren: number,
): void {
  // This is called right after we reconcile an array (or iterator) of child
  // fibers, because that's the only place where we know how many children in
  // the whole set without doing extra work later, or storing addtional
  // information on the fiber.
  //
  // That's why this function is separate from pushTreeId — it's called during
  // the render phase of the fork parent, not the child, which is where we push
  // the other context values.
  //
  // In the Fizz implementation this is much simpler because the child is
  // rendered in the same callstack as the parent.
  //
  // It might be better to just add a `forks` field to the Fiber type. It would
  // make this module simpler.

  warnIfNotHydrating();

  forkStack[forkStackIndex++] = treeForkCount;
  forkStack[forkStackIndex++] = treeForkProvider;

  treeForkProvider = workInProgress;
  treeForkCount = totalChildren;
}

export function pushTreeId(
  workInProgress: Fiber,
  totalChildren: number,
  index: number,
) {
  warnIfNotHydrating();

  idStack[idStackIndex++] = treeContextId;
  idStack[idStackIndex++] = treeContextOverflow;
  idStack[idStackIndex++] = treeContextProvider;

  treeContextProvider = workInProgress;

  const baseIdWithLeadingBit = treeContextId;
  const baseOverflow = treeContextOverflow;

  // The leftmost 1 marks the end of the sequence, non-inclusive. It's not part
  // of the id; we use it to account for leading 0s.
  const baseLength = getBitLength(baseIdWithLeadingBit) - 1;
  const baseId = baseIdWithLeadingBit & ~(1 << baseLength);

  const slot = index + 1;
  const length = getBitLength(totalChildren) + baseLength;

  // 30 is the max length we can store without overflowing, taking into
  // consideration the leading 1 we use to mark the end of the sequence.
  if (length > 30) {
    // We overflowed the bitwise-safe range. Fall back to slower algorithm.
    // This branch assumes the length of the base id is greater than 5; it won't
    // work for smaller ids, because you need 5 bits per character.
    //
    // We encode the id in multiple steps: first the base id, then the
    // remaining digits.
    //
    // Each 5 bit sequence corresponds to a single base 32 character. So for
    // example, if the current id is 23 bits long, we can convert 20 of those
    // bits into a string of 4 characters, with 3 bits left over.
    //
    // First calculate how many bits in the base id represent a complete
    // sequence of characters.
    const numberOfOverflowBits = baseLength - (baseLength % 5);

    // Then create a bitmask that selects only those bits.
    const newOverflowBits = (1 << numberOfOverflowBits) - 1;

    // Select the bits, and convert them to a base 32 string.
    const newOverflow = (baseId & newOverflowBits).toString(32);

    // Now we can remove those bits from the base id.
    const restOfBaseId = baseId >> numberOfOverflowBits;
    const restOfBaseLength = baseLength - numberOfOverflowBits;

    // Finally, encode the rest of the bits using the normal algorithm. Because
    // we made more room, this time it won't overflow.
    const restOfLength = getBitLength(totalChildren) + restOfBaseLength;
    const restOfNewBits = slot << restOfBaseLength;
    const id = restOfNewBits | restOfBaseId;
    const overflow = newOverflow + baseOverflow;

    treeContextId = (1 << restOfLength) | id;
    treeContextOverflow = overflow;
  } else {
    // Normal path
    const newBits = slot << baseLength;
    const id = newBits | baseId;
    const overflow = baseOverflow;

    treeContextId = (1 << length) | id;
    treeContextOverflow = overflow;
  }
}

export function pushMaterializedTreeId(workInProgress: Fiber) {
  warnIfNotHydrating();

  // This component materialized an id. This will affect any ids that appear
  // in its children.
  const returnFiber = workInProgress.return;
  if (returnFiber !== null) {
    const numberOfForks = 1;
    const slotIndex = 0;
    pushTreeFork(workInProgress, numberOfForks);
    pushTreeId(workInProgress, numberOfForks, slotIndex);
  }
}

function getBitLength(number: number): number {
  return 32 - clz32(number);
}

function getLeadingBit(id: number) {
  return 1 << (getBitLength(id) - 1);
}

export function popTreeContext(workInProgress: Fiber) {
  // Restore the previous values.

  // This is a bit more complicated than other context-like modules in Fiber
  // because the same Fiber may appear on the stack multiple times and for
  // different reasons. We have to keep popping until the work-in-progress is
  // no longer at the top of the stack.

  while (workInProgress === treeForkProvider) {
    treeForkProvider = forkStack[--forkStackIndex];
    forkStack[forkStackIndex] = null;
    treeForkCount = forkStack[--forkStackIndex];
    forkStack[forkStackIndex] = null;
  }

  while (workInProgress === treeContextProvider) {
    treeContextProvider = idStack[--idStackIndex];
    idStack[idStackIndex] = null;
    treeContextOverflow = idStack[--idStackIndex];
    idStack[idStackIndex] = null;
    treeContextId = idStack[--idStackIndex];
    idStack[idStackIndex] = null;
  }
}

export function getSuspendedTreeContext(): TreeContext | null {
  warnIfNotHydrating();
  if (treeContextProvider !== null) {
    return {
      id: treeContextId,
      overflow: treeContextOverflow,
    };
  } else {
    return null;
  }
}

export function restoreSuspendedTreeContext(
  workInProgress: Fiber,
  suspendedContext: TreeContext,
) {
  warnIfNotHydrating();

  idStack[idStackIndex++] = treeContextId;
  idStack[idStackIndex++] = treeContextOverflow;
  idStack[idStackIndex++] = treeContextProvider;

  treeContextId = suspendedContext.id;
  treeContextOverflow = suspendedContext.overflow;
  treeContextProvider = workInProgress;
}

function warnIfNotHydrating() {
  if (__DEV__) {
    if (!getIsHydrating()) {
      console.error(
        'Expected to be hydrating. This is a bug in React. Please file ' +
          'an issue.',
      );
    }
  }
}
