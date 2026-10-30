// @ts-ignore
import * as ReactServer from 'react-server-dom-vite/server.edge';
import type React from 'react';
import type {ReactFormState} from 'react-dom/client';
import {Root} from './routes/root';
import {importSsr, Resources, serverManifest} from '../basic/rsc';

export type RscPayload = {
  root: React.ReactNode;
  formState?: ReactFormState;
  returnValue?: unknown;
};

export default async function handler(request: Request): Promise<Response> {
  const nonce = process.env.DISABLE_NONCE ? undefined : crypto.randomUUID();

  function RscRoot() {
    return (
      <>
        <Resources nonce={nonce} />
        <Root url={new URL(request.url)} />
      </>
    );
  }

  return renderRsc(request, <RscRoot />, {nonce});
}

async function renderRsc(
  request: Request,
  root: React.ReactNode,
  options: {nonce?: string},
): Promise<Response> {
  const url = new URL(request.url);
  const isAction = request.method === 'POST';

  // override with ?__rsc and ?__html for quick debugging
  const isRscRequest =
    (!request.headers.get('accept')?.includes('text/html') &&
      !url.searchParams.has('__html')) ||
    url.searchParams.has('__rsc');

  // action
  let returnValue: unknown | undefined;
  let formState: ReactFormState | undefined;
  let temporaryReferences: unknown | undefined;
  if (isAction) {
    const actionId = request.headers.get('x-rsc-action');
    if (actionId) {
      // client stream request
      const contentType = request.headers.get('content-type');
      const body = contentType?.startsWith('multipart/form-data')
        ? await request.formData()
        : await request.text();
      temporaryReferences = ReactServer.createTemporaryReferenceSet();
      const args = await ReactServer.decodeReply(body, serverManifest, {
        temporaryReferences,
      });
      const action = await ReactServer.loadServerAction(
        actionId,
        serverManifest,
      );
      returnValue = await action.apply(null, args);
    } else {
      // progressive enhancement
      const formData = await request.formData();
      const decodedAction = await ReactServer.decodeAction(
        formData,
        serverManifest,
      );
      const result = await decodedAction();
      formState = await ReactServer.decodeFormState(
        result,
        formData,
        serverManifest,
      );
    }
  }

  const rscPayload: RscPayload = {root, formState, returnValue};
  const rscOptions = {temporaryReferences, nonce: options.nonce};
  const stream = ReactServer.renderToReadableStream(rscPayload, {}, rscOptions);

  if (isRscRequest) {
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/x-component;charset=utf-8',
      },
    });
  }

  const ssr = await importSsr<typeof import('./entry.ssr')>();
  const htmlStream = await ssr.renderHtml({
    url,
    stream,
    formState,
    nonce: options.nonce,
  });
  const headers = new Headers({'Content-Type': 'text/html;charset=utf-8'});
  if (options.nonce) {
    headers.set(
      'Content-Security-Policy',
      `default-src 'self'; object-src 'none';` +
        // allow unsafe-eval during dev for `createFakeFunction` eval.
        `script-src 'self' 'nonce-${options.nonce}' ${import.meta.env.DEV ? `'unsafe-eval'` : ''};` +
        `style-src 'self' 'unsafe-inline'`,
    );
  }
  return new Response(htmlStream, {headers});
}
