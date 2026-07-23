// @validatePreserveExistingMemoizationGuarantees
import {useMemo} from 'react';

function visualFor(state, getLabels) {
  return {label: getLabels(state), tint: 'red', glyph: () => null};
}

// Repro: synthesized temporaries for destructured bindings from cross-scope
// hoisting would have their Babel AST identifier node's .loc set to the
// internal GeneratedSource Symbol sentinel instead of null, causing
// v8.serialize / jest-worker IPC failures.
export function Example({state, getLabels, colors, onTap}) {
  const session = useMemo(() => ({state}), [state]);
  if (session.state === 'off') return null;

  const handleTap = () => onTap?.(session.state);
  const {label, tint, glyph} = visualFor(session.state, getLabels);

  return (
    <button aria-label={label} onClick={handleTap} style={{background: tint}}>
      <span>
        {session.state === 'listening' ? <em>...</em> : glyph(colors.fg)}
        <span style={{color: colors.fg}}>{label}</span>
      </span>
    </button>
  );
}
