
## Input

```javascript
import {useMemo} from 'react';
import {useFoo, formatB, Baz} from './lib';

export const Example = ({data}) => {
  let a;
  let b;

  if (data) {
    ({a, b} = data);
  }

  const foo = useFoo(a);
  const bar = useMemo(() => formatB(b), [b]);

  return <Baz foo={foo} bar={bar} />;
};

```


## Error

```
Found 1 error:

Invariant: Expected consistent kind for destructuring

Other places were `Reassign` but 'mutate? #t8$46[7:9]{reactive}' is const.

error.bug-invariant-expected-consistent-destructuring.ts:9:9
   7 |
   8 |   if (data) {
>  9 |     ({a, b} = data);
     |          ^ Expected consistent kind for destructuring
  10 |   }
  11 |
  12 |   const foo = useFoo(a);
```
          
      