/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Debug error printer for the Rust port testing infrastructure.
 *
 * Prints a detailed representation of CompilerError/CompilerDiagnostic objects,
 * including all fields: category, severity, reason, description, loc,
 * suggestions, and nested details.
 *
 * Format matches the testing infrastructure plan:
 *
 * Error:
 *   category: InvalidReact
 *   severity: InvalidReact
 *   reason: "Hooks must be called unconditionally"
 *   description: "Cannot call a hook (useState) conditionally"
 *   loc: 3:4-3:20
 *   suggestions: []
 *   details:
 *     - kind: error
 *       loc: 2:2-5:3
 *       message: "This is a conditional"
 */

/**
 * Format a source location for debug output.
 * @param {object|symbol|null} loc
 * @returns {string}
 */
export function formatSourceLocation(loc) {
  if (loc == null || typeof loc === "symbol") {
    return "generated";
  }
  return `${loc.start.line}:${loc.start.column}-${loc.end.line}:${loc.end.column}`;
}

/**
 * Format a CompilerError (with details array) into a debug string.
 * @param {object} error - A CompilerError instance
 * @returns {string}
 */
export function debugPrintError(error) {
  const lines = [];

  if (error.details && error.details.length > 0) {
    for (const detail of error.details) {
      lines.push("Error:");
      lines.push(`  category: ${detail.category ?? "unknown"}`);
      lines.push(`  severity: ${detail.severity ?? "unknown"}`);
      lines.push(`  reason: ${JSON.stringify(detail.reason ?? "")}`);

      if (detail.description != null) {
        lines.push(`  description: ${JSON.stringify(detail.description)}`);
      } else {
        lines.push(`  description: null`);
      }

      // Handle loc: CompilerDiagnostic uses primaryLocation(), CompilerErrorDetail uses .loc
      const loc =
        typeof detail.primaryLocation === "function"
          ? detail.primaryLocation()
          : detail.loc;
      lines.push(`  loc: ${formatSourceLocation(loc)}`);

      const suggestions = detail.suggestions ?? [];
      if (suggestions.length === 0) {
        lines.push(`  suggestions: []`);
      } else {
        lines.push(`  suggestions:`);
        for (const s of suggestions) {
          lines.push(`    - op: ${s.op}`);
          lines.push(`      range: [${s.range[0]}, ${s.range[1]}]`);
          lines.push(`      description: ${JSON.stringify(s.description)}`);
          if (s.text != null) {
            lines.push(`      text: ${JSON.stringify(s.text)}`);
          }
        }
      }

      // Handle details array for CompilerDiagnostic (new-style errors)
      if (
        detail.options &&
        detail.options.details &&
        detail.options.details.length > 0
      ) {
        lines.push(`  details:`);
        for (const d of detail.options.details) {
          if (d.kind === "error") {
            lines.push(`    - kind: error`);
            lines.push(`      loc: ${formatSourceLocation(d.loc)}`);
            lines.push(`      message: ${JSON.stringify(d.message)}`);
          } else if (d.kind === "hint") {
            lines.push(`    - kind: hint`);
            lines.push(`      message: ${JSON.stringify(d.message)}`);
          }
        }
      }
    }
  } else {
    lines.push("Error:");
    lines.push(`  message: ${JSON.stringify(error.message)}`);
  }

  return lines.join("\n") + "\n";
}
