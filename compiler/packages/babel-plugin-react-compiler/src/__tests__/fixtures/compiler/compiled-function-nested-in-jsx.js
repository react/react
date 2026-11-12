function Component({dataSource, viewRenderer}) {
  return (
    <Search
      filters={[
        {
          getConfig: (() => {
            function useConfig() {
              return {dataSource, viewRenderer};
            }
            return useConfig;
          })(),
        },
      ]}
    />
  );
}
