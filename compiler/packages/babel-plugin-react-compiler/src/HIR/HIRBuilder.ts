/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Binding, NodePath} from '@babel/traverse';
import * as t from '@babel/types';
import {
  CompilerError,
  CompilerDiagnostic,
  CompilerErrorDetail,
  ErrorCategory,
} from '../CompilerError';
import {Environment} from './Environment';
import {
  BasicBlock,
  BlockId,
  BlockKind,
  Effect,
  GeneratedSource,
  GotoVariant,
  HIR,
  Identifier,
  IdentifierId,
  Instruction,
  Place,
  SourceLocation,
  Terminal,
  VariableBinding,
  makeBlockId,
  makeDeclarationId,
  makeIdentifierName,
  makeInstructionId,
  makeTemporaryIdentifier,
  makeType,
} from './HIR';
import {printInstruction} from './PrintHIR';
import {
  eachTerminalSuccessor,
  mapTerminalSuccessors,
  terminalFallthrough,
} from './visitors';

/*
 * *******************************************************************************************
 * *******************************************************************************************
 * ************************************* Lowering to HIR *************************************
 * *******************************************************************************************
 * *******************************************************************************************
 */

// A work-in-progress block that does not yet have a terminator
export type WipBlock = {
  id: BlockId;
  instructions: Array<Instruction>;
  kind: BlockKind;
};

type Scope = LoopScope | LabelScope | SwitchScope;

type LoopScope = {
  kind: 'loop';
  label: string | null;
  continueBlock: BlockId;
  breakBlock: BlockId;
};

type SwitchScope = {
  kind: 'switch';
  breakBlock: BlockId;
  label: string | null;
};

type LabelScope = {
  kind: 'label';
  label: string;
  breakBlock: BlockId;
};

function newBlock(id: BlockId, kind: BlockKind): WipBlock {
  return {id, kind, instructions: []};
}

export type Bindings = Map<
  string,
  {node: t.Identifier; identifier: Identifier}
>;

/*
 * Determines how instructions should be constructed in order to preserve
 * exception semantics
 */
export type ExceptionsMode =
  /*
   * Mode used for code not covered by explicit exception handling, any
   * errors are assumed to be thrown out of the function
   */
  | {kind: 'ThrowExceptions'}
  /*
   * Mode used for code that *is* covered by explicit exception handling
   * (ie try/catch), which requires modeling the possibility of control
   * flow to the exception handler.
   */
  | {kind: 'CatchExceptions'; handler: BlockId};

// Helper class for constructing a CFG
export default class HIRBuilder {
  #completed: Map<BlockId, BasicBlock> = new Map();
  #current: WipBlock;
  #entry: BlockId;
  #scopes: Array<Scope> = [];
  #context: Map<t.Identifier, SourceLocation>;
  #bindings: Bindings;
  #env: Environment;
  #exceptionHandlerStack: Array<BlockId> = [];
  /**
   * Traversal context: counts the number of `fbt` tag parents
   * of the current babel node.
   */
  fbtDepth: number = 0;

  get nextIdentifierId(): IdentifierId {
    return this.#env.nextIdentifierId;
  }

  get context(): Map<t.Identifier, SourceLocation> {
    return this.#context;
  }

  get bindings(): Bindings {
    return this.#bindings;
  }

  get environment(): Environment {
    return this.#env;
  }

  constructor(
    env: Environment,
    options?: {
      bindings?: Bindings | null;
      context?: Map<t.Identifier, SourceLocation>;
      entryBlockKind?: BlockKind;
    },
  ) {
    this.#env = env;
    this.#bindings = options?.bindings ?? new Map();
    this.#context = options?.context ?? new Map();
    this.#entry = makeBlockId(env.nextBlockId);
    this.#current = newBlock(this.#entry, options?.entryBlockKind ?? 'block');
  }

  recordError(error: CompilerDiagnostic | CompilerErrorDetail): void {
    this.#env.recordError(error);
  }

  currentBlockKind(): BlockKind {
    return this.#current.kind;
  }

  // Push a statement or expression onto the current block
  push(instruction: Instruction): void {
    this.#current.instructions.push(instruction);
    const exceptionHandler = this.#exceptionHandlerStack.at(-1);
    if (exceptionHandler !== undefined) {
      const continuationBlock = this.reserve(this.currentBlockKind());
      this.terminateWithContinuation(
        {
          kind: 'maybe-throw',
          continuation: continuationBlock.id,
          handler: exceptionHandler,
          id: makeInstructionId(0),
          loc: instruction.loc,
          effects: null,
        },
        continuationBlock,
      );
    }
  }

  enterTryCatch(handler: BlockId, fn: () => void): void {
    this.#exceptionHandlerStack.push(handler);
    fn();
    this.#exceptionHandlerStack.pop();
  }

  resolveThrowHandler(): BlockId | null {
    const handler = this.#exceptionHandlerStack.at(-1);
    return handler ?? null;
  }

  makeTemporary(loc: SourceLocation): Identifier {
    const id = this.nextIdentifierId;
    return makeTemporaryIdentifier(id, loc);
  }

  #resolveBabelBinding(
    path: NodePath<t.Identifier | t.JSXIdentifier>,
  ): Binding | null {
    const originalName = path.node.name;
    const binding = path.scope.getBinding(originalName);
    if (binding == null) {
      return null;
    }
    return binding;
  }

  /*
   * Maps an Identifier (or JSX identifier) Babel node to an internal `Identifier`
   * which represents the variable being referenced, according to the JS scoping rules.
   *
   * Because Forget does not preserve _all_ block scopes in the input (only those that
   * happen to occur from control flow), this resolution ensures that different variables
   * with the same name are mapped to a unique name. Concretely, this function maintains
   * the invariant that all references to a given variable will return an `Identifier`
   * with the same (unique for the function) `name` and `id`.
   *
   * Example:
   *
   * ```javascript
   * function foo() {
   *    const x = 0;
   *    {
   *      const x = 1;
   *    }
   *    return x;
   * }
   * ```
   *
   * The above converts as follows:
   *
   * ```
   * Const Identifier { name: 'x', id: 0 } = Primitive { value: 0 };
   * Const Identifier { name: 'x_0', id: 1 } = Primitive { value: 1 };
   * Return Identifier { name: 'x', id: 0};
   * ```
   */
  resolveIdentifier(
    path: NodePath<t.Identifier | t.JSXIdentifier>,
  ): VariableBinding {
    const originalName = path.node.name;
    const babelBinding = this.#resolveBabelBinding(path);
    if (babelBinding == null) {
      return {kind: 'Global', name: originalName};
    }

    // Check if the binding is from module scope
    const outerBinding =
      this.#env.parentFunction.scope.parent.getBinding(originalName);
    if (babelBinding === outerBinding) {
      const path = babelBinding.path;
      if (path.isImportDefaultSpecifier()) {
        const importDeclaration =
          path.parentPath as NodePath<t.ImportDeclaration>;
        return {
          kind: 'ImportDefault',
          name: originalName,
          module: importDeclaration.node.source.value,
        };
      } else if (path.isImportSpecifier()) {
        const importDeclaration =
          path.parentPath as NodePath<t.ImportDeclaration>;
        return {
          kind: 'ImportSpecifier',
          name: originalName,
          module: importDeclaration.node.source.value,
          imported:
            path.node.imported.type === 'Identifier'
              ? path.node.imported.name
              : path.node.imported.value,
        };
      } else if (path.isImportNamespaceSpecifier()) {
        const importDeclaration =
          path.parentPath as NodePath<t.ImportDeclaration>;
        return {
          kind: 'ImportNamespace',
          name: originalName,
          module: importDeclaration.node.source.value,
        };
      } else {
        return {
          kind: 'ModuleLocal',
          name: originalName,
        };
      }
    }

    const resolvedBinding = this.resolveBinding(babelBinding.identifier);
    if (resolvedBinding.name && resolvedBinding.name.value !== originalName) {
      babelBinding.scope.rename(originalName, resolvedBinding.name.value);
    }
    return {
      kind: 'Identifier',
      identifier: resolvedBinding,
      bindingKind: babelBinding.kind,
    };
  }

  isContextIdentifier(path: NodePath<t.Identifier | t.JSXIdentifier>): boolean {
    const binding = this.#resolveBabelBinding(path);
    if (binding) {
      // Check if the binding is from module scope, if so return null
      const outerBinding = this.#env.parentFunction.scope.parent.getBinding(
        path.node.name,
      );
      if (binding === outerBinding) {
        return false;
      }
      return this.#env.isContextIdentifier(binding.identifier);
    } else {
      return false;
    }
  }

  resolveBinding(node: t.Identifier): Identifier {
    if (node.name === 'fbt') {
      this.recordError(
        new CompilerErrorDetail({
          category: ErrorCategory.Todo,
          reason: 'Support local variables named `fbt`',
          description:
            'Local variables named `fbt` may conflict with the fbt plugin and are not yet supported',
          loc: node.loc ?? GeneratedSource,
          suggestions: null,
        }),
      );
    }
    if (node.name === 'this') {
      this.recordError(
        new CompilerErrorDetail({
          category: ErrorCategory.UnsupportedSyntax,
          reason: '`this` is not supported syntax',
          description:
            'React Compiler does not support compiling functions that use `this`',
          loc: node.loc ?? GeneratedSource,
          suggestions: null,
        }),
      );
    }
    const originalName = node.name;
    let name = originalName;
    let index = 0;
    while (true) {
      const mapping = this.#bindings.get(name);
      if (mapping === undefined) {
        const id = this.nextIdentifierId;
        const identifier: Identifier = {
          id,
          declarationId: makeDeclarationId(id),
          name: makeIdentifierName(name),
          mutableRange: {
            start: makeInstructionId(0),
            end: makeInstructionId(0),
          },
          scope: null,
          type: makeType(),
          loc: node.loc ?? GeneratedSource,
        };
        this.#env.programContext.addNewReference(name);
        this.#bindings.set(name, {node, identifier});
        return identifier;
      } else if (mapping.node === node) {
        return mapping.identifier;
      } else {
        name = `${originalName}_${index++}`;
      }
    }
  }

  // Construct a final CFG from this context
  build(): HIR {
    let ir: HIR = {
      blocks: this.#completed,
      entry: this.#entry,
    };
    const rpoBlocks = getReversePostorderedBlocks(ir);
    for (const [id, block] of ir.blocks) {
      if (
        !rpoBlocks.has(id) &&
        block.instructions.some(
          instr => instr.value.kind === 'FunctionExpression',
        )
      ) {
        this.recordError(
          new CompilerErrorDetail({
            reason: `Support functions with unreachable code that may contain hoisted declarations`,
            loc: block.instructions[0]?.loc ?? block.terminal.loc,
            description: null,
            suggestions: null,
            category: ErrorCategory.Todo,
          }),
        );
      }
    }
    ir.blocks = rpoBlocks;

    removeUnreachableForUpdates(ir);
    removeDeadDoWhileStatements(ir);
    removeUnnecessaryTryCatch(ir);
    markInstructionIds(ir);
    markPredecessors(ir);

    return ir;
  }

  // Terminate the current block w the given terminal, and start a new block
  terminate(terminal: Terminal, nextBlockKind: BlockKind | null): BlockId {
    const {id: blockId, kind, instructions} = this.#current;
    this.#completed.set(blockId, {
      kind,
      id: blockId,
      instructions,
      terminal,
      preds: new Set(),
      phis: new Set(),
    });
    if (nextBlockKind) {
      const nextId = this.#env.nextBlockId;
      this.#current = newBlock(nextId, nextBlockKind);
    }
    return blockId;
  }

  /*
   * Terminate the current block w the given terminal, and set the previously
   * reserved block as the new current block
   */
  terminateWithContinuation(terminal: Terminal, continuation: WipBlock): void {
    const {id: blockId, kind, instructions} = this.#current;
    this.#completed.set(blockId, {
      kind: kind,
      id: blockId,
      instructions,
      terminal: terminal,
      preds: new Set(),
      phis: new Set(),
    });
    this.#current = continuation;
  }

  /*
   * Reserve a block so that it can be referenced prior to construction.
   * Make this the current block with `terminateWithContinuation()` or
   * call `complete()` to save it without setting it as the current block.
   */
  reserve(kind: BlockKind): WipBlock {
    return newBlock(makeBlockId(this.#env.nextBlockId), kind);
  }

  // Save a previously reserved block as completed
  complete(block: WipBlock, terminal: Terminal): void {
    const {id: blockId, kind, instructions} = block;
    this.#completed.set(blockId, {
      kind,
      id: blockId,
      instructions,
      terminal,
      preds: new Set(),
      phis: new Set(),
    });
  }

  /*
   * Sets the given wip block as the current block, executes the provided callback to populate the block
   * up to its terminal, and then resets the previous actively block.
   */
  enterReserved(wip: WipBlock, fn: () => Terminal): void {
    const current = this.#current;
    this.#current = wip;
    const terminal = fn();
    const {id: blockId, kind, instructions} = this.#current;
    this.#completed.set(blockId, {
      kind,
      id: blockId,
      instructions,
      terminal,
      preds: new Set(),
      phis: new Set(),
    });
    this.#current = current;
  }

  /*
   * Create a new block and execute the provided callback with the new block
   * set as the current, resetting to the previously active block upon exit.
   * The lambda must return a terminal node, which is used to terminate the
   * newly constructed block.
   */
  enter(nextBlockKind: BlockKind, fn: (blockId: BlockId) => Terminal): BlockId {
    const wip = this.reserve(nextBlockKind);
    this.enterReserved(wip, () => {
      return fn(wip.id);
    });
    return wip.id;
  }

  label<T>(label: string, breakBlock: BlockId, fn: () => T): T {
    this.#scopes.push({
      kind: 'label',
      breakBlock,
      label,
    });
    const value = fn();
    const last = this.#scopes.pop();
    CompilerError.invariant(
      last != null &&
        last.kind === 'label' &&
        last.label === label &&
        last.breakBlock === breakBlock,
      {
        reason: 'Mismatched label',
        loc: GeneratedSource,
      },
    );
    return value;
  }

  switch<T>(label: string | null, breakBlock: BlockId, fn: () => T): T {
    this.#scopes.push({
      kind: 'switch',
      breakBlock,
      label,
    });
    const value = fn();
    const last = this.#scopes.pop();
    CompilerError.invariant(
      last != null &&
        last.kind === 'switch' &&
        last.label === label &&
        last.breakBlock === breakBlock,
      {
        reason: 'Mismatched label',
        loc: GeneratedSource,
      },
    );
    return value;
  }

  /*
   * Executes the provided lambda inside a scope in which the provided loop
   * information is cached for lookup with `lookupBreak()` and `lookupContinue()`
   */
  loop<T>(
    label: string | null,
    // block of the loop body. "continue" jumps here.
    continueBlock: BlockId,
    // block following the loop. "break" jumps here.
    breakBlock: BlockId,
    fn: () => T,
  ): T {
    this.#scopes.push({
      kind: 'loop',
      label,
      continueBlock,
      breakBlock,
    });
    const value = fn();
    const last = this.#scopes.pop();
    CompilerError.invariant(
      last != null &&
        last.kind === 'loop' &&
        last.label === label &&
        last.continueBlock === continueBlock &&
        last.breakBlock === breakBlock,
      {
        reason: 'Mismatched loops',
        loc: GeneratedSource,
      },
    );
    return value;
  }

  /*
   * Lookup the block target for a break statement, based on loops and switch statements
   * in scope. Throws if there is no available location to break.
   */
  lookupBreak(label: string | null): BlockId {
    for (let ii = this.#scopes.length - 1; ii >= 0; ii--) {
      const scope = this.#scopes[ii];
      if (
        (label === null &&
          (scope.kind === 'loop' || scope.kind === 'switch')) ||
        label === scope.label
      ) {
        return scope.breakBlock;
      }
    }
    CompilerError.invariant(false, {
      reason: 'Expected a loop or switch to be in scope',
      loc: GeneratedSource,
    });
  }

  /*
   * Lookup the block target for a continue statement, based on loops
   * in scope. Throws if there is no available location to continue, or if the given
   * label does not correspond to a loop (this should also be validated at parse time).
   */
  lookupContinue(label: string | null): BlockId {
    for (let ii = this.#scopes.length - 1; ii >= 0; ii--) {
      const scope = this.#scopes[ii];
      if (scope.kind === 'loop') {
        if (label === null || label === scope.label) {
          return scope.continueBlock;
        }
      } else if (label !== null && scope.label === label) {
        CompilerError.invariant(false, {
          reason: 'Continue may only refer to a labeled loop',
          loc: GeneratedSource,
        });
      }
    }
    CompilerError.invariant(false, {
      reason: 'Expected a loop to be in scope',
      loc: GeneratedSource,
    });
  }
}

// Helper to shrink a CFG eliminate jump-only blocks.
function _shrink(func: HIR): void {
  const gotos = new Map();
  /*
   * Given a target block for some terminator, resolves the ideal block that should be
   * targeted instead. This transitively resolves any blocks that are simple indirections
   * (empty blocks that terminate in a goto).
   */
  function resolveBlockTarget(blockId: BlockId): BlockId {
    let target = gotos.get(blockId) ?? null;
    if (target !== null) {
      return target;
    }
    const block = func.blocks.get(blockId);
    CompilerError.invariant(block != null, {
      reason: `expected block ${blockId} to exist`,
      loc: GeneratedSource,
    });
    target = getTargetIfIndirection(block);
    if (target !== null) {
      //  the target might also be a simple goto, recurse
      target = resolveBlockTarget(target) ?? target;
      gotos.set(blockId, target);
      return target;
    } else {
      //  If the block wasn't an indirection, return the original input.
      return blockId;
    }
  }

  const queue = [func.entry];
  const reachable = new Set<BlockId>();
  while (queue.length !== 0) {
    const blockId = queue.shift()!;
    if (reachable.has(blockId)) {
      continue;
    }
    reachable.add(blockId);
    const block = func.blocks.get(blockId)!;
    block.terminal = mapTerminalSuccessors(block.terminal, prevTarget => {
      const target = resolveBlockTarget(prevTarget);
      queue.push(target);
      return target;
    });
  }
  for (const [blockId] of func.blocks) {
    if (!reachable.has(blockId)) {
      func.blocks.delete(blockId);
    }
  }
}

export function removeUnreachableForUpdates(fn: HIR): void {
  for (const [, block] of fn.blocks) {
    if (
      block.terminal.kind === 'for' &&
      block.terminal.update !== null &&
      !fn.blocks.has(block.terminal.update)
    ) {
      block.terminal.update = null;
    }
  }
}

export function removeDeadDoWhileStatements(func: HIR): void {
  const visited: Set<BlockId> = new Set();
  for (const [_, block] of func.blocks) {
    visited.add(block.id);
  }

  /*
   * If the test condition of a DoWhile is unreachable, the terminal is effectively deadcode and we
   * can just inline the loop body. We replace the terminal with a goto to the loop block and
   * MergeConsecutiveBlocks figures out how to merge as appropriate.
   */
  for (const [_, block] of func.blocks) {
    if (block.terminal.kind === 'do-while') {
      if (!visited.has(block.terminal.test)) {
        block.terminal = {
          kind: 'goto',
          block: block.terminal.loop,
          variant: GotoVariant.Break,
          id: block.terminal.id,
          loc: block.terminal.loc,
        };
      }
    }
  }
}

/*
 * Converts the graph to reverse-postorder, with predecessor blocks appearing
 * before successors except in the case of back edges (ie loops).
 */
export function reversePostorderBlocks(func: HIR): void {
  const rpoBlocks = getReversePostorderedBlocks(func);
  func.blocks = rpoBlocks;
}

/**
 * Returns a mapping of BlockId => BasicBlock where the insertion order of the map
 * has blocks in reverse-postorder, with predecessor blocks appearing before successors
 * except in the case of back edges (ie loops). Note that not all blocks in the input
 * may be in the output: blocks will be removed in the case of unreachable code in
 * the input.
 */
function getReversePostorderedBlocks(func: HIR): HIR['blocks'] {
  const visited: Set<BlockId> = new Set();
  const used: Set<BlockId> = new Set();
  const usedFallthroughs: Set<BlockId> = new Set();
  const postorder: Array<BlockId> = [];
  function visit(blockId: BlockId, isUsed: boolean): void {
    const wasUsed = used.has(blockId);
    const wasVisited = visited.has(blockId);
    visited.add(blockId);
    if (isUsed) {
      used.add(blockId);
    }
    if (wasVisited && (wasUsed || !isUsed)) {
      return;
    }

    /*
     * Note that we visit successors in reverse order. This ensures that when we
     * reverse the list at the end, that "sibling" edges appear in-order. For example,
     * ```
     * // bb0
     * let x;
     * if (c) {
     *    // bb1
     *    x = 1;
     * } else {
     *    // bb2
     *    x = 2;
     * }
     * // bb3
     * x;
     * ```
     *
     * We want the output to be bb0, bb1, bb2, bb3 just to line up with the original
     * program order for visual debugging. By visiting the successors in reverse order
     * (eg bb2 then bb1), we ensure that they get reversed back to the correct order.
     */
    const block = func.blocks.get(blockId)!;
    CompilerError.invariant(block != null, {
      reason: '[HIRBuilder] Unexpected null block',
      description: `expected block ${blockId} to exist`,
      loc: GeneratedSource,
    });
    const successors = [...eachTerminalSuccessor(block.terminal)].reverse();
    const fallthrough = terminalFallthrough(block.terminal);

    /**
     * Fallthrough blocks are only used to record original program block structure. If the
     * fallthrough is actually reachable, it will be reached through terminal successors.
     * To retain program structure, we visit fallthrough blocks first (marking them as not
     * actually used yet) to ensure their block IDs emitted in the correct order.
     */
    if (fallthrough != null) {
      if (isUsed) {
        usedFallthroughs.add(fallthrough);
      }
      visit(fallthrough, false);
    }
    for (const successor of successors) {
      visit(successor, isUsed);
    }

    if (!wasVisited) {
      postorder.push(blockId);
    }
  }
  visit(func.entry, true);
  const blocks = new Map<BlockId, BasicBlock>();
  for (const blockId of postorder.reverse()) {
    const block = func.blocks.get(blockId)!;
    if (used.has(blockId)) {
      blocks.set(blockId, func.blocks.get(blockId)!);
    } else if (usedFallthroughs.has(blockId)) {
      blocks.set(blockId, {
        ...block,
        instructions: [],
        terminal: {
          kind: 'unreachable',
          id: block.terminal.id,
          loc: block.terminal.loc,
        },
      });
    }
    // otherwise this block is unreachable
  }

  return blocks;
}

export function markInstructionIds(func: HIR): void {
  let id = 0;
  const visited = new Set<Instruction>();
  for (const [_, block] of func.blocks) {
    for (const instr of block.instructions) {
      CompilerError.invariant(!visited.has(instr), {
        reason: `${printInstruction(instr)} already visited!`,
        loc: instr.loc,
      });
      visited.add(instr);
      instr.id = makeInstructionId(++id);
    }
    block.terminal.id = makeInstructionId(++id);
  }
}

export function markPredecessors(func: HIR): void {
  for (const [, block] of func.blocks) {
    block.preds.clear();
  }
  const visited: Set<BlockId> = new Set();
  function visit(blockId: BlockId, prevBlock: BasicBlock | null): void {
    const block = func.blocks.get(blockId)!;
    if (block == null) {
      return;
    }
    CompilerError.invariant(block != null, {
      reason: 'unexpected missing block',
      description: `block ${blockId}`,
      loc: GeneratedSource,
    });
    if (prevBlock) {
      block.preds.add(prevBlock.id);
    }

    if (visited.has(blockId)) {
      return;
    }
    visited.add(blockId);

    const {terminal} = block;

    for (const successor of eachTerminalSuccessor(terminal)) {
      visit(successor, block);
    }
  }
  visit(func.entry, null);
}

/*
 * If the given block is a simple indirection — empty terminated with a goto(break) —
 * returns the block being pointed to. Otherwise returns null.
 */
function getTargetIfIndirection(block: BasicBlock): number | null {
  return block.instructions.length === 0 &&
    block.terminal.kind === 'goto' &&
    block.terminal.variant === GotoVariant.Break
    ? block.terminal.block
    : null;
}

/*
 * Finds try terminals where the handler is unreachable, and converts the try
 * to a goto(terminal.block)
 */
export function removeUnnecessaryTryCatch(fn: HIR): void {
  for (const [, block] of fn.blocks) {
    if (
      block.terminal.kind === 'try' &&
      !fn.blocks.has(block.terminal.handler)
    ) {
      const handlerId = block.terminal.handler;
      const fallthroughId = block.terminal.fallthrough;
      const fallthrough = fn.blocks.get(fallthroughId);
      block.terminal = {
        kind: 'goto',
        block: block.terminal.block,
        id: makeInstructionId(0),
        loc: block.terminal.loc,
        variant: GotoVariant.Break,
      };

      if (fallthrough != null) {
        if (fallthrough.preds.size === 1 && fallthrough.preds.has(handlerId)) {
          // delete fallthrough
          fn.blocks.delete(fallthroughId);
        } else {
          fallthrough.preds.delete(handlerId);
        }
      }
    }
  }
}

export function createTemporaryPlace(
  env: Environment,
  loc: SourceLocation,
): Place {
  return {
    kind: 'Identifier',
    identifier: makeTemporaryIdentifier(env.nextIdentifierId, loc),
    reactive: false,
    effect: Effect.Unknown,
    loc: GeneratedSource,
  };
}

/**
 * Clones an existing Place, returning a new temporary Place that shares the
 * same metadata properties as the original place (effect, reactive flag, type)
 * but has a new, temporary Identifier.
 */
export function clonePlaceToTemporary(env: Environment, place: Place): Place {
  const temp = createTemporaryPlace(env, place.loc);
  temp.effect = place.effect;
  temp.identifier.type = place.identifier.type;
  temp.reactive = place.reactive;
  return temp;
}

/**
 * Fix scope and identifier ranges to account for renumbered instructions
 */
export function fixScopeAndIdentifierRanges(func: HIR): void {
  for (const [, block] of func.blocks) {
    const terminal = block.terminal;
    if (terminal.kind === 'scope' || terminal.kind === 'pruned-scope') {
      /*
       * Scope ranges should always align to start at the 'scope' terminal
       * and end at the first instruction of the fallthrough block
       */
      const fallthroughBlock = func.blocks.get(terminal.fallthrough)!;
      const firstId =
        fallthroughBlock.instructions[0]?.id ?? fallthroughBlock.terminal.id;
      terminal.scope.range.start = terminal.id;
      terminal.scope.range.end = firstId;
    }
  }
}
