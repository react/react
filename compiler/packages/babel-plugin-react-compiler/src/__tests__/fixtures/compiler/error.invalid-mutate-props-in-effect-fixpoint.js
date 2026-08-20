import {useEffect} from 'react';

function Component(props) {
  let x = null;
  while (x == null) {
    x = props.value;
  }
  let y = x;
  let mutateProps = () => {
    y.foo = true;
  };
  let mutatePropsIndirect = () => {
    mutateProps();
  };
  useEffect(() => mutatePropsIndirect(), [mutatePropsIndirect]);
}
