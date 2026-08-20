// @panicThreshold:"none"
import {useHook} from 'shared-runtime';

function InvalidComponent(props) {
  if (props.cond) {
    useHook();
  }
  return <div>Hello World!</div>;
}

function ValidComponent(props) {
  return <div>{props.greeting}</div>;
}
