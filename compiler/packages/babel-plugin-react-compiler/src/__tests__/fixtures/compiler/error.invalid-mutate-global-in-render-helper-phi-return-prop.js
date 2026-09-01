function Component() {
  const renderItem = item => {
    // Multiple returns so that the return type is a Phi (union)
    if (item == null) {
      return null;
    }
    // Normally we assume that it's safe to mutate globals in a function passed
    // as a prop, because the prop could be used as an event handler or effect.
    // But if the function returns JSX we can assume it's a render helper, ie
    // called during render, and thus it's unsafe to mutate globals or call
    // other impure code.
    global.property = true;
    return <Item item={item} value={rand} />;
  };
  return <ItemList renderItem={renderItem} />;
}
