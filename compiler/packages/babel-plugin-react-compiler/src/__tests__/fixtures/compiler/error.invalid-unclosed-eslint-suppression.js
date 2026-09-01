// Note: Everything below this is sketchy @validateExhaustiveMemoizationDependencies:false
/* eslint-disable react-hooks/rules-of-hooks */
function lowercasecomponent() {
  'use forget';
  const x = [];
  return <div>{x}</div>;
}

function Haunted() {
  return <div>This entire file is haunted oOoOo</div>;
}

function CrimesAgainstReact() {
  let x = React.useMemo(async () => {
    await a;
  }, []);

  class MyAmazingInnerComponent {
    render() {
      return <div>Why would you do this</div>;
    }
  }

  // Note: This shouldn't reset the eslint suppression to just this line
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return <MyAmazingInnerComponent />;
}
