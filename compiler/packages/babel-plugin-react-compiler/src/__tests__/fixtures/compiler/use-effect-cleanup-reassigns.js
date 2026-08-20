import {useEffect, useState} from 'react';

/**
 * Example of a function expression whose return value shouldn't have
 * a "freeze" effect on all operands.
 *
 * This is because the function expression is passed to `useEffect` and
 * thus is not a render function. `cleanedUp` is also created within
 * the effect and is not a render variable.
 */
function Component({prop}) {
  const [cleanupCount, setCleanupCount] = useState(0);

  useEffect(() => {
    let cleanedUp = false;
    setTimeout(() => {
      if (!cleanedUp) {
        cleanedUp = true;
        setCleanupCount(c => c + 1);
      }
    }, 0);
    // This return value should not have freeze effects
    // on its operands
    return () => {
      if (!cleanedUp) {
        cleanedUp = true;
        setCleanupCount(c => c + 1);
      }
    };
  }, [prop]);
  return <div>{cleanupCount}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{prop: 5}],
  sequentialRenders: [{prop: 5}, {prop: 5}, {prop: 6}],
};
