// @compilationMode:"all"
'use no memo';

function TestComponent({x}) {
  'use memo';
  return <Button>{x}</Button>;
}
