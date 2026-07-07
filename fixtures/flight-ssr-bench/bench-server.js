'use strict';

require('@babel/register')({
  presets: [['@babel/preset-react', {runtime: 'automatic'}]],
  plugins: ['@babel/plugin-transform-modules-commonjs'],
  only: [/\/src\//],
});

const http = require('http');
const {Readable} = require('stream');
const webpack = require('webpack');

const {clientManifest, ssrManifest} = require('./webpack-mock');
const {
  renderFizzNode,
  renderFizzEdge,
  renderFlightFizzNode,
  renderFlightFizzEdge,
} = require('./render-helpers');
const {printGrid} = require('./print-helpers');

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function build() {
  const config = require('./webpack.config');
  return new Promise(function (resolve, reject) {
    webpack(config, function (err, stats) {
      if (err) {
        reject(err);
        return;
      }
      if (stats.hasErrors()) {
        reject(new Error(stats.toString({errors: true})));
        return;
      }
      console.log(
        stats.toString({colors: true, modules: false, entrypoints: false})
      );
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const ITEM_COUNT = 200;
const PORT = 3001;

async function main() {
  console.log('Building RSC bundle...\n');
  await build();

  const {
    renderRSCNode,
    renderRSCEdge,
    App: RSCApp,
    AppAsync: RSCAppAsync,
  } = require('./build/rsc-bundle.js');
  const App = require('./src/App.js').default;
  const AppAsync = require('./src/AppAsync.js').default;

  function pipeStreamToRes(stream, res) {
    if (typeof stream.pipe === 'function') {
      // Node Readable stream
      stream.pipe(res);
    } else {
      // Web ReadableStream — convert to Node stream for HTTP response
      Readable.fromWeb(stream).pipe(res);
    }
  }

  function pipeToRes(streamOrPromise, res) {
    if (typeof streamOrPromise.then === 'function') {
      streamOrPromise.then(
        function (stream) {
          pipeStreamToRes(stream, res);
        },
        function (err) {
          console.error(err);
          if (!res.headersSent) res.writeHead(500);
          res.end();
        }
      );
    } else {
      pipeStreamToRes(streamOrPromise, res);
    }
  }

  const routes = {
    '/fizz-node-sync': function (res) {
      pipeToRes(renderFizzNode(App, ITEM_COUNT), res);
    },
    '/fizz-node-async': function (res) {
      pipeToRes(renderFizzNode(AppAsync, ITEM_COUNT), res);
    },
    '/fizz-edge-sync': function (res) {
      pipeToRes(renderFizzEdge(App, ITEM_COUNT), res);
    },
    '/fizz-edge-async': function (res) {
      pipeToRes(renderFizzEdge(AppAsync, ITEM_COUNT), res);
    },
    '/flight-node-sync': function (res) {
      pipeToRes(
        renderFlightFizzNode(
          renderRSCNode,
          RSCApp,
          ITEM_COUNT,
          clientManifest,
          ssrManifest
        ),
        res
      );
    },
    '/flight-node-sync.rsc': function (res) {
      pipeStreamToRes(renderRSCNode(clientManifest, RSCApp, ITEM_COUNT), res);
    },
    '/flight-node-async': function (res) {
      pipeToRes(
        renderFlightFizzNode(
          renderRSCNode,
          RSCAppAsync,
          ITEM_COUNT,
          clientManifest,
          ssrManifest
        ),
        res
      );
    },
    '/flight-node-async.rsc': function (res) {
      pipeStreamToRes(
        renderRSCNode(clientManifest, RSCAppAsync, ITEM_COUNT),
        res
      );
    },
    '/flight-edge-sync': function (res) {
      pipeToRes(
        renderFlightFizzEdge(
          renderRSCEdge,
          RSCApp,
          ITEM_COUNT,
          clientManifest,
          ssrManifest
        ),
        res
      );
    },
    '/flight-edge-sync.rsc': function (res) {
      pipeStreamToRes(renderRSCEdge(clientManifest, RSCApp, ITEM_COUNT), res);
    },
    '/flight-edge-async': function (res) {
      pipeToRes(
        renderFlightFizzEdge(
          renderRSCEdge,
          RSCAppAsync,
          ITEM_COUNT,
          clientManifest,
          ssrManifest
        ),
        res
      );
    },
    '/flight-edge-async.rsc': function (res) {
      pipeStreamToRes(
        renderRSCEdge(clientManifest, RSCAppAsync, ITEM_COUNT),
        res
      );
    },
  };

  const server = http.createServer(function (req, res) {
    const handler = routes[req.url];
    if (!handler) {
      if (req.url === '/' || req.url === '') {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(
          '<html><body><h1>Flight SSR Bench</h1><ul>' +
            Object.keys(routes)
              .map(function (r) {
                return '<li><a href="' + r + '">' + r + '</a></li>';
              })
              .join('') +
            '</ul></body></html>'
        );
        return;
      }
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const contentType = req.url.endsWith('.rsc')
      ? 'text/x-component'
      : 'text/html';
    res.writeHead(200, {'Content-Type': contentType});
    handler(res);
  });

  await new Promise(function (resolve) {
    server.listen(PORT, resolve);
  });

  console.log('\nServer listening on http://localhost:%d', PORT);
  console.log('Endpoints:');
  for (const route of Object.keys(routes)) {
    console.log('  http://localhost:%d%s', PORT, route);
  }

  if (!process.argv.includes('--bench')) {
    return;
  }

  // Run autocannon against each endpoint.
  // Use a fixed request count (amount) instead of duration so that all
  // in-flight requests complete before autocannon closes connections.
  const autocannon = require('autocannon');
  const concurrencyLevels = [1, 10];
  const WARMUP_AMOUNT = 200;
  const BENCH_AMOUNT = 1000;

  function runAutocannon(benchUrl, connections, amount) {
    return new Promise(function (resolve, reject) {
      const instance = autocannon({url: benchUrl, connections, amount});
      autocannon.track(instance, {
        renderProgressBar: false,
        renderResultsTable: false,
      });
      instance.on('done', resolve);
      instance.on('error', reject);
    });
  }

  for (const c of concurrencyLevels) {
    console.log(
      '\n--- HTTP Benchmark (%d warmup, c=%d, %d requests) ---\n',
      WARMUP_AMOUNT,
      c,
      BENCH_AMOUNT
    );

    const results = {};
    const benchRoutes = Object.keys(routes).filter(function (r) {
      return !r.endsWith('.rsc');
    });
    const labelWidth = Math.max(
      ...benchRoutes.map(function (r) {
        return r.length - 1;
      })
    );

    const header =
      ''.padEnd(labelWidth) +
      '  ' +
      'req/s'.padStart(14) +
      '  ' +
      'p50'.padStart(8) +
      '  ' +
      'p99'.padStart(8);
    console.log('  ' + header);
    console.log('  ' + '-'.repeat(header.length));

    for (const route of benchRoutes) {
      const label = route.slice(1);
      const benchUrl = 'http://localhost:' + PORT + route;

      // Warmup
      await runAutocannon(benchUrl, c, WARMUP_AMOUNT);

      const data = await runAutocannon(benchUrl, c, BENCH_AMOUNT);
      const reqPerSec = (1000 / data.latency.mean) * data.connections;
      const latencyMedian = data.latency.p50;
      const latencyP99 = data.latency.p99;
      const errors = data.errors + data.timeouts;

      results[label] = {reqPerSec, latencyMedian, latencyP99};

      let line =
        '  ' +
        label.padEnd(labelWidth) +
        '  ' +
        String(reqPerSec.toFixed(1)).padStart(8) +
        ' req/s' +
        '  ' +
        String(latencyMedian).padStart(5) +
        ' ms' +
        '  ' +
        String(latencyP99).padStart(5) +
        ' ms';
      if (errors > 0) {
        line += '  (' + errors + ' errors)';
      }
      console.log(line);
    }

    const rps = function (r) {
      return r.reqPerSec;
    };

    console.log('\n--- Flight overhead (c=%d) ---\n', c);
    printGrid(
      ['Fizz', 'Flight+Fizz'],
      [
        ['Node sync', results['fizz-node-sync'], results['flight-node-sync']],
        [
          'Node async',
          results['fizz-node-async'],
          results['flight-node-async'],
        ],
        ['Edge sync', results['fizz-edge-sync'], results['flight-edge-sync']],
        [
          'Edge async',
          results['fizz-edge-async'],
          results['flight-edge-async'],
        ],
      ],
      rps,
      'req/s'
    );

    console.log('\n--- Edge vs Node (c=%d) ---\n', c);
    printGrid(
      ['Node', 'Edge'],
      [
        ['Fizz sync', results['fizz-node-sync'], results['fizz-edge-sync']],
        ['Fizz async', results['fizz-node-async'], results['fizz-edge-async']],
        [
          'Flight+Fizz sync',
          results['flight-node-sync'],
          results['flight-edge-sync'],
        ],
        [
          'Flight+Fizz async',
          results['flight-node-async'],
          results['flight-edge-async'],
        ],
      ],
      rps,
      'req/s'
    );
  }

  server.close();
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
