import PropTypes from 'prop-types';
const React = window.React;

const propTypes = {
  children: PropTypes.node.isRequired,
};

class Fixture extends React.Component {
  render() {
    const {children} = this.props;

    return <div className="test-fixture">{children}</div>;
  }
}

Fixture.propTypes = propTypes;

export default Fixture;

Fixture.Controls = function FixtureControls({children}) {
  return <div className="test-fixture__controls">{children}</div>;
};
