function Component(props) {
  const value = {count: null, other: 2, enabled: true, fallback: 0};
  let writes = 0;

  value[props.key] ??= (writes += 1, props.count);
  value.other ??= (writes += 1, props.count);
  value.enabled &&= (writes += 1, props.enabled);
  value.fallback ||= (writes += 1, props.count);

  return [value.count, value.other, value.enabled, value.fallback, writes];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{key: 'count', count: 1, enabled: false}],
  isComponent: false,
};
