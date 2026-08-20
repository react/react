import {identity} from 'shared-runtime';

class Foo {}
function Component({val}) {
  const MyClass = identity(Foo);
  const x = [val];
  const y = new MyClass();

  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{val: 0}],
};
