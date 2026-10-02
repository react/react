/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  diagnosticCatalog,
  type DiagnosticExplanation,
} from '../diagnostics/catalog';

/**
 * Input to `explainCompilerDiagnostic`. The LLM either supplies a formatted
 * message (as returned by the `compile` tool) and the function uses regex
 * patterns from the catalog to identify the rule, or it supplies the rule
 * name directly for an exact-key lookup. `codeContext` is optional source
 * code that produced the diagnostic — it is currently unused by the
 * matching logic but is accepted so the LLM does not have to drop it.
 */
/**
 * Input to `explainCompilerDiagnostic`. The LLM either supplies a formatted
 * message (as returned by the `compile` tool) and the function uses regex
 * patterns from the catalog to identify the rule, or it supplies the rule
 * name directly for an exact-key lookup. `codeContext` is optional source
 * code that produced the diagnostic — it is currently unused by the
 * matching logic but is accepted so the LLM does not have to drop it.
 */
export type ExplainCompilerDiagnosticInput = {
  /** Formatted diagnostic message exactly as returned by the `compile` tool. */
  message: string;
  /** Optional source code that produced the diagnostic. Currently informational. */
  codeContext?: string;
  /** Optional rule name from babel-plugin-react-compiler's `ErrorCategory` enum. */
  rule?: string;
};

/**
 * Result of `explainCompilerDiagnostic`. A `matched` result carries the full
 * `DiagnosticExplanation` from the catalog. An `unmatched` result carries the
 * raw message and a generic guidance string the LLM can use to investigate
 * further (search docs, look at `ErrorCategory`, etc.).
 */
export type ExplainCompilerDiagnosticResult =
  | {
      kind: 'matched';
      explanation: DiagnosticExplanation;
    }
  | {
      kind: 'unmatched';
      message: string;
      genericGuidance: string;
    };

/**
 * Guidance shown to the LLM when no catalog entry matches. Designed to push
 * the LLM toward something useful (docs search, source-of-truth pointer)
 * rather than admitting defeat.
 */
const GENERIC_GUIDANCE = `I do not have a curated explanation for this React Compiler diagnostic yet.

To investigate, try:
1. Search the React docs (https://react.dev) for keywords from the message.
2. Look up the rule in the React Compiler source:
   compiler/packages/babel-plugin-react-compiler/src/CompilerError.ts
   (the \`ErrorCategory\` enum lists every rule name).
3. If you can identify the rule name, pass it as the \`rule\` parameter
   to this tool for an exact lookup once it has been added to the catalog.

You can also open an issue at https://github.com/facebook/react/issues
with a minimal reproduction so the rule can be added to a future version
of this catalog.`;

/**
 * Look up a plain-English explanation for a React Compiler diagnostic.
 *
 * Matching strategy:
 *  1. If `rule` is provided and the catalog has an entry with that key,
 *     return it directly.
 *  2. Otherwise, iterate the catalog in insertion order and test each
 *     entry's `messagePatterns` against `message` (case-insensitive). The
 *     first entry with any matching pattern wins.
 *  3. If no rule or pattern matches, return the unmatched result.
 *
 * The function is pure — it does not import the MCP SDK, do I/O, or depend
 * on Node APIs — so it can be unit tested in isolation.
 */
export function explainCompilerDiagnostic(
  input: ExplainCompilerDiagnosticInput,
): ExplainCompilerDiagnosticResult {
  if (input.rule != null && input.rule.length > 0) {
    const direct = diagnosticCatalog.get(input.rule);
    if (direct != null) {
      return {kind: 'matched', explanation: direct};
    }
  }

  for (const explanation of diagnosticCatalog.values()) {
    for (const patternSource of explanation.messagePatterns) {
      const re = new RegExp(patternSource, 'i');
      if (re.test(input.message)) {
        return {kind: 'matched', explanation};
      }
    }
  }

  return {
    kind: 'unmatched',
    message: input.message,
    genericGuidance: GENERIC_GUIDANCE,
  };
}
