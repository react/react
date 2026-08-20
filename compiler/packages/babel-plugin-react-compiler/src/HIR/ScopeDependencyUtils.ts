import {
  Place,
  ReactiveScopeDependency,
  Identifier,
  makeInstructionId,
  InstructionKind,
  GeneratedSource,
  BlockId,
  makeTemporaryIdentifier,
  Effect,
  GotoVariant,
  HIR,
} from './HIR';
import {CompilerError} from '../CompilerError';
import {Environment} from './Environment';
import HIRBuilder from './HIRBuilder';
import {lowerValueToTemporary} from './BuildHIR';

type DependencyInstructions = {
  place: Place;
  value: HIR;
  exitBlockId: BlockId;
};

export function buildDependencyInstructions(
  dep: ReactiveScopeDependency,
  env: Environment,
): DependencyInstructions {
  const builder = new HIRBuilder(env, {
    entryBlockKind: 'value',
  });
  let dependencyValue: Identifier;
  if (dep.path.every(path => !path.optional)) {
    dependencyValue = writeNonOptionalDependency(dep, env, builder);
  } else {
    dependencyValue = writeOptionalDependency(dep, builder, null);
  }

  const exitBlockId = builder.terminate(
    {
      kind: 'unsupported',
      loc: GeneratedSource,
      id: makeInstructionId(0),
    },
    null,
  );
  return {
    place: {
      kind: 'Identifier',
      identifier: dependencyValue,
      effect: Effect.Freeze,
      reactive: dep.reactive,
      loc: GeneratedSource,
    },
    value: builder.build(),
    exitBlockId,
  };
}

/**
 * Write instructions for a simple dependency (without optional chains)
 */
function writeNonOptionalDependency(
  dep: ReactiveScopeDependency,
  env: Environment,
  builder: HIRBuilder,
): Identifier {
  const loc = dep.identifier.loc;
  let curr: Identifier = makeTemporaryIdentifier(env.nextIdentifierId, loc);
  builder.push({
    lvalue: {
      identifier: curr,
      kind: 'Identifier',
      effect: Effect.Mutate,
      reactive: dep.reactive,
      loc,
    },
    value: {
      kind: 'LoadLocal',
      place: {
        identifier: dep.identifier,
        kind: 'Identifier',
        effect: Effect.Freeze,
        reactive: dep.reactive,
        loc,
      },
      loc,
    },
    id: makeInstructionId(1),
    loc: loc,
    effects: null,
  });

  /**
   * Iteratively build up dependency instructions by reading from the last written
   * instruction.
   */
  for (const path of dep.path) {
    const next = makeTemporaryIdentifier(env.nextIdentifierId, loc);
    builder.push({
      lvalue: {
        identifier: next,
        kind: 'Identifier',
        effect: Effect.Mutate,
        reactive: dep.reactive,
        loc,
      },
      value: {
        kind: 'PropertyLoad',
        object: {
          identifier: curr,
          kind: 'Identifier',
          effect: Effect.Freeze,
          reactive: dep.reactive,
          loc,
        },
        property: path.property,
        loc,
      },
      id: makeInstructionId(1),
      loc: loc,
      effects: null,
    });
    curr = next;
  }
  return curr;
}

/**
 * Write a dependency into optional blocks.
 *
 * e.g. `a.b?.c.d` is written to an optional block that tests `a.b` and
 * conditionally evaluates `c.d`.
 */
function writeOptionalDependency(
  dep: ReactiveScopeDependency,
  builder: HIRBuilder,
  parentAlternate: BlockId | null,
): Identifier {
  const env = builder.environment;
  /**
   * Reserve an identifier which will be used to store the result of this
   * dependency.
   */
  const dependencyValue: Place = {
    kind: 'Identifier',
    identifier: makeTemporaryIdentifier(env.nextIdentifierId, GeneratedSource),
    effect: Effect.Mutate,
    reactive: dep.reactive,
    loc: GeneratedSource,
  };

  /**
   * Reserve a block which is the fallthrough (and transitive successor) of this
   * optional chain.
   */
  const continuationBlock = builder.reserve(builder.currentBlockKind());
  let alternate;
  if (parentAlternate != null) {
    alternate = parentAlternate;
  } else {
    /**
     * If an outermost alternate block has not been reserved, write one
     *
     * $N = Primitive undefined
     * $M = StoreLocal $OptionalResult = $N
     * goto fallthrough
     */
    alternate = builder.enter('value', () => {
      const temp = lowerValueToTemporary(builder, {
        kind: 'Primitive',
        value: undefined,
        loc: GeneratedSource,
      });
      lowerValueToTemporary(builder, {
        kind: 'StoreLocal',
        lvalue: {kind: InstructionKind.Const, place: {...dependencyValue}},
        value: {...temp},
        type: null,
        loc: GeneratedSource,
      });
      return {
        kind: 'goto',
        variant: GotoVariant.Break,
        block: continuationBlock.id,
        id: makeInstructionId(0),
        loc: GeneratedSource,
      };
    });
  }

  // Reserve the consequent block, which is the successor of the test block
  const consequent = builder.reserve('value');

  let testIdentifier: Identifier | null = null;
  const testBlock = builder.enter('value', () => {
    const testDependency = {
      ...dep,
      path: dep.path.slice(0, dep.path.length - 1),
    };
    const firstOptional = dep.path.findIndex(path => path.optional);
    CompilerError.invariant(firstOptional !== -1, {
      reason:
        '[ScopeDependencyUtils] Internal invariant broken: expected optional path',
      loc: dep.identifier.loc,
    });
    if (firstOptional === dep.path.length - 1) {
      // Base case: the test block is simple
      testIdentifier = writeNonOptionalDependency(testDependency, env, builder);
    } else {
      // Otherwise, the test block is a nested optional chain
      testIdentifier = writeOptionalDependency(
        testDependency,
        builder,
        alternate,
      );
    }

    return {
      kind: 'branch',
      test: {
        identifier: testIdentifier,
        effect: Effect.Freeze,
        kind: 'Identifier',
        loc: GeneratedSource,
        reactive: dep.reactive,
      },
      consequent: consequent.id,
      alternate,
      id: makeInstructionId(0),
      loc: GeneratedSource,
      fallthrough: continuationBlock.id,
    };
  });

  builder.enterReserved(consequent, () => {
    CompilerError.invariant(testIdentifier !== null, {
      reason: 'Satisfy type checker',
      loc: GeneratedSource,
    });

    lowerValueToTemporary(builder, {
      kind: 'StoreLocal',
      lvalue: {kind: InstructionKind.Const, place: {...dependencyValue}},
      value: lowerValueToTemporary(builder, {
        kind: 'PropertyLoad',
        object: {
          identifier: testIdentifier,
          kind: 'Identifier',
          effect: Effect.Freeze,
          reactive: dep.reactive,
          loc: GeneratedSource,
        },
        property: dep.path.at(-1)!.property,
        loc: GeneratedSource,
      }),
      type: null,
      loc: GeneratedSource,
    });
    return {
      kind: 'goto',
      variant: GotoVariant.Break,
      block: continuationBlock.id,
      id: makeInstructionId(0),
      loc: GeneratedSource,
    };
  });
  builder.terminateWithContinuation(
    {
      kind: 'optional',
      optional: dep.path.at(-1)!.optional,
      test: testBlock,
      fallthrough: continuationBlock.id,
      id: makeInstructionId(0),
      loc: GeneratedSource,
    },
    continuationBlock,
  );

  return dependencyValue.identifier;
}
