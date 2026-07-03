/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Skill, ToolDefinition} from './types';

// Parses the SKILL.md open format: YAML frontmatter with at least
// `name` and `description`, followed by a markdown body.
// Only the two required scalar fields are read; unknown fields are ignored.
export function parseSkillMarkdown(markdown: string): Skill | null {
  const match = markdown.match(/^\s*---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (match == null) {
    return null;
  }
  const [, frontmatter, body] = match;

  let name = null;
  let description = null;
  const lines = frontmatter.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const fieldMatch = lines[i].match(/^(name|description):\s*(.+)\s*$/);
    if (fieldMatch != null) {
      const value = fieldMatch[2].replace(/^['"]|['"]$/g, '');
      if (fieldMatch[1] === 'name') {
        name = value;
      } else {
        description = value;
      }
    }
  }

  if (name == null || description == null || body.trim() === '') {
    return null;
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
    return null;
  }

  return {
    name,
    description,
    body: body.trim(),
    builtIn: false,
    enabled: true,
  };
}

const REACT_PERFORMANCE_SKILL = `---
name: react-performance
description: How to turn React profiling findings into correct, idiomatic fixes (memoization, state placement, lists, transitions, effects).
---

# React performance fixes

Apply these once profiling data identifies the problem. Always tie the fix to
the observed evidence (which components, which commits, why they rendered).

## Parent-caused re-renders (no own prop/state/hook change)
- Wrap the child in \`React.memo\` — correct when its props are stable between
  the parent's renders. Verify: props changed lists must be empty for the
  child in the profile.
- If a prop is a new function/object each render, memoize it in the parent
  (\`useCallback\`/\`useMemo\`) or the memo() wrapper will not help.
- If the app uses React Compiler, manual memo/useCallback is usually
  unnecessary — suggest checking compiler coverage before adding manual memo.

## State placement
- State that only a subtree reads should live in that subtree ("push state
  down"). A form input's state does not belong in the page component.
- Content that is expensive but independent of the changing state can be
  passed as \`children\` so it is not re-created by the stateful parent.

## Expensive lists
- Items rendering at similar cost each (flat profile across items) suggest
  per-item work: memoize items, and verify stable \`key\`s (index keys defeat
  memoization when the list reorders or grows at the front).
- Long lists (hundreds of rows) benefit from virtualization; recommend it
  only when item count, not per-item cost, is the driver.

## Interaction responsiveness
- Slow discrete-input commits (Sync/InputDiscrete lanes) block the next
  frame. If part of the update can lag (filtering results, charts), wrap
  that state update in \`startTransition\` / \`useDeferredValue\`, keeping the
  input's own state synchronous.

## Effects
- High passive-effect duration in a commit means \`useEffect\` bodies, not
  rendering, are the cost: look for effects that run on every commit due to
  unstable dependencies.

## What NOT to recommend
- Do not sprinkle memoization everywhere; each memo has a cost and unstable
  props make it useless. Only memoize what the profile shows re-rendering
  without cause.
- Do not recommend \`useMemo\` for cheap computations; cite the measured self
  time when recommending it.
`;

const WASTED_RENDERS_SKILL = `---
name: wasted-renders
description: A systematic checklist for finding and confirming unnecessary re-renders in a recorded profiling session.
---

# Wasted-render investigation checklist

1. Start from the summary's \`parent_caused_renders\` column — components with
   a high count re-rendered without any prop/state/hook/context change.
2. For each candidate, call get_component_commits to confirm: renders listed
   as "no own changes (parent re-rendered)" are the wasted ones.
3. Find the trigger: get_render_cause on the affected commits shows which
   component scheduled the update and what actually changed there.
4. Quantify the waste: wasted renders x self time = potential saving. Only
   flag components where the saving is meaningful (>1ms per commit or high
   frequency).
5. Check the fix preconditions before recommending React.memo:
   - Are the props actually stable across parent renders? If the parent
     passes fresh callbacks/objects, the parent must memoize them first.
   - Is the component cheap anyway? memo on a 0.1ms component is noise.
6. Distinguish "wasted" from "necessary but slow": a component whose props
   DID change is not wasted — it may still be slow, which is a different
   fix (reduce per-render cost, split the component, virtualize).
`;

export function getBuiltInSkills(): Array<Skill> {
  const skills = [];
  const sources = [REACT_PERFORMANCE_SKILL, WASTED_RENDERS_SKILL];
  for (let i = 0; i < sources.length; i++) {
    const skill = parseSkillMarkdown(sources[i]);
    if (skill != null) {
      skills.push({...skill, builtIn: true});
    }
  }
  return skills;
}

// Builds the skill catalog for the system prompt (progressive disclosure:
// names and descriptions only; bodies load on demand via the load_skill tool).
export function buildSkillCatalog(skills: Array<Skill>): string {
  const enabled = skills.filter(skill => skill.enabled);
  if (enabled.length === 0) {
    return '';
  }
  const lines = ['## Available skills'];
  lines.push(
    'Skills are instruction packs. When one is relevant to the question,',
    'call load_skill with its name BEFORE answering, and follow it.',
  );
  for (let i = 0; i < enabled.length; i++) {
    lines.push(`- ${enabled[i].name} — ${enabled[i].description}`);
  }
  return lines.join('\n');
}

export function createSkillLoaderTool(skills: Array<Skill>): ToolDefinition {
  return {
    name: 'load_skill',
    description:
      'Loads the full instructions of an available skill by name. Call this ' +
      'before answering when a listed skill matches the question.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {type: 'string', description: 'Skill name from the catalog.'},
      },
      required: ['name'],
    },
    execute: async (args: Object) => {
      const requested = String(args.name || '');
      const skill = skills.find(
        candidate => candidate.enabled && candidate.name === requested,
      );
      if (skill == null) {
        const available = skills
          .filter(candidate => candidate.enabled)
          .map(candidate => candidate.name)
          .join(', ');
        return `Unknown skill "${requested}". Available: ${available || '(none)'}.`;
      }
      return skill.body;
    },
  };
}
