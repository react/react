function component({mutator}) {
  const poke = () => {
    mutator.poke();
  };

  const hide = () => {
    mutator.user.hide();
  };

  return <Foo poke={poke} hide={hide}></Foo>;
}
