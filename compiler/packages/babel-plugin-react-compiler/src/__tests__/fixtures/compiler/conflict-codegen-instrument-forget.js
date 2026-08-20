// @enableEmitInstrumentForget @compilationMode:"annotation"

import {identity} from 'shared-runtime';

function Bar(props) {
  'use forget';
  const shouldInstrument = identity(null);
  const _shouldInstrument = identity(null);
  const _x2 = () => {
    const _shouldInstrument2 = 'hello world';
    return identity({_shouldInstrument2});
  };
  return (
    <div style={shouldInstrument} other={_shouldInstrument}>
      {props.bar}
    </div>
  );
}

function Foo(props) {
  'use forget';
  return <Foo>{props.bar}</Foo>;
}
