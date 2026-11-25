'use strict';

const B = process.env.BUILD || './build/node_modules';
const React = require(B + '/react/cjs/react.production.js');
const {renderToPipeableStream} = require(
  B + '/react-dom/cjs/react-dom-server.node.production.js',
);
const {Writable} = require('stream');

function Row({i}) {
  return React.createElement(
    'div',
    {
      className: 'row item-' + i,
      id: 'row-' + i,
      'data-index': i,
      'aria-label': 'Row ' + i,
      title: 'Item number ' + i,
      style: {color: 'red', padding: 4, margin: 2, fontWeight: 600},
    },
    'Item content ' + i,
  );
}

function App() {
  const rows = [];
  for (let i = 0; i < 1000; i++) rows.push(React.createElement(Row, {key: i, i}));
  return React.createElement('main', {className: 'container'}, rows);
}

function once() {
  return new Promise(resolve => {
    const sink = new Writable({write(c, e, cb) {cb();}});
    sink.on('finish', resolve);
    renderToPipeableStream(React.createElement(App)).pipe(sink);
  });
}

(async () => {
  for (let i = 0; i < 50; i++) await once(); // warmup
  const N = 500;
  const start = process.hrtime.bigint();
  for (let i = 0; i < N; i++) await once();
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  console.log((N / (ms / 1000)).toFixed(1) + ' ops/s (' + ms.toFixed(0) + 'ms / ' + N + ')');
})();
