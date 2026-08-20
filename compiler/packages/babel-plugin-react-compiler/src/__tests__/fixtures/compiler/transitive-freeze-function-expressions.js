// @enableTransitivelyFreezeFunctionExpressions
function Component(props) {
  const {data, loadNext, isLoadingNext} =
    usePaginationFragment(props.key).items ?? [];

  const loadMoreWithTiming = () => {
    if (data.length === 0) {
      return;
    }
    loadNext();
  };

  useEffect(() => {
    if (isLoadingNext) {
      return;
    }
    loadMoreWithTiming();
  }, [isLoadingNext, loadMoreWithTiming]);

  const items = data.map(x => x);

  return items;
}
