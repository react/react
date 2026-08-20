// @enableTransitivelyFreezeFunctionExpressions:false

function Component(props) {
  const item = useMutable(props.itemId);
  const dispatch = useDispatch();
  useFreeze(dispatch);

  const exit = useCallback(() => {
    dispatch(createExitAction());
  }, [dispatch]);

  useEffect(() => {
    const cleanup = GlobalEventEmitter.addListener('onInput', () => {
      if (item.value) {
        exit();
      }
    });
    return () => cleanup.remove();
  }, [exit, item]);

  maybeMutate(item);

  return <div />;
}
