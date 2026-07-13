import TestCase from '../../TestCase';
import Fixture from '../../Fixture';
import EventFragmentContainer from './EventFragmentContainer';

const React = window.React;
const {useState} = React;

function WrapperComponent(props) {
  return props.children;
}

export default function EventListenerCase() {
  const [extraChildCount, setExtraChildCount] = useState(0);

  return (
    <TestCase title="Event Registration">
      <TestCase.Steps>
        <li>
          Click "Add event listener" to attach a click handler to the fragment
        </li>
        <li>Click "Dispatch click event" to dispatch a click event</li>
        <li>Observe the event log showing the event fired</li>
        <li>Add a new child, dispatch again to see it still works</li>
        <li>
          Click "Remove event listener" and dispatch again to see no event fires
        </li>
      </TestCase.Steps>

      <TestCase.ExpectedResult>
        <p>
          Fragment refs can manage event listeners on the first level of host
          children. The event log shows when events are dispatched and handled.
        </p>
        <p>
          New child nodes will also have event listeners applied. Removed nodes
          will have their listeners cleaned up.
        </p>
      </TestCase.ExpectedResult>

      <Fixture>
        <Fixture.Controls>
          <div style={{marginBottom: '10px'}}>
            Target count: {extraChildCount + 3}
            <button
              onClick={() => {
                setExtraChildCount(prev => prev + 1);
              }}
              style={{marginLeft: '10px'}}>
              Add Child
            </button>
          </div>
          <EventFragmentContainer>
            <div className="card" id="child-a">
              Child A
            </div>
            <div className="card" id="child-b">
              Child B
            </div>
            <WrapperComponent>
              <div className="card" id="child-c">
                Child C
              </div>
              {Array.from({length: extraChildCount}).map((_, index) => (
                <div className="card" id={'extra-child-' + index} key={index}>
                  Extra Child {index}
                </div>
              ))}
            </WrapperComponent>
          </EventFragmentContainer>
        </Fixture.Controls>
      </Fixture>
    </TestCase>
  );
}
