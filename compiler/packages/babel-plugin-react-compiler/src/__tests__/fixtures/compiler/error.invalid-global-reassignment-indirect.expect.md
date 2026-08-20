
## Input

```javascript
import {useEffect, useState} from 'react';

let someGlobal = false;

function Component() {
  const [state, setState] = useState(someGlobal);

  const setGlobal = () => {
    someGlobal = true;
  };
  const indirectSetGlobal = () => {
    setGlobal();
  };
  indirectSetGlobal();

  useEffect(() => {
    setState(someGlobal);
  }, [someGlobal]);

  return <div>{String(state)}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```


## Error

```
Found 1 error:

Error: Cannot reassign variables declared outside of the component/hook

Variable `someGlobal` is declared outside of the component/hook. Reassigning this value during render is a form of side effect, which can cause unpredictable behavior depending on when the component happens to re-render. If this variable is used in rendering, use useState instead. Otherwise, consider updating it in an effect. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#side-effects-must-run-outside-of-render).

error.invalid-global-reassignment-indirect.ts:9:4
   7 |
   8 |   const setGlobal = () => {
>  9 |     someGlobal = true;
     |     ^^^^^^^^^^ `someGlobal` cannot be reassigned
  10 |   };
  11 |   const indirectSetGlobal = () => {
  12 |     setGlobal();
```
          
      