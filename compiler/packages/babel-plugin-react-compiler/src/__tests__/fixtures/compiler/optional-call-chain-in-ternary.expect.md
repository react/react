
## Input

```javascript
import {useNoAlias} from 'shared-runtime';

function useFoo(props: {value: {x: string; y: string} | null}) {
  const value = props.value;
  return useNoAlias(value?.x, value?.y) ? {} : null;
}

export const FIXTURE_ENTRYPONT = {
  fn: useFoo,
  props: [{value: null}],
};

```

## Code

```javascript
import { useNoAlias } from "shared-runtime";

function useFoo(props) {
  const value = props.value;
  return useNoAlias(value?.x, value?.y) ? {} : null;
}

export const FIXTURE_ENTRYPONT = {
  fn: useFoo,
  props: [{ value: null }],
};

```
      
### Eval output
(kind: exception) Fixture not implemented