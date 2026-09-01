/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export function cloneStyleTags(): Array<HTMLLinkElement | HTMLStyleElement> {
  const tags: Array<HTMLLinkElement | HTMLStyleElement> = [];

  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const linkTag of document.getElementsByTagName('link')) {
    if (linkTag.rel === 'stylesheet') {
      const newLinkTag = document.createElement('link');

      // eslint-disable-next-line no-for-of-loops/no-for-of-loops
      for (const attribute of linkTag.attributes) {
        newLinkTag.setAttribute(attribute.nodeName, attribute.nodeValue);
      }

      tags.push(newLinkTag);
    }
  }

  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const styleTag of document.getElementsByTagName('style')) {
    const newStyleTag = document.createElement('style');

    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const attribute of styleTag.attributes) {
      newStyleTag.setAttribute(attribute.nodeName, attribute.nodeValue);
    }

    newStyleTag.textContent = styleTag.textContent;

    tags.push(newStyleTag);
  }

  return tags;
}
