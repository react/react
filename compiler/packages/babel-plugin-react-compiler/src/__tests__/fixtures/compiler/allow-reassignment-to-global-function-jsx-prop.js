function Component() {
  const onClick = () => {
    // Cannot assign to globals
    someUnknownGlobal = true;
    moduleLocal = true;
  };
  // It's possible that this could be an event handler / effect function,
  // but we don't know that and optimistically assume it will only be
  // called by an event handler or effect, where it is allowed to modify globals
  return <div onClick={onClick} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
