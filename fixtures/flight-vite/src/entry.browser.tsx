// @ts-ignore
import * as ReactClient from 'react-server-dom-vite/client.browser';
import React from 'react';
import ReactDomClient from 'react-dom/client';
import {rscStream} from 'rsc-html-stream/client';
import type {RscPayload} from './entry.rsc';
import {
  clientManifest,
  findSourceMapURL,
  setCallServer,
} from '../basic/browser';

async function main() {
  const callServer = async (id: string, args: unknown) => {
    const temporaryReferences = ReactClient.createTemporaryReferenceSet();
    const payload = await ReactClient.createFromFetch<RscPayload>(
      fetch(window.location.href, {
        method: 'POST',
        body: await ReactClient.encodeReply(args, {temporaryReferences}),
        headers: {
          'x-rsc-action': id,
        },
      }),
      {...rscOptions, temporaryReferences},
    );
    setPayload(payload);
    return payload.returnValue;
  };
  setCallServer(callServer);
  const rscOptions = {callServer, findSourceMapURL, clientManifest};

  let setPayload: (v: RscPayload) => void;
  const initialPayload: RscPayload = await ReactClient.createFromReadableStream(
    rscStream,
    rscOptions,
  );

  async function onNavigation() {
    const url = new URL(window.location.href);
    const payload = await ReactClient.createFromFetch<RscPayload>(
      fetch(url),
      rscOptions,
    );
    setPayload(payload);
  }

  function BrowserRoot() {
    const [payload, setPayload_] = React.useState(initialPayload);

    React.useEffect(() => {
      setPayload = v => React.startTransition(() => setPayload_(v));
    }, [setPayload_]);

    React.useEffect(() => {
      return listenNavigation(() => onNavigation());
    }, []);

    return payload.root;
  }

  const browserRoot = (
    <React.StrictMode>
      <BrowserRoot />
    </React.StrictMode>
  );

  ReactDomClient.hydrateRoot(document, browserRoot, {
    formState: initialPayload.formState,
  });

  if (import.meta.hot) {
    import.meta.hot.on('rsc:update', async () => {
      const payload = await ReactClient.createFromFetch<RscPayload>(
        fetch(window.location.href),
        rscOptions,
      );
      setPayload(payload);
    });
  }
}

function listenNavigation(onNavigation: () => void) {
  window.addEventListener('popstate', onNavigation);

  const oldPushState = window.history.pushState;
  window.history.pushState = function (...args) {
    const res = oldPushState.apply(this, args);
    onNavigation();
    return res;
  };

  const oldReplaceState = window.history.replaceState;
  window.history.replaceState = function (...args) {
    const res = oldReplaceState.apply(this, args);
    onNavigation();
    return res;
  };

  function onClick(e: MouseEvent) {
    let link = (e.target as Element).closest('a');
    if (
      link &&
      link instanceof HTMLAnchorElement &&
      link.href &&
      (!link.target || link.target === '_self') &&
      link.origin === location.origin &&
      !link.hasAttribute('download') &&
      e.button === 0 && // left clicks only
      !e.metaKey && // open in new tab (mac)
      !e.ctrlKey && // open in new tab (windows)
      !e.altKey && // download
      !e.shiftKey &&
      !e.defaultPrevented
    ) {
      e.preventDefault();
      history.pushState(null, '', link.href);
    }
  }
  document.addEventListener('click', onClick);

  return () => {
    document.removeEventListener('click', onClick);
    window.removeEventListener('popstate', onNavigation);
    window.history.pushState = oldPushState;
    window.history.replaceState = oldReplaceState;
  };
}

main();
