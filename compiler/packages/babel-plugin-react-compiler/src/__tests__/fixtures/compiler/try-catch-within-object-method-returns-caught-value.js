import {throwInput} from 'shared-runtime';

function Component(props) {
  const object = {
    foo() {
      try {
        throwInput([props.value]);
      } catch (e) {
        return e;
      }
    },
  };
  return object.foo();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};
