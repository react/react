function Component({c}) {
  let h = c++;
  let i = --c;
  return [c, h, i];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{c: 4}],
  isComponent: false,
};
