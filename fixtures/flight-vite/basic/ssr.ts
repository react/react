// @ts-ignore
import clientReferences from 'virtual:vite-rsc/client-references';
// @ts-ignore
import assetsManifest from 'virtual:vite-rsc/assets-manifest';

import * as ReactDOM from 'react-dom';
import type {AssetDeps} from './plugin';

export {assetsManifest};

export const clientManifest = {load: loadModule};

async function loadModule(id: string) {
  if (import.meta.env.DEV) {
    const mod = await import(/* @vite-ignore */ id);
    const modCss = await import(
      /* @vite-ignore */ '/@id/__x00__virtual:vite-rsc/css/dev-ssr/' + id
    );
    return wrapResourceProxy(mod, {js: [], css: modCss.default});
  } else {
    const mod = await clientReferences[id]();
    return wrapResourceProxy(mod, assetsManifest.clientReferenceDeps[id]);
  }
}

// trigger ssr preload/preinit on module getter access (i.e. requireModule) instead of async module loading (i.e. preloadModule)
// since async module loading is cached on production.
function wrapResourceProxy(mod: any, deps: AssetDeps) {
  return new Proxy(mod, {
    get(target, p, receiver) {
      if (p in mod) {
        if (deps) {
          for (const href of deps.js) {
            ReactDOM.preloadModule(href, {
              as: 'script',
              // vite doesn't allow configuring crossorigin at the moment, so we can hard code it as well.
              // https://github.com/vitejs/vite/issues/6648
              crossOrigin: '',
            });
          }
          for (const href of deps.css) {
            ReactDOM.preinit(href, {as: 'style'});
          }
        }
      }
      return Reflect.get(target, p, receiver);
    },
  });
}

export const findSourceMapURL = undefined;
export const callServer = undefined;
