
## Input

```javascript
import Bar from './Bar';

export function Foo() {
  return (
    <Bar
      renderer={(...props) => {
        return <span {...props}>{displayValue}</span>;
      }}
    />
  );
}

```


## Error

```
Found 1 error:

Invariant: Expected temporaries to be promoted to named identifiers in an earlier pass

identifier 15 is unnamed.
```
          
      