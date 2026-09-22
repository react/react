/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '../CompilerError';
import {Environment} from '../HIR/Environment';
import {
  BasicBlock,
  BlockId,
  GeneratedSource,
  HIRFunction,
  Identifier,
  IdentifierId,
  makeInstructionId,
  makeType,
  Phi,
  Place,
} from '../HIR/HIR';
import {printIdentifier, printPlace} from '../HIR/PrintHIR';
import {
  eachTerminalSuccessor,
  mapInstructionLValues,
  mapInstructionOperands,
  mapTerminalOperands,
} from '../HIR/visitors';

type IncompletePhi = {
  oldPlace: Place;
  newPlace: Place;
};

type State = {
  defs: Map<Identifier, Identifier>;
  incompletePhis: Array<IncompletePhi>;
};

class SSABuilder {
  #states: Map<BasicBlock, State> = new Map();
  #current: BasicBlock | null = null;
  unsealedPreds: Map<BasicBlock, number> = new Map();
  #blocks: Map<BlockId, BasicBlock>;
  #env: Environment;
  #unknown: Set<Identifier> = new Set();
  #context: Set<Identifier> = new Set();

  constructor(env: Environment, blocks: ReadonlyMap<BlockId, BasicBlock>) {
    this.#blocks = new Map(blocks);
    this.#env = env;
  }

  get nextSsaId(): IdentifierId {
    return this.#env.nextIdentifierId;
  }

  defineFunction(func: HIRFunction): void {
    for (const [id, block] of func.body.blocks) {
      this.#blocks.set(id, block);
    }
  }

  enter(fn: () => void): void {
    const current = this.#current;
    fn();
    this.#current = current;
  }

  state(): State {
    CompilerError.invariant(this.#current !== null, {
      reason: 'we need to be in a block to access state!',
      loc: GeneratedSource,
    });
    return this.#states.get(this.#current)!;
  }

  makeId(oldId: Identifier): Identifier {
    return {
      id: this.nextSsaId,
      declarationId: oldId.declarationId,
      name: oldId.name,
      mutableRange: {
        start: makeInstructionId(0),
        end: makeInstructionId(0),
      },
      scope: null, // reset along w the mutable range
      type: makeType(),
      loc: oldId.loc,
    };
  }

  defineContext(oldPlace: Place): Place {
    const newPlace = this.definePlace(oldPlace);
    this.#context.add(oldPlace.identifier);
    return newPlace;
  }

  /**
   * A function's context places capture a *binding*, not a value: the
   * variable is only read when the function is later called, so a context
   * place may reference a binding that is declared after the function
   * expression itself (eg `const colgroup = useMemo(() => <colgroup>...)`,
   * where the JSX tag name resolves to the variable being assigned). Unmark
   * such identifiers so the later declaration doesn't error; if the function
   * body actually *reads* the variable before it is defined, visiting the
   * body re-marks it and the hoisting bailout in definePlace still applies.
   */
  unmarkUnknown(place: Place): void {
    this.#unknown.delete(place.identifier);
  }

  definePlace(oldPlace: Place): Place {
    const oldId = oldPlace.identifier;
    if (this.#unknown.has(oldId)) {
      CompilerError.throwTodo({
        reason: `[hoisting] EnterSSA: Expected identifier to be defined before being used`,
        description: `Identifier ${printIdentifier(oldId)} is undefined`,
        loc: oldPlace.loc,
        suggestions: null,
      });
    }

    // Do not redefine context references.
    if (this.#context.has(oldId)) {
      return this.getPlace(oldPlace);
    }

    const newId = this.makeId(oldId);
    this.state().defs.set(oldId, newId);
    return {
      ...oldPlace,
      identifier: newId,
    };
  }

  getPlace(oldPlace: Place): Place {
    const newId = this.getIdAt(oldPlace, this.#current!.id);
    return {
      ...oldPlace,
      identifier: newId,
    };
  }

  getIdAt(oldPlace: Place, blockId: BlockId): Identifier {
    // check if Place is defined locally
    const block = this.#blocks.get(blockId)!;
    const state = this.#states.get(block)!;

    if (state.defs.has(oldPlace.identifier)) {
      return state.defs.get(oldPlace.identifier)!;
    }

    if (block.preds.size == 0) {
      /*
       * We're at the entry block and haven't found our definition yet.
       * console.log(
       *   `Unable to find "${printPlace(
       *     oldPlace
       *   )}" in bb${blockId}, assuming it's a global`
       * );
       */
      this.#unknown.add(oldPlace.identifier);
      return oldPlace.identifier;
    }

    if (this.unsealedPreds.get(block)! > 0) {
      /*
       * We haven't visited all our predecessors, let's place an incomplete phi
       * for now.
       */
      const newId = this.makeId(oldPlace.identifier);
      state.incompletePhis.push({
        oldPlace,
        newPlace: {...oldPlace, identifier: newId},
      });
      state.defs.set(oldPlace.identifier, newId);
      return newId;
    }

    // Only one predecessor, let's check there
    if (block.preds.size == 1) {
      const [pred] = block.preds;
      const newId = this.getIdAt(oldPlace, pred);
      state.defs.set(oldPlace.identifier, newId);
      return newId;
    }

    // There are multiple predecessors, we may need a phi.
    const newId = this.makeId(oldPlace.identifier);
    /*
     * Adding a phi may loop back to our block if there is a loop in the CFG.  We
     * update our defs before adding the phi to terminate the recursion rather than
     * looping infinitely.
     */
    state.defs.set(oldPlace.identifier, newId);
    return this.addPhi(block, oldPlace, {...oldPlace, identifier: newId});
  }

  addPhi(block: BasicBlock, oldPlace: Place, newPlace: Place): Identifier {
    const predDefs: Map<BlockId, Place> = new Map();
    for (const predBlockId of block.preds) {
      const predId = this.getIdAt(oldPlace, predBlockId);
      predDefs.set(predBlockId, {...oldPlace, identifier: predId});
    }

    const phi: Phi = {
      kind: 'Phi',
      place: newPlace,
      operands: predDefs,
    };

    block.phis.add(phi);
    return newPlace.identifier;
  }

  fixIncompletePhis(block: BasicBlock): void {
    const state = this.#states.get(block)!;
    for (const phi of state.incompletePhis) {
      this.addPhi(block, phi.oldPlace, phi.newPlace);
    }
  }

  startBlock(block: BasicBlock): void {
    this.#current = block;
    this.#states.set(block, {
      defs: new Map(),
      incompletePhis: [],
    });
  }

  print(): void {
    const text: Array<string> = [];
    for (const [block, state] of this.#states) {
      text.push(`bb${block.id}:`);
      for (const [oldId, newId] of state.defs) {
        text.push(`  \$${printIdentifier(oldId)}: \$${printIdentifier(newId)}`);
      }

      for (const incompletePhi of state.incompletePhis) {
        text.push(
          `  iphi \$${printPlace(
            incompletePhi.newPlace,
          )} = \$${printPlace(incompletePhi.oldPlace)}`,
        );
      }
    }

    text.push(`current block: bb${this.#current?.id}`);
    console.log(text.join('\n'));
  }
}

export default function enterSSA(func: HIRFunction): void {
  const builder = new SSABuilder(func.env, func.body.blocks);
  enterSSAImpl(func, builder, func.body.entry);
}

function enterSSAImpl(
  func: HIRFunction,
  builder: SSABuilder,
  rootEntry: BlockId,
): void {
  const visitedBlocks: Set<BasicBlock> = new Set();
  for (const [blockId, block] of func.body.blocks) {
    CompilerError.invariant(!visitedBlocks.has(block), {
      reason: `found a cycle! visiting bb${block.id} again`,
      loc: GeneratedSource,
    });

    visitedBlocks.add(block);

    builder.startBlock(block);

    if (blockId === rootEntry) {
      // NOTE: func.context should be empty for the root function
      CompilerError.invariant(func.context.length === 0, {
        reason: `Expected function context to be empty for outer function declarations`,
        loc: func.loc,
      });
      func.params = func.params.map(param => {
        if (param.kind === 'Identifier') {
          return builder.definePlace(param);
        } else {
          return {
            kind: 'Spread',
            place: builder.definePlace(param.place),
          };
        }
      });
    }

    for (const instr of block.instructions) {
      mapInstructionOperands(instr, place => builder.getPlace(place));
      mapInstructionLValues(instr, lvalue => builder.definePlace(lvalue));

      if (
        instr.value.kind === 'FunctionExpression' ||
        instr.value.kind === 'ObjectMethod'
      ) {
        const loweredFunc = instr.value.loweredFunc.func;
        for (const place of loweredFunc.context) {
          builder.unmarkUnknown(place);
        }
        const entry = loweredFunc.body.blocks.get(loweredFunc.body.entry)!;
        CompilerError.invariant(entry.preds.size === 0, {
          reason:
            'Expected function expression entry block to have zero predecessors',
          loc: GeneratedSource,
        });
        entry.preds.add(blockId);
        builder.defineFunction(loweredFunc);
        builder.enter(() => {
          loweredFunc.params = loweredFunc.params.map(param => {
            if (param.kind === 'Identifier') {
              return builder.definePlace(param);
            } else {
              return {
                kind: 'Spread',
                place: builder.definePlace(param.place),
              };
            }
          });
          enterSSAImpl(loweredFunc, builder, rootEntry);
        });
        entry.preds.clear();
      }
    }

    mapTerminalOperands(block.terminal, place => builder.getPlace(place));
    for (const outputId of eachTerminalSuccessor(block.terminal)) {
      const output = func.body.blocks.get(outputId)!;
      let count;
      if (builder.unsealedPreds.has(output)) {
        count = builder.unsealedPreds.get(output)! - 1;
      } else {
        count = output.preds.size - 1;
      }
      builder.unsealedPreds.set(output, count);

      if (count === 0 && visitedBlocks.has(output)) {
        builder.fixIncompletePhis(output);
      }
    }
  }
}
