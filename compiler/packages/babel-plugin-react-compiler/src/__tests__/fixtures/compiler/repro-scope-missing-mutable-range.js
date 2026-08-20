function HomeDiscoStoreItemTileRating(props) {
  const item = useFragment();
  let count = 0;
  const aggregates = item?.aggregates || [];
  aggregates.forEach(aggregate => {
    count += aggregate.count || 0;
  });

  return <Text>{count}</Text>;
}
