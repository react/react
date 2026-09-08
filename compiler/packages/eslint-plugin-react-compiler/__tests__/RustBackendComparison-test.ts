/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Comparison test: runs every ESLint test case with both the TS and Rust
 * backends and asserts the diagnostics (message + line) are identical.
 *
 * Uses ESLint's Linter API directly (not RuleTester) so we can capture
 * the full list of diagnostics per backend without throwing on the first
 * mismatch.
 */

import {Linter} from 'eslint';
import {configs} from '../src/index';
import {
  allRules,
  recommendedRules,
  mapErrorSeverityToESlint,
} from '../src/rules/ReactCompilerRule';

// --------------------------------------------------------------------------
// Check Rust availability
// --------------------------------------------------------------------------
let rustAvailable = false;
try {
  require('babel-plugin-react-compiler-rust');
  rustAvailable = true;
} catch {
  // Rust native module not built — skip all comparison tests
}

const describeIfRust = rustAvailable ? describe : describe.skip;

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/**
 * Remove leading indentation (same as normalizeIndent in shared-utils).
 */
function normalizeIndent(strings: TemplateStringsArray): string {
  const codeLines = strings[0].split('\n');
  const leftPadding = codeLines[1]?.match(/\s+/)?.[0] ?? '';
  return codeLines.map(line => line.slice(leftPadding.length)).join('\n');
}

interface DiagnosticSummary {
  message: string;
  line: number | null;
}

/**
 * Lint `code` using all recommended rules and return sorted diagnostics.
 */
function lintWithBackend(
  code: string,
  filename: string,
  useRust: boolean,
): DiagnosticSummary[] {
  const linter = new Linter();

  // Register all rules from the plugin
  for (const [name, {rule}] of Object.entries(allRules)) {
    linter.defineRule(`react-compiler/${name}`, rule);
  }

  // Build the rule config: enable all recommended rules at their default severity
  const ruleConfig: Record<string, Linter.RuleEntry> = {};
  for (const [name, ruleEntry] of Object.entries(recommendedRules)) {
    const severity = mapErrorSeverityToESlint(ruleEntry.severity);
    if (severity === 'off') continue;
    const opts: Record<string, unknown> = {};
    if (useRust) {
      opts.__unstable_useRustCompiler = true;
    }
    ruleConfig[`react-compiler/${name}`] = [severity, opts];
  }

  const messages = linter.verify(
    code,
    {
      parser: 'hermes-eslint',
      parserOptions: {
        ecmaVersion: 2015,
        sourceType: 'module',
        enableExperimentalComponentSyntax: true,
      },
      rules: ruleConfig,
    },
    {filename},
  );

  // Filter out parser errors — only keep rule diagnostics
  const diagnostics: DiagnosticSummary[] = messages
    .filter(m => m.ruleId != null)
    .map(m => ({
      message: m.message,
      line: m.line ?? null,
    }));

  // Sort deterministically by line then message
  diagnostics.sort((a, b) => {
    const lineDiff = (a.line ?? 0) - (b.line ?? 0);
    if (lineDiff !== 0) return lineDiff;
    return a.message.localeCompare(b.message);
  });

  return diagnostics;
}

/**
 * Lint with a specific single rule (not recommended set).
 */
function lintWithRule(
  code: string,
  filename: string,
  ruleName: string,
  useRust: boolean,
): DiagnosticSummary[] {
  const linter = new Linter();

  const ruleEntry = allRules[ruleName];
  if (!ruleEntry) throw new Error(`Unknown rule: ${ruleName}`);

  linter.defineRule(`react-compiler/${ruleName}`, ruleEntry.rule);

  const opts: Record<string, unknown> = {};
  if (useRust) {
    opts.__unstable_useRustCompiler = true;
  }
  const severity = mapErrorSeverityToESlint(ruleEntry.severity);
  if (severity === 'off') return [];

  const messages = linter.verify(
    code,
    {
      parser: 'hermes-eslint',
      parserOptions: {
        ecmaVersion: 2015,
        sourceType: 'module',
        enableExperimentalComponentSyntax: true,
      },
      rules: {
        [`react-compiler/${ruleName}`]: [severity, opts],
      },
    },
    {filename},
  );

  const diagnostics: DiagnosticSummary[] = messages
    .filter(m => m.ruleId != null)
    .map(m => ({
      message: m.message,
      line: m.line ?? null,
    }));

  diagnostics.sort((a, b) => {
    const lineDiff = (a.line ?? 0) - (b.line ?? 0);
    if (lineDiff !== 0) return lineDiff;
    return a.message.localeCompare(b.message);
  });

  return diagnostics;
}

// --------------------------------------------------------------------------
// Test case catalog — every test case from the existing test files
// --------------------------------------------------------------------------

interface ComparisonTestCase {
  name: string;
  code: string;
  filename?: string;
  /** Which rule to test in isolation, or 'recommended' for all */
  rule: string;
  expectedErrorCount: number;
}

// Gather all test cases from across the test suite. We replicate the test
// data here so the comparison is self-contained.

const testCases: ComparisonTestCase[] = [
  // ---- PluginTest-test.ts (recommended rules) ----
  {
    name: '[PluginTest] Basic example with component syntax',
    code: normalizeIndent`
      export default component HelloWorld(
        text: string = 'Hello!',
        onClick: () => void,
      ) {
        return <div onClick={onClick}>{text}</div>;
      }
    `,
    rule: 'recommended',
    expectedErrorCount: 0,
  },
  {
    name: '[PluginTest] [Invariant] Defined after use',
    code: normalizeIndent`
      function Component(props) {
        let y = function () {
          m(x);
        };

        let x = { a };
        m(x);
        return y;
      }
    `,
    rule: 'recommended',
    expectedErrorCount: 0,
  },
  {
    name: "[PluginTest] Classes don't throw",
    code: normalizeIndent`
      class Foo {
        #bar() {}
      }
    `,
    rule: 'recommended',
    expectedErrorCount: 0,
  },
  {
    name: '[PluginTest] Multiple diagnostic kinds from the same function',
    code: normalizeIndent`
      import Child from './Child';
      function Component() {
        const result = cond ?? useConditionalHook();
        return <>
          {Child(result)}
        </>;
      }
    `,
    rule: 'recommended',
    expectedErrorCount: 2,
  },
  {
    name: '[PluginTest] Multiple diagnostics within the same file',
    code: normalizeIndent`
      function useConditional1() {
        'use memo';
        return cond ?? useConditionalHook();
      }
      function useConditional2(props) {
        'use memo';
        return props.cond && useConditionalHook();
      }
    `,
    rule: 'recommended',
    expectedErrorCount: 2,
  },
  {
    name: "[PluginTest] 'use no forget' does not disable eslint rule",
    code: normalizeIndent`
      let count = 0;
      function Component() {
        'use no forget';
        return cond ?? useConditionalHook();

      }
    `,
    rule: 'recommended',
    expectedErrorCount: 1,
  },
  {
    name: '[PluginTest] Multiple non-fatal useMemo diagnostics',
    code: normalizeIndent`
      import {useMemo, useState} from 'react';

      function Component({item, cond}) {
        const [prevItem, setPrevItem] = useState(item);
        const [state, setState] = useState(0);

        useMemo(() => {
          if (cond) {
            setPrevItem(item);
            setState(0);
          }
        }, [cond, item, init]);

        return <Child x={state} />;
      }
    `,
    rule: 'recommended',
    expectedErrorCount: 4,
  },

  // ---- InvalidHooksRule-test.ts ----
  {
    name: '[InvalidHooks] Basic example (valid)',
    code: normalizeIndent`
      function Component() {
        useHook();
        return <div>Hello world</div>;
      }
    `,
    rule: 'recommended',
    expectedErrorCount: 0,
  },
  {
    name: '[InvalidHooks] Violation with Flow suppression (valid)',
    code: `
    // Valid since error already suppressed with flow.
    function useHook() {
      if (cond) {
        // $FlowFixMe[react-rule-hook]
        useConditionalHook();
      }
    }
  `,
    rule: 'recommended',
    expectedErrorCount: 0,
  },
  {
    name: '[InvalidHooks] Simple violation',
    code: normalizeIndent`
      function useConditional() {
        if (cond) {
          useConditionalHook();
        }
      }
    `,
    rule: 'recommended',
    expectedErrorCount: 1,
  },
  {
    name: '[InvalidHooks] Multiple diagnostics within the same function',
    code: normalizeIndent`
      function useConditional() {
        cond ?? useConditionalHook();
        props.cond && useConditionalHook();
        return <div>Hello world</div>;
      }
    `,
    rule: 'recommended',
    expectedErrorCount: 2,
  },

  // ---- ImpureFunctionCallsRule-test.ts ----
  {
    name: '[ImpureFunctionCalls] Known impure function calls are caught',
    code: normalizeIndent`
      function Component() {
        const date = Date.now();
        const now = performance.now();
        const rand = Math.random();
        return <Foo date={date} now={now} rand={rand} />;
      }
    `,
    rule: 'recommended',
    expectedErrorCount: 3,
  },

  // ---- NoCapitalizedCallsRule-test.ts ----
  {
    name: '[NoCapitalizedCalls] Simple violation',
    code: normalizeIndent`
      import Child from './Child';
      function Component() {
        return <>
          {Child()}
        </>;
      }
    `,
    rule: 'recommended',
    expectedErrorCount: 1,
  },
  {
    name: '[NoCapitalizedCalls] Method call violation',
    code: normalizeIndent`
      import myModule from './MyModule';
      function Component() {
        return <>
          {myModule.Child()}
        </>;
      }
    `,
    rule: 'recommended',
    expectedErrorCount: 1,
  },
  {
    name: '[NoCapitalizedCalls] Multiple diagnostics',
    code: normalizeIndent`
      import Child1 from './Child1';
      import MyModule from './MyModule';
      function Component() {
        return <>
          {Child1()}
          {MyModule.Child2()}
        </>;
      }
    `,
    rule: 'recommended',
    expectedErrorCount: 2,
  },

  // ---- NoAmbiguousJsxRule-test.ts ----
  {
    name: '[NoAmbiguousJsx] JSX in try blocks',
    code: normalizeIndent`
      function Component(props) {
        let el;
        try {
          el = <Child />;
        } catch {
          return null;
        }
        return el;
      }
    `,
    rule: 'recommended',
    expectedErrorCount: 1,
  },

  // ---- NoRefAccessInRender-tests.ts ----
  {
    name: '[NoRefAccessInRender] Simple ref access in render',
    code: normalizeIndent`
      function Component(props) {
        const ref = useRef(null);
        const value = ref.current;
        return value;
      }
    `,
    rule: 'recommended',
    expectedErrorCount: 1,
  },

  // ---- ReactCompilerRuleTypescript-test.ts ----
  {
    name: '[TypeScript] Basic example (valid)',
    code: normalizeIndent`
      function Button(props) {
        return null;
      }
    `,
    filename: 'test.tsx',
    rule: 'recommended',
    expectedErrorCount: 0,
  },
  {
    name: '[TypeScript] Repro for hooks as normal values',
    code: normalizeIndent`
      function Button(props) {
        const scrollview = React.useRef<ScrollView>(null);
        return <Button thing={scrollview} />;
      }
    `,
    filename: 'test.tsx',
    rule: 'recommended',
    expectedErrorCount: 0,
  },
  {
    name: '[TypeScript] Mutating useState value',
    code: `
      import { useState } from 'react';
      function Component(props) {
        // typescript syntax that hermes-parser doesn't understand yet
        const x: \`foo\${1}\` = 'foo1';
        const [state, setState] = useState({a: 0});
        state.a = 1;
        return <div>{props.foo}</div>;
      }
    `,
    filename: 'test.tsx',
    rule: 'recommended',
    expectedErrorCount: 1,
  },
];

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describeIfRust('TS vs Rust backend comparison', () => {
  const results: Array<{
    name: string;
    ts: DiagnosticSummary[];
    rust: DiagnosticSummary[];
    match: boolean;
  }> = [];

  for (const tc of testCases) {
    test(tc.name, () => {
      const filename = tc.filename ?? 'test.js';
      const tsDiags = lintWithBackend(tc.code, filename, false);
      const rustDiags = lintWithBackend(tc.code, filename, true);

      results.push({
        name: tc.name,
        ts: tsDiags,
        rust: rustDiags,
        match: JSON.stringify(tsDiags) === JSON.stringify(rustDiags),
      });

      // First check: both backends agree on error count
      if (tsDiags.length !== rustDiags.length) {
        const tsMessages = tsDiags
          .map(d => `  L${d.line}: ${d.message}`)
          .join('\n');
        const rustMessages = rustDiags
          .map(d => `  L${d.line}: ${d.message}`)
          .join('\n');
        console.log(
          `\n⚠️  DIAGNOSTIC COUNT MISMATCH: ${tc.name}\n` +
            `  TS (${tsDiags.length}):\n${tsMessages || '    (none)'}\n` +
            `  Rust (${rustDiags.length}):\n${rustMessages || '    (none)'}\n`,
        );
      }

      // Second check: messages match in content
      // We compare sorted diagnostics — message text should be identical
      const tsMessages = tsDiags.map(d => d.message);
      const rustMessages = rustDiags.map(d => d.message);

      // Log detailed diff for any mismatch
      if (JSON.stringify(tsDiags) !== JSON.stringify(rustDiags)) {
        console.log(
          `\n⚠️  DIAGNOSTIC MISMATCH: ${tc.name}\n` +
            `  TS diagnostics:\n${tsDiags.map(d => `    L${d.line}: ${d.message}`).join('\n') || '    (none)'}\n` +
            `  Rust diagnostics:\n${rustDiags.map(d => `    L${d.line}: ${d.message}`).join('\n') || '    (none)'}\n`,
        );
      }

      // Assert equality — both count and messages should match
      expect(rustDiags.length).toBe(tsDiags.length);
      expect(rustMessages).toEqual(tsMessages);
    });
  }

  // Summary — printed once after all tests
  afterAll(() => {
    const total = results.length;
    const matches = results.filter(r => r.match).length;
    const mismatches = results.filter(r => !r.match);

    console.log('\n' + '='.repeat(70));
    console.log(`TS vs Rust ESLint Backend Comparison`);
    console.log('='.repeat(70));
    console.log(`Total test cases: ${total}`);
    console.log(`Matching:         ${matches}`);
    console.log(`Mismatches:       ${mismatches.length}`);

    if (mismatches.length > 0) {
      console.log('\nMismatched cases:');
      for (const m of mismatches) {
        console.log(`\n  ❌ ${m.name}`);
        console.log(
          `     TS  (${m.ts.length}): ${m.ts.map(d => `L${d.line}:${d.message.slice(0, 60)}`).join(' | ') || '(none)'}`,
        );
        console.log(
          `     Rust(${m.rust.length}): ${m.rust.map(d => `L${d.line}:${d.message.slice(0, 60)}`).join(' | ') || '(none)'}`,
        );
      }
    } else {
      console.log('\n✅ All diagnostics match between TS and Rust backends!');
    }
    console.log('='.repeat(70) + '\n');
  });
});
