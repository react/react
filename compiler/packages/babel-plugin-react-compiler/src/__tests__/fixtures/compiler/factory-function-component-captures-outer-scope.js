// @compilationMode:"infer"
/**
 * Regression test for https://github.com/facebook/react/issues/34901
 *
 * When `infer` mode compiles a component defined inside an enclosing
 * function (e.g. a factory or HOC), inner callbacks that capture
 * variables from the enclosing scope must NOT be hoisted to module
 * scope by `outlineFunctions`. The enclosing scope's locals are
 * mis-tagged as `ModuleLocal` by `HIRBuilder` (it uses
 * `parentFunction.scope.parent` as a proxy for the module scope),
 * so `getCount`'s context appeared empty and outlining would emit a
 * top-level `_temp` function referencing an undefined `counter` at
 * runtime.
 */
function makeCounter(initialValue) {
  const counter = {value: initialValue};

  const Counter = () => {
    const getCount = () => counter.value;
    return <div>{getCount()}</div>;
  };

  return Counter;
}

const Counter = makeCounter(42);

export const FIXTURE_ENTRYPOINT = {
  fn: Counter,
  params: [],
};
