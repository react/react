import ScrollIntoViewTargetElement from './ScrollIntoViewTargetElement';

const React = window.React;
const {Fragment, useRef, useState, useEffect} = React;
const ReactDOM = window.ReactDOM;

export default function ScrollIntoViewCaseComplex({
  caseInViewport,
  scrollContainerRef,
}) {
  const [didMount, setDidMount] = useState(false);
  // Hack to portal child into the scroll container
  // after the first render. This is to simulate a case where
  // an item is portaled into another scroll container.
  useEffect(() => {
    if (!didMount) {
      setDidMount(true);
    }
  }, []);
  return (
    <Fragment>
      {caseInViewport && (
        <div
          style={{position: 'fixed', top: 0, backgroundColor: 'red'}}
          id="header">
          Fixed header
        </div>
      )}
      {didMount &&
        ReactDOM.createPortal(
          <ScrollIntoViewTargetElement color="red" id="FROM_PORTAL" />,
          scrollContainerRef.current
        )}
      <ScrollIntoViewTargetElement color="lightgreen" id="A" />
      <ScrollIntoViewTargetElement color="lightcoral" id="B" />
      <ScrollIntoViewTargetElement color="lightblue" id="C" />
      {caseInViewport && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            backgroundColor: 'purple',
          }}
          id="footer">
          Fixed footer
        </div>
      )}
    </Fragment>
  );
}
