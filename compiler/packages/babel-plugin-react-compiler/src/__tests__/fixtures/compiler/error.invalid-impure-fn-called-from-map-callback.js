// @validateNoImpureFunctionsInRender
function Component({items}) {
  function format(item) {
    return Date.now() + item.length;
  }
  return (
    <div>
      {items.map(item => (
        <span key={item}>{format(item)}</span>
      ))}
    </div>
  );
}
