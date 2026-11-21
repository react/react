import {useRef} from 'react';

function useRefs() {
  return {first: useRef(0), second: useRef(0)};
}

function useRefAndValue(props) {
  return {ref: useRef(null), value: props.value};
}

function Component(props) {
  const {ref, value} = useRefAndValue(props);
  return (
    <div ref={ref}>
      {value}
      {props.children}
    </div>
  );
}
