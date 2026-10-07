import TestCase from '../../TestCase';

const React = window.React;
const ReactDOM = window.ReactDOM;
const ReactDOMClient = window.ReactDOMClient;

const MouseEnter = () => {
  const containerRef = React.useRef();

  React.useEffect(function () {
    const hostEl = containerRef.current;
    const useModernRoots = ReactDOMClient && ReactDOMClient.createRoot;
    let outerRoot;
    let innerRoot;
    let innerContainer;
    let cancelled = false;

    // Queue setup and cleanup so nested roots are managed outside a commit.
    Promise.resolve().then(() => {
      if (cancelled) {
        return;
      }
      if (useModernRoots) {
        outerRoot = ReactDOMClient.createRoot(hostEl);
        outerRoot.render(
          <MouseEnterDetect
            onMount={container => {
              if (!cancelled) {
                innerRoot = ReactDOMClient.createRoot(container);
                innerRoot.render(<MouseEnterDetect />);
              }
            }}
          />
        );
      } else {
        ReactDOM.render(<MouseEnterDetect />, hostEl, () => {
          innerContainer = hostEl.childNodes[1];
          ReactDOM.render(<MouseEnterDetect />, innerContainer);
        });
      }
    });

    return () => {
      cancelled = true;
      Promise.resolve().then(() => {
        if (useModernRoots) {
          if (innerRoot) {
            innerRoot.unmount();
          }
          if (outerRoot) {
            outerRoot.unmount();
          }
        } else if (innerContainer) {
          ReactDOM.unmountComponentAtNode(innerContainer);
          ReactDOM.unmountComponentAtNode(hostEl);
        }
      });
    };
  }, []);

  return (
    <TestCase
      title="Mouse Enter"
      description=""
      affectedBrowsers="Chrome, Safari, Firefox">
      <TestCase.Steps>
        <li>Mouse enter the boxes below, from different borders</li>
      </TestCase.Steps>
      <TestCase.ExpectedResult>
        Mouse enter call count should equal to 1; <br />
        Issue{' '}
        <a
          rel="noopener noreferrer"
          target="_blank"
          href="https://github.com/facebook/react/issues/16763">
          #16763
        </a>{' '}
        should not happen.
        <br />
      </TestCase.ExpectedResult>
      <div ref={containerRef} />
    </TestCase>
  );
};

const MouseEnterDetect = ({onMount}) => {
  const [log, setLog] = React.useState({});
  const firstEl = React.useRef();
  const siblingEl = React.useRef();

  React.useLayoutEffect(() => {
    if (onMount) {
      onMount(siblingEl.current);
    }
  }, [onMount]);

  const onMouseEnter = e => {
    const timeStamp = e.timeStamp;
    setLog(log => {
      const callCount = 1 + (log.timeStamp === timeStamp ? log.callCount : 0);
      return {
        timeStamp,
        callCount,
      };
    });
  };

  return (
    <React.Fragment>
      <div
        ref={firstEl}
        onMouseEnter={onMouseEnter}
        style={{
          border: '1px solid #d9d9d9',
          padding: '20px 20px',
        }}>
        Mouse enter call count: {log.callCount || ''}
      </div>
      <div ref={siblingEl} />
    </React.Fragment>
  );
};

export default MouseEnter;
