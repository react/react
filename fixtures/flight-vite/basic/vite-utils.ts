// import analysis logic copied from vite
// since there's no proper API exposed yet
// cf. https://github.com/vitejs/vite/pull/19950

import fs from 'node:fs';
import path from 'node:path';
import type {DevEnvironment, Rollup} from 'vite';

const VALID_ID_PREFIX = `/@id/`;

const NULL_BYTE_PLACEHOLDER = `__x00__`;

const FS_PREFIX = `/@fs/`;

function wrapId(id: string): string {
  return id.startsWith(VALID_ID_PREFIX)
    ? id
    : VALID_ID_PREFIX + id.replace('\0', NULL_BYTE_PLACEHOLDER);
}

// function unwrapId(id: string): string {
//   return id.startsWith(VALID_ID_PREFIX)
//     ? id.slice(VALID_ID_PREFIX.length).replace(NULL_BYTE_PLACEHOLDER, "\0")
//     : id;
// }

function withTrailingSlash(path: string): string {
  if (path[path.length - 1] !== '/') {
    return `${path}/`;
  }
  return path;
}

const postfixRE = /[?#].*$/;
function cleanUrl(url: string): string {
  return url.replace(postfixRE, '');
}

function splitFileAndPostfix(path: string): {
  file: string;
  postfix: string;
} {
  const file = cleanUrl(path);
  return {file, postfix: path.slice(file.length)};
}

const windowsSlashRE = /\\/g;
function slash(p: string): string {
  return p.replace(windowsSlashRE, '/');
}

const isWindows =
  typeof process !== 'undefined' && process.platform === 'win32';

function injectQuery(url: string, queryToInject: string): string {
  const {file, postfix} = splitFileAndPostfix(url);
  const normalizedFile = isWindows ? slash(file) : file;
  return `${normalizedFile}?${queryToInject}${postfix[0] === '?' ? `&${postfix.slice(1)}` : /* hash only */ postfix}`;
}

// function joinUrlSegments(a: string, b: string): string {
//   if (!a || !b) {
//     return a || b || "";
//   }
//   if (a.endsWith("/")) {
//     a = a.substring(0, a.length - 1);
//   }
//   if (b[0] !== "/") {
//     b = "/" + b;
//   }
//   return a + b;
// }

function normalizeResolvedIdToUrl(
  environment: DevEnvironment,
  url: string,
  resolved: Rollup.PartialResolvedId,
): string {
  const root = environment.config.root;
  const depsOptimizer = environment.depsOptimizer;

  // normalize all imports into resolved URLs
  // e.g. `import 'foo'` -> `import '/@fs/.../node_modules/foo/index.js'`
  if (resolved.id.startsWith(withTrailingSlash(root))) {
    // in root: infer short absolute path from root
    url = resolved.id.slice(root.length);
  } else if (
    depsOptimizer?.isOptimizedDepFile(resolved.id) ||
    // vite-plugin-react isn't following the leading \0 virtual module convention.
    // This is a temporary hack to avoid expensive fs checks for React apps.
    // We'll remove this as soon we're able to fix the react plugins.
    (resolved.id !== '/@react-refresh' &&
      path.isAbsolute(resolved.id) &&
      fs.existsSync(cleanUrl(resolved.id)))
  ) {
    // an optimized deps may not yet exists in the filesystem, or
    // a regular file exists but is out of root: rewrite to absolute /@fs/ paths
    url = path.posix.join(FS_PREFIX, resolved.id);
  } else {
    url = resolved.id;
  }

  // if the resolved id is not a valid browser import specifier,
  // prefix it to make it valid. We will strip this before feeding it
  // back into the transform pipeline
  if (url[0] !== '.' && url[0] !== '/') {
    url = wrapId(resolved.id);
  }

  return url;
}

export function normalizeViteImportAnalysisUrl(
  environment: DevEnvironment,
  id: string,
): string {
  let url = normalizeResolvedIdToUrl(environment, id, {id});

  // https://github.com/vitejs/vite/blob/c18ce868c4d70873406e9f7d1b2d0a03264d2168/packages/vite/src/node/plugins/importAnalysis.ts#L416
  if (environment.config.consumer === 'client') {
    const mod = environment.moduleGraph.getModuleById(id);
    if (mod && mod.lastHMRTimestamp > 0) {
      url = injectQuery(url, `t=${mod.lastHMRTimestamp}`);
    }
  }

  return url;
}
