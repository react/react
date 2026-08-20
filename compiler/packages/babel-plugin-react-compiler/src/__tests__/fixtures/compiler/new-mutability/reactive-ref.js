// @enableNewMutationAliasingModel
function ReactiveRefInEffect(props) {
  const ref1 = useRef('initial value');
  const ref2 = useRef('initial value');
  let ref;
  if (props.foo) {
    ref = ref1;
  } else {
    ref = ref2;
  }
  useEffect(() => print(ref));
}
