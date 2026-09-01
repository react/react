const React = window.React;

export default function ScrollIntoViewTargetElement({color, id, top}) {
  return (
    <div
      id={id}
      style={{
        height: 500,
        minWidth: 300,
        backgroundColor: color,
        marginTop: top ? '50vh' : 0,
        marginBottom: 100,
        flexShrink: 0,
      }}>
      {id}
    </div>
  );
}
