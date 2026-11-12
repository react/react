
## Input

```javascript
/**
 * @flow strict-local
 * @format
 */

'use strict';

import type {SelectorStrict} from 'SelectorStrict';
import type LoadObject from 'LoadObject';

import DataAtom from 'DataAtom';
// eslint-disable-next-line custom/no-restricted-imports
import BaseSingleDataStore from 'BaseSingleDataStore';

import storeToSelector from 'storeToSelector';
import invariant from 'invariant';
import createLoadObjectSelector from 'createLoadObjectSelector';

/**
 * Create a ad-hoc store + selector that lives as long as it's used
 *
 * Allows the easy use of Suspense and caching without having to define a
 * new store/selector file every time we need to load data from a
 * controller
 *
 * Use:
 * const dogSelector = adHocSelector(() => promiseAsyncRequest(DogsController.getURIBuilder().getURI()),
 *
 * const dogComponent = createSuspenseContainer(dogSelector, dog => <Dog dog={dog} />);
);
 */

const stores = new Set<string>();

function adHocSelector<T>(
  storeName: string,
  genFunction: () => Promise<empty>
): SelectorStrict<LoadObject<unknown>, unknown, unknown> {
  invariant(
    !stores.has(storeName),
    'adHocSelector was run multiple times for store name %s',
    storeName
  );
  stores.add(storeName);
  class AdHocStore extends BaseSingleDataStore<T, void> {
    __loadPromise: () => Promise<empty> = genFunction;
  }

  const adHocStore = new AdHocStore(storeName, DataAtom);

  return createLoadObjectSelector([storeToSelector(adHocStore)], () =>
    adHocStore.getData()
  );
}

// $FlowFixMe[incompatible-type]
export default adHocSelector as <T>(
  storeName: string,
  genFunction: () => Promise<empty>
) => SelectorStrict<LoadObject<T>>;

```


## Error

```
Found 1 error:

Invariant: [InferMutationAliasingEffects] Expected value kind to be initialized

<unknown> AdHocStore$16:TFunction.

error.bug-hir_loc_diff_2.ts:49:25
  47 |   }
  48 |
> 49 |   const adHocStore = new AdHocStore(storeName, DataAtom);
     |                          ^^^^^^^^^^ this is uninitialized
  50 |
  51 |   return createLoadObjectSelector([storeToSelector(adHocStore)], () =>
  52 |     adHocStore.getData()
```
          
      