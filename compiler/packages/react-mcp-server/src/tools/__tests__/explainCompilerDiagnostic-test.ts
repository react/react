/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {explainCompilerDiagnostic} from '../explainCompilerDiagnostic';

describe('explainCompilerDiagnostic', () => {
  describe('direct rule lookup', () => {
    test.each([
      'set-state-in-render',
      'preserve-manual-memoization',
      'immutability',
      'purity',
      'refs',
    ])('returns matched explanation for rule %s', rule => {
      const result = explainCompilerDiagnostic({message: 'irrelevant', rule});
      expect(result.kind).toBe('matched');
      if (result.kind === 'matched') {
        expect(result.explanation.rule).toBe(rule);
      }
    });

    test('falls through to message matching when rule is unknown', () => {
      const result = explainCompilerDiagnostic({
        message: 'Cannot update a component while rendering a different component',
        rule: 'not-a-real-rule',
      });
      expect(result.kind).toBe('matched');
      if (result.kind === 'matched') {
        expect(result.explanation.rule).toBe('set-state-in-render');
      }
    });

    test('treats empty rule string as no rule', () => {
      const result = explainCompilerDiagnostic({
        message: 'Cannot update a component while rendering a different component',
        rule: '',
      });
      expect(result.kind).toBe('matched');
      if (result.kind === 'matched') {
        expect(result.explanation.rule).toBe('set-state-in-render');
      }
    });
  });

  describe('message pattern matching', () => {
    test('matches set-state-in-render on "cannot update...while rendering"', () => {
      const result = explainCompilerDiagnostic({
        message:
          'Cannot update a component while rendering a different component',
      });
      expect(result.kind).toBe('matched');
      if (result.kind === 'matched') {
        expect(result.explanation.rule).toBe('set-state-in-render');
      }
    });

    test('matches preserve-manual-memoization on "manual memoization"', () => {
      const result = explainCompilerDiagnostic({
        message: 'Existing manual memoization could not be preserved',
      });
      expect(result.kind).toBe('matched');
      if (result.kind === 'matched') {
        expect(result.explanation.rule).toBe('preserve-manual-memoization');
      }
    });

    test('matches immutability on a mutation message', () => {
      const result = explainCompilerDiagnostic({
        message: 'Mutating a value that should be immutable',
      });
      expect(result.kind).toBe('matched');
      if (result.kind === 'matched') {
        expect(result.explanation.rule).toBe('immutability');
      }
    });

    test('matches purity on a "side effect" message', () => {
      const result = explainCompilerDiagnostic({
        message: 'Functions are not pure: side effect detected',
      });
      expect(result.kind).toBe('matched');
      if (result.kind === 'matched') {
        expect(result.explanation.rule).toBe('purity');
      }
    });

    test('matches refs on a ref.current message', () => {
      const result = explainCompilerDiagnostic({
        message: 'Cannot access ref.current during render',
      });
      expect(result.kind).toBe('matched');
      if (result.kind === 'matched') {
        expect(result.explanation.rule).toBe('refs');
      }
    });

    test('matching is case-insensitive', () => {
      const result = explainCompilerDiagnostic({
        message: 'CANNOT UPDATE WHILE RENDERING',
      });
      expect(result.kind).toBe('matched');
      if (result.kind === 'matched') {
        expect(result.explanation.rule).toBe('set-state-in-render');
      }
    });
  });

  describe('unmatched messages', () => {
    test('returns unmatched with genericGuidance for unrecognized text', () => {
      const result = explainCompilerDiagnostic({
        message: 'Something completely unrelated to any rule',
      });
      expect(result.kind).toBe('unmatched');
      if (result.kind === 'unmatched') {
        expect(result.message).toBe(
          'Something completely unrelated to any rule',
        );
        expect(result.genericGuidance).toMatch(/ErrorCategory/);
        expect(result.genericGuidance).toMatch(/react\.dev/);
      }
    });

    test('returns unmatched for an empty message when no rule is given', () => {
      const result = explainCompilerDiagnostic({message: ''});
      expect(result.kind).toBe('unmatched');
    });
  });

  describe('explanation shape on match', () => {
    test('every entry exposes all required fields', () => {
      const result = explainCompilerDiagnostic({
        message: 'cannot update while rendering',
      });
      if (result.kind !== 'matched') {
        throw new Error('expected matched result');
      }
      const exp = result.explanation;
      expect(typeof exp.rule).toBe('string');
      expect(exp.rule.length).toBeGreaterThan(0);
      expect(typeof exp.title).toBe('string');
      expect(typeof exp.summary).toBe('string');
      expect(typeof exp.category).toBe('string');
      expect(typeof exp.why_it_happens).toBe('string');
      expect(typeof exp.how_to_fix).toBe('string');
      expect(['error', 'warning', 'info']).toContainEqual(exp.severity);
      expect(Array.isArray(exp.related_links)).toBe(true);
      expect(Array.isArray(exp.messagePatterns)).toBe(true);
    });
  });

  describe('input shape', () => {
    test('codeContext is accepted but does not affect matching', () => {
      const withContext = explainCompilerDiagnostic({
        message: 'side effect detected',
        codeContext: 'function C() { fetch("/x") }',
      });
      const withoutContext = explainCompilerDiagnostic({
        message: 'side effect detected',
      });
      expect(withContext.kind).toBe('matched');
      expect(withoutContext.kind).toBe('matched');
      if (withContext.kind === 'matched' && withoutContext.kind === 'matched') {
        expect(withContext.explanation.rule).toBe(
          withoutContext.explanation.rule,
        );
      }
    });
  });
});
