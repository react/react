// @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
function Component() {
  const items = useItems();
  const filteredItems = useMemo(
    () =>
      items.filter(([item]) => {
        return item.name != null;
      }),
    [item]
  );

  if (filteredItems.length === 0) {
    // note: this must return nested JSX to create the right scope
    // shape that causes no declarations to be emitted
    return (
      <div>
        <span />
      </div>
    );
  }

  return (
    <>
      {filteredItems.map(([item]) => (
        <Stringify item={item} />
      ))}
    </>
  );
}
