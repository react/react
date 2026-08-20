describe('ErrorBoundaryReconciliation', () => {
  let BrokenRender;
  let DidCatchErrorBoundary;
  let GetDerivedErrorBoundary;
  let React;
  let ReactTestRenderer;
  let span;
  let act;

  beforeEach(() => {
    jest.resetModules();

    ReactTestRenderer = require('react-test-renderer');
    React = require('react');
    act = require('internal-test-utils').act;
    DidCatchErrorBoundary = class extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        this.setState({error});
      }
      render() {
        return this.state.error
          ? React.createElement(this.props.fallbackTagName, {
              prop: 'ErrorBoundary',
            })
          : this.props.children;
      }
    };

    GetDerivedErrorBoundary = class extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        return this.state.error
          ? React.createElement(this.props.fallbackTagName, {
              prop: 'ErrorBoundary',
            })
          : this.props.children;
      }
    };

    const InvalidType = undefined;
    BrokenRender = ({fail}) =>
      fail ? <InvalidType /> : <span prop="BrokenRender" />;
  });

  async function sharedTest(ErrorBoundary, fallbackTagName) {
    let renderer;

    await act(() => {
      renderer = ReactTestRenderer.create(
        <ErrorBoundary fallbackTagName={fallbackTagName}>
          <BrokenRender fail={false} />
        </ErrorBoundary>,
        {unstable_isConcurrent: true},
      );
    });
    expect(renderer).toMatchRenderedOutput(<span prop="BrokenRender" />);
    await act(() => {
      renderer.update(
        <ErrorBoundary fallbackTagName={fallbackTagName}>
          <BrokenRender fail={true} />
        </ErrorBoundary>,
      );
    });

    const Fallback = fallbackTagName;
    expect(renderer).toMatchRenderedOutput(<Fallback prop="ErrorBoundary" />);
  }

  it('componentDidCatch can recover by rendering an element of the same type', () =>
    sharedTest(DidCatchErrorBoundary, 'span'));

  it('componentDidCatch can recover by rendering an element of a different type', () =>
    sharedTest(DidCatchErrorBoundary, 'div'));

  it('getDerivedStateFromError can recover by rendering an element of the same type', () =>
    sharedTest(GetDerivedErrorBoundary, 'span'));

  it('getDerivedStateFromError can recover by rendering an element of a different type', () =>
    sharedTest(GetDerivedErrorBoundary, 'div'));
});
