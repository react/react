import FixtureSet from '../../FixtureSet';
import TestCase from '../../TestCase';

const React = window.React;
const ReactDOM = window.ReactDOM;

function BadRender(props) {
  props.doThrow();
}

class BadDidMount extends React.Component {
  componentDidMount() {
    this.props.doThrow();
  }

  render() {
    return null;
  }
}

class ErrorBoundary extends React.Component {
  static defaultProps = {
    buttonText: 'Trigger error',
    badChildType: BadRender,
  };
  state = {
    shouldThrow: false,
    didThrow: false,
    error: null,
  };
  componentDidCatch(error) {
    this.setState({error, didThrow: true});
  }
  triggerError = () => {
    this.setState({
      shouldThrow: true,
    });
  };
  render() {
    if (this.state.didThrow) {
      if (this.state.error) {
        return <p>Captured an error: {this.state.error.message}</p>;
      } else {
        return <p>Captured an error: {String(this.state.error)}</p>;
      }
    }
    if (this.state.shouldThrow) {
      const BadChild = this.props.badChildType;
      return <BadChild doThrow={this.props.doThrow} />;
    }
    return <button onClick={this.triggerError}>{this.props.buttonText}</button>;
  }
}
class Example extends React.Component {
  state = {key: 0};
  restart = () => {
    this.setState(state => ({key: state.key + 1}));
  };
  render() {
    return (
      <div>
        <button onClick={this.restart}>Reset</button>
        <ErrorBoundary
          buttonText={this.props.buttonText}
          doThrow={this.props.doThrow}
          key={this.state.key}
        />
      </div>
    );
  }
}

class TriggerErrorAndCatch extends React.Component {
  container = document.createElement('div');

  triggerErrorAndCatch = () => {
    try {
      ReactDOM.flushSync(() => {
        ReactDOM.render(
          <BadRender
            doThrow={() => {
              throw new Error('Caught error');
            }}
          />,
          this.container
        );
      });
    } catch (e) {}
  };

  render() {
    return (
      <button onClick={this.triggerErrorAndCatch}>
        Trigger error and catch
      </button>
    );
  }
}

function silenceWindowError(event) {
  event.preventDefault();
}

class SilenceErrors extends React.Component {
  state = {
    silenceErrors: false,
  };
  componentDidMount() {
    if (this.state.silenceErrors) {
      window.addEventListener('error', silenceWindowError);
    }
  }
  componentDidUpdate(prevProps, prevState) {
    if (!prevState.silenceErrors && this.state.silenceErrors) {
      window.addEventListener('error', silenceWindowError);
    } else if (prevState.silenceErrors && !this.state.silenceErrors) {
      window.removeEventListener('error', silenceWindowError);
    }
  }
  componentWillUnmount() {
    if (this.state.silenceErrors) {
      window.removeEventListener('error', silenceWindowError);
    }
  }
  render() {
    return (
      <div>
        <label>
          <input
            type="checkbox"
            value={this.state.silenceErrors}
            onChange={() =>
              this.setState(state => ({
                silenceErrors: !state.silenceErrors,
              }))
            }
          />
          Silence errors
        </label>
        {this.state.silenceErrors && (
          <div>
            {this.props.children}
            <br />
            <hr />
            <b style={{color: 'red'}}>
              Don't forget to uncheck "Silence errors" when you're done with
              this test!
            </b>
          </div>
        )}
      </div>
    );
  }
}
class GetEventTypeDuringUpdate extends React.Component {
  state = {};

  onClick = () => {
    this.expectUpdate = true;
    this.forceUpdate();
  };

  componentDidUpdate() {
    if (this.expectUpdate) {
      this.expectUpdate = false;
      this.setState({eventType: window.event.type});
      setTimeout(() => {
        this.setState({cleared: !window.event});
      });
    }
  }

  render() {
    return (
      <div className="test-fixture">
        <button onClick={this.onClick}>Trigger callback in event.</button>
        {this.state.eventType ? (
          <p>
            Got <b>{this.state.eventType}</b> event.
          </p>
        ) : (
          <p>Got no event</p>
        )}
        {this.state.cleared ? (
          <p>Event cleared correctly.</p>
        ) : (
          <p>Event failed to clear.</p>
        )}
      </div>
    );
  }
}

class SilenceRecoverableError extends React.Component {
  render() {
    return (
      <SilenceErrors>
        <ErrorBoundary
          badChildType={BadRender}
          buttonText={'Throw (render phase)'}
          doThrow={() => {
            throw new Error('Silenced error (render phase)');
          }}
        />
        <ErrorBoundary
          badChildType={BadDidMount}
          buttonText={'Throw (commit phase)'}
          doThrow={() => {
            throw new Error('Silenced error (commit phase)');
          }}
        />
      </SilenceErrors>
    );
  }
}

class TrySilenceFatalError extends React.Component {
  container = document.createElement('div');

  triggerErrorAndCatch = () => {
    try {
      ReactDOM.flushSync(() => {
        ReactDOM.render(
          <BadRender
            doThrow={() => {
              throw new Error('Caught error');
            }}
          />,
          this.container
        );
      });
    } catch (e) {}
  };

  render() {
    return (
      <SilenceErrors>
        <button onClick={this.triggerErrorAndCatch}>Throw fatal error</button>
      </SilenceErrors>
    );
  }
}

function naiveMemoize(fn) {
  let memoizedEntry;
  return function () {
    if (!memoizedEntry) {
      memoizedEntry = {result: null};
      memoizedEntry.result = fn();
    }
    return memoizedEntry.result;
  };
}
let memoizedFunction = naiveMemoize(function () {
  throw new Error('Passed');
});

export default class ErrorHandlingTestCases extends React.Component {
  render() {
    return (
      <FixtureSet title="Error handling">
        <TestCase
          title="Break on uncaught exceptions"
          description="In DEV, errors should be treated as uncaught, even though React catches them internally">
          <TestCase.Steps>
            <li>Open the browser DevTools</li>
            <li>Make sure "Pause on exceptions" is enabled</li>
            <li>Make sure "Pause on caught exceptions" is disabled</li>
            <li>Click the "Trigger error" button</li>
            <li>Click the reset button</li>
          </TestCase.Steps>
          <TestCase.ExpectedResult>
            The DevTools should pause at the line where the error was thrown, in
            the BadRender component. After resuming, the "Trigger error" button
            should be replaced with "Captured an error: Oops!" Clicking reset
            should reset the test case.
            <br />
            <br />
            In the console, you should see <b>two</b> messages: the actual error
            ("Oops") printed natively by the browser with its JavaScript stack,
            and our addendum ("The above error occurred in BadRender component")
            with a React component stack.
          </TestCase.ExpectedResult>
          <Example
            doThrow={() => {
              throw new Error('Oops!');
            }}
          />
        </TestCase>
        <TestCase title="Throwing null" description="">
          <TestCase.Steps>
            <li>Click the "Trigger error" button</li>
            <li>Click the reset button</li>
          </TestCase.Steps>
          <TestCase.ExpectedResult>
            The "Trigger error" button should be replaced with "Captured an
            error: null". Clicking reset should reset the test case.
          </TestCase.ExpectedResult>
          <Example
            doThrow={() => {
              throw null; // eslint-disable-line no-throw-literal
            }}
          />
        </TestCase>
        <TestCase title="Throwing memoized result" description="">
          <TestCase.Steps>
            <li>Click the "Trigger error" button</li>
            <li>Click the reset button</li>
          </TestCase.Steps>
          <TestCase.ExpectedResult>
            The "Trigger error" button should be replaced with "Captured an
            error: Passed". Clicking reset should reset the test case.
          </TestCase.ExpectedResult>
          <Example
            doThrow={() => {
              memoizedFunction().value;
            }}
          />
        </TestCase>
        <TestCase
          title="Cross-origin errors (development mode only)"
          description="">
          <TestCase.Steps>
            <li>Click the "Trigger cross-origin error" button</li>
            <li>Click the reset button</li>
          </TestCase.Steps>
          <TestCase.ExpectedResult>
            The "Trigger error" button should be replaced with "Captured an
            error: A cross-origin error was thrown [...]". The actual error
            message should be logged to the console: "Uncaught Error: Expected
            true to be false".
          </TestCase.ExpectedResult>
          <Example
            buttonText="Trigger cross-origin error"
            doThrow={() => {
              // The `expect` module is loaded via unpkg, so that this assertion
              // triggers a cross-origin error
              window.expect(true).toBe(false);
            }}
          />
        </TestCase>
        <TestCase
          title="Errors are logged even if they're caught (development mode only)"
          description="">
          <TestCase.Steps>
            <li>Click the "Trigger render error and catch" button</li>
          </TestCase.Steps>
          <TestCase.ExpectedResult>
            Open the console. "Uncaught Error: Caught error" should have been
            logged by the browser. You should also see our addendum ("The above
            error...").
          </TestCase.ExpectedResult>
          <TriggerErrorAndCatch />
        </TestCase>
        <TestCase
          title="Recoverable errors can be silenced with preventDefault (development mode only)"
          description="">
          <TestCase.Steps>
            <li>Check the "Silence errors" checkbox below</li>
            <li>Click the "Throw (render phase)" button</li>
            <li>Click the "Throw (commit phase)" button</li>
            <li>Uncheck the "Silence errors" checkbox</li>
          </TestCase.Steps>
          <TestCase.ExpectedResult>
            Open the console. You shouldn't see <b>any</b> messages in the
            console: neither the browser error, nor our "The above error"
            addendum, from either of the buttons. The buttons themselves should
            get replaced by two labels: "Captured an error: Silenced error
            (render phase)" and "Captured an error: Silenced error (commit
            phase)".
          </TestCase.ExpectedResult>
          <SilenceRecoverableError />
        </TestCase>
        <TestCase
          title="Fatal errors cannot be silenced with preventDefault (development mode only)"
          description="">
          <TestCase.Steps>
            <li>Check the "Silence errors" checkbox below</li>
            <li>Click the "Throw fatal error" button</li>
            <li>Uncheck the "Silence errors" checkbox</li>
          </TestCase.Steps>
          <TestCase.ExpectedResult>
            Open the console. "Error: Caught error" should have been logged by
            React. You should also see our addendum ("The above error...").
          </TestCase.ExpectedResult>
          <TrySilenceFatalError />
        </TestCase>

        {window.hasOwnProperty('event') ? (
          <TestCase
            title="Error handling does not interfere with window.event"
            description="">
            <TestCase.Steps>
              <li>Click the "Trigger callback in event" button</li>
            </TestCase.Steps>
            <TestCase.ExpectedResult>
              You should see "Got <b>click</b> event" and "Event cleared
              successfully" below.
            </TestCase.ExpectedResult>
            <GetEventTypeDuringUpdate />
          </TestCase>
        ) : null}
      </FixtureSet>
    );
  }
}
