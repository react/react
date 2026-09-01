
## Input

```javascript
import fbt from 'fbt';

function Component({a, b}) {
  return (
    <fbt desc="Description">
      <fbt:enum enum-range={['avalue1', 'avalue1']} value={a} />{' '}
      <fbt:enum enum-range={['bvalue1', 'bvalue2']} value={b} />
    </fbt>
  );
}

```


## Error

```
Found 1 error:

Todo: Support duplicate fbt tags

Support `<fbt>` tags with multiple `<fbt:enum>` values.

error.todo-fbt-unknown-enum-value.ts:6:7
  4 |   return (
  5 |     <fbt desc="Description">
> 6 |       <fbt:enum enum-range={['avalue1', 'avalue1']} value={a} />{' '}
    |        ^^^^^^^^ Multiple `<fbt:enum>` tags found
  7 |       <fbt:enum enum-range={['bvalue1', 'bvalue2']} value={b} />
  8 |     </fbt>
  9 |   );

error.todo-fbt-unknown-enum-value.ts:7:7
   5 |     <fbt desc="Description">
   6 |       <fbt:enum enum-range={['avalue1', 'avalue1']} value={a} />{' '}
>  7 |       <fbt:enum enum-range={['bvalue1', 'bvalue2']} value={b} />
     |        ^^^^^^^^ Multiple `<fbt:enum>` tags found
   8 |     </fbt>
   9 |   );
  10 | }
```
          
      