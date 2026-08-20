import {makeObject_Primitives, Stringify} from 'shared-runtime';

function Component(props) {
  let useFeature = makeObject_Primitives();
  let x;
  if (useFeature) {
    x = [useFeature + useFeature].push(-useFeature);
  }
  let y = useFeature;
  let z = useFeature.useProperty;
  return (
    <Stringify val={useFeature}>
      {x}
      {y}
      {z}
    </Stringify>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
