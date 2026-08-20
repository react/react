// @validatePreserveExistingMemoizationGuarantees
function Component(props) {
  const data = useMemo(() => {
    // actual code is non-optional
    return props.items.edges.nodes ?? [];
    // deps are optional
  }, [props.items?.edges?.nodes]);
  return <Foo data={data} />;
}
