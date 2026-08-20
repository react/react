// @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions
type Bar = string;
function TypeAliasUsedAsVariableAnnotation() {
  type Foo = Bar;
  const fun = f => {
    let g: Foo = f;
    console.log(g);
  };
  fun('hello, world');
}

export const FIXTURE_ENTRYPOINT = {
  fn: TypeAliasUsedAsVariableAnnotation,
  params: [],
};
