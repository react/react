// @validateExhaustiveMemoizationDependencies
import {useCallback, useMemo} from 'react';
import {makeObject_Primitives, Stringify} from 'shared-runtime';

function useHook1(x) {
  return useMemo(() => {
    return x?.y.z?.a;
  }, [x?.y.z?.a]);
}
function useHook2(x) {
  useMemo(() => {
    return x.y.z?.a;
  }, [x.y.z?.a]);
}
function useHook3(x) {
  return useMemo(() => {
    return x?.y.z.a?.b;
  }, [x?.y.z.a?.b]);
}
function useHook4(x, y, z) {
  return useMemo(() => {
    return x?.y?.[(console.log(y), z?.b)];
  }, [x?.y, y, z?.b]);
}
function useHook5(x) {
  return useMemo(() => {
    const e = [];
    const local = makeObject_Primitives(x);
    const fn = () => {
      e.push(local);
    };
    fn();
    return e;
  }, [x]);
}
function useHook6(x) {
  return useMemo(() => {
    const f = [];
    f.push(x.y.z);
    f.push(x.y);
    f.push(x);
    return f;
  }, [x]);
}

function useHook7(x) {
  const [state, setState] = useState(true);
  const f = () => {
    setState(x => !x);
  };
  return useCallback(() => {
    f();
  }, [f]);
}

function Component({x, y, z}) {
  const a = useHook1(x);
  const b = useHook2(x);
  const c = useHook3(x);
  const d = useHook4(x, y, z);
  const e = useHook5(x);
  const f = useHook6(x);
  const g = useHook7(x);
  return <Stringify results={[a, b, c, d, e, f, g]} />;
}
