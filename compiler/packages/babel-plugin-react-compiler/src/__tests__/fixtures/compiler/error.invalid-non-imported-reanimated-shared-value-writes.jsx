// @enableCustomTypeDefinitionForReanimated

/**
 * Test that a global (i.e. non-imported) useSharedValue is treated as an
 * unknown hook.
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
