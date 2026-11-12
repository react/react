// @flow @compilationMode(infer)
function Component(props: {data: Array<[string, mixed]>}) {
  let id = 0;
  for (const [key, value] of props.data) {
    const item = {
      key,
      id: '' + id++,
    };
  }
  const getIndex = ((): ((id: string) => number) => {
    return (id: string): number => 0;
  })();
  return <div />;
}
