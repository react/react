import React from 'react';
import {
  TASK_STATUS,
  TASK_STATUS_LABEL,
  ISSUE_STATUS,
} from '../domain/constants.js';

// -----------------------------------------------------------------------------
// Shared UI primitives — "industrial / construction" design system.
// Chunky touch targets (min 44px), high contrast, safety-amber accent.
// These are presentational only; they hold no logic and touch no data.
// -----------------------------------------------------------------------------

const BUTTON_VARIANTS = {
  primary:
    'bg-brand text-brand-fg hover:bg-brand-dark hover:text-white font-semibold',
  secondary:
    'bg-white text-steel border-2 border-steel hover:bg-steel hover:text-white font-semibold',
  danger: 'bg-hazard text-white hover:bg-red-700 font-semibold',
  ghost: 'bg-transparent text-steel hover:bg-zinc-200 font-medium',
};

export function Button({variant = 'primary', type = 'button', className = '', ...props}) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function PageTitle({children, subtitle}) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-black tracking-tight text-steel">
        {children}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
    </div>
  );
}

// Invite code chip — monospace, easy to read aloud on site.
export function InviteCode({code}) {
  return (
    <span className="inline-block rounded border border-brand-dark bg-amber-50 px-2 py-0.5 font-mono text-sm font-bold tracking-widest text-brand-dark">
      {code}
    </span>
  );
}

export function Card({className = '', children}) {
  return (
    <div
      className={`rounded-lg border border-zinc-300 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// Section heading with the signature amber rule on the left.
export function SectionTitle({children, count}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 border-l-4 border-brand pl-3 text-lg font-bold tracking-tight text-steel uppercase">
      {children}
      {count !== undefined && (
        <span className="rounded bg-zinc-200 px-2 py-0.5 text-sm font-semibold text-zinc-600">
          {count}
        </span>
      )}
    </h2>
  );
}

const TASK_STATUS_STYLE = {
  [TASK_STATUS.TODO]: 'bg-zinc-200 text-zinc-700',
  [TASK_STATUS.IN_PROGRESS]: 'bg-progress text-white',
  [TASK_STATUS.DONE]: 'bg-go text-white',
};

export function StatusBadge({status}) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${TASK_STATUS_STYLE[status] || 'bg-zinc-200 text-zinc-700'}`}>
      {TASK_STATUS_LABEL[status] || status}
    </span>
  );
}

export function IssueBadge({status}) {
  const open = status === ISSUE_STATUS.OPEN;
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
        open ? 'bg-hazard text-white' : 'bg-zinc-200 text-zinc-600'
      }`}>
      {open ? 'Open' : 'Resolved'}
    </span>
  );
}

// Labeled field wrapper for forms.
export function Field({label, children}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-steel">
        {label}
      </span>
      {children}
    </label>
  );
}

const CONTROL =
  'w-full min-h-11 rounded-md border-2 border-zinc-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none';

export function TextInput(props) {
  return <input className={CONTROL} {...props} />;
}

export function TextArea(props) {
  return <textarea className={`${CONTROL} min-h-24`} {...props} />;
}

export function Select({className = '', ...props}) {
  return <select className={`${CONTROL} ${className}`} {...props} />;
}

// Styled file picker — the native button is themed to match the system.
export function FileInput(props) {
  return (
    <input
      type="file"
      className="block w-full text-sm text-zinc-500 file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border-0 file:bg-steel file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-steel-light"
      {...props}
    />
  );
}

// Initials avatar — keeps the logged-in user visible even on small screens.
export function Avatar({name}) {
  const initials = (name || '?')
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-fg">
      {initials}
    </span>
  );
}
