import React, {Suspense, use} from 'react';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function Use({useable}) {
  use(useable);
  return null;
}

let delay1;
let delay2;

export function resetNestedReveal() {
  delay1 = undefined;
  delay2 = undefined;
}

export default function NestedReveal({}) {
  if (!delay1) {
    delay1 = sleep(100);
    // Needs to happen before the throttled reveal of delay 1
    delay2 = sleep(200);
  }

  return (
    <div className="swipe-recognizer">
      Shell
      <Suspense fallback="Loading level 1">
        <div>Level 1</div>
        <Use useable={delay1} />

        <Suspense fallback="Loading level 2">
          <div>Level 2</div>
          <Use useable={delay2} />
        </Suspense>
      </Suspense>
    </div>
  );
}
