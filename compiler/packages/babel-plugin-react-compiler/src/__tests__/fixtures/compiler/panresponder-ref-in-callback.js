// @flow
import {PanResponder, Stringify} from 'shared-runtime';

export default component Playground() {
  const onDragEndRef = useRef(() => {});
  useEffect(() => {
    onDragEndRef.current = () => {
      console.log('drag ended');
    };
  });
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onPanResponderTerminate: () => {
          onDragEndRef.current();
        },
      }),
    []
  );
  return <Stringify responder={panResponder} />;
}
