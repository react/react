// @validateNoVoidUseMemo:false @validateExhaustiveMemoizationDependencies:false
function Component(props) {
  const item = props.item;
  const thumbnails = [];
  const baseVideos = getBaseVideos(item);
  useMemo(() => {
    baseVideos.forEach(video => {
      const baseVideo = video.hasBaseVideo;
      if (Boolean(baseVideo)) {
        thumbnails.push({extraVideo: true});
      }
    });
  });
  return <FlatList baseVideos={baseVideos} items={thumbnails} />;
}
