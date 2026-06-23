import {
  renderToPipeableStream,
  renderToReadableStream,
} from 'react-server-dom-webpack/server';
import App from './App';
import AppAsync from './AppAsync';

export function renderRSCNode(clientManifest, Component, itemCount) {
  return renderToPipeableStream(
    <Component itemCount={itemCount} />,
    clientManifest
  );
}

export function renderRSCEdge(clientManifest, Component, itemCount) {
  return renderToReadableStream(
    <Component itemCount={itemCount} />,
    clientManifest
  );
}

export {App, AppAsync};
