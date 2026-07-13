// @validateExhaustiveMemoizationDependencies @validateExhaustiveEffectDependencies:"all"
import {
  useCallback,
  useTransition,
  useState,
  useOptimistic,
  useActionState,
  useRef,
  useReducer,
  useEffect,
} from 'react';

function useFoo() {
  const [s, setState] = useState();
  const ref = useRef(null);
  const [t, startTransition] = useTransition();
  const [u, addOptimistic] = useOptimistic();
  const [v, dispatch] = useReducer(() => {}, null);
  const [isPending, dispatchAction] = useActionState(() => {}, null);

  useEffect(() => {
    dispatch();
    startTransition(() => {});
    addOptimistic();
    setState(null);
    dispatchAction();
    ref.current = true;
  }, [
    // intentionally adding unnecessary deps on nonreactive stable values
    // to check that they're allowed
    dispatch,
    startTransition,
    addOptimistic,
    setState,
    dispatchAction,
    ref,
  ]);

  return useCallback(() => {
    dispatch();
    startTransition(() => {});
    addOptimistic();
    setState(null);
    dispatchAction();
    ref.current = true;
  }, [
    // intentionally adding unnecessary deps on nonreactive stable values
    // to check that they're allowed
    dispatch,
    startTransition,
    addOptimistic,
    setState,
    dispatchAction,
    ref,
  ]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};
