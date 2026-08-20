import TestCase from '../../TestCase';
import Fixture from '../../Fixture';

const React = window.React;
const {Fragment, useRef, useState} = React;

function WrapperComponent(props) {
  return props.children;
}

const initialState = {
  child: false,
  parent: false,
  grandparent: false,
};

export default function EventListenerCase() {
  const fragmentRef = useRef(null);
  const [clickedState, setClickedState] = useState({...initialState});
  const [fragmentEventFired, setFragmentEventFired] = useState(false);
  const [bubblesState, setBubblesState] = useState(true);

  function setClick(id) {
    setClickedState(prev => ({...prev, [id]: true}));
  }

  function fragmentClickHandler(e) {
    setFragmentEventFired(true);
  }

  return (
    <TestCase title="Event Dispatch">
      <TestCase.Steps>
        <li>
          Each box has regular click handlers, you can click each one to observe
          the status changing through standard bubbling.
        </li>
        <li>Clear the clicked state</li>
        <li>
          Click the "Dispatch click event" button to dispatch a click event on
          the Fragment. The event will be dispatched on the Fragment's parent,
          so the child will not change state.
        </li>
        <li>
          Click the "Add event listener" button to add a click event listener on
          the Fragment. This registers a handler that will turn the child blue
          on click.
        </li>
        <li>
          Now click the "Dispatch click event" button again. You can see that it
          will fire the Fragment's event handler in addition to bubbling the
          click from the parent.
        </li>
        <li>
          If you turn off bubbling, only the Fragment's event handler will be
          called.
        </li>
      </TestCase.Steps>

      <TestCase.ExpectedResult>
        <p>
          Dispatching an event on a Fragment will forward the dispatch to its
          parent for the standard case. You can observe when dispatching that
          the parent handler is called in additional to bubbling from there. A
          delay is added to make the bubbling more clear.{' '}
        </p>
        <p>
          When there have been event handlers added to the Fragment, the
          Fragment's event handler will be called in addition to bubbling from
          the parent. Without bubbling, only the Fragment's event handler will
          be called.
        </p>
      </TestCase.ExpectedResult>

      <Fixture>
        <Fixture.Controls>
          <select
            value={bubblesState ? 'true' : 'false'}
            onChange={e => {
              setBubblesState(e.target.value === 'true');
            }}>
            <option value="true">Bubbles: true</option>
            <option value="false">Bubbles: false</option>
          </select>
          <button
            onClick={() => {
              fragmentRef.current.dispatchEvent(
                new MouseEvent('click', {bubbles: bubblesState})
              );
            }}>
            Dispatch click event
          </button>
          <button
            onClick={() => {
              setClickedState({...initialState});
              setFragmentEventFired(false);
            }}>
            Reset clicked state
          </button>
          <button
            onClick={() => {
              fragmentRef.current.addEventListener(
                'click',
                fragmentClickHandler
              );
            }}>
            Add event listener
          </button>
          <button
            onClick={() => {
              fragmentRef.current.removeEventListener(
                'click',
                fragmentClickHandler
              );
            }}>
            Remove event listener
          </button>
        </Fixture.Controls>
        <div
          id="grandparent"
          onClick={e => {
            setTimeout(() => {
              setClick('grandparent');
            }, 200);
          }}
          className="card">
          Fragment grandparent - clicked:{' '}
          {clickedState.grandparent ? 'true' : 'false'}
          <div
            id="parent"
            onClick={e => {
              setTimeout(() => {
                setClick('parent');
              }, 100);
            }}
            className="card">
            Fragment parent - clicked: {clickedState.parent ? 'true' : 'false'}
            <Fragment ref={fragmentRef}>
              <div
                style={{
                  backgroundColor: fragmentEventFired ? 'lightblue' : 'inherit',
                }}
                id="child"
                className="card"
                onClick={e => {
                  setClick('child');
                }}>
                Fragment child - clicked:{' '}
                {clickedState.child ? 'true' : 'false'}
              </div>
            </Fragment>
          </div>
        </div>
      </Fixture>
    </TestCase>
  );
}
