// @validateExhaustiveMemoizationDependencies
import {useMemo} from 'react';
import {Stringify} from 'shared-runtime';

function Component({x, y, z}) {
  const a = useMemo(() => {
    return x?.y.z?.a;
    // error: too precise
  }, [x?.y.z?.a.b]);
  const b = useMemo(() => {
    return x.y.z?.a;
    // ok, not our job to type check nullability
  }, [x.y.z.a]);
  const c = useMemo(() => {
    return x?.y.z.a?.b;
    // error: too precise
  }, [x?.y.z.a?.b.z]);
  const d = useMemo(() => {
    return x?.y?.[(console.log(y), z?.b)];
    // ok
  }, [x?.y, y, z?.b]);
  const e = useMemo(() => {
    const e = [];
    e.push(x);
    return e;
    // ok
  }, [x]);
  const f = useMemo(() => {
    return [];
    // error: unnecessary
  }, [x, y.z, z?.y?.a, UNUSED_GLOBAL]);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref = z ? ref1 : ref2;
  const cb = useMemo(() => {
    return () => {
      return ref.current;
    };
    // error: ref is a stable type but reactive
  }, []);
  return <Stringify results={[a, b, c, d, e, f, cb]} />;
}
