// @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies
import {ValidateMemoization} from 'shared-runtime';
function Component(props) {
  const data = useMemo(() => {
    const x = [];
    x.push(props?.a.b?.c.d?.e);
    x.push(props.a?.b.c?.d.e);
    return x;
  }, [props.a.b.c.d.e]);
  return <ValidateMemoization inputs={[props.a.b.c.d.e]} output={x} />;
}
