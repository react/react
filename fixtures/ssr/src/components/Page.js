import React, {Component} from 'react';

import Theme from './Theme';
import Suspend from './Suspend';

import './Page.css';

const autofocusedInputs = [
  <input key="0" autoFocus placeholder="Has auto focus" />,
  <input key="1" autoFocus placeholder="Has auto focus" />,
];

export default class Page extends Component {
  state = {active: false, value: ''};
  handleClick = e => {
    this.setState({active: true});
  };
  handleChange = e => {
    this.setState({value: e.target.value});
  };
  componentDidMount() {
    // Rerender on mount
    this.setState({mounted: true});
  }
  render() {
    const link = (
      <a className="link" onClick={this.handleClick}>
        Click Here
      </a>
    );
    return (
      <div className={this.context + '-box'}>
        <Suspend>
          <p suppressHydrationWarning={true}>
            A random number: {Math.random()}
          </p>
          <p>Autofocus on page load: {autofocusedInputs}</p>
          <p>{!this.state.active ? link : 'Thanks!'}</p>
          {this.state.active && <p>Autofocus on update: {autofocusedInputs}</p>}
          <p>
            Controlled input:{' '}
            <input value={this.state.value} onChange={this.handleChange} />
          </p>
        </Suspend>
      </div>
    );
  }
}
Page.contextType = Theme;
