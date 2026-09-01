// @panicThreshold:"none" @validateExhaustiveMemoizationDependencies:false

// unclosed disable rule should affect all components
/* eslint-disable react-hooks/rules-of-hooks */

function ValidComponent1(props) {
  return <div>Hello World!</div>;
}

function ValidComponent2(props) {
  return <div>{props.greeting}</div>;
}
