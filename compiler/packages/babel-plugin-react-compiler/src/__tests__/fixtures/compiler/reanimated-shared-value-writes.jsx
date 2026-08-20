// @enableCustomTypeDefinitionForReanimated
import {useSharedValue} from 'react-native-reanimated';

/**
 * https://docs.swmansion.com/react-native-reanimated/docs/2.x/api/hooks/useSharedValue/
 *
 * Test that shared values are treated as ref-like, i.e. allowing writes outside
 * of render
 */
function SomeComponent() {
  const sharedVal = useSharedValue(0);
  return (
    <Button
      onPress={() => (sharedVal.value = Math.random())}
      title="Randomize"
    />
  );
}
