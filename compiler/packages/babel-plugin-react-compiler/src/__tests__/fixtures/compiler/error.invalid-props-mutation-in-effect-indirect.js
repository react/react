function Component(props) {
  const mutateProps = () => {
    props.value = true;
  };
  const indirectMutateProps = () => {
    mutateProps();
  };
  useEffect(() => indirectMutateProps(), []);
}
