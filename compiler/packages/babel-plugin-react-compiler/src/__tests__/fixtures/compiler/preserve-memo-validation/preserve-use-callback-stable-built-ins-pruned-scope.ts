// @validatePreserveExistingMemoizationGuarantees
import {
  useCallback,
  useTransition,
  useState,
  useOptimistic,
  useActionState,
  useRef,
  useReducer,
} from 'react';

/**
 * Repro from https://github.com/react/react/issues/34957
 *
 * The method call on `thing.label` extends the scope of `thing` over the hook
 * calls, so the stable values below come out of a pruned scope. They still
 * don't need to be listed as dependencies.
 */
function useFoo({things}) {
  const thing = things.find(thing => thing.something > 0);
  const [s, setState] = useState();
  const ref = useRef(null);
  const [t, startTransition] = useTransition();
  const [u, addOptimistic] = useOptimistic();
  const [v, dispatch] = useReducer(() => {}, null);
  const [isPending, dispatchAction] = useActionState(() => {}, null);
  const label = thing.label.toLowerCase();

  const onClick = useCallback(() => {
    dispatch();
    startTransition(() => {});
    addOptimistic();
    setState(null);
    dispatchAction();
    ref.current = true;
  }, []);
  return [label, onClick];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{things: [{something: 1, label: 'A'}]}],
};
