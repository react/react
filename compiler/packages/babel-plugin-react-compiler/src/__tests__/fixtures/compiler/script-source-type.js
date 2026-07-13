// @script
const React = require('react');

function Component(props) {
  return <div>{props.name}</div>;
}

// To work with snap evaluator
exports = {
  FIXTURE_ENTRYPOINT: {
    fn: Component,
    params: [{name: 'React Compiler'}],
  },
};
