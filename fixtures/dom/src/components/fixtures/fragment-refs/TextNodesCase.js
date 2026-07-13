import TestCase from '../../TestCase';
import Fixture from '../../Fixture';
import PrintRectsFragmentContainer from './PrintRectsFragmentContainer';
import CompareDocumentPositionFragmentContainer from './CompareDocumentPositionFragmentContainer';
import EventFragmentContainer from './EventFragmentContainer';
import GetRootNodeFragmentContainer from './GetRootNodeFragmentContainer';

const React = window.React;
const {Fragment, useRef, useState} = React;

function GetClientRectsTextOnly() {
  return (
    <TestCase title="getClientRects - Text Only">
      <TestCase.Steps>
        <li>Click the "Print Rects" button</li>
      </TestCase.Steps>
      <TestCase.ExpectedResult>
        The fragment contains only text nodes. getClientRects should return
        bounding rectangles for the text content using the Range API.
      </TestCase.ExpectedResult>
      <Fixture>
        <Fixture.Controls>
          <PrintRectsFragmentContainer>
            This is text content inside a fragment with no element children.
          </PrintRectsFragmentContainer>
        </Fixture.Controls>
      </Fixture>
    </TestCase>
  );
}

function GetClientRectsMixed() {
  return (
    <TestCase title="getClientRects - Mixed Content">
      <TestCase.Steps>
        <li>Click the "Print Rects" button</li>
      </TestCase.Steps>
      <TestCase.ExpectedResult>
        The fragment contains both text nodes and elements. getClientRects
        should return bounding rectangles for both text content (via Range API)
        and elements.
      </TestCase.ExpectedResult>
      <Fixture>
        <Fixture.Controls>
          <PrintRectsFragmentContainer>
            Text before the span.
            <span
              style={{
                display: 'inline-block',
                padding: '5px 10px',
                backgroundColor: 'lightblue',
                border: '1px solid blue',
                margin: '0 5px',
              }}>
              Element
            </span>
            Text after the span.
            <div
              style={{
                width: '500px',
                height: '50px',
                backgroundColor: 'lightpink',
                border: '1px solid black',
              }}></div>
            More text at the end.
          </PrintRectsFragmentContainer>
        </Fixture.Controls>
      </Fixture>
    </TestCase>
  );
}

function FocusTextOnlyNoop() {
  const fragmentRef = useRef(null);
  const [message, setMessage] = useState('');

  const tryFocus = () => {
    fragmentRef.current.focus();
    setMessage('Called focus() - no-op for text-only fragments');
  };

  const tryFocusLast = () => {
    fragmentRef.current.focusLast();
    setMessage('Called focusLast() - no-op for text-only fragments');
  };

  return (
    <TestCase title="focus/focusLast - Text Only (No-op)">
      <TestCase.Steps>
        <li>Click either focus button</li>
      </TestCase.Steps>
      <TestCase.ExpectedResult>
        Calling focus() or focusLast() on a fragment with only text children is
        a no-op. Nothing happens and no warning is logged. This is because text
        nodes cannot receive focus.
      </TestCase.ExpectedResult>
      <Fixture>
        <Fixture.Controls>
          <button onClick={tryFocus}>focus()</button>
          <button onClick={tryFocusLast}>focusLast()</button>
          {message && (
            <div style={{marginTop: '10px', color: '#666'}}>{message}</div>
          )}
        </Fixture.Controls>
        <div
          style={{
            padding: '20px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
          }}>
          <Fragment ref={fragmentRef}>
            This fragment contains only text. Text nodes are not focusable.
          </Fragment>
        </div>
      </Fixture>
    </TestCase>
  );
}

function ScrollIntoViewTextOnly() {
  const fragmentRef = useRef(null);
  const [message, setMessage] = useState('');

  const tryScrollIntoView = alignToTop => {
    fragmentRef.current.scrollIntoView(alignToTop);
    setMessage(
      `Called scrollIntoView(${alignToTop}) - page should scroll to text`
    );
  };

  return (
    <TestCase title="scrollIntoView - Text Only">
      <TestCase.Steps>
        <li>Scroll down the page so the text fragment is not visible</li>
        <li>Click one of the scrollIntoView buttons</li>
      </TestCase.Steps>
      <TestCase.ExpectedResult>
        The page should scroll to bring the text content into view. With
        alignToTop=true, the text should appear at the top of the viewport. With
        alignToTop=false, it should appear at the bottom. This uses the Range
        API to calculate text node positions.
      </TestCase.ExpectedResult>
      <Fixture>
        <Fixture.Controls>
          <button onClick={() => tryScrollIntoView(true)}>
            scrollIntoView(true)
          </button>
          <button onClick={() => tryScrollIntoView(false)}>
            scrollIntoView(false)
          </button>
          {message && (
            <div style={{marginTop: '10px', color: 'green'}}>{message}</div>
          )}
        </Fixture.Controls>
        <div
          style={{
            marginTop: '100vh',
            marginBottom: '100vh',
            padding: '20px',
            backgroundColor: '#f0fff0',
            border: '1px solid #cfc',
          }}>
          <Fragment ref={fragmentRef}>
            This fragment contains only text. The scrollIntoView method uses the
            Range API to calculate the text position and scroll to it.
          </Fragment>
        </div>
      </Fixture>
    </TestCase>
  );
}

function ScrollIntoViewMixed() {
  const fragmentRef = useRef(null);
  const [message, setMessage] = useState('');

  const tryScrollIntoView = alignToTop => {
    fragmentRef.current.scrollIntoView(alignToTop);
    setMessage(
      `Called scrollIntoView(${alignToTop}) - page should scroll to fragment`
    );
  };

  const targetStyle = {
    height: 300,
    marginBottom: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
  };

  return (
    <TestCase title="scrollIntoView - Mixed Content">
      <TestCase.Steps>
        <li>Scroll down the page so the fragment is not visible</li>
        <li>Click one of the scrollIntoView buttons</li>
      </TestCase.Steps>
      <TestCase.ExpectedResult>
        The fragment contains raw text nodes (not wrapped in elements) and
        elements in alternating order. With alignToTop=true, scroll starts from
        the last child and works backwards, ending with the first text node at
        the top. With alignToTop=false, scroll starts from the first child and
        works forward, ending with the last text node at the bottom. Text nodes
        use the Range API for scrolling.
      </TestCase.ExpectedResult>
      <Fixture>
        <Fixture.Controls>
          <button onClick={() => tryScrollIntoView(true)}>
            scrollIntoView(true)
          </button>
          <button onClick={() => tryScrollIntoView(false)}>
            scrollIntoView(false)
          </button>
          {message && (
            <div style={{marginTop: '10px', color: 'green'}}>{message}</div>
          )}
        </Fixture.Controls>
        <div
          style={{
            marginTop: '100vh',
            marginBottom: '100vh',
            whiteSpace: 'pre-wrap',
            lineHeight: '2',
          }}>
          <Fragment ref={fragmentRef}>
            TEXT NODE 1 - This is a raw text node at the start of the fragment
            <div style={{...targetStyle, backgroundColor: 'lightyellow'}}>
              ELEMENT 1
            </div>
            TEXT NODE 2 - This is a raw text node between elements
            <div style={{...targetStyle, backgroundColor: 'lightpink'}}>
              ELEMENT 2
            </div>
            TEXT NODE 3 - This is a raw text node between elements
            <div style={{...targetStyle, backgroundColor: 'lightcyan'}}>
              ELEMENT 3
            </div>
            TEXT NODE 4 - This is a raw text node at the end of the fragment
          </Fragment>
        </div>
      </Fixture>
    </TestCase>
  );
}

function CompareDocumentPositionTextNodes() {
  return (
    <TestCase title="compareDocumentPosition - Text Only">
      <TestCase.Steps>
        <li>Click the "Compare All Positions" button</li>
      </TestCase.Steps>
      <TestCase.ExpectedResult>
        compareDocumentPosition should work correctly even when the fragment
        contains only text nodes. The "Before" element should be PRECEDING the
        fragment, and the "After" element should be FOLLOWING.
      </TestCase.ExpectedResult>
      <Fixture>
        <Fixture.Controls>
          <CompareDocumentPositionFragmentContainer>
            This is text-only content inside the fragment.
          </CompareDocumentPositionFragmentContainer>
        </Fixture.Controls>
      </Fixture>
    </TestCase>
  );
}

function ObserveTextOnlyWarning() {
  const fragmentRef = useRef(null);
  const [message, setMessage] = useState('');

  const tryObserve = () => {
    setMessage('Called observeUsing() - check console for warning');
    const observer = new IntersectionObserver(() => {});
    fragmentRef.current.observeUsing(observer);
  };

  return (
    <TestCase title="observeUsing - Text Only Warning">
      <TestCase.Steps>
        <li>Open the browser console</li>
        <li>Click the observeUsing button</li>
      </TestCase.Steps>
      <TestCase.ExpectedResult>
        A warning should appear in the console because IntersectionObserver
        cannot observe text nodes. The warning message should indicate that
        observeUsing() was called on a FragmentInstance with only text children.
      </TestCase.ExpectedResult>
      <Fixture>
        <Fixture.Controls>
          <button onClick={tryObserve}>
            observeUsing(IntersectionObserver)
          </button>
          {message && (
            <div style={{marginTop: '10px', color: 'orange'}}>{message}</div>
          )}
        </Fixture.Controls>
        <div
          style={{
            padding: '20px',
            backgroundColor: '#fff0f0',
            border: '1px solid #fcc',
          }}>
          <Fragment ref={fragmentRef}>
            This fragment contains only text. Text nodes cannot be observed.
          </Fragment>
        </div>
      </Fixture>
    </TestCase>
  );
}

function EventTextOnly() {
  return (
    <TestCase title="Event Operations - Text Only">
      <TestCase.Steps>
        <li>
          Click "Add event listener" to attach a click handler to the fragment
        </li>
        <li>Click "Dispatch click event" to dispatch a click event</li>
        <li>Observe that the fragment's event listener fires</li>
        <li>Click "Remove event listener" and dispatch again</li>
      </TestCase.Steps>
      <TestCase.ExpectedResult>
        Event operations (addEventListener, removeEventListener, dispatchEvent)
        work on fragments with text-only content. The event is dispatched on the
        fragment's parent element since text nodes cannot be event targets.
      </TestCase.ExpectedResult>
      <Fixture>
        <Fixture.Controls>
          <EventFragmentContainer>
            This fragment contains only text. Events are handled via the parent.
          </EventFragmentContainer>
        </Fixture.Controls>
      </Fixture>
    </TestCase>
  );
}

function EventMixed() {
  return (
    <TestCase title="Event Operations - Mixed Content">
      <TestCase.Steps>
        <li>
          Click "Add event listener" to attach a click handler to the fragment
        </li>
        <li>Click "Dispatch click event" to dispatch a click event</li>
        <li>Observe that the fragment's event listener fires</li>
        <li>Click directly on the element or text content to see bubbling</li>
      </TestCase.Steps>
      <TestCase.ExpectedResult>
        Event operations work on fragments with mixed text and element content.
        dispatchEvent forwards to the parent element. Clicks on child elements
        or text bubble up through the DOM as normal.
      </TestCase.ExpectedResult>
      <Fixture>
        <Fixture.Controls>
          <EventFragmentContainer>
            Text node before element.
            <span
              style={{
                display: 'inline-block',
                padding: '5px 10px',
                margin: '0 5px',
                backgroundColor: 'lightblue',
                border: '1px solid blue',
              }}>
              Element
            </span>
            Text node after element.
          </EventFragmentContainer>
        </Fixture.Controls>
      </Fixture>
    </TestCase>
  );
}

function GetRootNodeTextOnly() {
  return (
    <TestCase title="getRootNode - Text Only">
      <TestCase.Steps>
        <li>Click the "Get Root Node" button</li>
      </TestCase.Steps>
      <TestCase.ExpectedResult>
        getRootNode should return the root of the DOM tree containing the
        fragment's text content. For a fragment in the main document, this
        should return the Document node.
      </TestCase.ExpectedResult>
      <Fixture>
        <Fixture.Controls>
          <GetRootNodeFragmentContainer>
            This fragment contains only text. getRootNode returns the document.
          </GetRootNodeFragmentContainer>
        </Fixture.Controls>
      </Fixture>
    </TestCase>
  );
}

function GetRootNodeMixed() {
  return (
    <TestCase title="getRootNode - Mixed Content">
      <TestCase.Steps>
        <li>Click the "Get Root Node" button</li>
      </TestCase.Steps>
      <TestCase.ExpectedResult>
        getRootNode should return the root of the DOM tree for fragments with
        mixed text and element content. The result is the same whether checking
        from text nodes or element nodes within the fragment.
      </TestCase.ExpectedResult>
      <Fixture>
        <Fixture.Controls>
          <GetRootNodeFragmentContainer>
            Text before element.
            <span
              style={{
                display: 'inline-block',
                padding: '5px 10px',
                margin: '0 5px',
                backgroundColor: 'lightyellow',
                border: '1px solid #cc0',
              }}>
              Element
            </span>
            Text after element.
          </GetRootNodeFragmentContainer>
        </Fixture.Controls>
      </Fixture>
    </TestCase>
  );
}

export default function TextNodesCase() {
  return (
    <TestCase title="Text Node Support">
      <TestCase.ExpectedResult>
        <p>
          This section demonstrates how various FragmentInstance methods work
          with text nodes.
        </p>
        <p>
          <strong>Supported:</strong> getClientRects, compareDocumentPosition,
          scrollIntoView, getRootNode, addEventListener, removeEventListener,
          dispatchEvent
        </p>
        <p>
          <strong>No-op (silent):</strong> focus, focusLast (text nodes cannot
          receive focus)
        </p>
        <p>
          <strong>Not supported (warns):</strong> observeUsing (observers cannot
          observe text nodes)
        </p>
      </TestCase.ExpectedResult>
      <GetClientRectsTextOnly />
      <GetClientRectsMixed />
      <CompareDocumentPositionTextNodes />
      <FocusTextOnlyNoop />
      <ScrollIntoViewTextOnly />
      <ScrollIntoViewMixed />
      <ObserveTextOnlyWarning />
      <EventTextOnly />
      <EventMixed />
      <GetRootNodeTextOnly />
      <GetRootNodeMixed />
    </TestCase>
  );
}
