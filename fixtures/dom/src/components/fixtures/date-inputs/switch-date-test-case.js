const React = window.React;

const startDate = new Date();
/**
 * This test case was originally provided by @richsoni,
 * https://github.com/react/react/issues/8116
 */
class SwitchDateTestCase extends React.Component {
  state = {
    fullDate: false,
    date: startDate,
  };

  render() {
    const attrs = this.inputAttrs();

    return (
      <div>
        <p>
          <b>{attrs.type}</b> input type ({attrs.value})
        </p>
        <p>
          <input
            type={attrs.type}
            value={attrs.value}
            onChange={this.onInputChange}
          />
          <label>
            <input
              type="checkbox"
              checked={this.state.fullDate}
              onChange={this.updateFullDate}
            />{' '}
            Switch type
          </label>
        </p>
      </div>
    );
  }

  inputAttrs() {
    if (this.state.fullDate) {
      return {
        type: 'datetime-local',
        value: this.state.date.toISOString().replace(/\..*Z/, ''),
      };
    } else {
      return {
        type: 'date',
        value: this.state.date.toISOString().replace(/T.*/, ''),
      };
    }
  }

  onInputChange = ({target: {value}}) => {
    const date = value ? new Date(Date.parse(value)) : startDate;
    this.setState({date});
  };

  updateFullDate = () => {
    this.setState({
      fullDate: !this.state.fullDate,
    });
  };
}

export default SwitchDateTestCase;
