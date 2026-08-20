import TestCase from '../../TestCase';
import Fixture from '../../Fixture';

const React = window.React;
const {Fragment, useEffect, useRef, useState} = React;

export default function ResizeObserverCase() {
  const fragmentRef = useRef(null);
  const [width, setWidth] = useState([0, 0, 0]);

  useEffect(() => {
    const resizeObserver = new window.ResizeObserver(entries => {
      if (entries.length > 0) {
        setWidth(prev => {
          const newWidth = [...prev];
          entries.forEach(entry => {
            const index = parseInt(entry.target.id, 10);
            newWidth[index] = Math.round(entry.contentRect.width);
          });
          return newWidth;
        });
      }
    });

    fragmentRef.current.observeUsing(resizeObserver);
    const lastFragmentRefValue = fragmentRef.current;
    return () => {
      lastFragmentRefValue.unobserveUsing(resizeObserver);
    };
  }, []);

  return (
    <TestCase title="Resize Observer">
      <TestCase.Steps>
        <li>Resize the viewport width until the children respond</li>
        <li>See that the width data updates as they elements resize</li>
      </TestCase.Steps>
      <TestCase.ExpectedResult>
        The Fragment Ref has a ResizeObserver attached which has a callback to
        update the width state of each child node.
      </TestCase.ExpectedResult>
      <Fixture>
        <Fragment ref={fragmentRef}>
          <div className="card" id="0" style={{width: '100%'}}>
            <p>
              Width: <b>{width[0]}px</b>
            </p>
          </div>
          <div className="card" id="1" style={{width: '80%'}}>
            <p>
              Width: <b>{width[1]}px</b>
            </p>
          </div>
          <div className="card" id="2" style={{width: '50%'}}>
            <p>
              Width: <b>{width[2]}px</b>
            </p>
          </div>
        </Fragment>
      </Fixture>
    </TestCase>
  );
}
