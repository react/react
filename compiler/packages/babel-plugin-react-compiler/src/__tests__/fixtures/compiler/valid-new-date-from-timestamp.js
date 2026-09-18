// @validateNoImpureFunctionsInRender

function Component({timestamp}) {
  const date = new Date(timestamp);
  return <Foo date={date} />;
}
