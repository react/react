/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type * as BabelCore from '@babel/core';
import {hasReactLikeFunctions} from './prefilter';
import {compileWithRust, type BindingRenameInfo} from './bridge';
import {extractScopeInfo} from './scope';
import {resolveOptions, type PluginOptions} from './options';

export default function BabelPluginReactCompilerRust(
  _babel: typeof BabelCore,
): BabelCore.PluginObj {
  let compiledProgram = false;
  return {
    name: 'react-compiler-rust',
    visitor: {
      Program: {
        enter(prog, pass): void {
          // Guard against re-entry: replaceWith() below causes Babel
          // to re-traverse the new Program, which would re-trigger this
          // handler. Skip if we've already compiled.
          if (compiledProgram) {
            return;
          }
          compiledProgram = true;
          const filename = pass.filename ?? null;

          // Step 1: Resolve options (pre-resolve JS-only values)
          const opts = resolveOptions(
            pass.opts as PluginOptions,
            pass.file,
            filename,
            pass.file.ast,
          );

          // Step 2: Quick bail — should we compile this file at all?
          if (!opts.shouldCompile) {
            return;
          }

          // Step 3: Pre-filter — any potential React functions?
          // Skip prefilter when compilationMode is 'all' (compiles all functions)
          if (opts.compilationMode !== 'all' && !hasReactLikeFunctions(prog)) {
            return;
          }

          // Step 4: Extract scope info
          const logger = (pass.opts as PluginOptions).logger;
          let scopeInfo;
          try {
            scopeInfo = extractScopeInfo(prog);
          } catch (e) {
            // Scope extraction can fail on unsupported syntax (e.g., reserved
            // word as binding name). Report as CompileUnexpectedThrow +
            // CompileError, matching TS compiler behavior.
            const errMsg = e instanceof Error ? e.message : String(e);
            const dotIdx = errMsg.indexOf('. ');
            const reason = dotIdx >= 0 ? errMsg.substring(0, dotIdx) : errMsg;
            let description: string | undefined =
              dotIdx >= 0 ? errMsg.substring(dotIdx + 2) : undefined;
            if (description?.endsWith('.')) {
              description = description.slice(0, -1);
            }
            if (logger) {
              logger.logEvent(filename, {
                kind: 'CompileUnexpectedThrow',
                data: `Error: ${errMsg}`,
              });
              logger.logEvent(filename, {
                kind: 'CompileError',
                detail: {
                  reason,
                  severity: 'Error',
                  category: 'Syntax',
                  description: description ?? null,
                  suggestions: null,
                  details: [
                    {
                      kind: 'error',
                      loc: null,
                      message: 'reserved word',
                    },
                  ],
                },
              });
            }
            const panicThreshold = (pass.opts as PluginOptions).panicThreshold;
            if (
              panicThreshold === 'all_errors' ||
              panicThreshold === 'critical_errors'
            ) {
              const heading = 'Error';
              const parts = [`${heading}: ${reason}`];
              if (description != null) {
                parts.push(`\n\n${description}.`);
              }
              const formatted = `Found 1 error:\n\n${parts.join('')}`;
              const err = new Error(formatted);
              (err as any).details = [];
              throw err;
            }
            return;
          }

          // Step 5: Call Rust compiler
          const optsForRust =
            (logger as any)?.debugLogIRs != null
              ? {...opts, __debug: true}
              : opts;
          const result = compileWithRust(
            pass.file.ast,
            scopeInfo,
            optsForRust,
            pass.file.code ?? null,
          );

          // Step 6: Forward logger events and debug logs via orderedLog
          if (logger && result.orderedLog && result.orderedLog.length > 0) {
            for (const item of result.orderedLog) {
              if (item.type === 'event') {
                logger.logEvent(filename, item.event);
              } else if (item.type === 'debug' && logger.debugLogIRs) {
                logger.debugLogIRs(item.entry);
              }
            }
          } else if (logger && result.events) {
            for (const event of result.events) {
              logger.logEvent(filename, event);
            }
          }

          // Step 7: Handle result
          if (result.kind === 'error') {
            const message =
              (result.error as any).rawMessage ??
              (result.error as any).formattedMessage ??
              'Unexpected compiler error';
            const err = new Error(message);
            (err as any).details = result.error.details;
            throw err;
          }

          if (result.ast != null) {
            // Replace the program with Rust's compiled output.
            const newFile = result.ast as any;
            const newProgram = newFile.program ?? newFile;

            // After JSON round-tripping through Rust, comment objects that were
            // shared by reference in Babel's AST (e.g., a comment between two
            // statements appears as trailingComments on stmt A and leadingComments
            // on stmt B, sharing the same JS object) become separate objects.
            // Babel's generator uses reference identity to avoid printing the
            // same comment twice. We restore sharing by deduplicating: for each
            // unique comment position, we keep one canonical object and replace
            // all duplicates with references to it.
            deduplicateComments(newProgram);

            // Use Babel's replaceWith() API so that subsequent plugins
            // (babel-plugin-fbt, babel-plugin-fbt-runtime, babel-plugin-idx)
            // properly traverse the new AST. Direct assignment to
            // pass.file.ast.program bypasses Babel's traversal tracking,
            // and prog.skip() would prevent all merged plugin visitors from
            // running on the new children.
            pass.file.ast.comments = [];
            prog.replaceWith(newProgram);
          }

          // Apply variable renames from lowering to the Babel AST.
          // Must run AFTER the AST replacement so that scope.rename()
          // operates on the compiled output, not the original (discarded) AST.
          if (result.renames != null && result.renames.length > 0) {
            applyRenames(prog, result.renames);
          }
        },
      },
    },
  };
}

/**
 * Deduplicate comments across AST nodes after JSON round-tripping.
 *
 * Babel's parser attaches the same comment object to multiple nodes
 * (e.g., as trailingComments on node A and leadingComments on node B).
 * The code generator uses reference identity (`===`) to avoid printing
 * a comment twice. After JSON serialization/deserialization through Rust,
 * these shared references become separate objects with identical content.
 *
 * This function walks the AST, finds comments with the same (start, end)
 * position, and replaces duplicates with references to a single canonical
 * object, restoring the sharing that Babel expects.
 */
/**
 * Apply variable renames from the Rust compiler's lowering phase to the Babel AST.
 *
 * During lowering, the Rust compiler renames variables that shadow outer bindings
 * (e.g., an inner function parameter `ref` that shadows an outer `ref` becomes `ref_0`).
 * In the TS compiler, this is done via Babel's `scope.rename()` during HIRBuilder.
 * Since the Rust compiler doesn't have access to Babel's scope API, it records the
 * renames and returns them here for the Babel plugin to apply.
 */
function applyRenames(
  prog: BabelCore.NodePath<BabelCore.types.Program>,
  renames: Array<BindingRenameInfo>,
): void {
  // Build a map from declaration start position to rename info
  const renamesByPos = new Map<number, BindingRenameInfo>();
  for (const rename of renames) {
    renamesByPos.set(rename.declarationStart, rename);
  }

  // Traverse all scopes to find bindings that match by position
  prog.traverse({
    Scope(path: BabelCore.NodePath) {
      const scope = path.scope;
      for (const [name, binding] of Object.entries(
        scope.bindings as Record<string, any>,
      )) {
        const start = binding.identifier.start;
        if (start != null) {
          const rename = renamesByPos.get(start);
          if (rename != null && name === rename.original) {
            scope.rename(rename.original, rename.renamed);
            renamesByPos.delete(start);
          }
        }
      }
    },
  } as BabelCore.Visitor);
}

function deduplicateComments(node: any): void {
  // Map from "start:end" to canonical comment object
  const canonical = new Map<string, any>();

  function dedup(comments: any[]): any[] {
    return comments.map(c => {
      const key = `${c.start}:${c.end}`;
      const existing = canonical.get(key);
      if (existing != null) {
        return existing;
      }
      canonical.set(key, c);
      return c;
    });
  }

  function visit(n: any): void {
    if (n == null || typeof n !== 'object') return;
    if (Array.isArray(n)) {
      for (const item of n) {
        visit(item);
      }
      return;
    }
    if (n.leadingComments) {
      n.leadingComments = dedup(n.leadingComments);
    }
    if (n.trailingComments) {
      n.trailingComments = dedup(n.trailingComments);
    }
    if (n.innerComments) {
      n.innerComments = dedup(n.innerComments);
    }
    for (const key of Object.keys(n)) {
      if (
        key === 'leadingComments' ||
        key === 'trailingComments' ||
        key === 'innerComments' ||
        key === 'start' ||
        key === 'end' ||
        key === 'loc'
      ) {
        continue;
      }
      visit(n[key]);
    }
  }

  visit(node);
}
