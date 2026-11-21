function Component(options) {
  const {title, visible, retries} = options;
  title ??= options.lookup('title');
  visible ||= options.lookup('visible');
  retries &&= options.lookup('retries');
  return [title, visible, retries];
}
