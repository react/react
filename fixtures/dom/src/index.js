import './polyfills';
import loadReact, {isLocal} from './react-loader';

if (isLocal()) {
  Promise.all([
    import('react'),
    import('react-dom'),
    import('react-dom/client'),
  ])
    .then(([React, ReactDOM, ReactDOMClient]) => {
      if (
        React === undefined ||
        ReactDOM === undefined ||
        ReactDOMClient === undefined
      ) {
        throw new Error(
          'Unable to load React. Build experimental and then run `yarn dev` again'
        );
      }
      window.React = React;
      window.ReactDOM = ReactDOM;
      window.ReactDOMClient = ReactDOMClient;
    })
    .then(() => import('./components/App'))
    .then(App => {
      window.ReactDOMClient.createRoot(document.getElementById('root')).render(
        window.React.createElement(App.default)
      );
    });
} else {
  loadReact()
    .then(() => import('./components/App'))
    .then(App => {
      const {React, ReactDOM} = window;
      if (
        typeof window.ReactDOMClient !== 'undefined' &&
        typeof window.ReactDOMClient.createRoot !== 'undefined'
      ) {
        // we are in a React that only supports modern roots

        window.ReactDOMClient.createRoot(
          document.getElementById('root')
        ).render(React.createElement(App.default));
      } else {
        ReactDOM.render(
          React.createElement(App.default),
          document.getElementById('root')
        );
      }
    });
}
