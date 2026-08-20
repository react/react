function Component(props) {
  const dispatch = useDispatch();
  useFreeze(dispatch);

  // onUpdate should be memoized even though it doesn't
  // flow into the return value
  const onUpdate = () => {
    dispatch({kind: 'update'});
  };

  useEffect(() => {
    onUpdate();
  }, [onUpdate]);

  return <div />;
}
