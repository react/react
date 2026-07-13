import TestCase from '../../TestCase';
import Fixture from '../../Fixture';
import ScrollIntoViewCaseComplex from './ScrollIntoViewCaseComplex';
import ScrollIntoViewCaseSimple from './ScrollIntoViewCaseSimple';
import ScrollIntoViewTargetElement from './ScrollIntoViewTargetElement';

const React = window.React;
const {Fragment, useRef, useState, useEffect} = React;
const ReactDOM = window.ReactDOM;

function Controls({
  alignToTop,
  setAlignToTop,
  scrollVertical,
  exampleType,
  setExampleType,
}) {
  return (
    <div>
      <label>
        Example Type:
        <select
          value={exampleType}
          onChange={e => setExampleType(e.target.value)}>
          <option value="simple">Simple</option>
          <option value="multiple">Multiple Scroll Containers</option>
          <option value="horizontal">Horizontal</option>
          <option value="empty">Empty Fragment</option>
        </select>
      </label>
      <div>
        <label>
          Align to Top:
          <input
            type="checkbox"
            checked={alignToTop}
            onChange={e => setAlignToTop(e.target.checked)}
          />
        </label>
      </div>
      <div>
        <button onClick={scrollVertical}>scrollIntoView()</button>
      </div>
    </div>
  );
}

export default function ScrollIntoViewCase() {
  const [exampleType, setExampleType] = useState('simple');
  const [alignToTop, setAlignToTop] = useState(true);
  const [caseInViewport, setCaseInViewport] = useState(false);
  const fragmentRef = useRef(null);
  const testCaseRef = useRef(null);
  const noChildRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const scrollVertical = () => {
    fragmentRef.current.scrollIntoView(alignToTop);
  };

  const scrollVerticalNoChildren = () => {
    noChildRef.current.scrollIntoView(alignToTop);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setCaseInViewport(true);
        } else {
          setCaseInViewport(false);
        }
      });
    });
    testCaseRef.current.observeUsing(observer);

    const lastRef = testCaseRef.current;
    return () => {
      lastRef.unobserveUsing(observer);
      observer.disconnect();
    };
  });

  return (
    <Fragment ref={testCaseRef}>
      <TestCase title="ScrollIntoView">
        <TestCase.Steps>
          <li>Toggle alignToTop and click the buttons to scroll</li>
        </TestCase.Steps>
        <TestCase.ExpectedResult>
          <p>When the Fragment has children:</p>
          <p>
            In order to handle the case where children are split between
            multiple scroll containers, we call scrollIntoView on each child in
            reverse order.
          </p>
          <p>When the Fragment does not have children:</p>
          <p>
            The Fragment still represents a virtual space. We can scroll to the
            nearest edge by selecting the host sibling before if
            alignToTop=false, or after if alignToTop=true|undefined. We'll fall
            back to the other sibling or parent in the case that the preferred
            sibling target doesn't exist.
          </p>
        </TestCase.ExpectedResult>
        <Fixture>
          <Fixture.Controls>
            <Controls
              alignToTop={alignToTop}
              setAlignToTop={setAlignToTop}
              scrollVertical={scrollVertical}
              exampleType={exampleType}
              setExampleType={setExampleType}
            />
          </Fixture.Controls>
          {exampleType === 'simple' && (
            <Fragment ref={fragmentRef}>
              <ScrollIntoViewCaseSimple />
            </Fragment>
          )}
          {exampleType === 'horizontal' && (
            <div
              style={{
                display: 'flex',
                overflowX: 'auto',
                flexDirection: 'row',
                border: '1px solid #ccc',
                padding: '1rem 10rem',
                marginBottom: '1rem',
                width: '100%',
                whiteSpace: 'nowrap',
                justifyContent: 'space-between',
              }}>
              <Fragment ref={fragmentRef}>
                <ScrollIntoViewCaseSimple />
              </Fragment>
            </div>
          )}
          {exampleType === 'multiple' && (
            <Fragment>
              <div
                style={{
                  height: '50vh',
                  overflowY: 'auto',
                  border: '1px solid black',
                  marginBottom: '1rem',
                }}
                ref={scrollContainerRef}
              />
              <Fragment ref={fragmentRef}>
                <ScrollIntoViewCaseComplex
                  caseInViewport={caseInViewport}
                  scrollContainerRef={scrollContainerRef}
                />
              </Fragment>
            </Fragment>
          )}
          {exampleType === 'empty' && (
            <Fragment>
              <ScrollIntoViewTargetElement
                color="lightyellow"
                id="ABOVE EMPTY FRAGMENT"
              />
              <Fragment ref={fragmentRef}></Fragment>
              <ScrollIntoViewTargetElement
                color="lightblue"
                id="BELOW EMPTY FRAGMENT"
              />
            </Fragment>
          )}
          <Fixture.Controls>
            <Controls
              alignToTop={alignToTop}
              setAlignToTop={setAlignToTop}
              scrollVertical={scrollVertical}
              exampleType={exampleType}
              setExampleType={setExampleType}
            />
          </Fixture.Controls>
        </Fixture>
      </TestCase>
    </Fragment>
  );
}
