function Component(options) {
  const connection = options.connection;
  return {
    read: () => connection,
    open: () => (connection ??= options.connect()),
  };
}
