/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {SourceLocation as BabelSourceLocation} from '@babel/types';
import {
  CompilerSuggestionOperation,
  type CompileErrorDetail,
} from 'babel-plugin-react-compiler/src';
import type {Linter, Rule} from 'eslint';
import runReactCompiler, {RunCacheEntry} from '../shared/RunReactCompiler';
import {
  ErrorSeverity,
  LintRulePreset,
  LintRules,
  type LintRule,
} from 'babel-plugin-react-compiler/src/CompilerError';

function assertExhaustive(_: never, errorMsg: string): never {
  throw new Error(errorMsg);
}

/**
 * Get the primary source location from a CompileErrorDetail.
 * Handles both the new format (details array) and legacy format (flat loc).
 */
function primaryLocation(
  detail: CompileErrorDetail,
): BabelSourceLocation | null {
  if (detail.details != null) {
    const firstError = detail.details.find(d => d.kind === 'error');
    if (firstError != null) {
      return firstError.loc ?? null;
    }
  }
  return detail.loc ?? null;
}

/**
 * Format an error message from a CompileErrorDetail, matching the old
 * CompilerErrorDetail.printErrorMessage() / CompilerDiagnostic.printErrorMessage() behavior.
 */
function printErrorMessage(detail: CompileErrorDetail): string {
  const buffer = [`[ReactCompilerError] ${detail.reason}`];
  if (detail.description != null) {
    buffer.push(`\n\n${detail.description}.`);
  }
  return buffer.join('');
}

function makeSuggestions(
  detail: CompileErrorDetail,
): Array<Rule.SuggestionReportDescriptor> {
  const suggest: Array<Rule.SuggestionReportDescriptor> = [];
  if (Array.isArray(detail.suggestions)) {
    for (const suggestion of detail.suggestions as Array<any>) {
      switch (suggestion.op) {
        case CompilerSuggestionOperation.InsertBefore:
          suggest.push({
            desc: suggestion.description,
            fix(fixer) {
              return fixer.insertTextBeforeRange(
                suggestion.range,
                suggestion.text,
              );
            },
          });
          break;
        case CompilerSuggestionOperation.InsertAfter:
          suggest.push({
            desc: suggestion.description,
            fix(fixer) {
              return fixer.insertTextAfterRange(
                suggestion.range,
                suggestion.text,
              );
            },
          });
          break;
        case CompilerSuggestionOperation.Replace:
          suggest.push({
            desc: suggestion.description,
            fix(fixer) {
              return fixer.replaceTextRange(suggestion.range, suggestion.text);
            },
          });
          break;
        case CompilerSuggestionOperation.Remove:
          suggest.push({
            desc: suggestion.description,
            fix(fixer) {
              return fixer.removeRange(suggestion.range);
            },
          });
          break;
        default:
          assertExhaustive(suggestion, 'Unhandled suggestion operation');
      }
    }
  }
  return suggest;
}

function getReactCompilerResult(context: Rule.RuleContext): RunCacheEntry {
  // Compat with older versions of eslint
  const sourceCode = context.sourceCode ?? context.getSourceCode();
  const filename = context.filename ?? context.getFilename();
  const userOpts = context.options[0] ?? {};

  const results = runReactCompiler({
    sourceCode,
    filename,
    userOpts,
  });

  return results;
}

function hasFlowSuppression(
  program: RunCacheEntry,
  nodeLoc: BabelSourceLocation,
  suppressions: Array<string>,
): boolean {
  for (const commentNode of program.flowSuppressions) {
    if (
      suppressions.includes(commentNode.code) &&
      commentNode.line === nodeLoc.start.line - 1
    ) {
      return true;
    }
  }
  return false;
}

function makeRule(rule: LintRule): Rule.RuleModule {
  const create = (context: Rule.RuleContext): Rule.RuleListener => {
    const result = getReactCompilerResult(context);

    for (const event of result.events) {
      if (event.kind === 'CompileError') {
        const detail = event.detail;
        if (detail.category === rule.category) {
          const loc = primaryLocation(detail);
          if (loc == null) {
            continue;
          }
          if (
            hasFlowSuppression(result, loc, [
              'react-rule-hook',
              'react-rule-unsafe-ref',
            ])
          ) {
            // If Flow already caught this error, we don't need to report it again.
            continue;
          }
          /*
           * TODO: if multiple rules report the same linter category,
           * we should deduplicate them with a "reported" set
           */
          context.report({
            message: printErrorMessage(detail),
            loc,
            suggest: makeSuggestions(detail),
          });
        }
      }
    }
    return {};
  };

  return {
    meta: {
      type: 'problem',
      docs: {
        description: rule.description,
        recommended: rule.preset === LintRulePreset.Recommended,
      },
      fixable: 'code',
      hasSuggestions: true,
      // validation is done at runtime with zod
      schema: [{type: 'object', additionalProperties: true}],
    },
    create,
  };
}

type RulesConfig = {
  [name: string]: {rule: Rule.RuleModule; severity: ErrorSeverity};
};

export const allRules: RulesConfig = LintRules.reduce((acc, rule) => {
  acc[rule.name] = {rule: makeRule(rule), severity: rule.severity};
  return acc;
}, {} as RulesConfig);

export const recommendedRules: RulesConfig = LintRules.filter(
  rule => rule.preset === LintRulePreset.Recommended,
).reduce((acc, rule) => {
  acc[rule.name] = {rule: makeRule(rule), severity: rule.severity};
  return acc;
}, {} as RulesConfig);

export const recommendedLatestRules: RulesConfig = LintRules.filter(
  rule =>
    rule.preset === LintRulePreset.Recommended ||
    rule.preset === LintRulePreset.RecommendedLatest,
).reduce((acc, rule) => {
  acc[rule.name] = {rule: makeRule(rule), severity: rule.severity};
  return acc;
}, {} as RulesConfig);

export function mapErrorSeverityToESlint(
  severity: ErrorSeverity,
): Linter.StringSeverity {
  switch (severity) {
    case ErrorSeverity.Error: {
      return 'error';
    }
    case ErrorSeverity.Warning: {
      return 'warn';
    }
    case ErrorSeverity.Hint:
    case ErrorSeverity.Off: {
      return 'off';
    }
    default: {
      assertExhaustive(severity, `Unhandled severity: ${severity}`);
    }
  }
}
