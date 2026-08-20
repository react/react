function Component(props) {
  let x = cond ? someGlobal : props.foo;
  const mutatePhiThatCouldBeProps = () => {
    x.y = true;
  };
  const indirectMutateProps = () => {
    mutatePhiThatCouldBeProps();
  };
  useEffect(() => indirectMutateProps(), []);
}
