function Component(props) {
  return props?.items?.map?.(render)?.filter(Boolean) ?? [];
}
