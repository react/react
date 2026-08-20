import TestCase from '../../TestCase';

const React = window.React;
const ReactDOM = window.ReactDOM;

const MouseEnter = () => {
  const containerRef = React.useRef();

  React.useEffect(function () {
    const hostEl = containerRef.current;
    ReactDOM.render(<MouseEnterDetect />, hostEl, () => {
      ReactDOM.render(<MouseEnterDetect />, hostEl.childNodes[1]);
    });
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

const MouseEnterDetect = () => {
  const [log, setLog] = React.useState({});
  const firstEl = React.useRef();
  const siblingEl = React.useRef();

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
