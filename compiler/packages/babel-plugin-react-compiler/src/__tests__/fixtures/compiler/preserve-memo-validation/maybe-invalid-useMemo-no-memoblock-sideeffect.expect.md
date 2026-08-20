
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees

import {useMemo} from 'react';

// This is currently considered valid because we don't ensure that every
// instruction within manual memoization gets assigned to a reactive scope
// (i.e. inferred non-mutable or non-escaping values don't get memoized)
function useFoo({minWidth, styles, setStyles}) {
  useMemo(() => {
    if (styles.width > minWidth) {
      setStyles(styles);
    }
  }, [styles, minWidth, setStyles]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{minWidth: 2, styles: {width: 1}, setStyles: () => {}}],
};

```

## Code

```javascript
// @validatePreserveExistingMemoizationGuarantees

import { useMemo } from "react";

// This is currently considered valid because we don't ensure that every
// instruction within manual memoization gets assigned to a reactive scope
// (i.e. inferred non-mutable or non-escaping values don't get memoized)
function useFoo(t0) {
  const { minWidth, styles, setStyles } = t0;

  if (styles.width > minWidth) {
    setStyles(styles);
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ minWidth: 2, styles: { width: 1 }, setStyles: () => {} }],
};

```
      
### Eval output
(kind: ok) 