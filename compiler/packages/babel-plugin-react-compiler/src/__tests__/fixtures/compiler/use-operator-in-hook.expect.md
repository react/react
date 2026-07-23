
## Input

```javascript
// @compilationMode:"infer" @expectNothingCompiled
import {use} from 'react';

const MyContext = React.createContext(null);

function useMyContext() {
  const context = use(MyContext);
  return [context];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useMyContext,
  params: [],
};

```

## Code

```javascript
// @compilationMode:"infer" @expectNothingCompiled
import { use } from "react";

const MyContext = React.createContext(null);

function useMyContext() {
  const context = use(MyContext);
  return [context];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useMyContext,
  params: [],
};

```
      
### Eval output
(kind: ok) [null]