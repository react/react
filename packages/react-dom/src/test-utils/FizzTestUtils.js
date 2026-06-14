/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
'use strict';

async function insertNodesAndExecuteScripts(
  source: Document | Element,
  target: Node,
  CSPnonce: string | null,
) {
  const ownerDocument = target.ownerDocument || target;

  // We need to remove the script content for any scripts that would not run based on CSP
  // We restore the script content after moving the nodes into the target
  const badNonceScriptNodes: Map<Element, string> = new Map();
  if (CSPnonce) {
    const scripts = source.querySelectorAll('script');
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (
        !script.hasAttribute('src') &&
        script.getAttribute('nonce') !== CSPnonce
      ) {
        badNonceScriptNodes.set(script, script.textContent);
        script.textContent = '';
      }
    }
  }
  let lastChild = null;
  while (source.firstChild) {
    const node = source.firstChild;
    if (lastChild === node) {
      throw new Error('Infinite loop.');
    }
    lastChild = node;

    if (node.nodeType === 1) {
      const element: Element = node as any;
      if (
        // $FlowFixMe[prop-missing]
        element.dataset != null &&
        (element.dataset.rxi != null ||
          element.dataset.rri != null ||
          element.dataset.rci != null ||
          element.dataset.rsi != null)
      ) {
        // Fizz external runtime instructions are expected to be in the body.
        // When we have renderIntoContainer and renderDocument this will be
        // more enforceable. At the moment you can misconfigure your stream and end up
        // with instructions that are deep in the document
        (ownerDocument.body as any).appendChild(element);
      } else {
        target.appendChild(element);

        if (element.nodeName === 'SCRIPT') {
          await executeScript(element);
        } else {
          const scripts = element.querySelectorAll('script');
          for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            await executeScript(script);
          }
        }
      }
    } else {
      target.appendChild(node);
    }
  }

  // restore the textContent now that we have finished attempting to execute scripts
  badNonceScriptNodes.forEach((scriptContent, script) => {
    script.textContent = scriptContent;
  });
}

async function executeScript(script: Element) {
  const ownerDocument = script.ownerDocument;
  if (script.parentNode == null) {
    throw new Error(
      'executeScript expects to be called on script nodes that are currently in a document',
    );
  }
  const parent = script.parentNode;
  const scriptSrc = script.getAttribute('src');
  if (scriptSrc) {
    if (document !== ownerDocument) {
      throw new Error(
        'You must set the current document to the global document to use script src in tests',
      );
    }

    try {
      // $FlowFixMe[unsupported-syntax]
      require(scriptSrc);
    } catch (x) {
      const event = new window.ErrorEvent('error', {error: x});
      window.dispatchEvent(event);
    }
  } else {
    const newScript = ownerDocument.createElement('script');
    newScript.textContent = script.textContent;
    // make sure to add nonce back to script if it exists
    for (let i = 0; i < script.attributes.length; i++) {
      const attribute = script.attributes[i];
      newScript.setAttribute(attribute.name, attribute.value);
    }

    parent.insertBefore(newScript, script);
    parent.removeChild(script);
  }
}

function mergeOptions(options: Object, defaultOptions: Object): Object {
  return {
    ...defaultOptions,
    ...options,
  };
}

function stripExternalRuntimeInNodes(
  nodes: HTMLElement[] | HTMLCollection<HTMLElement>,
  externalRuntimeSrc: string | null,
): HTMLElement[] {
  if (!Array.isArray(nodes)) {
    nodes = Array.from(nodes);
  }
  if (externalRuntimeSrc == null) {
    return nodes;
  }
  return nodes.filter(
    n =>
      (n.tagName !== 'SCRIPT' && n.tagName !== 'script') ||
      n.getAttribute('src') !== externalRuntimeSrc,
  );
}

function getVisibleChildren(element: Element): React$Node {
  const children = [];
  let node: any = element.firstChild;
  while (node) {
    if (node.nodeType === 1) {
      if (
        ((node.tagName !== 'SCRIPT' && node.tagName !== 'script') ||
          node.hasAttribute('data-meaningful')) &&
        node.tagName !== 'TEMPLATE' &&
        node.tagName !== 'template' &&
        !node.hasAttribute('hidden') &&
        !node.hasAttribute('aria-hidden') &&
        // Ignore the render blocking expect
        (node.getAttribute('rel') !== 'expect' ||
          node.getAttribute('blocking') !== 'render')
      ) {
        const props: any = {};
        const attributes = node.attributes;
        for (let i = 0; i < attributes.length; i++) {
          if (
            attributes[i].name === 'id' &&
            attributes[i].value.includes(':')
          ) {
            // We assume this is a React added ID that's a non-visual implementation detail.
            continue;
          }
          props[attributes[i].name] = attributes[i].value;
        }
        const nestedChildren = getVisibleChildren(node);
        if (nestedChildren !== undefined) {
          props.children = nestedChildren;
        }
        children.push(
          require('react').createElement(node.tagName.toLowerCase(), props),
        );
      }
    } else if (node.nodeType === 3) {
      children.push(node.data);
    }
    node = node.nextSibling;
  }
  return children.length === 0
    ? undefined
    : children.length === 1
      ? children[0]
      : children;
}

export {
  insertNodesAndExecuteScripts,
  mergeOptions,
  stripExternalRuntimeInNodes,
  getVisibleChildren,
};
