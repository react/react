// @validateRefAccessDuringRender
import {PanResponder, Stringify} from 'shared-runtime';

function Component() {
  const ref = useRef(0);
  const config = useMemo(
    () => ({
      onPanResponderRelease: () => {
        ref.current = 0;
      },
    }),
    []
  );
  const panResponder = PanResponder.create(config);
  return <Stringify responder={panResponder} />;
}
