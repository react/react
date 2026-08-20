// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component({propValue}) {
  const [value, setValue] = useState(null);

  function localFunction() {
    console.log('local function');
  }

  useEffect(() => {
    setValue(propValue);
    localFunction();
  }, [propValue]);

  return <div>{value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{propValue: 'test'}],
};
