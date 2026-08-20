import TestCase from '../../TestCase';
import Fixture from '../../Fixture';

const React = window.React;
const {Fragment, useEffect, useRef, useState} = React;

function WrapperComponent(props) {
  return props.children;
}

function ObservedChild({id}) {
  return (
    <div id={id} className="observable-card">
      {id}
    </div>
  );
}

const initialItems = [
  ['A', false],
  ['B', false],
  ['C', false],
];

export default function IntersectionObserverCase() {
  const fragmentRef = useRef(null);
  const [items, setItems] = useState(initialItems);
  const addedItems = items.slice(3);
  const anyOnScreen = items.some(([, onScreen]) => onScreen);
  const observerRef = useRef(null);

  useEffect(() => {
    if (observerRef.current === null) {
      observerRef.current = new IntersectionObserver(
        entries => {
          setItems(prev => {
            const newItems = [...prev];
            entries.forEach(entry => {
              const index = newItems.findIndex(
                ([id]) => id === entry.target.id
              );
              newItems[index] = [entry.target.id, entry.isIntersecting];
            });
            return newItems;
          });
        },
        {
          threshold: [0.5],
        }
      );
    }
    fragmentRef.current.observeUsing(observerRef.current);

    const lastFragmentRefValue = fragmentRef.current;
    return () => {
      lastFragmentRefValue.unobserveUsing(observerRef.current);
      observerRef.current = null;
    };
  }, []);

  return (
    <TestCase title="Intersection Observer">
      <TestCase.Steps>
        <li>
          Scroll the children into view, observe the sidebar appears and shows
          which children are in the viewport
        </li>
        <li>
          Add a new child and observe that the Intersection Observer is applied
        </li>
        <li>
          Click Unobserve and observe that the state of children in the viewport
          is no longer updated
        </li>
        <li>
          Click Observe and observe that the state of children in the viewport
          is updated again
        </li>
      </TestCase.Steps>

      <TestCase.ExpectedResult>
        <p>
          Fragment refs manage Intersection Observers on the first level of host
          children. This page loads with an effect that sets up an Inersection
          Observer applied to each child card.
        </p>
        <p>
          New child nodes will also have the observer applied. Removed nodes
          will be unobserved.
        </p>
      </TestCase.ExpectedResult>
      <Fixture>
        <Fixture.Controls>
          <button
            onClick={() => {
              setItems(prev => [
                ...prev,
                [`Extra child: ${prev.length + 1}`, false],
              ]);
            }}>
            Add Child
          </button>
          <button
            onClick={() => {
              setItems(prev => {
                if (prev.length === 3) {
                  return prev;
                }
                return prev.slice(0, prev.length - 1);
              });
            }}>
            Remove Child
          </button>
          <button
            onClick={() => {
              fragmentRef.current.observeUsing(observerRef.current);
            }}>
            Observe
          </button>
          <button
            onClick={() => {
              fragmentRef.current.unobserveUsing(observerRef.current);
              setItems(prev => {
                return prev.map(item => [item[0], false]);
              });
            }}>
            Unobserve
          </button>
          {anyOnScreen && (
            <div className="fixed-sidebar card-container">
              <p>
                <strong>Children on screen:</strong>
              </p>
              {items.map(item => (
                <div className={`card ${item[1] ? 'onscreen' : null}`}>
                  {item[0]}
                </div>
              ))}
            </div>
          )}
        </Fixture.Controls>
        <Fragment ref={fragmentRef}>
          <ObservedChild id="A" />
          <WrapperComponent>
            <ObservedChild id="B" />
          </WrapperComponent>
          <ObservedChild id="C" />
          {addedItems.map((_, index) => (
            <ObservedChild id={`Extra child: ${index + 4}`} />
          ))}
        </Fragment>
      </Fixture>
    </TestCase>
  );
}
