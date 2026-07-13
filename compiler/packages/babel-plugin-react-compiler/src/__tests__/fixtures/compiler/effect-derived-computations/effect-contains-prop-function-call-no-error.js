// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component({propValue, onChange}) {
  const [value, setValue] = useState(null);
  useEffect(() => {
    setValue(propValue);
    onChange();
  }, [propValue]);

  return <div>{value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{propValue: 'test', onChange: () => {}}],
};
