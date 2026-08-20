// @compilationMode:"infer"
function useStateValue(props) {
  const [state, _] = useState(null);
  return [state];
}
