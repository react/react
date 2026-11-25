import {Stringify} from 'shared-runtime';

/**
 * The handler only runs on click, and the button is disabled while the list is
 * empty. Reading `items[0].id` during render would throw on the first render.
 */
function Component({items}: {items: Array<{id: number}>}) {
  return (
    <Stringify disabled={items.length === 0} onClick={() => items[0].id} />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: []}],
  sequentialRenders: [{items: []}, {items: [{id: 1}]}],
};
