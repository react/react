// @panicThreshold:"none" @validateExhaustiveMemoizationDependencies:false

// unclosed oxlint disable rule should affect all components
/* oxlint-disable react-hooks/rules-of-hooks */

function ValidComponent1(props) {
  return <div>Hello World!</div>;
}

function ValidComponent2(props) {
  return <div>{props.greeting}</div>;
}
