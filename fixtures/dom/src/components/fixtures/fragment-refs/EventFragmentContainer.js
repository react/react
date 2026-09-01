const React = window.React;
const {Fragment, useRef, useState} = React;

export default function EventFragmentContainer({children}) {
  const fragmentRef = useRef(null);
  const [eventLog, setEventLog] = useState([]);
  const [listenerAdded, setListenerAdded] = useState(false);
  const [bubblesState, setBubblesState] = useState(true);

  const logEvent = message => {
    setEventLog(prev => [...prev, message]);
  };

  const fragmentClickHandler = () => {
    logEvent('Fragment event listener fired');
  };

  const addListener = () => {
    fragmentRef.current.addEventListener('click', fragmentClickHandler);
    setListenerAdded(true);
    logEvent('Added click listener to fragment');
  };

  const removeListener = () => {
    fragmentRef.current.removeEventListener('click', fragmentClickHandler);
    setListenerAdded(false);
    logEvent('Removed click listener from fragment');
  };

  const dispatchClick = () => {
    fragmentRef.current.dispatchEvent(
      new MouseEvent('click', {bubbles: bubblesState})
    );
    logEvent(`Dispatched click event (bubbles: ${bubblesState})`);
  };

  const clearLog = () => {
    setEventLog([]);
  };

  return (
    <Fragment>
      <div
        style={{
          marginBottom: '16px',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
        <select
          value={bubblesState ? 'true' : 'false'}
          onChange={e => setBubblesState(e.target.value === 'true')}
          style={{padding: '6px 10px'}}>
          <option value="true">Bubbles: true</option>
          <option value="false">Bubbles: false</option>
        </select>
        <button onClick={dispatchClick} style={{padding: '6px 12px'}}>
          Dispatch click event
        </button>
        <button
          onClick={addListener}
          disabled={listenerAdded}
          style={{padding: '6px 12px'}}>
          Add event listener
        </button>
        <button
          onClick={removeListener}
          disabled={!listenerAdded}
          style={{padding: '6px 12px'}}>
          Remove event listener
        </button>
        <button onClick={clearLog} style={{padding: '6px 12px'}}>
          Clear log
        </button>
      </div>

      <div
        onClick={() => logEvent('Parent div clicked')}
        style={{
          padding: '12px',
          border: '1px dashed #ccc',
          borderRadius: '4px',
          backgroundColor: '#fff',
        }}>
        <Fragment ref={fragmentRef}>{children}</Fragment>
      </div>

      {eventLog.length > 0 && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px',
            maxHeight: '150px',
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: '13px',
          }}>
          <strong>Event Log:</strong>
          <ul style={{margin: '5px 0', paddingLeft: '20px'}}>
            {eventLog.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
    </Fragment>
  );
}
