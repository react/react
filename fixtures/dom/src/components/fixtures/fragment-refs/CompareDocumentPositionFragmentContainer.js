const React = window.React;
const {Fragment, useRef, useState} = React;

const POSITION_FLAGS = {
  DISCONNECTED: 0x01,
  PRECEDING: 0x02,
  FOLLOWING: 0x04,
  CONTAINS: 0x08,
  CONTAINED_BY: 0x10,
  IMPLEMENTATION_SPECIFIC: 0x20,
};

function getPositionDescription(bitmask) {
  const flags = [];
  if (bitmask & POSITION_FLAGS.DISCONNECTED) flags.push('DISCONNECTED');
  if (bitmask & POSITION_FLAGS.PRECEDING) flags.push('PRECEDING');
  if (bitmask & POSITION_FLAGS.FOLLOWING) flags.push('FOLLOWING');
  if (bitmask & POSITION_FLAGS.CONTAINS) flags.push('CONTAINS');
  if (bitmask & POSITION_FLAGS.CONTAINED_BY) flags.push('CONTAINED_BY');
  if (bitmask & POSITION_FLAGS.IMPLEMENTATION_SPECIFIC)
    flags.push('IMPLEMENTATION_SPECIFIC');
  return flags.length > 0 ? flags.join(' | ') : 'SAME';
}

function ResultRow({label, result, color}) {
  if (!result) return null;

  return (
    <div
      style={{
        padding: '10px 14px',
        marginBottom: '8px',
        backgroundColor: '#f8f9fa',
        borderLeft: `4px solid ${color}`,
        borderRadius: '4px',
      }}>
      <div
        style={{
          fontWeight: 'bold',
          marginBottom: '6px',
          color: '#333',
        }}>
        {label}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '4px 12px',
          fontSize: '13px',
          fontFamily: 'monospace',
        }}>
        <span style={{color: '#666'}}>Raw value:</span>
        <span style={{color: '#333'}}>{result.raw}</span>
        <span style={{color: '#666'}}>Flags:</span>
        <span style={{color: color, fontWeight: 500}}>
          {getPositionDescription(result.raw)}
        </span>
      </div>
    </div>
  );
}

export default function CompareDocumentPositionFragmentContainer({children}) {
  const fragmentRef = useRef(null);
  const beforeRef = useRef(null);
  const afterRef = useRef(null);
  const insideRef = useRef(null);
  const [results, setResults] = useState(null);

  const compareAll = () => {
    const fragment = fragmentRef.current;
    const beforePos = fragment.compareDocumentPosition(beforeRef.current);
    const afterPos = fragment.compareDocumentPosition(afterRef.current);
    const insidePos = insideRef.current
      ? fragment.compareDocumentPosition(insideRef.current)
      : null;

    setResults({
      before: {raw: beforePos},
      after: {raw: afterPos},
      inside: insidePos !== null ? {raw: insidePos} : null,
    });
  };

  return (
    <Fragment>
      <div style={{marginBottom: '16px'}}>
        <button
          onClick={compareAll}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}>
          Compare All Positions
        </button>
        {results && (
          <span style={{marginLeft: '12px', color: '#666'}}>
            Comparison complete
          </span>
        )}
      </div>

      <div style={{display: 'flex', gap: '24px'}}>
        <div style={{flex: '0 0 300px'}}>
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f0f0f0',
              borderRadius: '8px',
            }}>
            <div
              ref={beforeRef}
              style={{
                padding: '12px',
                backgroundColor: '#d4edda',
                border: '2px solid #28a745',
                borderRadius: '4px',
                marginBottom: '12px',
                textAlign: 'center',
                fontWeight: 'bold',
                color: '#155724',
              }}>
              Before Element
            </div>

            <div
              style={{
                padding: '12px',
                backgroundColor: '#fff3cd',
                border: '2px dashed #ffc107',
                borderRadius: '4px',
                marginBottom: '12px',
              }}>
              <div
                style={{
                  fontSize: '11px',
                  color: '#856404',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                }}>
                FRAGMENT
              </div>
              <div ref={insideRef}>
                <Fragment ref={fragmentRef}>{children}</Fragment>
              </div>
            </div>

            <div
              ref={afterRef}
              style={{
                padding: '12px',
                backgroundColor: '#f8d7da',
                border: '2px solid #dc3545',
                borderRadius: '4px',
                textAlign: 'center',
                fontWeight: 'bold',
                color: '#721c24',
              }}>
              After Element
            </div>
          </div>
        </div>

        <div style={{flex: 1}}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '12px',
              color: '#333',
            }}>
            Comparison Results
          </div>

          {!results && (
            <div
              style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                color: '#666',
                textAlign: 'center',
              }}>
              Click "Compare All Positions" to see results
            </div>
          )}

          {results && (
            <Fragment>
              <ResultRow
                label='vs "Before Element"'
                result={results.before}
                color="#28a745"
              />
              <ResultRow
                label='vs "After Element"'
                result={results.after}
                color="#dc3545"
              />
              {results.inside && (
                <ResultRow
                  label='vs "Inside Element"'
                  result={results.inside}
                  color="#ffc107"
                />
              )}

              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#e7f3ff',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#0c5460',
                }}>
                <strong>Flag Reference:</strong>
                <div
                  style={{
                    marginTop: '8px',
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '2px 12px',
                  }}>
                  <code>0x01</code>
                  <span>DISCONNECTED</span>
                  <code>0x02</code>
                  <span>PRECEDING (other is before fragment)</span>
                  <code>0x04</code>
                  <span>FOLLOWING (other is after fragment)</span>
                  <code>0x08</code>
                  <span>CONTAINS (other contains fragment)</span>
                  <code>0x10</code>
                  <span>CONTAINED_BY (other is inside fragment)</span>
                </div>
              </div>
            </Fragment>
          )}
        </div>
      </div>
    </Fragment>
  );
}
