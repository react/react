// @compilationMode:"annotation"
function Component({initial}) {
  'use memo';
  const object = {value: initial};
  function tag() {
    object.value++;
    return 0;
  }
  tag`value`;
  return object.value;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{initial: 0}],
  sequentialRenders: [{initial: 0}, {initial: 0}],
};
