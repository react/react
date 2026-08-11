'use client';

export default function Skeleton({type}) {
  return (
    <div className={'skeleton skeleton-' + type} aria-busy="true">
      <div className="skeleton-shimmer" />
    </div>
  );
}
