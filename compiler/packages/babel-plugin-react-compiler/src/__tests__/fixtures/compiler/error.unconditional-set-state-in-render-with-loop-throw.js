// @validateNoSetStateInRender
function Component(props) {
  const [state, setState] = useState(false);
  for (const _ of props) {
    if (props.cond) {
      break;
    } else {
      throw new Error('bye!');
    }
  }
  setState(true);
  return state;
}
