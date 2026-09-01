import TestCase from '../../TestCase';
import Fixture from '../../Fixture';

const React = window.React;

const {Fragment, useRef} = React;

export default function FocusCase() {
  const fragmentRef = useRef(null);

  return (
    <TestCase title="Focus Management">
      <TestCase.Steps>
        <li>Click to focus the first child</li>
        <li>Click to focus the last child</li>
        <li>Click to blur any focus within the fragment</li>
      </TestCase.Steps>

      <TestCase.ExpectedResult>
        <p>
          The focus method will focus the first focusable child within the
          fragment, skipping any unfocusable children.
        </p>
        <p>
          The focusLast method is the reverse, focusing the last focusable
          child.
        </p>
        <p>
          Blur will call blur on the document, only if one of the children
          within the fragment is the active element.
        </p>
      </TestCase.ExpectedResult>

      <Fixture>
        <Fixture.Controls>
          <button onClick={() => fragmentRef.current.focus()}>
            Focus first child
          </button>
          <button onClick={() => fragmentRef.current.focusLast()}>
            Focus last child
          </button>
          <button onClick={() => fragmentRef.current.blur()}>Blur</button>
        </Fixture.Controls>
        <div className="highlight-focused-children" style={{display: 'flex'}}>
          <Fragment ref={fragmentRef}>
            <div style={{outline: '1px solid black'}}>
              <p>Unfocusable div</p>
            </div>
            <div style={{outline: '1px solid black'}}>
              <p>Unfocusable div with nested focusable button</p>
              <button>Button 1</button>
            </div>
            <button>Button 2</button>
            <input type="text" placeholder="Input field" />
            <div style={{outline: '1px solid black'}}>
              <p>Unfocusable div</p>
            </div>
          </Fragment>
        </div>
      </Fixture>
    </TestCase>
  );
}
