import semver from 'semver';

/**
 * Take a version from the window query string and load a specific
 * version of React.
 *
 * @example
 * http://localhost:3000?version=15.4.1
 * (Loads React 15.4.1)
 */

function parseQuery(qstr) {
  var query = {};
  var a = qstr.slice(1).split('&');

  for (var i = 0; i < a.length; i++) {
    var b = a[i].split('=');
    query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
  }
  return query;
}

function loadScript(src) {
  let firstScript = document.getElementsByTagName('script')[0];
  let scriptNode;

  return new Promise((resolve, reject) => {
    scriptNode = document.createElement('script');
    scriptNode.async = 1;
    scriptNode.src = src;

    scriptNode.onload = () => resolve();
    scriptNode.onerror = () => reject(new Error(`failed to load: ${src}`));

    firstScript.parentNode.insertBefore(scriptNode, firstScript);
  });
}

function loadModules(SymbolSrcPairs) {
  let firstScript = document.getElementsByTagName('script')[0];

  let imports = '';
  SymbolSrcPairs.map(([symbol, src]) => {
    imports += `import ${symbol} from "${src}";\n`;
    imports += `window.${symbol} = ${symbol};\n`;
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Timed out loading react modules over esm')),
      5000
    );
    window.__loaded = () => {
      clearTimeout(timeout);
      resolve();
    };

    const moduleScript = document.createElement('script');
    moduleScript.type = 'module';
    moduleScript.textContent = imports + 'window.__loaded();';

    firstScript.parentNode.insertBefore(moduleScript, firstScript);
  });
}

function getVersion() {
  let query = parseQuery(window.location.search);
  return query.version || 'local';
}

export function isLocal() {
  return getVersion() === 'local';
}

export function reactPaths(version = getVersion()) {
  let query = parseQuery(window.location.search);
  let isProduction = query.production === 'true';
  let environment = isProduction ? 'production.min' : 'development';
  let reactPath = `react.${environment}.js`;
  let reactDOMPath = `react-dom.${environment}.js`;
  let reactDOMClientPath = `react-dom.${environment}.js`;
  let reactDOMServerPath = `react-dom-server.browser.${environment}.js`;
  let needsCreateElement = true;
  let needsReactDOM = true;
  let usingModules = false;

  if (version !== 'local') {
    const {major, minor, prerelease} = semver(version);
    console.log('semver', semver(version));

    if (major === 0) {
      needsCreateElement = minor >= 12;
      needsReactDOM = minor >= 14;
    }

    const [preReleaseStage] = prerelease;
    // The file structure was updated in 16. This wasn't the case for alphas.
    // Load the old module location for anything less than 16 RC
    if (major >= 19) {
      usingModules = true;
      const devQuery = environment === 'development' ? '?dev' : '';
      reactPath = 'https://esm.sh/react@' + version + '/' + devQuery;
      reactDOMPath = 'https://esm.sh/react-dom@' + version + '/' + devQuery;
      reactDOMClientPath =
        'https://esm.sh/react-dom@' + version + '/client' + devQuery;
      reactDOMServerPath =
        'https://esm.sh/react-dom@' + version + '/server.browser' + devQuery;
    } else if (major >= 16 && !(minor === 0 && preReleaseStage === 'alpha')) {
      reactPath =
        'https://unpkg.com/react@' +
        version +
        '/umd/react.' +
        environment +
        '.js';
      reactDOMPath =
        'https://unpkg.com/react-dom@' +
        version +
        '/umd/react-dom.' +
        environment +
        '.js';
      reactDOMServerPath =
        'https://unpkg.com/react-dom@' +
        version +
        '/umd/react-dom-server.browser' +
        environment;
    } else if (major > 0 || minor > 11) {
      reactPath = 'https://unpkg.com/react@' + version + '/dist/react.js';
      reactDOMPath =
        'https://unpkg.com/react-dom@' + version + '/dist/react-dom.js';
      reactDOMServerPath =
        'https://unpkg.com/react-dom@' + version + '/dist/react-dom-server.js';
    } else {
      reactPath =
        'https://cdnjs.cloudflare.com/ajax/libs/react/' + version + '/react.js';
    }
  } else {
    throw new Error(
      'This fixture no longer works with local versions. Provide a version query parameter that matches a version published to npm to use the fixture.'
    );
  }

  return {
    reactPath,
    reactDOMPath,
    reactDOMClientPath,
    reactDOMServerPath,
    needsCreateElement,
    needsReactDOM,
    usingModules,
  };
}

export default function loadReact() {
  console.log('reactPaths', reactPaths());
  const {
    reactPath,
    reactDOMPath,
    reactDOMClientPath,
    needsReactDOM,
    usingModules,
  } = reactPaths();

  if (usingModules) {
    return loadModules([
      ['React', reactPath],
      ['ReactDOM', reactDOMPath],
      ['ReactDOMClient', reactDOMClientPath],
    ]);
  } else {
    let request = loadScript(reactPath, usingModules);

    if (needsReactDOM) {
      request = request.then(() => loadScript(reactDOMPath, usingModules));
    } else {
      // Aliasing React to ReactDOM for compatibility.
      request = request.then(() => {
        window.ReactDOM = window.React;
      });
    }
    return request;
  }
}
