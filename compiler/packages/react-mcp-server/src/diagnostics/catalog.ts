/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * A hand-curated, plain-English explanation of a React Compiler diagnostic.
 *
 * The catalog is keyed by the stable rule name from
 * babel-plugin-react-compiler's `ErrorCategory` enum (see
 * `compiler/packages/babel-plugin-react-compiler/src/CompilerError.ts`). The
 * rule name is the most stable identifier the compiler exposes — it survives
 * diagnostic message text changes across versions, so the catalog should be
 * keyed on it, not on message text.
 *
 * The `messagePatterns` field is used by the tool to identify which catalog
 * entry applies to a given formatted compile error. Each pattern is a
 * JavaScript RegExp source string (e.g. `"setState.*render"`); the tool
 * compiles them with the `i` flag. Patterns are best-effort — they are
 * intentionally broad to survive small wording changes in compiler messages.
 * When a pattern is missing or fails to match, the tool returns the fallback
 * object instead of a specific explanation.
 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export type DiagnosticCodeExample = {
  problem: string;
  solution: string;
};

export type DiagnosticExplanation = {
  /**
   * The rule name from `ErrorCategory`. Acts as the catalog key.
   */
  rule: string;
  /**
   * Short human-readable title for the diagnostic (e.g. "Setting state
   * during render").
   */
  title: string;
  /**
   * One-sentence summary. Plain text — the LLM composes from this directly.
   */
  summary: string;
  /**
   * High-level category (e.g. "render-purity", "hook-usage").
   */
  category: string;
  /**
   * Why this diagnostic is reported — what the compiler is concerned about.
   * Plain text, one or two short paragraphs.
   */
  why_it_happens: string;
  /**
   * Concrete fix suggestion. Plain text.
   */
  how_to_fix: string;
  /**
   * Optional before/after example. Omit if the fix is hard to illustrate in a
   * short snippet.
   */
  code_example: DiagnosticCodeExample | null;
  /**
   * Diagnostic severity as exposed by the compiler.
   */
  severity: DiagnosticSeverity;
  /**
   * Links to relevant React docs, blog posts, or compiler documentation.
   * Empty array if no helpful links exist yet.
   */
  related_links: Array<string>;
  /**
   * RegExp source strings (no flags) used to match this rule from the
   * formatted compile error text. The tool compiles each with the `i` flag
   * and tests against the LLM-supplied message. Empty array means the rule
   * is only reachable by direct key lookup.
   */
  messagePatterns: Array<string>;
};

const setStateInRender: DiagnosticExplanation = {
  rule: 'set-state-in-render',
  title: 'Setting state during render',
  summary:
    'A component is calling a state setter (e.g. setState, setX) directly in its render body, which will trigger an extra render and can produce infinite loops.',
  category: 'render-purity',
  why_it_happens:
    'React renders a component to compute its output. If that render call updates state, the same component will re-render before the original render finishes. In most cases the second render will set state again, producing an infinite render loop. Even when the loop terminates, the extra renders waste work and make component behavior hard to reason about.',
  how_to_fix:
    'Move the state update into an event handler (e.g. onClick, onChange) or a useEffect if you are synchronizing with an external system. If you are deriving a value from props or state, compute it during render and store it in a const — no state setter is needed. To reset state when a prop changes, use a `key` on the component, not a setState call.',
  code_example: {
    problem: `function Counter({step}) {
  const [count, setCount] = useState(0);
  if (step > 0) {
    setCount(count + step); // ❌ setState during render
  }
  return <div>{count}</div>;
}`,
    solution: `function Counter({step}) {
  const [count, setCount] = useState(0);
  // Derive values from props/state without calling setState.
  const next = step > 0 ? count + step : count;
  return <div>{next}</div>;
}`,
  },
  severity: 'error',
  related_links: [
    'https://react.dev/reference/rules/components-and-hooks-must-be-pure',
  ],
  messagePatterns: [
    'setState.*render',
    'setting state.*render',
    'cannot update.*while rendering',
    'render.*state.*update',
  ],
};

const preserveManualMemoization: DiagnosticExplanation = {
  rule: 'preserve-manual-memoization',
  title: 'Manual memoization could not be preserved',
  summary:
    'The component uses useMemo, useCallback, or React.memo, but the compiler cannot guarantee the same memoization guarantee from its automatic analysis, so the component was skipped.',
  category: 'memoization',
  why_it_happens:
    'React Compiler adds automatic memoization around components and hooks. The compiler will only rewrite a function if its automatic memoization is at least as tight as the manual memoization a developer wrote. When the compiler cannot match or exceed the existing guarantee — for example, because the existing memo depends on referential identity the compiler cannot prove stable — the component is skipped to avoid silently changing behavior.',
  how_to_fix:
    'Remove the manual useMemo/useCallback/React.memo and let the compiler handle memoization automatically. If the manual memo was placed there for a specific reason (e.g. object identity stability for a downstream consumer), restructure the code so the compiler can see the dependency, or split the function so the memoized piece is independent of the rest.',
  code_example: {
    problem: `function List({items}) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.id - b.id),
    [items],
  );
  return <ul>{sorted.map(...)}</ul>;
}`,
    solution: `function List({items}) {
  // The compiler memoizes this sort automatically.
  const sorted = [...items].sort((a, b) => a.id - b.id);
  return <ul>{sorted.map(...)}</ul>;
}`,
  },
  severity: 'error',
  related_links: [
    'https://react.dev/learn/react-compiler/introduction#what-should-i-do-about-usememo-usecallback-and-reactmemo',
  ],
  messagePatterns: [
    'manual memoization',
    'useMemo.*could not.*preserved',
    'useCallback.*could not.*preserved',
    'skipping optimization.*memoization',
    'skipped optimizing.*manual memo',
  ],
};

const immutability: DiagnosticExplanation = {
  rule: 'immutability',
  title: 'Mutating a value that should be immutable',
  summary:
    'The component is mutating a prop, a hook return value, or another value that the compiler has identified as immutable, which would silently break reactivity.',
  category: 'immutability',
  why_it_happens:
    'React expects props, state, and hook return values to be treated as immutable. The compiler memoizes reads of these values; if a function mutates them in place, later renders will see the mutated value even when the inputs have not changed. This breaks the assumption that React renders are pure functions of their inputs and can produce subtle, hard-to-reproduce bugs.',
  how_to_fix:
    'Replace the mutation with a non-mutating update: spread the value into a new object/array (`{...obj, key: value}` or `[...arr, newItem]`), use `Array.prototype.map`/`filter`/`slice` instead of push/splice/sort, and avoid helper libraries that mutate in place. If the value is genuinely local to the function, declare a fresh `const` and use that.',
  code_example: {
    problem: `function AddItem({items}) {
  items.push({id: 1, name: 'new'}); // ❌ mutates a prop
  return <List items={items} />;
}`,
    solution: `function AddItem({items}) {
  const next = [...items, {id: 1, name: 'new'}];
  return <List items={next} />;
}`,
  },
  severity: 'error',
  related_links: [
    'https://react.dev/reference/rules/components-and-hooks-must-be-pure#props-and-state-are-immutable',
  ],
  messagePatterns: [
    'mutating',
    'mutation',
    'in place',
    'readonly.*mutated',
    'immutable.*mutated',
  ],
};

const purity: DiagnosticExplanation = {
  rule: 'purity',
  title: 'Side effect or impure call during render',
  summary:
    'The component is performing a side effect (network request, logging, mutation of an external value, etc.) or calling a known-impure function directly inside the render body.',
  category: 'purity',
  why_it_happens:
    'React may render a component more than once for scheduling reasons, especially in development with Strict Mode. If a render call performs a side effect — fetching data, mutating a global, logging to an external system — the side effect runs on every render, potentially many times per logical render. This produces duplicate requests, corrupted state, and non-deterministic UI.',
  how_to_fix:
    'Move side effects into event handlers (for user-initiated actions) or into a useEffect (for synchronization with external systems). If a value must be computed during render, compute it from props and state without calling external functions. If the component is initializing state lazily, use the initializer form of useState: `useState(() => computeInitial())`.',
  code_example: {
    problem: `function Profile({userId}) {
  fetch('/api/users/' + userId).then(...); // ❌ fetch during render
  return <div>...</div>;
}`,
    solution: `function Profile({userId}) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch('/api/users/' + userId)
      .then(r => r.json())
      .then(setUser);
  }, [userId]);
  return <div>{user?.name ?? 'Loading...'}</div>;
}`,
  },
  severity: 'error',
  related_links: [
    'https://react.dev/reference/rules/components-and-hooks-must-be-pure',
  ],
  messagePatterns: [
    'side effect',
    'impure',
    'not pure',
    'render.*pure',
    'cannot read.*during render',
  ],
};

const refs: DiagnosticExplanation = {
  rule: 'refs',
  title: 'Reading or writing a ref during render',
  summary:
    'The component is reading or writing `ref.current` directly inside its render body, which makes the output depend on mutable state and can produce inconsistent UI.',
  category: 'refs',
  why_it_happens:
    'Refs are mutable escape hatches. Their values persist across renders, but unlike state, reading or writing a ref does not schedule a re-render. If a render reads `ref.current` and uses it to compute its output, the output depends on mutable state the rendering system does not know about, which can produce UI that lags behind the real value. If a render writes to `ref.current`, the write is silently lost on the next commit or duplicated across renders.',
  how_to_fix:
    'Read refs in event handlers and useEffects, not during render. To display a ref value, store it in state via useEffect: `useEffect(() => { setX(ref.current); }, [...])`. To write a ref, do it in an event handler or useEffect — never in the render body. Lazy initialization (creating the ref with a value) is the one place where writing to a ref during render is allowed.',
  code_example: {
    problem: `function Counter() {
  const countRef = useRef(0);
  countRef.current += 1; // ❌ writing a ref during render
  return <div>Renders: {countRef.current}</div>;
}`,
    solution: `function Counter() {
  const [renderCount, setRenderCount] = useState(0);
  useEffect(() => {
    setRenderCount(c => c + 1);
  }, []);
  return <div>Renders: {renderCount}</div>;
}`,
  },
  severity: 'error',
  related_links: [
    'https://react.dev/reference/react/useRef#caveats',
  ],
  messagePatterns: [
    'ref\\.current',
    'reading.*ref.*render',
    'writing.*ref.*render',
    'ref.*during render',
    'accessing.*ref',
  ],
};

/**
 * Catalog of hand-curated diagnostic explanations, keyed by rule name.
 *
 * Adding a new entry is the only change required to support a new
 * diagnostic — the tool function in `src/tools/explainCompilerDiagnostic.ts`
 * looks up by rule name and falls back to a generic response on miss.
 */
export const diagnosticCatalog: ReadonlyMap<string, DiagnosticExplanation> =
  new Map<string, DiagnosticExplanation>([
    [setStateInRender.rule, setStateInRender],
    [preserveManualMemoization.rule, preserveManualMemoization],
    [immutability.rule, immutability],
    [purity.rule, purity],
    [refs.rule, refs],
  ]);
