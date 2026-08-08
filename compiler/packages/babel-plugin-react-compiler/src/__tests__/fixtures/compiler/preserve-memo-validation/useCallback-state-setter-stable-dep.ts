// @validatePreserveExistingMemoizationGuarantees
import {useCallback, useState} from 'react';

/**
 * State setters (and other stable values like dispatch) must not be required
 * in manual dependency arrays. The compiler should not reject a component
 * because its useCallback omits a state setter from its deps list, since
 * state setters are guaranteed stable across renders.
 *
 * Regression test for: Compiler requires state setter to be added to
 * dependency array (github.com/facebook/react/issues/36384)
 */
function Component({data}: {data: Array<string>}) {
  const [processed, setProcessed] = useState<Array<string>>([]);
  const [count, setCount] = useState(0);

  const handleProcess = useCallback(async () => {
    const result = data.map(d => d.trim());
    setProcessed(prev => [...prev, ...result]);
    setCount(c => c + 1);
  }, [data]);

  return (
    <div>
      <button onClick={handleProcess}>Process</button>
      <span>{count}</span>
      {processed.map((p, i) => (
        <div key={i}>{p}</div>
      ))}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: ['hello ', ' world']}],
};
