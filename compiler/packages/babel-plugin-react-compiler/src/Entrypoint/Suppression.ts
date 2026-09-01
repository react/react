/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {NodePath} from '@babel/core';
import * as t from '@babel/types';
import {
  CompilerDiagnostic,
  CompilerError,
  CompilerSuggestionOperation,
  ErrorCategory,
} from '../CompilerError';
import {assertExhaustive} from '../Utils/utils';
import {GeneratedSource} from '../HIR';

/**
 * Captures the start and end range of a pair of eslint-disable ... eslint-enable comments. In the
 * case of a CommentLine or a relevant Flow suppression, both the disable and enable point to the
 * same comment.
 *
 * The enable comment can be missing in the case where only a disable block is present, ie the rest
 * of the file has potential React violations.
 */
export type SuppressionRange = {
  disableComment: t.Comment;
  enableComment: t.Comment | null;
  source: SuppressionSource;
};

type SuppressionSource = 'Eslint' | 'Flow';

/**
 * An suppression affects a function if:
 *   1. The suppression is within the function's body; or
 *   2. The suppression wraps the function
 */
export function filterSuppressionsThatAffectFunction(
  suppressionRanges: Array<SuppressionRange>,
  fn: NodePath<t.Function>,
): Array<SuppressionRange> {
  const suppressionsInScope: Array<SuppressionRange> = [];
  const fnNode = fn.node;
  for (const suppressionRange of suppressionRanges) {
    if (
      suppressionRange.disableComment.start == null ||
      fnNode.start == null ||
      fnNode.end == null
    ) {
      continue;
    }
    // The suppression is within the function
    if (
      suppressionRange.disableComment.start > fnNode.start &&
      // If there is no matching enable, the rest of the file has potential violations
      (suppressionRange.enableComment === null ||
        (suppressionRange.enableComment.end != null &&
          suppressionRange.enableComment.end < fnNode.end))
    ) {
      suppressionsInScope.push(suppressionRange);
    }

    // The suppression wraps the function
    if (
      suppressionRange.disableComment.start < fnNode.start &&
      // If there is no matching enable, the rest of the file has potential violations
      (suppressionRange.enableComment === null ||
        (suppressionRange.enableComment.end != null &&
          suppressionRange.enableComment.end > fnNode.end))
    ) {
      suppressionsInScope.push(suppressionRange);
    }
  }
  return suppressionsInScope;
}

export function findProgramSuppressions(
  programComments: Array<t.Comment>,
  ruleNames: Array<string> | null,
  flowSuppressions: boolean,
): Array<SuppressionRange> {
  const suppressionRanges: Array<SuppressionRange> = [];
  let disableComment: t.Comment | null = null;
  let enableComment: t.Comment | null = null;
  let source: SuppressionSource | null = null;

  let disableNextLinePattern: RegExp | null = null;
  let disablePattern: RegExp | null = null;
  let enablePattern: RegExp | null = null;
  if (ruleNames != null && ruleNames.length !== 0) {
    const rulePattern = `(${ruleNames.join('|')})`;
    disableNextLinePattern = new RegExp(
      `eslint-disable-next-line ${rulePattern}`,
    );
    disablePattern = new RegExp(`eslint-disable ${rulePattern}`);
    enablePattern = new RegExp(`eslint-enable ${rulePattern}`);
  }

  const flowSuppressionPattern = new RegExp(
    '\\$(FlowFixMe\\w*|FlowExpectedError|FlowIssue)\\[react\\-rule',
  );

  for (const comment of programComments) {
    if (comment.start == null || comment.end == null) {
      continue;
    }

    if (
      /*
       * If we're already within a CommentBlock, we should not restart the range prematurely for a
       * CommentLine within the block.
       */
      disableComment == null &&
      disableNextLinePattern != null &&
      disableNextLinePattern.test(comment.value)
    ) {
      disableComment = comment;
      enableComment = comment;
      source = 'Eslint';
    }

    if (
      flowSuppressions &&
      disableComment == null &&
      flowSuppressionPattern.test(comment.value)
    ) {
      disableComment = comment;
      enableComment = comment;
      source = 'Flow';
    }

    if (disablePattern != null && disablePattern.test(comment.value)) {
      disableComment = comment;
      source = 'Eslint';
    }

    if (
      enablePattern != null &&
      enablePattern.test(comment.value) &&
      source === 'Eslint'
    ) {
      enableComment = comment;
    }

    if (disableComment != null && source != null) {
      suppressionRanges.push({
        disableComment: disableComment,
        enableComment: enableComment,
        source,
      });
      disableComment = null;
      enableComment = null;
      source = null;
    }
  }
  return suppressionRanges;
}

export function suppressionsToCompilerError(
  suppressionRanges: Array<SuppressionRange>,
): CompilerError {
  CompilerError.invariant(suppressionRanges.length !== 0, {
    reason: `Expected at least suppression comment source range`,
    loc: GeneratedSource,
  });
  const error = new CompilerError();
  for (const suppressionRange of suppressionRanges) {
    if (
      suppressionRange.disableComment.start == null ||
      suppressionRange.disableComment.end == null
    ) {
      continue;
    }
    let reason, suggestion;
    switch (suppressionRange.source) {
      case 'Eslint':
        reason =
          'React Compiler has skipped optimizing this component because one or more React ESLint rules were disabled';
        suggestion =
          'Remove the ESLint suppression and address the React error';
        break;
      case 'Flow':
        reason =
          'React Compiler has skipped optimizing this component because one or more React rule violations were reported by Flow';
        suggestion = 'Remove the Flow suppression and address the React error';
        break;
      default:
        assertExhaustive(
          suppressionRange.source,
          'Unhandled suppression source',
        );
    }
    error.pushDiagnostic(
      CompilerDiagnostic.create({
        reason: reason,
        description: `React Compiler only works when your components follow all the rules of React, disabling them may result in unexpected or incorrect behavior. Found suppression \`${suppressionRange.disableComment.value.trim()}\``,
        category: ErrorCategory.Suppression,
        suggestions: [
          {
            description: suggestion,
            range: [
              suppressionRange.disableComment.start,
              suppressionRange.disableComment.end,
            ],
            op: CompilerSuggestionOperation.Remove,
          },
        ],
      }).withDetails({
        kind: 'error',
        loc: suppressionRange.disableComment.loc ?? null,
        message: 'Found React rule suppression',
      }),
    );
  }
  return error;
}
