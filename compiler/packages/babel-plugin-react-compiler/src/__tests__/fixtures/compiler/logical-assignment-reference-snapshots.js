import {Stringify} from 'shared-runtime';

function Component() {
  const action = () => {
    let key = 'a';
    const keyed = {stored: 0, b: 0};
    Object.defineProperty(keyed, 'a', {
      get() {
        key = 'b';
        return 0;
      },
      set(value) {
        keyed.stored = value;
      },
    });
    const keyResult = (keyed[key] ||= 7);

    const original = {stored: 0};
    let object = original;
    Object.defineProperty(original, 'x', {
      get() {
        object = {x: 5};
        return null;
      },
      set(value) {
        original.stored = value;
      },
    });
    const objectResult = (object.x ??= 9);
    return {
      keyStored: keyed.stored,
      otherKey: keyed.b,
      key,
      keyResult,
      objectStored: original.stored,
      reboundObject: object.x,
      objectResult,
    };
  };
  return <Stringify action={action} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
