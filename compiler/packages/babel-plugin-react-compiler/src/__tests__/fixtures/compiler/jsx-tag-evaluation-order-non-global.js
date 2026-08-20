import {StaticText1, StaticText2} from 'shared-runtime';

function MaybeMutable() {
  return {};
}
function maybeMutate(x) {}

function Component(props) {
  const maybeMutable = new MaybeMutable();
  let Tag = props.component;
  // NOTE: the order of evaluation in the lowering is incorrect:
  // the jsx element's tag observes `Tag` after reassignment, but should observe
  // it before the reassignment.

  // Currently, Forget preserves jsx whitespace in the source text.
  // prettier-ignore
  return (
    <Tag>{((Tag = props.alternateComponent), maybeMutate(maybeMutable))}<Tag /></Tag>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{component: StaticText1, alternateComponent: StaticText2}],
  isComponent: true,
};
