import {use$, use_} from 'shared-runtime';

function Component(props) {
  if (props.cond) {
    use$();
  }
  if (props.otherCond) {
    use_();
  }
  return null;
}
