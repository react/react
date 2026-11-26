// @ts-ignore
import serverReferences from 'virtual:vite-rsc/server-references';
// @ts-ignore
import assetsManifest from 'virtual:vite-rsc/assets-manifest';
// @ts-ignore
import * as ReactServer from 'react-server-dom-vite/server.edge';
// @ts-ignore
import * as ReactClient from 'react-server-dom-vite/client.edge';

export {assetsManifest};

export const serverManifest = {load: loadModule};
export const clientManifest = {load: loadModuleClient};

function loadModule(id: string) {
  if (import.meta.env.DEV) {
    return import(/* @vite-ignore */ id);
  } else {
    return serverReferences[id]();
  }
}

async function loadModuleClient(id: string) {
  // TODO: likely there's no legitimate way to load the original module properly.
  // for now, we use proxy to generate `registerClientReference` on the fly.
  // https://github.com/hi-ogawa/vite-plugins/pull/906
  return new Proxy({} as any, {
    get(target, name, _receiver) {
      if (name === 'then') return;
      return (target[name] ??= ReactServer.registerClientReference(
        () => {
          throw new Error("client reference shouldn't be called on server");
        },
        id,
        name,
      ));
    },
  });
}

export async function importSsr<T>(): Promise<T> {
  const mod = await import('virtual:vite-rsc/import-ssr' as any);
  if (import.meta.env.DEV) {
    return mod.default();
  } else {
    return mod;
  }
}

export async function Resources({nonce}: {nonce?: string}) {
  let {css, js} = assetsManifest.entry.deps as {css: string[]; js: string[]};

  if (import.meta.env.DEV) {
    // for build, css in rsc environment is included in client entry css
    const rscCss = await import('virtual:vite-rsc/rsc-css' as string);
    css = [...css, ...rscCss.default];
  }

  const cssLinks = css.map(href => (
    <link key={href} rel="stylesheet" href={href} precedence="high" />
  ));

  const jsLinks = js.map(href => (
    <link key={href} rel="modulepreload" href={href} />
  ));

  // https://vite.dev/guide/features.html#content-security-policy-csp
  // this is used by inline style during dev,
  // but this is essentially meaningless when allowing `style-src 'unsafe-inline'`
  const viteCsp = nonce && <meta property="csp-nonce" nonce={nonce} />;

  return (
    <>
      {cssLinks}
      {jsLinks}
      {viteCsp}
    </>
  );
}

export function serialize<T>(original: T): ReadableStream<Uint8Array> {
  return ReactServer.renderToReadableStream(original, {});
}

export function deserialize<T>(
  serialized: ReadableStream<Uint8Array>,
): Promise<T> {
  return ReactClient.createFromReadableStream(serialized, {
    clientManifest,
    serverManifest,
  });
}
