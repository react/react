const React = window.React;
const {Fragment, useRef, useState} = React;

const colors = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#9b59b6',
  '#f39c12',
  '#1abc9c',
];

export default function PrintRectsFragmentContainer({children}) {
  const fragmentRef = useRef(null);
  const [rects, setRects] = useState([]);

  const getRects = () => {
    const rectsResult = fragmentRef.current.getClientRects();
    setRects(Array.from(rectsResult));
  };

  const getColor = index => colors[index % colors.length];

  return (
    <Fragment>
      <div style={{marginBottom: '16px'}}>
        <button
          onClick={getRects}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}>
          Print Rects
        </button>
        {rects.length > 0 && (
          <span style={{marginLeft: '12px', color: '#666'}}>
            Found {rects.length} rect{rects.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{display: 'flex', gap: '20px', marginBottom: '16px'}}>
        <div
          style={{
            position: 'relative',
            width: '30vw',
            height: '30vh',
            border: '1px solid #ccc',
            backgroundColor: '#fafafa',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
          {rects.length === 0 && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#999',
                fontSize: '14px',
              }}>
              Click button to visualize rects
            </div>
          )}
          {rects.map(({x, y, width, height}, index) => {
            const scale = 0.3;
            const color = getColor(index);

            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  top: y * scale,
                  left: x * scale,
                  width: width * scale,
                  height: height * scale,
                  border: `2px solid ${color}`,
                  backgroundColor: `${color}22`,
                  boxSizing: 'border-box',
                  borderRadius: '2px',
                }}
              />
            );
          })}
        </div>

        <div style={{flex: 1, fontSize: '13px', fontFamily: 'monospace'}}>
          {rects.map(({x, y, width, height}, index) => {
            const color = getColor(index);
            return (
              <div
                key={index}
                style={{
                  padding: '6px 10px',
                  marginBottom: '4px',
                  backgroundColor: '#f5f5f5',
                  borderLeft: `3px solid ${color}`,
                  borderRadius: '2px',
                }}>
                <span style={{color: '#666'}}>#{index}</span>{' '}
                <span style={{color: '#333'}}>
                  x: {Math.round(x)}, y: {Math.round(y)}, w: {Math.round(width)}
                  , h: {Math.round(height)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          padding: '12px',
          border: '1px dashed #ccc',
          borderRadius: '4px',
          backgroundColor: '#fff',
        }}>
        <Fragment ref={fragmentRef}>{children}</Fragment>
      </div>
    </Fragment>
  );
}
