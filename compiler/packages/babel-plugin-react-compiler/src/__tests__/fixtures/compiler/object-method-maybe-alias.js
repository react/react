import {createHookWrapper, setProperty} from 'shared-runtime';
function useHook(props) {
  const x = {
    getX() {
      return props;
    },
  };
  const y = {
    getY() {
      return 'y';
    },
  };
  return setProperty(x, y);
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{value: 0}],
};
