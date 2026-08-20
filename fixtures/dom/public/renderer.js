/**
 * Supports render.html, a piece of the hydration fixture. See /hydration
 */

'use strict';

(function () {
  var Fixture = null;
  var output = document.getElementById('output');
  var status = document.getElementById('status');
  var hydrate = document.getElementById('hydrate');
  var reload = document.getElementById('reload');
  var renders = 0;
  var failed = false;

  var needsReactDOM = getBooleanQueryParam('needsReactDOM');
  var needsCreateElement = getBooleanQueryParam('needsCreateElement');

  function unmountComponent(node) {
    // ReactDOM was moved into a separate package in 0.14
    if (needsReactDOM) {
      ReactDOM.unmountComponentAtNode(node);
    } else if (React.unmountComponentAtNode) {
      React.unmountComponentAtNode(node);
    } else {
      // Unmounting for React 0.4 and lower
      React.unmountAndReleaseReactRootNode(node);
    }
  }

  function createElement(value) {
    // React.createElement replaced function invocation in 0.12
    if (needsCreateElement) {
      return React.createElement(value);
    } else {
      return value();
    }
  }

  function getQueryParam(key) {
    var pattern = new RegExp(key + '=([^&]+)(&|$)');
    var matches = window.location.search.match(pattern);

    if (matches) {
      return decodeURIComponent(matches[1]);
    }

    handleError(new Error('No key found for' + key));
  }

  function getBooleanQueryParam(key) {
    return getQueryParam(key) === 'true';
  }

  function setStatus(label) {
    status.innerHTML = label;
  }

  function prerender() {
    setStatus('Generating markup');

    return Promise.resolve()
      .then(function () {
        const element = createElement(Fixture);

        // Server rendering moved to a separate package along with ReactDOM
        // in 0.14.0
        if (needsReactDOM) {
          return ReactDOMServer.renderToString(element);
        }

        // React.renderComponentToString was renamed in 0.12
        if (React.renderToString) {
          return React.renderToString(element);
        }

        // React.renderComponentToString became synchronous in React 0.9.0
        if (React.renderComponentToString.length === 1) {
          return React.renderComponentToString(element);
        }

        // Finally, React 0.4 and lower emits markup in a callback
        return new Promise(function (resolve) {
          React.renderComponentToString(element, resolve);
        });
      })
      .then(function (string) {
        output.innerHTML = string;
        setStatus('Markup only (No React)');
      })
      .catch(handleError);
  }

  function render() {
    setStatus('Hydrating');

    var element = createElement(Fixture);

    // ReactDOM was split out into another package in 0.14
    if (needsReactDOM) {
      // Hydration changed to a separate method in React 16
      if (ReactDOM.hydrate) {
        ReactDOM.hydrate(element, output);
      } else {
        ReactDOM.render(element, output);
      }
    } else if (React.render) {
      // React.renderComponent was renamed in 0.12
      React.render(element, output);
    } else {
      React.renderComponent(element, output);
    }

    setStatus(renders > 0 ? 'Re-rendered (' + renders + 'x)' : 'Hydrated');
    renders += 1;
    hydrate.innerHTML = 'Re-render';
  }

  function handleError(error) {
    console.log(error);
    failed = true;
    setStatus('Javascript Error');
    output.innerHTML = error;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.async = true;
      script.src = src;

      script.onload = resolve;
      script.onerror = function (error) {
        reject(new Error('Unable to load ' + src));
      };

      document.body.appendChild(script);
    });
  }

  function injectFixture(src) {
    Fixture = new Function(src + '\nreturn Fixture;')();

    if (typeof Fixture === 'undefined') {
      setStatus('Failed');
      output.innerHTML = 'Please name your root component "Fixture"';
    } else {
      prerender().then(function () {
        if (getBooleanQueryParam('hydrate')) {
          render();
        }
      });
    }
  }

  function reloadFixture(code) {
    renders = 0;
    unmountComponent(output);
    injectFixture(code);
  }

  window.onerror = handleError;

  reload.onclick = function () {
    window.location.reload();
  };

  hydrate.onclick = render;

  loadScript(getQueryParam('reactPath'))
    .then(function () {
      if (needsReactDOM) {
        return Promise.all([
          loadScript(getQueryParam('reactDOMPath')),
          loadScript(getQueryParam('reactDOMServerPath')),
        ]);
      }
    })
    .then(function () {
      if (failed) {
        return;
      }

      window.addEventListener('message', function (event) {
        var data = JSON.parse(event.data);

        switch (data.type) {
          case 'code':
            reloadFixture(data.payload);
            break;
          default:
            throw new Error(
              'Renderer Error: Unrecognized message "' + data.type + '"'
            );
        }
      });

      window.parent.postMessage(JSON.stringify({type: 'ready'}), '*');
    })
    .catch(handleError);
})();
