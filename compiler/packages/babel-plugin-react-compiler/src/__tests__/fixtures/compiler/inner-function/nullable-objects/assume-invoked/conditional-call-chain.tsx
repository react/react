import {useRef} from 'react';
import {Stringify} from 'shared-runtime';

function Component({a, b}) {
  const logA = () => {
    console.log(a.value);
  };
  const logB = () => {
    console.log(b.value);
  };
  const hasLogged = useRef(false);
  const log = () => {
    if (!hasLogged.current) {
      logA();
      logB();
      hasLogged.current = true;
    }
  };
  return <Stringify log={log} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: {value: 1}, b: {value: 2}}],
  sequentialRenders: [
    {a: {value: 1}, b: {value: 2}},
    {a: {value: 3}, b: {value: 4}},
  ],
};
