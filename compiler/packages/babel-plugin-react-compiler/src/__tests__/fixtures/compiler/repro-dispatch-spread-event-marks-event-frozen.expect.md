
## Input

```javascript
// @compilationMode:"infer"
function Component() {
  const dispatch = useDispatch();
  // const [state, setState] = useState(0);

  return (
    <div>
      <input
        type="file"
        onChange={event => {
          dispatch(...event.target);
          event.target.value = '';
        }}
      />
    </div>
  );
}

function useDispatch() {
  'use no memo';
  // skip compilation to make it easier to debug the above function
  return (...values) => {
    console.log(...values);
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer"
function Component() {
  const $ = _c(2);
  const dispatch = useDispatch();
  let t0;
  if ($[0] !== dispatch) {
    t0 = (
      <div>
        <input
          type="file"
          onChange={(event) => {
            dispatch(...event.target);
            event.target.value = "";
          }}
        />
      </div>
    );
    $[0] = dispatch;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

function useDispatch() {
  "use no memo";
  // skip compilation to make it easier to debug the above function
  return (...values) => {
    console.log(...values);
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div><input type="file"></div>