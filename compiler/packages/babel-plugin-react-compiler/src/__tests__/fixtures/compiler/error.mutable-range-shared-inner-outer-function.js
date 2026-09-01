// @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions
let cond = true;
function Component(props) {
  let a;
  let b;
  const f = () => {
    if (cond) {
      a = {};
      b = [];
    } else {
      a = {};
      b = [];
    }
    a.property = true;
    b.push(false);
  };
  return <div onClick={f} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
