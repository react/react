// @flow
function useChannelRowIndexes(input: ReadonlyArray<{isChannel: boolean}>) {
  const sections = [...input];
  let channelRowCount = 0;
  const indexes = sections.map(section => {
    if (!section.isChannel) {
      return -1;
    }
    return channelRowCount++;
  });
  return {channelRowCount, indexes};
}

export const FIXTURE_ENTRYPOINT = {
  fn: useChannelRowIndexes,
  params: [
    [
      {isChannel: false},
      {isChannel: true},
      {isChannel: true},
      {isChannel: false},
    ],
  ],
  isComponent: false,
};
