// @validateNoJSXInTryStatements @outputMode:"lint"
import {identity} from 'shared-runtime';

function Component(props) {
  let el;
  try {
    let value;
    try {
      value = identity(props.foo);
    } catch {
      el = <div value={value} />;
    }
  } finally {
    console.log(el);
  }
  return el;
}
