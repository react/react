// @flow @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions
function Component(listItem, thread) {
  const isFoo = isFooThread(thread.threadType);
  const body = useBar(listItem, [getBadgeText(listItem, isFoo)]);

  return body;
}
