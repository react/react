'use strict';

const fs = require('fs');
const nodePath = require('path');
const inlinedHostConfigs = require('../shared/inlinedHostConfigs');

function resolveEntryFork(resolvedEntry, isFBBundle) {
  // Pick which entry point fork to use:
  // .modern.fb.js
  // .classic.fb.js
  // .fb.js
  // .stable.js
  // .experimental.js
  // .js
  // or any of those plus .development.js

  if (isFBBundle) {
    // FB builds for react-dom need to alias both react-dom and react-dom/client to the same
    // entrypoint since there is only a single build for them.
    if (
      resolvedEntry.endsWith('react-dom/index.js') ||
      resolvedEntry.endsWith('react-dom/client.js') ||
      resolvedEntry.endsWith('react-dom/unstable_testing.js')
    ) {
      let specifier;
      let entrypoint;
      if (resolvedEntry.endsWith('index.js')) {
        specifier = 'react-dom';
        entrypoint = __EXPERIMENTAL__
          ? 'src/ReactDOMFB.modern.js'
          : 'src/ReactDOMFB.js';
      } else if (resolvedEntry.endsWith('client.js')) {
        specifier = 'react-dom/client';
        entrypoint = __EXPERIMENTAL__
          ? 'src/ReactDOMFB.modern.js'
          : 'src/ReactDOMFB.js';
      } else {
        // must be unstable_testing
        specifier = 'react-dom/unstable_testing';
        entrypoint = __EXPERIMENTAL__
          ? 'src/ReactDOMTestingFB.modern.js'
          : 'src/ReactDOMTestingFB.js';
      }

      resolvedEntry = nodePath.join(resolvedEntry, '..', entrypoint);
      const devEntry = resolvedEntry.replace('.js', '.development.js');
      if (__DEV__ && fs.existsSync(devEntry)) {
        return devEntry;
      }
      if (fs.existsSync(resolvedEntry)) {
        return resolvedEntry;
      }
      const fbReleaseChannel = __EXPERIMENTAL__ ? 'www-modern' : 'www-classic';
      throw new Error(
        `${fbReleaseChannel} tests are expected to alias ${specifier} to ${entrypoint} but this file was not found`
      );
    }
    const resolvedFBEntry = resolvedEntry.replace(
      '.js',
      __EXPERIMENTAL__ ? '.modern.fb.js' : '.classic.fb.js'
    );
    const devFBEntry = resolvedFBEntry.replace('.js', '.development.js');
    if (__DEV__ && fs.existsSync(devFBEntry)) {
      return devFBEntry;
    }
    if (fs.existsSync(resolvedFBEntry)) {
      return resolvedFBEntry;
    }
    const resolvedGenericFBEntry = resolvedEntry.replace('.js', '.fb.js');
    const devGenericFBEntry = resolvedGenericFBEntry.replace(
      '.js',
      '.development.js'
    );
    if (__DEV__ && fs.existsSync(devGenericFBEntry)) {
      return devGenericFBEntry;
    }
    if (fs.existsSync(resolvedGenericFBEntry)) {
      return resolvedGenericFBEntry;
    }
    // Even if it's a FB bundle we fallthrough to pick stable or experimental if we don't have an FB fork.
  }
  const resolvedForkedEntry = resolvedEntry.replace(
    '.js',
    __EXPERIMENTAL__ ? '.experimental.js' : '.stable.js'
  );
  const devForkedEntry = resolvedForkedEntry.replace('.js', '.development.js');
  if (__DEV__ && fs.existsSync(devForkedEntry)) {
    return devForkedEntry;
  }
  if (fs.existsSync(resolvedForkedEntry)) {
    return resolvedForkedEntry;
  }
  const plainDevEntry = resolvedEntry.replace('.js', '.development.js');
  if (__DEV__ && fs.existsSync(plainDevEntry)) {
    return plainDevEntry;
  }
  // Just use the plain .js one.
  return resolvedEntry;
}

function mockReact() {
  jest.mock('react', () => {
    const resolvedEntryPoint = resolveEntryFork(
      require.resolve('react'),
      global.__WWW__ || global.__XPLAT__,
      global.__DEV__
    );
    return jest.requireActual(resolvedEntryPoint);
  });
  // Make it possible to import this module inside
  // the React package itself.
  jest.mock('shared/ReactSharedInternals', () => {
    return jest.requireActual('react/src/ReactSharedInternalsClient');
  });
}

// When we want to unmock React we really need to mock it again.
global.__unmockReact = mockReact;

mockReact();

jest.mock('react/react.react-server', () => {
  // If we're requiring an RSC environment, use those internals instead.
  jest.mock('shared/ReactSharedInternals', () => {
    return jest.requireActual('react/src/ReactSharedInternalsServer');
  });
  const resolvedEntryPoint = resolveEntryFork(
    require.resolve('react/src/ReactServer'),
    global.__WWW__ || global.__XPLAT__,
    global.__DEV__
  );
  return jest.requireActual(resolvedEntryPoint);
});

// When testing the custom renderer code path through `react-reconciler`,
// turn the export into a function, and use the argument as host config.
const shimHostConfigPath = 'react-reconciler/src/ReactFiberConfig';
jest.mock('react-reconciler', () => {
  return config => {
    jest.mock(shimHostConfigPath, () => config);
    return jest.requireActual('react-reconciler');
  };
});
const shimServerStreamConfigPath = 'react-server/src/ReactServerStreamConfig';
const shimServerConfigPath = 'react-server/src/ReactFizzConfig';
const shimFlightServerConfigPath = 'react-server/src/ReactFlightServerConfig';
jest.mock('react-server', () => {
  return config => {
    jest.mock(shimServerStreamConfigPath, () => config);
    jest.mock(shimServerConfigPath, () => config);
    return jest.requireActual('react-server');
  };
});
jest.mock('react-server/flight', () => {
  return config => {
    jest.mock(shimServerStreamConfigPath, () => config);
    jest.mock(shimServerConfigPath, () => config);
    jest.mock('react-server/src/ReactFlightServerConfigBundlerCustom', () => ({
      isClientReference: config.isClientReference,
      isServerReference: config.isServerReference,
      getClientReferenceKey: config.getClientReferenceKey,
      resolveClientReferenceMetadata: config.resolveClientReferenceMetadata,
    }));
    jest.mock(shimFlightServerConfigPath, () =>
      jest.requireActual(
        'react-server/src/forks/ReactFlightServerConfig.custom'
      )
    );
    return jest.requireActual('react-server/flight');
  };
});
const shimFlightClientConfigPath = 'react-client/src/ReactFlightClientConfig';
jest.mock('react-client/flight', () => {
  return config => {
    jest.mock(shimFlightClientConfigPath, () => config);
    return jest.requireActual('react-client/flight');
  };
});

const configPaths = [
  'react-reconciler/src/ReactFiberConfig',
  'react-client/src/ReactFlightClientConfig',
  'react-server/src/ReactServerStreamConfig',
  'react-server/src/ReactFizzConfig',
  'react-server/src/ReactFlightServerConfig',
];

function mockAllConfigs(rendererInfo) {
  configPaths.forEach(path => {
    // We want the reconciler to pick up the host config for this renderer.
    jest.mock(path, () => {
      let idx = path.lastIndexOf('/');
      let forkPath = path.slice(0, idx) + '/forks' + path.slice(idx);
      let parts = rendererInfo.shortName.split('-');
      while (parts.length) {
        try {
          const candidate = `${forkPath}.${parts.join('-')}.js`;
          fs.statSync(nodePath.join(process.cwd(), 'packages', candidate));
          return jest.requireActual(candidate);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
          // try without a part
        }
        parts.pop();
      }
      throw new Error(
        `Expected to find a fork for ${path} but did not find one.`
      );
    });
  });
}

// But for inlined host configs (such as React DOM, Native, etc), we
// mock their named entry points to establish a host config mapping.
inlinedHostConfigs.forEach(rendererInfo => {
  if (rendererInfo.shortName === 'custom') {
    // There is no inline entry point for the custom renderers.
    // Instead, it's handled by the generic `react-reconciler` entry point above.
    return;
  }
  rendererInfo.entryPoints.forEach(entryPoint => {
    jest.mock(entryPoint, () => {
      mockAllConfigs(rendererInfo);
      const resolvedEntryPoint = resolveEntryFork(
        require.resolve(entryPoint),
        global.__WWW__ || global.__XPLAT__,
        global.__DEV__
      );
      return jest.requireActual(resolvedEntryPoint);
    });
  });
});

jest.mock('react-server/src/ReactFlightServer', () => {
  // If we're requiring an RSC environment, use those internals instead.
  jest.mock('shared/ReactSharedInternals', () => {
    return jest.requireActual('react/src/ReactSharedInternalsServer');
  });
  return jest.requireActual('react-server/src/ReactFlightServer');
});

// Make it possible to import this module inside
// the ReactDOM package itself.
jest.mock('shared/ReactDOMSharedInternals', () =>
  jest.requireActual('react-dom/src/ReactDOMSharedInternals')
);

jest.mock('scheduler', () => jest.requireActual('scheduler/unstable_mock'));

if (global.__PERSISTENT__) {
  jest.mock('react-noop-renderer', () =>
    jest.requireActual('react-noop-renderer/persistent')
  );
}
