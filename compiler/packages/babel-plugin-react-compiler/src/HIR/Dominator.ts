/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import prettyFormat from 'pretty-format';
import {CompilerError} from '../CompilerError';
import {BlockId, GeneratedSource, HIRFunction} from './HIR';
import {eachTerminalSuccessor} from './visitors';

/*
 * Computes the dominator tree of the given function. The returned `Dominator` stores the immediate
 * dominator of each node in the function, which can be retrieved with `Dominator.prototype.get()`.
 *
 * A block X dominates block Y in the CFG if all paths to Y must flow through X. Thus the entry
 * block dominates all other blocks. See https://en.wikipedia.org/wiki/Dominator_(graph_theory)
 * for more.
 */
export function computeDominatorTree(fn: HIRFunction): Dominator<BlockId> {
  const graph = buildGraph(fn);
  const nodes = computeImmediateDominators(graph);
  return new Dominator(graph.entry, nodes);
}

/*
 * Similar to `computeDominatorTree()` but computes the post dominators of the function. The returned
 * `PostDominator` stores the immediate post-dominators of each node in the function.
 *
 * A block Y post-dominates block X in the CFG if all paths from X to the exit must flow through Y.
 * The caller must specify whether to consider `throw` statements as exit nodes. If set to false,
 * only return statements are considered exit nodes.
 */
export function computePostDominatorTree(
  fn: HIRFunction,
  options: {includeThrowsAsExitNode: boolean},
): PostDominator<BlockId> {
  const graph = buildReverseGraph(fn, options.includeThrowsAsExitNode);
  const nodes = computeImmediateDominators(graph);

  /*
   * When options.includeThrowsAsExitNode is false, nodes that flow into a throws
   * terminal and don't reach the exit node won't be in the node map. Add them
   * with themselves as dominator to reflect that they don't flow into the exit.
   */
  if (!options.includeThrowsAsExitNode) {
    for (const [id] of fn.body.blocks) {
      if (!nodes.has(id)) {
        nodes.set(id, id);
      }
    }
  }
  return new PostDominator(graph.entry, nodes);
}

type Node<T> = {
  id: T;
  index: number;
  preds: Set<T>;
  succs: Set<T>;
};
type Graph<T> = {
  entry: T;
  nodes: Map<T, Node<T>>;
};

// A dominator tree that stores the immediate dominator for each block in function.
export class Dominator<T> {
  #entry: T;
  #nodes: Map<T, T>;

  constructor(entry: T, nodes: Map<T, T>) {
    this.#entry = entry;
    this.#nodes = nodes;
  }

  // Returns the entry node
  get entry(): T {
    return this.#entry;
  }

  /*
   * Returns the immediate dominator of the block with @param id if present. Returns null
   * if there is no immediate dominator (ie if the dominator is @param id itself).
   */
  get(id: T): T | null {
    const dominator = this.#nodes.get(id);
    CompilerError.invariant(dominator !== undefined, {
      reason: 'Unknown node',
      loc: GeneratedSource,
    });
    return dominator === id ? null : dominator;
  }

  debug(): string {
    const dominators = new Map();
    for (const [key, value] of this.#nodes) {
      dominators.set(`bb${key}`, `bb${value}`);
    }
    return prettyFormat({
      entry: `bb${this.#entry}`,
      dominators,
    });
  }
}

export class PostDominator<T> {
  #exit: T;
  #nodes: Map<T, T>;

  constructor(exit: T, nodes: Map<T, T>) {
    this.#exit = exit;
    this.#nodes = nodes;
  }

  // Returns the node representing normal exit from the function, ie return terminals.
  get exit(): T {
    return this.#exit;
  }

  /*
   * Returns the immediate dominator of the block with @param id if present. Returns null
   * if there is no immediate dominator (ie if the dominator is @param id itself).
   */
  get(id: T): T | null {
    const dominator = this.#nodes.get(id);
    CompilerError.invariant(dominator !== undefined, {
      reason: 'Unknown node',
      loc: GeneratedSource,
    });
    return dominator === id ? null : dominator;
  }

  debug(): string {
    const postDominators = new Map();
    for (const [key, value] of this.#nodes) {
      postDominators.set(`bb${key}`, `bb${value}`);
    }
    return prettyFormat({
      exit: `bb${this.exit}`,
      postDominators,
    });
  }
}

/*
 * The implementation is a straightforward adaptation of https://www.cs.rice.edu/~keith/Embed/dom.pdf
 * except that CFG nodes ordering is inverted (so the comparison functions are swapped)
 */
function computeImmediateDominators<T>(graph: Graph<T>): Map<T, T> {
  const nodes: Map<T, T> = new Map();
  nodes.set(graph.entry, graph.entry);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, node] of graph.nodes) {
      // Skip start node
      if (node.id === graph.entry) {
        continue;
      }

      // first processed predecessor
      let newIdom: T | null = null;
      for (const pred of node.preds) {
        if (nodes.has(pred)) {
          newIdom = pred;
          break;
        }
      }
      CompilerError.invariant(newIdom !== null, {
        reason: `At least one predecessor must have been visited for block ${id}`,
        loc: GeneratedSource,
      });

      for (const pred of node.preds) {
        // For all other predecessors
        if (pred === newIdom) {
          continue;
        }
        const predDom = nodes.get(pred);
        if (predDom !== undefined) {
          newIdom = intersect(pred, newIdom, graph, nodes);
        }
      }

      if (nodes.get(id) !== newIdom) {
        nodes.set(id, newIdom);
        changed = true;
      }
    }
  }
  return nodes;
}

function intersect<T>(a: T, b: T, graph: Graph<T>, nodes: Map<T, T>): T {
  let block1: Node<T> = graph.nodes.get(a)!;
  let block2: Node<T> = graph.nodes.get(b)!;
  while (block1 !== block2) {
    while (block1.index > block2.index) {
      const dom = nodes.get(block1.id)!;
      block1 = graph.nodes.get(dom)!;
    }
    while (block2.index > block1.index) {
      const dom = nodes.get(block2.id)!;
      block2 = graph.nodes.get(dom)!;
    }
  }
  return block1.id;
}

// Turns the HIRFunction into a simplified internal form that is shared for dominator/post-dominator computation
function buildGraph(fn: HIRFunction): Graph<BlockId> {
  const graph: Graph<BlockId> = {entry: fn.body.entry, nodes: new Map()};
  let index = 0;
  for (const [id, block] of fn.body.blocks) {
    graph.nodes.set(id, {
      id,
      index: index++,
      preds: block.preds,
      succs: new Set(eachTerminalSuccessor(block.terminal)),
    });
  }
  return graph;
}

/*
 *  Turns the HIRFunction into a simplified internal form that is shared for dominator/post-dominator computation,
 * notably this version flips the graph and puts the reversed form back into RPO (such that successors are before predecessors).
 * Note that RPO of the reversed graph isn't the same as reversed RPO of the forward graph because of loops.
 */
function buildReverseGraph(
  fn: HIRFunction,
  includeThrowsAsExitNode: boolean,
): Graph<BlockId> {
  const nodes: Map<BlockId, Node<BlockId>> = new Map();
  const exitId = fn.env.nextBlockId;
  const exit: Node<BlockId> = {
    id: exitId,
    index: 0,
    preds: new Set(),
    succs: new Set(),
  };
  nodes.set(exitId, exit);

  for (const [id, block] of fn.body.blocks) {
    const node: Node<BlockId> = {
      id,
      index: 0,
      preds: new Set(eachTerminalSuccessor(block.terminal)),
      succs: new Set(block.preds),
    };
    if (block.terminal.kind === 'return') {
      node.preds.add(exitId);
      exit.succs.add(id);
    } else if (block.terminal.kind === 'throw' && includeThrowsAsExitNode) {
      node.preds.add(exitId);
      exit.succs.add(id);
    }
    nodes.set(id, node);
  }

  // Put nodes into RPO form
  const visited = new Set<BlockId>();
  const postorder: Array<BlockId> = [];
  function visit(id: BlockId): void {
    if (visited.has(id)) {
      return;
    }
    visited.add(id);
    const node = nodes.get(id)!;
    for (const successor of node.succs) {
      visit(successor);
    }
    postorder.push(id);
  }
  visit(exitId);

  const rpo: Graph<BlockId> = {entry: exitId, nodes: new Map()};
  let index = 0;
  for (const id of postorder.reverse()) {
    const node = nodes.get(id)!;
    node.index = index++;
    rpo.nodes.set(id, node);
  }
  return rpo;
}
