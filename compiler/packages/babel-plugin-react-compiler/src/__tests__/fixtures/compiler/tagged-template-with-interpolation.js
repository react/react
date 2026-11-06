function tag(strings, value) {
  return strings[0] + value + strings[1];
}

function Component({name}) {
  return tag`hello ${name}`;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Ada'}],
};
