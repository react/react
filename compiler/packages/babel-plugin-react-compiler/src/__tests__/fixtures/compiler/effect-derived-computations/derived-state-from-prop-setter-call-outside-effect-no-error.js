// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component({initialName}) {
  const [name, setName] = useState('');

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  return (
    <div>
      <input value={name} onChange={e => setName(e.target.value)} />
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{initialName: 'John'}],
};
