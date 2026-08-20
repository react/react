function Foo(props) {
  const onFoo = useCallback(
    reason => {
      log(props.router.location);
    },
    [props.router.location]
  );

  return onFoo;
}
