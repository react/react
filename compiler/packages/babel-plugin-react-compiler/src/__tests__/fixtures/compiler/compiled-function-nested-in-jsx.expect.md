
## Input

```javascript
function Component({dataSource, viewRenderer}) {
  return (
    <Search
      filters={[
        {
          getConfig: (() => {
            function useConfig() {
              return {dataSource, viewRenderer};
            }
            return useConfig;
          })(),
        },
      ]}
    />
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(5);
  const { dataSource, viewRenderer } = t0;
  let t1;
  if ($[0] !== dataSource || $[1] !== viewRenderer) {
    t1 = function useConfig() {
      return { dataSource, viewRenderer };
    };
    $[0] = dataSource;
    $[1] = viewRenderer;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const useConfig = t1;

  const t2 = useConfig;
  let t3;
  if ($[3] !== t2) {
    t3 = <Search filters={[{ getConfig: t2 }]} />;
    $[3] = t2;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  return t3;
}

```
      
### Eval output
(kind: exception) Fixture not implemented