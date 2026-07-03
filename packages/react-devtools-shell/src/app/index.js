/** @flow */

// This test harness mounts each test app as a separate root to test multi-root applications.

import semver from 'semver';

import {createElement} from 'react';
import {createRoot} from 'react-dom/client';

import DeeplyNestedComponents from './DeeplyNestedComponents';
import Iframe from './Iframe';
import EditableProps from './EditableProps';
import ElementTypes from './ElementTypes';
import Hydration from './Hydration';
import InspectableElements from './InspectableElements';
import ReactNativeWeb from './ReactNativeWeb';
import ToDoList from './ToDoList';
import Toggle from './Toggle';
import UserList from './UserList';
import ErrorBoundaries from './ErrorBoundaries';
import PartiallyStrictApp from './PartiallyStrictApp';
import Segments from './Segments';
import SuspenseTree from './SuspenseTree';
import ActivityTree from './ActivityTree';
import TraceUpdatesTest from './TraceUpdatesTest';
import {ignoreErrors, ignoreLogs, ignoreWarnings} from './console';

import './styles.css';

// DevTools intentionally tests compatibility with certain legacy APIs.
// Suppress their error messages in the local dev shell,
// because they might mask other more serious error messages.
ignoreErrors([
  'Warning: Legacy context API',
  'Warning: Unsafe lifecycle methods',
  'Warning: %s is deprecated in StrictMode.', // findDOMNode
  'Warning: ReactDOM.render was removed in React 19',
  'Warning: react-test-renderer is deprecated',
  // Ignore prefixed and not prefixed since I don't know which
  // React versions are being tested by this code.
  'Legacy context API',
  'Unsafe lifecycle methods',
  '%s is deprecated in StrictMode.', // findDOMNode
  'ReactDOM.render was removed in React 19',
  'react-test-renderer is deprecated',
]);
ignoreWarnings([
  'Warning: componentWillReceiveProps has been renamed',
  'componentWillReceiveProps has been renamed',
]);
ignoreLogs([]);

const unmountFunctions: Array<() => void | boolean> = [];

function createContainer() {
  const container = document.createElement('div');

  (document.body as any as HTMLBodyElement).appendChild(container);

  return container;
}

function mountApp(App: () => React$Node) {
  const container = createContainer();

  const root = createRoot(container);
  root.render(createElement(App));

  unmountFunctions.push(() => root.unmount());
}

// $FlowFixMe[missing-local-annot]
function mountStrictApp(App) {
  function StrictRoot() {
    return createElement(App);
  }

  const container = createContainer();

  const root = createRoot(container, {unstable_strictMode: true});
  root.render(createElement(StrictRoot));

  unmountFunctions.push(() => root.unmount());
}

function mountLegacyApp(App: () => React$Node) {
  // $FlowFixMe[prop-missing]: These are removed in 19.
  const {render, unmountComponentAtNode} = require('react-dom');

  function LegacyRender() {
    return createElement(App);
  }

  const container = createContainer();

  // $FlowFixMe[not-a-function]: These are removed in 19.
  render(createElement(LegacyRender), container);

  // $FlowFixMe[not-a-function]: These are removed in 19.
  unmountFunctions.push(() => unmountComponentAtNode(container));
}

const shouldRenderLegacy = semver.lte(
  process.env.E2E_APP_REACT_VERSION,
  '18.2.0',
);
function mountTestApp() {
  mountStrictApp(ToDoList);
  mountApp(UserList);
  mountApp(InspectableElements);
  mountApp(Hydration);
  mountApp(ElementTypes);
  mountApp(EditableProps);
  mountApp(ReactNativeWeb);
  mountApp(Toggle);
  mountApp(ErrorBoundaries);
  mountApp(SuspenseTree);
  mountApp(DeeplyNestedComponents);
  mountApp(Iframe);
  mountApp(ActivityTree);
  mountApp(TraceUpdatesTest);
  mountApp(Segments);

  if (shouldRenderLegacy) {
    mountLegacyApp(PartiallyStrictApp);
  }
}

function unmountTestApp() {
  unmountFunctions.forEach(fn => fn());
}

mountTestApp();

window.parent.mountTestApp = mountTestApp;
window.parent.unmountTestApp = unmountTestApp;
