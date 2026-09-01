// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import {useEffect, useState} from 'react';

function MockComponent({onSet}) {
  return <div onClick={() => onSet('clicked')}>Mock Component</div>;
}

function Component({propValue}) {
  const [value, setValue] = useState(null);
  useEffect(() => {
    setValue(propValue);
  }, [propValue]);

  return <MockComponent onSet={setValue} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{propValue: 'test'}],
};
