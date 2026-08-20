import {CONST_TRUE, useIdentity} from 'shared-runtime';

const hidden = CONST_TRUE;
function useFoo() {
  const makeCb = useIdentity(() => {
    const logIntervalId = () => {
      log(intervalId);
    };

    let intervalId;
    if (!hidden) {
      intervalId = 2;
    }
    return () => {
      logIntervalId();
    };
  });

  return <Stringify fn={makeCb()} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};
