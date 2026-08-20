
## Input

```javascript
// @enableCustomTypeDefinitionForReanimated
import {useAnimatedProps, useSharedValue} from 'react-native-reanimated';
function Component() {
  const radius = useSharedValue(50);

  const animatedProps = useAnimatedProps(() => {
    // draw a circle
    const path = `
    M 100, 100
    m -${radius.value}, 0
    a ${radius.value},${radius.value} 0 1,0 ${radius.value * 2},0
    a ${radius.value},${radius.value} 0 1,0 ${-radius.value * 2},0
    `;
    return {
      d: path,
    };
  });

  // attach animated props to an SVG path using animatedProps
  return (
    <Svg>
      <AnimatedPath animatedProps={animatedProps} fill="black" />
    </Svg>
  );
}
export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableCustomTypeDefinitionForReanimated
import { useAnimatedProps, useSharedValue } from "react-native-reanimated";
function Component() {
  const $ = _c(2);
  const radius = useSharedValue(50);

  const animatedProps = useAnimatedProps(() => {
    const path = `
    M 100, 100
    m -${radius.value}, 0
    a ${radius.value},${radius.value} 0 1,0 ${radius.value * 2},0
    a ${radius.value},${radius.value} 0 1,0 ${-radius.value * 2},0
    `;
    return { d: path };
  });
  let t0;
  if ($[0] !== animatedProps) {
    t0 = (
      <Svg>
        <AnimatedPath animatedProps={animatedProps} fill="black" />
      </Svg>
    );
    $[0] = animatedProps;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```
      