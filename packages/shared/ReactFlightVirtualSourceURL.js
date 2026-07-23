/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Fake stack frame functions are eval:ed with a virtual sourceURL of the form
//
//   about://React/<environmentName>/<filename>?<query>
//
// where <query> is a unique index that deduplicates otherwise identical
// scripts. The filename is an arbitrary string (a file path on the server, a
// file: URL for ES modules, a webpack-internal: URL, ...) so it is escaped
// such that it can always be recovered exactly:
//
//   devirtualizeVirtualSourceURL(makeVirtualSourceURL(env, filename, query))
//     === filename
//
// for every filename. Frameworks rely on this to map a frame that crossed
// multiple Flight hops back to the original script (e.g. to look up its
// source map), so the escaping must stay bijective. It also keeps the whole
// virtual URL well-formed: a raw '#' or '?' in the filename would otherwise
// be parsed as the URL's own fragment or query by debugger frontends.

const virtualSourceURLPrefix = 'about://React/';

function escapeFilename(filename: string): string {
  // encodeURI escapes '%' (and whitespace, which would terminate the
  // //# sourceURL= comment) but passes '#' and '?' through. Escape those two
  // as well so the embedded filename contains neither.
  return encodeURI(filename).replace(/#/g, '%23').replace(/\?/g, '%3F');
}

function unescapeFilename(escaped: string): string {
  // Reverse of escapeFilename. The replaces must run before decodeURI: at
  // this point a literal '%23'/'%3F' in the original filename is still
  // encoded as '%2523'/'%253F', so these can only match our own escapes.
  // decodeURI itself never decodes '%23'/'%3F' since '#' and '?' are
  // reserved characters.
  return decodeURI(escaped.replace(/%23/g, '#').replace(/%3F/g, '?'));
}

// We use the prefix about://React/ to separate these from other files listed
// in the Chrome DevTools. We need a "host name" and not just a protocol
// because otherwise the group name becomes the root folder. Ideally we don't
// want to show these at all but there's two reasons to assign a fake URL.
// 1) A printed stack trace string needs a unique URL to be able to source map it.
// 2) If source maps are disabled or fails, you should at least be able to tell
//    which file it was.
export function makeVirtualSourceURL(
  environmentName: string,
  filename: string,
  query: string,
): string {
  return (
    virtualSourceURLPrefix +
    encodeURIComponent(environmentName) +
    '/' +
    escapeFilename(filename) +
    '?' +
    query
  );
}

export function devirtualizeSourceURL(url: string): string {
  if (url.startsWith(virtualSourceURLPrefix)) {
    // Reverse the URL back into the original filename by stripping the
    // prefix, the environment name and the query. The environment name isn't
    // returned because it's available on the parent object that contains the
    // stack.
    const envIdx = url.indexOf('/', virtualSourceURLPrefix.length);
    // escapeFilename never leaves a raw '?' in the filename, so the last '?'
    // is the one appended by makeVirtualSourceURL.
    const suffixIdx = url.lastIndexOf('?');
    if (envIdx > -1 && suffixIdx > -1) {
      return unescapeFilename(url.slice(envIdx + 1, suffixIdx));
    }
  }
  return url;
}
