function Component(value) {
  return {
    1n: value,
    0x10n: value + 1,
    0o10n: value + 2,
    0b10n: value + 3,
    9007199254740993n: value + 4,
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [1],
  isComponent: false,
};