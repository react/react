// @validateRefAccessDuringRender

function useHook(parentRef) {
  // Some components accept a union of "callback" refs and ref objects, which
  // we can't currently represent
  const elementRef = useRef(null);
  const handler = instance => {
    elementRef.current = instance;
    if (parentRef != null) {
      if (typeof parentRef === 'function') {
        // This call infers the type of `parentRef` as a function...
        parentRef(instance);
      } else {
        // So this assignment fails since we don't know its a ref
        parentRef.current = instance;
      }
    }
  };
  return handler;
}
