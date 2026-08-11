let React;
let ReactNoop;
let Scheduler;
let act;
let Activity;
let useState;
let assertLog;

describe('Activity error handling', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    Activity = React.Activity;
    useState = React.useState;

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;
  });

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  it(
    'errors inside a hidden Activity do not escape in the visible part ' +
      'of the UI',
    async () => {
      class ErrorBoundary extends React.Component {
        state = {error: null};
        static getDerivedStateFromError(error) {
          return {error};
        }
        render() {
          if (this.state.error) {
            return (
              <Text text={`Caught an error: ${this.state.error.message}`} />
            );
          }
          return this.props.children;
        }
      }

      function Throws() {
        throw new Error('Oops!');
      }

      let setShowMore;
      function App({content, more}) {
        const [showMore, _setShowMore] = useState(false);
        setShowMore = _setShowMore;
        return (
          <>
            <div>{content}</div>
            <div>
              <ErrorBoundary>
                <Activity mode={showMore ? 'visible' : 'hidden'}>
                  {more}
                </Activity>
              </ErrorBoundary>
            </div>
          </>
        );
      }

      await act(() =>
        ReactNoop.render(
          <App content={<Text text="Visible" />} more={<Throws />} />,
        ),
      );

      // Initial render. An error is thrown when prerendering the hidden
      // Activity boundary, but since it's hidden, the UI doesn't observe it.
      assertLog(['Visible']);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <div>Visible</div>
          <div />
        </>,
      );

      // Once the Activity boundary is revealed, the error is thrown and
      // captured by the outer ErrorBoundary.
      await act(() => setShowMore(true));
      assertLog(['Caught an error: Oops!', 'Caught an error: Oops!']);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <div>Visible</div>
          <div>Caught an error: Oops!</div>
        </>,
      );
    },
  );
});
