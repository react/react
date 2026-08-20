'use client';

export default function Badge({count, variant}) {
  const className = 'badge' + (variant ? ' badge-' + variant : '');
  return <span className={className}>{count}</span>;
}
