const React = window.React;
const {Fragment, useRef, useState} = React;

export default function GetRootNodeFragmentContainer({children}) {
  const fragmentRef = useRef(null);
  const [rootNodeInfo, setRootNodeInfo] = useState(null);

  const getRootNodeInfo = () => {
    const rootNode = fragmentRef.current.getRootNode();
    setRootNodeInfo({
      nodeName: rootNode.nodeName,
      nodeType: rootNode.nodeType,
      nodeTypeLabel: getNodeTypeLabel(rootNode.nodeType),
      isDocument: rootNode === document,
    });
  };

  const getNodeTypeLabel = nodeType => {
    const types = {
      1: 'ELEMENT_NODE',
      3: 'TEXT_NODE',
      9: 'DOCUMENT_NODE',
      11: 'DOCUMENT_FRAGMENT_NODE',
    };
    return types[nodeType] || `UNKNOWN (${nodeType})`;
  };

  return (
    <Fragment>
      <div style={{marginBottom: '16px'}}>
        <button
          onClick={getRootNodeInfo}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}>
          Get Root Node
        </button>
      </div>

      {rootNodeInfo && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#e8f4e8',
            border: '1px solid #9c9',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '13px',
          }}>
          <div style={{marginBottom: '4px'}}>
            <strong>Node Name:</strong> {rootNodeInfo.nodeName}
          </div>
          <div style={{marginBottom: '4px'}}>
            <strong>Node Type:</strong> {rootNodeInfo.nodeType} (
            {rootNodeInfo.nodeTypeLabel})
          </div>
          <div>
            <strong>Is Document:</strong>{' '}
            {rootNodeInfo.isDocument ? 'Yes' : 'No'}
          </div>
        </div>
      )}

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
