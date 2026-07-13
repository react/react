function id<T>(x: T): T {
  return x;
}

export function Component<T = string>({fn = id<T>}: {fn?: (x: T) => T}) {
  const value = fn('hi' as T);
  return <div>{String(value)}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
