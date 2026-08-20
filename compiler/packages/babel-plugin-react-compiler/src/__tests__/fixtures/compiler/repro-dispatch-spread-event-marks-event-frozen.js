// @compilationMode:"infer"
function Component() {
  const dispatch = useDispatch();
  // const [state, setState] = useState(0);

  return (
    <div>
      <input
        type="file"
        onChange={event => {
          dispatch(...event.target);
          event.target.value = '';
        }}
      />
    </div>
  );
}

function useDispatch() {
  'use no memo';
  // skip compilation to make it easier to debug the above function
  return (...values) => {
    console.log(...values);
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
