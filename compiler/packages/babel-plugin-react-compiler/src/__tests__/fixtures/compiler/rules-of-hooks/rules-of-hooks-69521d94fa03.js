// Valid because the neither the condition nor the loop affect the hook call.
function App(props) {
  const someObject = {propA: true};
  for (const propName in someObject) {
    if (propName === true) {
    } else {
    }
  }
  const [myState, setMyState] = useState(null);
}
