import {notAhookTypedAsHook} from 'ReactCompilerTest';

function Component() {
  return <div>{notAhookTypedAsHook()}</div>;
}
