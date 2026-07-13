/**
 * Exhaustive Deps
 */
// Valid because dependencies are declared correctly
function Comment({comment, commentSource}) {
  const currentUserID = comment.viewer.id;
  const environment = RelayEnvironment.forUser(currentUserID);
  const commentID = nullthrows(comment.id);
  useEffect(() => {
    const subscription = SubscriptionCounter.subscribeOnce(
      `StoreSubscription_${commentID}`,
      () =>
        StoreSubscription.subscribe(
          environment,
          {
            comment_id: commentID,
          },
          currentUserID,
          commentSource
        )
    );
    return () => subscription.dispose();
  }, [commentID, commentSource, currentUserID, environment]);
}

// Valid because no dependencies
function UseEffectWithNoDependencies() {
  const local = {};
  useEffect(() => {
    console.log(local);
  });
}
function UseEffectWithEmptyDependencies() {
  useEffect(() => {
    const local = {};
    console.log(local);
  }, []);
}

// OK because `props` wasn't defined.
function ComponentWithNoPropsDefined() {
  useEffect(() => {
    console.log(props.foo);
  }, []);
}

// Valid because props are declared as a dependency
function ComponentWithPropsDeclaredAsDep({foo}) {
  useEffect(() => {
    console.log(foo.length);
    console.log(foo.slice(0));
  }, [foo]);
}

// Valid because individual props are declared as dependencies
function ComponentWithIndividualPropsDeclaredAsDeps(props) {
  useEffect(() => {
    console.log(props.foo);
    console.log(props.bar);
  }, [props.bar, props.foo]);
}

// Invalid because neither props or props.foo are declared as dependencies
function ComponentWithoutDeclaringPropAsDep(props) {
  useEffect(() => {
    console.log(props.foo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useCallback(() => {
    console.log(props.foo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useMemo(() => {
    console.log(props.foo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => {
    console.log(props.foo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useCallback(() => {
    console.log(props.foo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useMemo(() => {
    console.log(props.foo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.notReactiveHook(() => {
    console.log(props.foo);
  }, []); // This one isn't a violation
}

/**
 * Rules of Hooks
 */
// Valid because functions can call functions.
function normalFunctionWithConditionalFunction() {
  if (cond) {
    doSomething();
  }
}

// Valid because hooks can call hooks.
function useHook() {
  useState();
}
const whatever = function useHook() {
  useState();
};
const useHook1 = () => {
  useState();
};
let useHook2 = () => useState();
useHook2 = () => {
  useState();
};

// Invalid because hooks can't be called in conditionals.
function ComponentWithConditionalHook() {
  if (cond) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useConditionalHook();
  }
}

// Invalid because hooks can't be called in loops.
function useHookInLoops() {
  while (a) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useHook1();
    if (b) return;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useHook2();
  }
  while (c) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useHook3();
    if (d) return;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useHook4();
  }
}

/**
 * Compiler Rules
 */
// Invalid: component factory
function InvalidComponentFactory() {
  const DynamicComponent = () => <div>Hello</div>;
  // eslint-disable-next-line react-hooks/static-components
  return <DynamicComponent />;
}

// Invalid: mutating globals
function InvalidGlobals() {
  // eslint-disable-next-line react-hooks/immutability
  window.myGlobal = 42;
  return <div>Done</div>;
}

// Invalid: useMemo with wrong deps
function InvalidUseMemo({items}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sorted = useMemo(() => [...items].sort(), []);
  return <div>{sorted.length}</div>;
}
