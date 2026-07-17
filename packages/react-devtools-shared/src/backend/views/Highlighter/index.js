/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import Agent from 'react-devtools-shared/src/backend/agent';
import {hideOverlay, showOverlay} from './Highlighter';
import {isReactNativeEnvironment} from 'react-devtools-shared/src/backend/utils';

import type {_Window, HostInstance} from 'react-devtools-shared/src/backend/types';
import type {BackendBridge} from 'react-devtools-shared/src/bridge';
import type {RendererInterface} from '../../types';

// This plug-in provides in-page highlighting of the selected element.
// It is used by the browser extension and the standalone DevTools shell (when connected to a browser).
// It is not currently the mechanism used to highlight React Native views.
// That is done by the React Native Inspector component.

let iframesListeningTo: Set<HTMLIFrameElement> = new Set();
let inspectOnlySuspenseNodes = false;

export default function setupHighlighter(
  bridge: BackendBridge,
  agent: Agent,
  _window?: _Window,
): void {
  bridge.addListener('clearHostInstanceHighlight', clearHostInstanceHighlight);
  bridge.addListener('highlightHostInstance', highlightHostInstance);
  bridge.addListener('highlightHostInstances', highlightHostInstances);
  bridge.addListener('scrollToHostInstance', scrollToHostInstance);
  bridge.addListener('shutdown', stopInspectingHost);
  bridge.addListener('startInspectingHost', startInspectingHost);
  bridge.addListener('stopInspectingHost', stopInspectingHost);
  bridge.addListener('scrollTo', scrollDocumentTo);
  bridge.addListener('requestScrollPosition', sendScroll);

  let applyingScroll = false;

  function scrollDocumentTo({
    left,
    top,
    right,
    bottom,
  }: {
    left: number,
    top: number,
    right: number,
    bottom: number,
  }) {
    if (isReactNativeEnvironment()) {
      // Not implemented.
      return;
    }

    if (
      left === Math.round(window.scrollX) &&
      top === Math.round(window.scrollY)
    ) {
      return;
    }
    applyingScroll = true;
    window.scrollTo({
      top: top,
      left: left,
      behavior: 'smooth',
    });
  }

  let scrollTimer = null;
  function sendScroll() {
    if (isReactNativeEnvironment()) {
      // Not implemented.
      return;
    }

    if (scrollTimer) {
      clearTimeout(scrollTimer);
      scrollTimer = null;
    }
    if (applyingScroll) {
      return;
    }
    const left = window.scrollX;
    const top = window.scrollY;
    const right = left + window.innerWidth;
    const bottom = top + window.innerHeight;
    bridge.send('scrollTo', {left, top, right, bottom});
  }

  function scrollEnd() {
    // Upon scrollend send it immediately.
    sendScroll();
    applyingScroll = false;
  }

  if (
    typeof document === 'object' &&
    // $FlowFixMe[method-unbinding]
    typeof document.addEventListener === 'function'
  ) {
    document.addEventListener('scroll', () => {
      if (!scrollTimer) {
        // Periodically synchronize the scroll while scrolling.
        scrollTimer = setTimeout(sendScroll, 400);
      }
    });

    document.addEventListener('scrollend', scrollEnd);
  }

  function startInspectingHost(onlySuspenseNodes: boolean) {
    inspectOnlySuspenseNodes = onlySuspenseNodes;
    registerListenersOnWindow(window);
  }

  function registerListenersOnWindow(targetWindow: any) {
    // Use original window methods if captured (to avoid overrides from app code).
    const addEventListener =
      _window != null && targetWindow === window
        ? _window.addEventListener
        : targetWindow?.addEventListener;
    if (typeof addEventListener === 'function') {
      addEventListener('click', onClick, true);
      addEventListener('mousedown', onMouseEvent, true);
      addEventListener('mouseover', onMouseEvent, true);
      addEventListener('mouseup', onMouseEvent, true);
      addEventListener('pointerdown', onPointerDown, true);
      addEventListener('pointermove', onPointerMove, true);
      addEventListener('pointerup', onPointerUp, true);
    } else {
      agent.emit('startInspectingNative');
    }
  }

  function stopInspectingHost() {
    hideOverlay(agent);
    removeListenersOnWindow(window);
    iframesListeningTo.forEach(function (frame) {
      try {
        removeListenersOnWindow(frame.contentWindow);
      } catch (error) {
        // This can error when the iframe is on a cross-origin.
      }
    });
    iframesListeningTo = new Set();
  }

  function removeListenersOnWindow(targetWindow: any) {
    // Use original window methods if captured (to avoid overrides from app code).
    const removeEventListener =
      _window != null && targetWindow === window
        ? _window.removeEventListener
        : targetWindow?.removeEventListener;
    if (typeof removeEventListener === 'function') {
      removeEventListener('click', onClick, true);
      removeEventListener('mousedown', onMouseEvent, true);
      removeEventListener('mouseover', onMouseEvent, true);
      removeEventListener('mouseup', onMouseEvent, true);
      removeEventListener('pointerdown', onPointerDown, true);
      removeEventListener('pointermove', onPointerMove, true);
      removeEventListener('pointerup', onPointerUp, true);
    } else {
      agent.emit('stopInspectingNative');
    }
  }

  function clearHostInstanceHighlight() {
    hideOverlay(agent);
  }

  function highlightHostInstance({
    displayName,
    hideAfterTimeout,
    id,
    openBuiltinElementsPanel,
    rendererID,
    scrollIntoView,
  }: {
    displayName: string | null,
    hideAfterTimeout: boolean,
    id: number,
    openBuiltinElementsPanel: boolean,
    rendererID: number,
    scrollIntoView: boolean,
    ...
  }) {
    const renderer = agent.rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);

      hideOverlay(agent);
      return;
    }

    // In some cases fiber may already be unmounted
    if (!renderer.hasElementWithId(id)) {
      hideOverlay(agent);
      return;
    }

    const nodes = renderer.findHostInstancesForElementID(id);
    if (nodes != null) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node === null) {
          continue;
        }
        const nodeRects =
          // $FlowFixMe[method-unbinding]
          typeof node.getClientRects === 'function'
            ? node.getClientRects()
            : [];
        if (
          typeof node.getClientRects === 'undefined' || // If Host doesn't implement getClientRects, try to show the overlay.
          (nodeRects.length > 0 && //                      If this is currently display: none, then try another node.
            (nodeRects.length > 2 || //                    This can happen when one of the host instances is a hoistable.
              nodeRects[0].width > 0 ||
              nodeRects[0].height > 0))
        ) {
          // $FlowFixMe[method-unbinding]
          if (scrollIntoView && typeof node.scrollIntoView === 'function') {
            if (scrollDelayTimer) {
              clearTimeout(scrollDelayTimer);
              scrollDelayTimer = null;
            }
            // If the node isn't visible show it before highlighting it.
            // We may want to reconsider this; it might be a little disruptive.
            node.scrollIntoView({block: 'nearest', inline: 'nearest'});
          }

          showOverlay(nodes, displayName, agent, hideAfterTimeout);

          if (openBuiltinElementsPanel) {
            window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$0 = node;
            bridge.send('syncSelectionToBuiltinElementsPanel');
          }
          return;
        }
      }
    }

    hideOverlay(agent);
  }

  function highlightHostInstances({
    displayName,
    hideAfterTimeout,
    elements,
    scrollIntoView,
  }: {
    displayName: string | null,
    hideAfterTimeout: boolean,
    elements: Array<{rendererID: number, id: number}>,
    scrollIntoView: boolean,
  }) {
    const nodes: Array<HostInstance> = [];
    for (let i = 0; i < elements.length; i++) {
      const {id, rendererID} = elements[i];
      const renderer = agent.rendererInterfaces[rendererID];
      if (renderer == null) {
        console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
        continue;
      }

      // In some cases fiber may already be unmounted
      if (!renderer.hasElementWithId(id)) {
        continue;
      }

      const hostInstances = renderer.findHostInstancesForElementID(id);
      if (hostInstances !== null) {
        for (let j = 0; j < hostInstances.length; j++) {
          nodes.push(hostInstances[j]);
        }
      }
    }

    if (nodes.length > 0) {
      const node = nodes[0];
      // $FlowFixMe[method-unbinding]
      if (scrollIntoView && typeof node.scrollIntoView === 'function') {
        // If the node isn't visible show it before highlighting it.
        // We may want to reconsider this; it might be a little disruptive.
        node.scrollIntoView({block: 'nearest', inline: 'nearest'});
      }
    }

    showOverlay(nodes, displayName, agent, hideAfterTimeout);
  }

  function attemptScrollToHostInstance(
    renderer: RendererInterface,
    id: number,
  ) {
    const nodes = renderer.findHostInstancesForElementID(id);
    if (nodes != null) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node === null) {
          continue;
        }
        const nodeRects =
          // $FlowFixMe[method-unbinding]
          typeof node.getClientRects === 'function'
            ? node.getClientRects()
            : [];
        // If this is currently display: none, then try another node.
        // This can happen when one of the host instances is a hoistable.
        if (
          nodeRects.length > 0 &&
          (nodeRects.length > 2 ||
            nodeRects[0].width > 0 ||
            nodeRects[0].height > 0)
        ) {
          // $FlowFixMe[method-unbinding]
          if (typeof node.scrollIntoView === 'function') {
            node.scrollIntoView({
              block: 'nearest',
              inline: 'nearest',
              behavior: 'smooth',
            });
            return true;
          }
        }
      }
    }
    return false;
  }

  let scrollDelayTimer = null;
  function scrollToHostInstance({
    id,
    rendererID,
  }: {
    id: number,
    rendererID: number,
  }) {
    // Always hide the existing overlay so it doesn't obscure the element.
    // If you wanted to show the overlay, highlightHostInstance should be used instead
    // with the scrollIntoView option.
    hideOverlay(agent);

    if (isReactNativeEnvironment()) {
      // Not implemented.
      return;
    }

    if (scrollDelayTimer) {
      clearTimeout(scrollDelayTimer);
      scrollDelayTimer = null;
    }

    const renderer = agent.rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
      return;
    }

    // In some cases fiber may already be unmounted
    if (!renderer.hasElementWithId(id)) {
      return;
    }

    if (attemptScrollToHostInstance(renderer, id)) {
      return;
    }

    // It's possible that the current state of a Suspense boundary doesn't have a position
    // in the tree. E.g. because it's not yet mounted in the state we're moving to.
    // Such as if it's in a null tree or inside another boundary's hidden state.
    // In this case we use the last known position and try to scroll to that.
    const rects = renderer.findLastKnownRectsForID(id);
    if (rects !== null && rects.length > 0) {
      let x = Infinity;
      let y = Infinity;
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        if (rect.x < x) {
          x = rect.x;
        }
        if (rect.y < y) {
          y = rect.y;
        }
      }
      const element = document.documentElement;
      if (!element) {
        return;
      }
      // Check if the target corner is already in the viewport.
      if (
        x < window.scrollX ||
        y < window.scrollY ||
        x > window.scrollX + element.clientWidth ||
        y > window.scrollY + element.clientHeight
      ) {
        window.scrollTo({
          top: y,
          left: x,
          behavior: 'smooth',
        });
      }
      // It's possible that after mount, we're able to scroll deeper once the new nodes
      // have mounted. Let's try again after mount. Ideally we'd know which commit this
      // is going to be but for now we just try after 100ms.
      scrollDelayTimer = setTimeout(() => {
        attemptScrollToHostInstance(renderer, id);
      }, 100);
    }
  }

  function onClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    stopInspectingHost();

    bridge.send('stopInspectingHost', true);
  }

  function onMouseEvent(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  function onPointerDown(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    selectElementForNode(getEventTarget(event));
  }

  let lastHoveredNode: HTMLElement | null = null;
  function onPointerMove(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const target: HTMLElement = getEventTarget(event);
    if (lastHoveredNode === target) return;
    lastHoveredNode = target;

    if (target.tagName === 'IFRAME') {
      const iframe: HTMLIFrameElement = target as any;
      try {
        if (!iframesListeningTo.has(iframe)) {
          const window = iframe.contentWindow;
          registerListenersOnWindow(window);
          iframesListeningTo.add(iframe);
        }
      } catch (error) {
        // This can error when the iframe is on a cross-origin.
      }
    }

    if (inspectOnlySuspenseNodes) {
      // For Suspense nodes we want to highlight not the actual target but the nodes
      // that are the root of the Suspense node.
      // TODO: Consider if we should just do the same for other elements because the
      // hovered node might just be one child of many in the Component.
      const match = agent.getIDForHostInstance(
        target,
        inspectOnlySuspenseNodes,
      );
      if (match !== null) {
        const renderer = agent.rendererInterfaces[match.rendererID];
        if (renderer == null) {
          console.warn(
            `Invalid renderer id "${match.rendererID}" for element "${match.id}"`,
          );
          return;
        }
        highlightHostInstance({
          displayName: renderer.getDisplayNameForElementID(match.id),
          hideAfterTimeout: false,
          id: match.id,
          openBuiltinElementsPanel: false,
          rendererID: match.rendererID,
          scrollIntoView: false,
        });
      }
    } else {
      // Don't pass the name explicitly.
      // It will be inferred from DOM tag and Fiber owner.
      showOverlay([target], null, agent, false);
    }
  }

  function onPointerUp(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  const selectElementForNode = (node: HTMLElement) => {
    const match = agent.getIDForHostInstance(node, inspectOnlySuspenseNodes);
    if (match !== null) {
      bridge.send('selectElement', match.id);
    }
  };

  function getEventTarget(event: MouseEvent): HTMLElement {
    if (event.composed) {
      return event.composedPath()[0] as any;
    }

    return event.target as any;
  }
}
