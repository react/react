'use client';

export function Dynamic() {
  return (
    <div>
      This client component should be loaded in a single chunk even when it is
      used as both a client reference and as a dynamic import.
    </div>
  );
}
