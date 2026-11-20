// @gating
import {useMemo} from 'react';

/**
 * TypeScript overload signatures reference `useDouble` before its
 * implementation, so gating takes the hoisted-wrapper path. The module must
 * still export `useDouble` (the gated wrapper), not only `useDouble_unoptimized`.
 */
export function useDouble(value: number): number;
export function useDouble(value: string): string;
export function useDouble(value: number | string): number | string {
  return useMemo(
    () => (typeof value === 'number' ? value * 2 : value + value),
    [value],
  );
}

function Component({value}: {value: number}) {
  const doubled = useDouble(value);
  return <div>{doubled}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 2}],
};
