// @validateRefAccessDuringRender
function useHook({value}) {
  const ref = useRef(null);
  // Writing to a ref in render is against the rules:
  ref.current = value;
  // returning a ref is allowed, so this alone doesn't trigger an error:
  return ref;
}
