import foo from 'useDefaultExportNotTypedAsHook';

function Component() {
  return <div>{foo()}</div>;
}
