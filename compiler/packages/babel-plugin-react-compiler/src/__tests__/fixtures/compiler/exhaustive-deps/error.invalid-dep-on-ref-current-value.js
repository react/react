// @validateExhaustiveMemoizationDependencies

function Component() {
  const ref = useRef(null);
  const onChange = useCallback(() => {
    return ref.current.value;
  }, [ref.current.value]);

  return <input ref={ref} onChange={onChange} />;
}
