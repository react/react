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
