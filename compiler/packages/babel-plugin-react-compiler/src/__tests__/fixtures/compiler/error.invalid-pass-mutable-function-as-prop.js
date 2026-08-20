// @validateNoFreezingKnownMutableFunctions
function Component() {
  const cache = new Map();
  const fn = () => {
    cache.set('key', 'value');
  };
  return <Foo fn={fn} />;
}
