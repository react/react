import {Stringify} from 'shared-runtime';

/**
 * We currently hoist the accessed properties of function expressions,
 * regardless of control flow. This is simply because we wrote support for
 * function expressions before doing a lot of work in PropagateScopeDeps
 * to handle conditionally accessed dependencies.
 *
 * Current evaluator error:
 *  Found differences in evaluator results
 *  Non-forget (expected):
 *  (kind: ok) <div>{"shouldInvokeFns":true,"callback":{"kind":"Function","result":null}}</div>
 *  Forget:
 *  (kind: exception) Cannot read properties of null (reading 'prop')
 */
function Component({obj, isObjNull}) {
  const callback = () => {
    if (!isObjNull) {
      return obj.prop;
    } else {
      return null;
    }
  };
  return <Stringify shouldInvokeFns={true} callback={callback} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{obj: null, isObjNull: true}],
};
