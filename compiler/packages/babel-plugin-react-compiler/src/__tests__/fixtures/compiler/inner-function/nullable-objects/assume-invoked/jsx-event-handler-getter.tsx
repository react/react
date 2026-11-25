import {Stringify} from 'shared-runtime';

/**
 * Property loads can run getters with side effects (e.g. libraries that track
 * which values a component reads during render). A handler that is not invoked
 * during render must not cause its property loads to run during render.
 */
class Store {
  get value(): number {
    throw new Error('Store.value must not be read during render');
  }
}

function Component({store}: {store: Store}) {
  return <Stringify onClick={() => store.value} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{store: new Store()}],
};
