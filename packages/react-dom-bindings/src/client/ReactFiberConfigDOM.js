/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {DOMEventName} from '../events/DOMEventNames';
import type {Fiber, FiberRoot} from 'react-reconciler/src/ReactInternalTypes';
import type {
  BoundingRect,
  IntersectionObserverOptions,
  ObserveVisibleRectsCallback,
} from 'react-reconciler/src/ReactTestSelectors';
import type {ReactContext, ReactScopeInstance} from 'shared/ReactTypes';
import type {AncestorInfoDev} from './validateDOMNesting';
import type {FormStatus} from 'react-dom-bindings/src/shared/ReactDOMFormActions';
import type {
  CrossOriginEnum,
  PreloadImplOptions,
  PreloadModuleImplOptions,
  PreinitStyleOptions,
  PreinitScriptOptions,
  PreinitModuleScriptOptions,
} from 'react-dom/src/shared/ReactDOMTypes';
import type {TransitionTypes} from 'react/src/ReactTransitionType';

import {NotPending} from '../shared/ReactDOMFormActions';

import {setSrcObject} from './ReactDOMSrcObject';

import {getCurrentRootHostContainer} from 'react-reconciler/src/ReactFiberHostContext';
import {runWithFiberInDEV} from 'react-reconciler/src/ReactCurrentFiber';

import hasOwnProperty from 'shared/hasOwnProperty';
import {checkAttributeStringCoercion} from 'shared/CheckStringCoercion';
import {REACT_CONTEXT_TYPE} from 'shared/ReactSymbols';

export {
  setCurrentUpdatePriority,
  getCurrentUpdatePriority,
  resolveUpdatePriority,
} from './ReactDOMUpdatePriority';
import {
  precacheFiberNode,
  updateFiberProps,
  getFiberCurrentPropsFromNode,
  getInstanceFromNode,
  getClosestInstanceFromNode,
  getFiberFromScopeInstance,
  getInstanceFromNode as getInstanceFromNodeDOMTree,
  isContainerMarkedAsRoot,
  detachDeletedInstance,
  getResourcesFromRoot,
  isMarkedHoistable,
  markNodeAsHoistable,
  markNodeAsPendingLoad,
  clearPendingLoadOnNode,
  isNodePendingLoad,
  isOwnedInstance,
} from './ReactDOMComponentTree';
import {
  traverseFragmentInstancesAndTextInstances,
  getFragmentParentInstanceOrContainerFiber,
  getInstanceFromHostFiber,
  isFiberFollowing,
  isFiberPreceding,
  getFragmentInstanceOrTextInstanceSiblings,
  traverseFragmentInstancesAndTextInstancesDeeply,
  fiberIsPortaledIntoHost,
  isFiberContainedByFragment,
  isFragmentContainedByFiber,
} from 'react-reconciler/src/ReactFiberTreeReflection';
import {compareDocumentPositionForEmptyFragment} from 'shared/ReactDOMFragmentRefShared';

export {detachDeletedInstance};
import {hasRole} from './DOMAccessibilityRoles';
import {
  setInitialProperties,
  updateProperties,
  hydrateProperties,
  hydrateText,
  diffHydratedProperties,
  getPropsFromElement,
  diffHydratedText,
  trapClickOnNonInteractiveElement,
} from './ReactDOMComponent';
import {hydrateInput} from './ReactDOMInput';
import {hydrateTextarea} from './ReactDOMTextarea';
import {hydrateSelect} from './ReactDOMSelect';
import {getSelectionInformation, restoreSelection} from './ReactInputSelection';
import setTextContent from './setTextContent';
import {
  validateDOMNesting,
  validateTextNesting,
  updatedAncestorInfoDev,
} from './validateDOMNesting';
import {
  isEnabled as ReactBrowserEventEmitterIsEnabled,
  setEnabled as ReactBrowserEventEmitterSetEnabled,
} from '../events/ReactDOMEventListener';
import {SVG_NAMESPACE, MATH_NAMESPACE} from './DOMNamespaces';
import {
  ELEMENT_NODE,
  TEXT_NODE,
  COMMENT_NODE,
  DOCUMENT_NODE,
  DOCUMENT_TYPE_NODE,
  DOCUMENT_FRAGMENT_NODE,
} from './HTMLNodeType';

import {
  flushEventReplaying,
  retryIfBlockedOn,
} from '../events/ReactDOMEventReplaying';

import {
  enableCreateEventHandleAPI,
  enableScopeAPI,
  enableTrustedTypesIntegration,
  disableLegacyMode,
  enableMoveBefore,
  disableCommentsAsDOMContainers,
  enableSuspenseyImages,
  enableSrcObject,
  enableViewTransition,
  enableHydrationChangeEvent,
  enableFragmentRefsScrollIntoView,
  enableProfilerTimer,
  enableFragmentRefsInstanceHandles,
  enableFragmentRefsTextNodes,
} from 'shared/ReactFeatureFlags';
import {
  HostComponent,
  HostHoistable,
  HostText,
  HostSingleton,
} from 'react-reconciler/src/ReactWorkTags';
import {listenToAllSupportedEvents} from '../events/DOMPluginEventSystem';
import {validateLinkPropsForStyleResource} from '../shared/ReactDOMResourceValidation';
import escapeSelectorAttributeValueInsideDoubleQuotes from './escapeSelectorAttributeValueInsideDoubleQuotes';
import {flushSyncWork as flushSyncWorkOnAllRoots} from 'react-reconciler/src/ReactFiberWorkLoop';
import {requestFormReset as requestFormResetOnFiber} from 'react-reconciler/src/ReactFiberHooks';

import ReactDOMSharedInternals from 'shared/ReactDOMSharedInternals';

export {default as rendererVersion} from 'shared/ReactVersion';

import noop from 'shared/noop';
import estimateBandwidth from './estimateBandwidth';

export const rendererPackageName = 'react-dom';
export const extraDevToolsConfig = null;

export type Type = string;
export type Props = {
  autoFocus?: boolean,
  children?: mixed,
  disabled?: boolean,
  hidden?: boolean,
  suppressHydrationWarning?: boolean,
  dangerouslySetInnerHTML?: mixed,
  style?: {
    display?: string,
    viewTransitionName?: string,
    'view-transition-name'?: string,
    viewTransitionClass?: string,
    'view-transition-class'?: string,
    margin?: string,
    marginTop?: string,
    'margin-top'?: string,
    marginBottom?: string,
    'margin-bottom'?: string,
    ...
  },
  bottom?: null | number,
  left?: null | number,
  right?: null | number,
  top?: null | number,
  is?: string,
  size?: number,
  value?: string,
  defaultValue?: string,
  checked?: boolean,
  defaultChecked?: boolean,
  multiple?: boolean,
  type?: string,
  src?: string | Blob | MediaSource | MediaStream, // TODO: Response
  srcSet?: string,
  loading?: 'eager' | 'lazy',
  onLoad?: (event: any) => void,
  ...
};
type RawProps = {
  [string]: mixed,
};
export type EventTargetChildElement = {
  type: string,
  props: null | {
    style?: {
      position?: string,
      zIndex?: number,
      bottom?: string,
      left?: string,
      right?: string,
      top?: string,
      ...
    },
    ...
  },
  ...
};

export type Container =
  | interface extends Element {_reactRootContainer?: FiberRoot}
  | interface extends Document {_reactRootContainer?: FiberRoot}
  | interface extends DocumentFragment {_reactRootContainer?: FiberRoot};
export type Instance = Element;
export type TextInstance = Text;

type InstanceWithFragmentHandles = Instance & {
  reactFragments?: Set<FragmentInstanceType>,
};
type HostNodeWithFragmentHandles = (Instance | TextInstance) & {
  reactFragments?: Set<FragmentInstanceType>,
};

declare class ActivityInterface extends Comment {}
declare class SuspenseInterface extends Comment {
  _reactRetry: void | (() => void);
}

export type ActivityInstance = ActivityInterface;
export type SuspenseInstance = SuspenseInterface;

type FormStateMarkerInstance = Comment;
export type HydratableInstance =
  | Instance
  | TextInstance
  | ActivityInstance
  | SuspenseInstance
  | FormStateMarkerInstance;
export type PublicInstance = Element | Text;
export type HostContextDev = {
  context: HostContextProd,
  ancestorInfo: AncestorInfoDev,
};
type HostContextProd = HostContextNamespace;
export type HostContext = HostContextDev | HostContextProd;
export type UpdatePayload = Array<mixed>;
export type ChildSet = void; // Unused
export type TimeoutHandle = TimeoutID;
export type NoTimeout = -1;
export type RendererInspectionConfig = $ReadOnly<{}>;

export type TransitionStatus = FormStatus;

export type ViewTransitionInstance = {
  name: string,
  group: mixin$Animatable,
  imagePair: mixin$Animatable,
  old: mixin$Animatable,
  new: mixin$Animatable,
};

type SelectionInformation = {
  focusedElem: null | HTMLElement,
  selectionRange: mixed,
};

const SUPPRESS_HYDRATION_WARNING = 'suppressHydrationWarning';

const ACTIVITY_START_DATA = '&';
const ACTIVITY_END_DATA = '/&';
const SUSPENSE_START_DATA = '$';
const SUSPENSE_END_DATA = '/$';
const SUSPENSE_PENDING_START_DATA = '$?';
const SUSPENSE_QUEUED_START_DATA = '$~';
const SUSPENSE_FALLBACK_START_DATA = '$!';
const PREAMBLE_CONTRIBUTION_HTML = 'html';
const PREAMBLE_CONTRIBUTION_BODY = 'body';
const PREAMBLE_CONTRIBUTION_HEAD = 'head';
const FORM_STATE_IS_MATCHING = 'F!';
const FORM_STATE_IS_NOT_MATCHING = 'F';

const DOCUMENT_READY_STATE_LOADING = 'loading';

const STYLE = 'style';

opaque type HostContextNamespace = 0 | 1 | 2;
export const HostContextNamespaceNone: HostContextNamespace = 0;
const HostContextNamespaceSvg: HostContextNamespace = 1;
const HostContextNamespaceMath: HostContextNamespace = 2;

let eventsEnabled: ?boolean = null;
let selectionInformation: null | SelectionInformation = null;

export * from 'react-reconciler/src/ReactFiberConfigWithNoPersistence';

function getOwnerDocumentFromRootContainer(
  rootContainerElement: Element | Document | DocumentFragment,
): Document {
  return rootContainerElement.nodeType === DOCUMENT_NODE
    ? (rootContainerElement as any)
    : rootContainerElement.ownerDocument;
}

export function getRootHostContext(
  rootContainerInstance: Container,
): HostContext {
  let type;
  let context: HostContextProd;
  const nodeType = rootContainerInstance.nodeType;
  switch (nodeType) {
    case DOCUMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE: {
      type = nodeType === DOCUMENT_NODE ? '#document' : '#fragment';
      const root = (rootContainerInstance as any).documentElement;
      if (root) {
        const namespaceURI = root.namespaceURI;
        context = namespaceURI
          ? getOwnHostContext(namespaceURI)
          : HostContextNamespaceNone;
      } else {
        context = HostContextNamespaceNone;
      }
      break;
    }
    default: {
      const container: any =
        !disableCommentsAsDOMContainers && nodeType === COMMENT_NODE
          ? rootContainerInstance.parentNode
          : rootContainerInstance;
      type = container.tagName;
      const namespaceURI = container.namespaceURI;
      if (!namespaceURI) {
        switch (type) {
          case 'svg':
            context = HostContextNamespaceSvg;
            break;
          case 'math':
            context = HostContextNamespaceMath;
            break;
          default:
            context = HostContextNamespaceNone;
            break;
        }
      } else {
        const ownContext = getOwnHostContext(namespaceURI);
        context = getChildHostContextProd(ownContext, type);
      }
      break;
    }
  }
  if (__DEV__) {
    const validatedTag = type.toLowerCase();
    const ancestorInfo = updatedAncestorInfoDev(null, validatedTag);
    return {context, ancestorInfo};
  }
  return context;
}

function getOwnHostContext(namespaceURI: string): HostContextNamespace {
  switch (namespaceURI) {
    case SVG_NAMESPACE:
      return HostContextNamespaceSvg;
    case MATH_NAMESPACE:
      return HostContextNamespaceMath;
    default:
      return HostContextNamespaceNone;
  }
}

function getChildHostContextProd(
  parentNamespace: HostContextNamespace,
  type: string,
): HostContextNamespace {
  if (parentNamespace === HostContextNamespaceNone) {
    // No (or default) parent namespace: potential entry point.
    switch (type) {
      case 'svg':
        return HostContextNamespaceSvg;
      case 'math':
        return HostContextNamespaceMath;
      default:
        return HostContextNamespaceNone;
    }
  }
  if (parentNamespace === HostContextNamespaceSvg && type === 'foreignObject') {
    // We're leaving SVG.
    return HostContextNamespaceNone;
  }
  // By default, pass namespace below.
  return parentNamespace;
}

export function getChildHostContext(
  parentHostContext: HostContext,
  type: string,
): HostContext {
  if (__DEV__) {
    const parentHostContextDev = parentHostContext as any as HostContextDev;
    const context = getChildHostContextProd(parentHostContextDev.context, type);
    const ancestorInfo = updatedAncestorInfoDev(
      parentHostContextDev.ancestorInfo,
      type,
    );
    return {context, ancestorInfo};
  }
  const parentNamespace = parentHostContext as any as HostContextProd;
  return getChildHostContextProd(parentNamespace, type);
}

export function getPublicInstance(instance: Instance): Instance {
  return instance;
}

export function prepareForCommit(containerInfo: Container): Object | null {
  eventsEnabled = ReactBrowserEventEmitterIsEnabled();
  selectionInformation = getSelectionInformation(containerInfo);
  let activeInstance = null;
  if (enableCreateEventHandleAPI) {
    const focusedElem = selectionInformation.focusedElem;
    if (focusedElem !== null) {
      activeInstance = getClosestInstanceFromNode(focusedElem);
    }
  }
  ReactBrowserEventEmitterSetEnabled(false);
  return activeInstance;
}

export function beforeActiveInstanceBlur(internalInstanceHandle: Object): void {
  if (enableCreateEventHandleAPI) {
    ReactBrowserEventEmitterSetEnabled(true);
    dispatchBeforeDetachedBlur(
      (selectionInformation as any).focusedElem,
      internalInstanceHandle,
    );
    ReactBrowserEventEmitterSetEnabled(false);
  }
}

export function afterActiveInstanceBlur(): void {
  if (enableCreateEventHandleAPI) {
    ReactBrowserEventEmitterSetEnabled(true);
    dispatchAfterDetachedBlur((selectionInformation as any).focusedElem);
    ReactBrowserEventEmitterSetEnabled(false);
  }
}

export function resetAfterCommit(containerInfo: Container): void {
  restoreSelection(selectionInformation, containerInfo);
  ReactBrowserEventEmitterSetEnabled(eventsEnabled);
  eventsEnabled = null;
  selectionInformation = null;
}

export function createHoistableInstance(
  type: string,
  props: Props,
  rootContainerInstance: Container,
  internalInstanceHandle: Object,
): Instance {
  const ownerDocument = getOwnerDocumentFromRootContainer(
    rootContainerInstance,
  );

  const domElement: Instance = ownerDocument.createElement(type);
  precacheFiberNode(internalInstanceHandle, domElement);
  updateFiberProps(domElement, props);
  setInitialProperties(domElement, type, props);
  markNodeAsHoistable(domElement);
  return domElement;
}

let didWarnScriptTags = false;
function isScriptDataBlock(props: Props): boolean {
  const scriptType = props.type;
  if (typeof scriptType !== 'string' || scriptType === '') {
    return false;
  }
  const lower = scriptType.toLowerCase();
  // Special non-MIME keywords recognized by the HTML spec
  // TODO: May be fine to also not warn about having these types be parsed as "parser-inserted"
  if (
    lower === 'module' ||
    lower === 'importmap' ||
    lower === 'speculationrules'
  ) {
    return false;
  }
  // JavaScript MIME types per https://mimesniff.spec.whatwg.org/#javascript-mime-type
  switch (lower) {
    case 'application/ecmascript':
    case 'application/javascript':
    case 'application/x-ecmascript':
    case 'application/x-javascript':
    case 'text/ecmascript':
    case 'text/javascript':
    case 'text/javascript1.0':
    case 'text/javascript1.1':
    case 'text/javascript1.2':
    case 'text/javascript1.3':
    case 'text/javascript1.4':
    case 'text/javascript1.5':
    case 'text/jscript':
    case 'text/livescript':
    case 'text/x-ecmascript':
    case 'text/x-javascript':
      return false;
  }
  // Any other non-empty type value means this is a data block
  return true;
}
const warnedUnknownTags: {
  [key: string]: boolean,
} = {
  // There are working polyfills for <dialog>. Let people use it.
  dialog: true,
  // Electron ships a custom <webview> tag to display external web content in
  // an isolated frame and process.
  // This tag is not present in non Electron environments such as JSDom which
  // is often used for testing purposes.
  // @see https://electronjs.org/docs/api/webview-tag
  webview: true,
};

export function createInstance(
  type: string,
  props: Props,
  rootContainerInstance: Container,
  hostContext: HostContext,
  internalInstanceHandle: Object,
): Instance {
  let hostContextProd: HostContextProd;
  if (__DEV__) {
    // TODO: take namespace into account when validating.
    const hostContextDev: HostContextDev = hostContext as any;
    validateDOMNesting(type, hostContextDev.ancestorInfo);
    hostContextProd = hostContextDev.context;
  } else {
    hostContextProd = hostContext as any;
  }

  const ownerDocument = getOwnerDocumentFromRootContainer(
    rootContainerInstance,
  );

  let domElement: Instance;
  switch (hostContextProd) {
    case HostContextNamespaceSvg:
      domElement = ownerDocument.createElementNS(SVG_NAMESPACE, type);
      break;
    case HostContextNamespaceMath:
      domElement = ownerDocument.createElementNS(MATH_NAMESPACE, type);
      break;
    default:
      switch (type) {
        case 'svg': {
          domElement = ownerDocument.createElementNS(SVG_NAMESPACE, type);
          break;
        }
        case 'math': {
          domElement = ownerDocument.createElementNS(MATH_NAMESPACE, type);
          break;
        }
        case 'script': {
          // Create the script via .innerHTML so its "parser-inserted" flag is
          // set to true and it does not execute
          const div = ownerDocument.createElement('div');
          if (__DEV__) {
            if (
              enableTrustedTypesIntegration &&
              !didWarnScriptTags &&
              // Data block scripts are not executed by UAs anyway so
              // we don't need to warn: https://html.spec.whatwg.org/multipage/scripting.html#attr-script-type
              !isScriptDataBlock(props)
            ) {
              console.error(
                'Encountered a script tag while rendering React component. ' +
                  'Scripts inside React components are never executed when rendering ' +
                  'on the client. Consider using template tag instead ' +
                  '(https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template).',
              );
              didWarnScriptTags = true;
            }
          }
          div.innerHTML = '<script><' + '/script>';
          // This is guaranteed to yield a script element.
          const firstChild = div.firstChild as any as HTMLScriptElement;
          domElement = div.removeChild(firstChild);
          break;
        }
        case 'select': {
          if (typeof props.is === 'string') {
            domElement = ownerDocument.createElement('select', {is: props.is});
          } else {
            // Separate else branch instead of using `props.is || undefined` above because of a Firefox bug.
            // See discussion in https://github.com/facebook/react/pull/6896
            // and discussion in https://bugzilla.mozilla.org/show_bug.cgi?id=1276240
            domElement = ownerDocument.createElement('select');
          }
          if (props.multiple) {
            domElement.multiple = true;
          } else if (props.size) {
            // Setting a size greater than 1 causes a select to behave like `multiple=true`, where
            // it is possible that no option is selected.
            //
            // This is only necessary when a select in "single selection mode".
            domElement.size = props.size;
          }
          break;
        }
        default: {
          if (typeof props.is === 'string') {
            domElement = ownerDocument.createElement(type, {is: props.is});
          } else {
            // Separate else branch instead of using `props.is || undefined` above because of a Firefox bug.
            // See discussion in https://github.com/facebook/react/pull/6896
            // and discussion in https://bugzilla.mozilla.org/show_bug.cgi?id=1276240
            domElement = ownerDocument.createElement(type);
          }

          if (__DEV__) {
            if (type.indexOf('-') === -1) {
              // We're not SVG/MathML and we don't have a dash, so we're not a custom element
              // Even if you use `is`, these should be of known type and lower case.
              if (type !== type.toLowerCase()) {
                console.error(
                  '<%s /> is using incorrect casing. ' +
                    'Use PascalCase for React components, ' +
                    'or lowercase for HTML elements.',
                  type,
                );
              }
              if (
                // $FlowFixMe[method-unbinding]
                Object.prototype.toString.call(domElement) ===
                  '[object HTMLUnknownElement]' &&
                !hasOwnProperty.call(warnedUnknownTags, type)
              ) {
                warnedUnknownTags[type] = true;
                console.error(
                  'The tag <%s> is unrecognized in this browser. ' +
                    'If you meant to render a React component, start its name with ' +
                    'an uppercase letter.',
                  type,
                );
              }
            }
          }
        }
      }
  }
  precacheFiberNode(internalInstanceHandle, domElement);
  updateFiberProps(domElement, props);
  return domElement;
}

let didWarnForClone = false;

export function cloneMutableInstance(
  instance: Instance,
  keepChildren: boolean,
): Instance {
  if (__DEV__) {
    // Warn for problematic
    const tagName = instance.tagName;
    switch (tagName) {
      case 'VIDEO':
      case 'IFRAME':
        if (!didWarnForClone) {
          didWarnForClone = true;
          // TODO: Once we have the ability to avoid cloning the root, suggest an absolutely
          // positioned ViewTransition instead as the solution.
          console.warn(
            'startGestureTransition() required cloning a <%s> element since it exists in ' +
              'both states of the gesture. This can be problematic since it will load it twice ' +
              'Try removing or hiding it with <Activity mode="offscreen"> in the optimistic state.',
            tagName.toLowerCase(),
          );
        }
        break;
    }
  }
  return instance.cloneNode(keepChildren);
}

export function appendInitialChild(
  parentInstance: Instance,
  child: Instance | TextInstance,
): void {
  // Note: This should not use moveBefore() because initial are appended while disconnected.
  parentInstance.appendChild(child);
}

export function finalizeInitialChildren(
  domElement: Instance,
  type: string,
  props: Props,
  hostContext: HostContext,
): boolean {
  setInitialProperties(domElement, type, props);
  switch (type) {
    case 'button':
    case 'input':
    case 'select':
    case 'textarea':
      return !!props.autoFocus;
    case 'img':
      return true;
    default:
      return false;
  }
}

export function finalizeHydratedChildren(
  domElement: Instance,
  type: string,
  props: Props,
  hostContext: HostContext,
): boolean {
  // TOOD: Consider unifying this with hydrateInstance.
  if (!enableHydrationChangeEvent) {
    return false;
  }
  switch (type) {
    case 'input':
    case 'select':
    case 'textarea':
    case 'img':
      return true;
    default:
      return false;
  }
}

export function shouldSetTextContent(type: string, props: Props): boolean {
  return (
    type === 'textarea' ||
    type === 'noscript' ||
    typeof props.children === 'string' ||
    typeof props.children === 'number' ||
    typeof props.children === 'bigint' ||
    (typeof props.dangerouslySetInnerHTML === 'object' &&
      props.dangerouslySetInnerHTML !== null &&
      props.dangerouslySetInnerHTML.__html != null)
  );
}

export function createTextInstance(
  text: string,
  rootContainerInstance: Container,
  hostContext: HostContext,
  internalInstanceHandle: Object,
): TextInstance {
  if (__DEV__) {
    const hostContextDev = hostContext as any as HostContextDev;
    const ancestor = hostContextDev.ancestorInfo.current;
    if (ancestor != null) {
      validateTextNesting(
        text,
        ancestor.tag,
        hostContextDev.ancestorInfo.implicitRootScope,
      );
    }
  }
  const textNode: TextInstance = getOwnerDocumentFromRootContainer(
    rootContainerInstance,
  ).createTextNode(text);
  precacheFiberNode(internalInstanceHandle, textNode);
  return textNode;
}

export function cloneMutableTextInstance(
  textInstance: TextInstance,
): TextInstance {
  return textInstance.cloneNode(false);
}

let currentPopstateTransitionEvent: Event | null = null;
export function shouldAttemptEagerTransition(): boolean {
  const event = window.event;
  if (event && event.type === 'popstate') {
    // This is a popstate event. Attempt to render any transition during this
    // event synchronously. Unless we already attempted during this event.
    if (event === currentPopstateTransitionEvent) {
      // We already attempted to render this popstate transition synchronously.
      // Any subsequent attempts must have happened as the result of a derived
      // update, like startTransition inside useEffect, or useDV. Switch back to
      // the default behavior for all remaining transitions during the current
      // popstate event.
      return false;
    } else {
      // Cache the current event in case a derived transition is scheduled.
      // (Refer to previous branch.)
      currentPopstateTransitionEvent = event;
      return true;
    }
  }
  // We're not inside a popstate event.
  currentPopstateTransitionEvent = null;
  return false;
}

let schedulerEvent: void | Event = undefined;
export function trackSchedulerEvent(): void {
  schedulerEvent = window.event;
}

export function resolveEventType(): null | string {
  const event = window.event;
  return event && event !== schedulerEvent ? event.type : null;
}

export function resolveEventTimeStamp(): number {
  const event = window.event;
  return event && event !== schedulerEvent ? event.timeStamp : -1.1;
}

export const isPrimaryRenderer = true;
export const warnsIfNotActing = true;
// This initialization code may run even on server environments
// if a component just imports ReactDOM (e.g. for findDOMNode).
// Some environments might not have setTimeout or clearTimeout.
export const scheduleTimeout: any =
  typeof setTimeout === 'function' ? setTimeout : (undefined as any);
export const cancelTimeout: any =
  typeof clearTimeout === 'function' ? clearTimeout : (undefined as any);
export const noTimeout: -1 = -1;
const localPromise = typeof Promise === 'function' ? Promise : undefined;
const localRequestAnimationFrame =
  typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : scheduleTimeout;

export {getClosestInstanceFromNode as getInstanceFromNode};

export function preparePortalMount(portalInstance: Instance): void {
  listenToAllSupportedEvents(portalInstance);
}

export function prepareScopeUpdate(
  scopeInstance: ReactScopeInstance,
  internalInstanceHandle: Object,
): void {
  if (enableScopeAPI) {
    precacheFiberNode(internalInstanceHandle, scopeInstance);
  }
}

export function getInstanceFromScope(
  scopeInstance: ReactScopeInstance,
): null | Object {
  if (enableScopeAPI) {
    return getFiberFromScopeInstance(scopeInstance);
  }
  return null;
}

// -------------------
//     Microtasks
// -------------------
export const supportsMicrotasks = true;
export const scheduleMicrotask: any =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : typeof localPromise !== 'undefined'
      ? callback =>
          localPromise.resolve(null).then(callback).catch(handleErrorInNextTick)
      : scheduleTimeout; // TODO: Determine the best fallback here.

function handleErrorInNextTick(error: any) {
  setTimeout(() => {
    throw error;
  });
}

// -------------------
//     Mutation
// -------------------

export const supportsMutation = true;

export function commitMount(
  domElement: Instance,
  type: string,
  newProps: Props,
  internalInstanceHandle: Object,
): void {
  // Despite the naming that might imply otherwise, this method only
  // fires if there is an `Update` effect scheduled during mounting.
  // This happens if `finalizeInitialChildren` returns `true` (which it
  // does to implement the `autoFocus` attribute on the client). But
  // there are also other cases when this might happen (such as patching
  // up text content during hydration mismatch). So we'll check this again.
  switch (type) {
    case 'button':
    case 'input':
    case 'select':
    case 'textarea':
      if (newProps.autoFocus) {
        (
          domElement as any as
            | HTMLButtonElement
            | HTMLInputElement
            | HTMLSelectElement
            | HTMLTextAreaElement
        ).focus();
      }
      return;
    case 'img': {
      // The technique here is to assign the src or srcSet property to cause the browser
      // to issue a new load event. If it hasn't loaded yet it'll fire whenever the load actually completes.
      // If it has already loaded we missed it so the second load will still be the first one that executes
      // any associated onLoad props.
      // Even if we have srcSet we prefer to reassign src. The reason is that Firefox does not trigger a new
      // load event when only srcSet is assigned. Chrome will trigger a load event if either is assigned so we
      // only need to assign one. And Safari just never triggers a new load event which means this technique
      // is already a noop regardless of which properties are assigned. We should revisit if browsers update
      // this heuristic in the future.
      if (newProps.src) {
        const src = (newProps as any).src;
        if (enableSrcObject && typeof src === 'object') {
          // For object src, we can't just set the src again to the same blob URL because it might have
          // already revoked if it loaded before this. However, we can create a new blob URL and set that.
          // This is relatively cheap since the blob is already in memory but this might cause some
          // duplicated work.
          // TODO: We could maybe detect if load hasn't fired yet and if so reuse the URL.
          try {
            setSrcObject(domElement, type, src);
            return;
          } catch (x) {
            // If URL.createObjectURL() errors, it was probably some other object type
            // that should be toString:ed instead, so we just fall-through to the normal
            // path.
          }
        }
        (domElement as any as HTMLImageElement).src = src;
      } else if (newProps.srcSet) {
        (domElement as any as HTMLImageElement).srcset = (
          newProps as any
        ).srcSet;
      }
      return;
    }
  }
}

export function commitHydratedInstance(
  domElement: Instance,
  type: string,
  props: Props,
  internalInstanceHandle: Object,
): void {
  if (!enableHydrationChangeEvent) {
    return;
  }
  // This fires in the commit phase if a hydrated instance needs to do further
  // work in the commit phase. Similar to commitMount. However, this should not
  // do things that would've already happened such as set auto focus since that
  // would steal focus. It's only scheduled if finalizeHydratedChildren returns
  // true.
  switch (type) {
    case 'input': {
      hydrateInput(
        domElement,
        props.value,
        props.defaultValue,
        props.checked,
        props.defaultChecked,
      );
      break;
    }
    case 'select': {
      hydrateSelect(
        domElement,
        props.value,
        props.defaultValue,
        props.multiple,
      );
      break;
    }
    case 'textarea':
      hydrateTextarea(domElement, props.value, props.defaultValue);
      break;
    case 'img':
      // TODO: Should we replay onLoad events?
      break;
  }
}

export function commitUpdate(
  domElement: Instance,
  type: string,
  oldProps: Props,
  newProps: Props,
  internalInstanceHandle: Object,
): void {
  // Diff and update the properties.
  updateProperties(domElement, type, oldProps, newProps);

  // Update the props handle so that we know which props are the ones with
  // with current event handlers.
  updateFiberProps(domElement, newProps);
}

export function resetTextContent(domElement: Instance): void {
  setTextContent(domElement, '');
}

export function commitTextUpdate(
  textInstance: TextInstance,
  oldText: string,
  newText: string,
): void {
  textInstance.nodeValue = newText;
}

const supportsMoveBefore =
  // $FlowFixMe[prop-missing]: We're doing the feature detection here.
  enableMoveBefore &&
  typeof window !== 'undefined' &&
  typeof window.Element.prototype.moveBefore === 'function';

export function appendChild(
  parentInstance: Instance,
  child: Instance | TextInstance,
): void {
  if (supportsMoveBefore && child.parentNode !== null) {
    // $FlowFixMe[prop-missing]: We've checked this with supportsMoveBefore.
    parentInstance.moveBefore(child, null);
  } else {
    parentInstance.appendChild(child);
  }
}

function warnForReactChildrenConflict(container: Container): void {
  if (__DEV__) {
    if ((container as any).__reactWarnedAboutChildrenConflict) {
      return;
    }
    const props = getFiberCurrentPropsFromNode(container);
    if (props !== null) {
      const fiber = getInstanceFromNode(container);
      if (fiber !== null) {
        if (
          typeof props.children === 'string' ||
          typeof props.children === 'number'
        ) {
          (container as any).__reactWarnedAboutChildrenConflict = true;
          // Run the warning with the Fiber of the container for context of where the children are specified.
          // We could also maybe use the Portal. The current execution context is the child being added.
          runWithFiberInDEV(fiber, () => {
            console.error(
              'Cannot use a ref on a React element as a container to `createRoot` or `createPortal` ' +
                'if that element also sets "children" text content using React. It should be a leaf with no children. ' +
                "Otherwise it's ambiguous which children should be used.",
            );
          });
        } else if (props.dangerouslySetInnerHTML != null) {
          (container as any).__reactWarnedAboutChildrenConflict = true;
          runWithFiberInDEV(fiber, () => {
            console.error(
              'Cannot use a ref on a React element as a container to `createRoot` or `createPortal` ' +
                'if that element also sets "dangerouslySetInnerHTML" using React. It should be a leaf with no children. ' +
                "Otherwise it's ambiguous which children should be used.",
            );
          });
        }
      }
    }
  }
}

export function appendChildToContainer(
  container: Container,
  child: Instance | TextInstance,
): void {
  if (__DEV__) {
    warnForReactChildrenConflict(container);
  }
  let parentNode: DocumentFragment | Element;
  if (container.nodeType === DOCUMENT_NODE) {
    parentNode = (container as any).body;
  } else if (
    !disableCommentsAsDOMContainers &&
    container.nodeType === COMMENT_NODE
  ) {
    parentNode = container.parentNode as any;
    if (supportsMoveBefore && child.parentNode !== null) {
      // $FlowFixMe[prop-missing]: We've checked this with supportsMoveBefore.
      parentNode.moveBefore(child, container);
    } else {
      parentNode.insertBefore(child, container);
    }
    return;
  } else if (container.nodeName === 'HTML') {
    parentNode = container.ownerDocument.body as any;
  } else {
    parentNode = container as any;
  }
  if (supportsMoveBefore && child.parentNode !== null) {
    // $FlowFixMe[prop-missing]: We've checked this with supportsMoveBefore.
    parentNode.moveBefore(child, null);
  } else {
    parentNode.appendChild(child);
  }

  // This container might be used for a portal.
  // If something inside a portal is clicked, that click should bubble
  // through the React tree. However, on Mobile Safari the click would
  // never bubble through the *DOM* tree unless an ancestor with onclick
  // event exists. So we wouldn't see it and dispatch it.
  // This is why we ensure that non React root containers have inline onclick
  // defined.
  // https://github.com/facebook/react/issues/11918
  const reactRootContainer = container._reactRootContainer;
  if (
    // $FlowFixMe[invalid-compare]
    (reactRootContainer === null || reactRootContainer === undefined) &&
    parentNode.onclick === null
  ) {
    // TODO: This cast may not be sound for SVG, MathML or custom elements.
    trapClickOnNonInteractiveElement(parentNode as any as HTMLElement);
  }
}

export function insertBefore(
  parentInstance: Instance,
  child: Instance | TextInstance,
  beforeChild: Instance | TextInstance | SuspenseInstance | ActivityInstance,
): void {
  if (supportsMoveBefore && child.parentNode !== null) {
    // $FlowFixMe[prop-missing]: We've checked this with supportsMoveBefore.
    parentInstance.moveBefore(child, beforeChild);
  } else {
    parentInstance.insertBefore(child, beforeChild);
  }
}

export function insertInContainerBefore(
  container: Container,
  child: Instance | TextInstance,
  beforeChild: Instance | TextInstance | SuspenseInstance | ActivityInstance,
): void {
  if (__DEV__) {
    warnForReactChildrenConflict(container);
  }
  let parentNode: DocumentFragment | Element;
  if (container.nodeType === DOCUMENT_NODE) {
    parentNode = (container as any).body;
  } else if (
    !disableCommentsAsDOMContainers &&
    container.nodeType === COMMENT_NODE
  ) {
    parentNode = container.parentNode as any;
  } else if (container.nodeName === 'HTML') {
    parentNode = container.ownerDocument.body as any;
  } else {
    parentNode = container as any;
  }
  if (supportsMoveBefore && child.parentNode !== null) {
    // $FlowFixMe[prop-missing]: We've checked this with supportsMoveBefore.
    parentNode.moveBefore(child, beforeChild);
  } else {
    parentNode.insertBefore(child, beforeChild);
  }
}

export function isSingletonScope(type: string): boolean {
  return type === 'head';
}

function createEvent(type: DOMEventName, bubbles: boolean): Event {
  const event = document.createEvent('Event');
  event.initEvent(type as any as string, bubbles, false);
  return event;
}

function dispatchBeforeDetachedBlur(
  target: HTMLElement,
  internalInstanceHandle: Object,
): void {
  if (enableCreateEventHandleAPI) {
    const event = createEvent('beforeblur', true);
    // Dispatch "beforeblur" directly on the target,
    // so it gets picked up by the event system and
    // can propagate through the React internal tree.
    // $FlowFixMe[prop-missing]: internal field
    event._detachedInterceptFiber = internalInstanceHandle;
    target.dispatchEvent(event);
  }
}

function dispatchAfterDetachedBlur(target: HTMLElement): void {
  if (enableCreateEventHandleAPI) {
    const event = createEvent('afterblur', false);
    // So we know what was detached, make the relatedTarget the
    // detached target on the "afterblur" event.
    (event as any).relatedTarget = target;
    // Dispatch the event on the document.
    document.dispatchEvent(event);
  }
}

export function removeChild(
  parentInstance: Instance,
  child: Instance | TextInstance | SuspenseInstance | ActivityInstance,
): void {
  parentInstance.removeChild(child);
}

export function removeChildFromContainer(
  container: Container,
  child: Instance | TextInstance | SuspenseInstance | ActivityInstance,
): void {
  let parentNode: DocumentFragment | Element;
  if (container.nodeType === DOCUMENT_NODE) {
    parentNode = (container as any).body;
  } else if (
    !disableCommentsAsDOMContainers &&
    container.nodeType === COMMENT_NODE
  ) {
    parentNode = container.parentNode as any;
  } else if (container.nodeName === 'HTML') {
    parentNode = container.ownerDocument.body as any;
  } else {
    parentNode = container as any;
  }
  parentNode.removeChild(child);
}

function clearHydrationBoundary(
  parentInstance: Instance,
  hydrationInstance: SuspenseInstance | ActivityInstance,
): void {
  let node: Node = hydrationInstance;
  // Delete all nodes within this suspense boundary.
  // There might be nested nodes so we need to keep track of how
  // deep we are and only break out when we're back on top.
  let depth = 0;
  do {
    const nextNode = node.nextSibling;
    parentInstance.removeChild(node);
    if (nextNode && nextNode.nodeType === COMMENT_NODE) {
      const data = (nextNode as any).data as string;
      if (data === SUSPENSE_END_DATA || data === ACTIVITY_END_DATA) {
        if (depth === 0) {
          parentInstance.removeChild(nextNode);
          // Retry if any event replaying was blocked on this.
          retryIfBlockedOn(hydrationInstance);
          return;
        } else {
          depth--;
        }
      } else if (
        data === SUSPENSE_START_DATA ||
        data === SUSPENSE_PENDING_START_DATA ||
        data === SUSPENSE_QUEUED_START_DATA ||
        data === SUSPENSE_FALLBACK_START_DATA ||
        data === ACTIVITY_START_DATA
      ) {
        depth++;
      } else if (data === PREAMBLE_CONTRIBUTION_HTML) {
        // If a preamble contribution marker is found within the bounds of this boundary,
        // then it contributed to the html tag and we need to reset it.
        const ownerDocument = parentInstance.ownerDocument;
        const documentElement: Element = ownerDocument.documentElement as any;
        releaseSingletonInstance(documentElement);
      } else if (data === PREAMBLE_CONTRIBUTION_HEAD) {
        const ownerDocument = parentInstance.ownerDocument;
        const head: Element = ownerDocument.head as any;
        releaseSingletonInstance(head);
        // We need to clear the head because this is the only singleton that can have children that
        // were part of this boundary but are not inside this boundary.
        clearHead(head);
      } else if (data === PREAMBLE_CONTRIBUTION_BODY) {
        const ownerDocument = parentInstance.ownerDocument;
        const body: Element = ownerDocument.body as any;
        releaseSingletonInstance(body);
      }
    }
    // $FlowFixMe[incompatible-type] we bail out when we get a null
    node = nextNode;
  } while (node);
  // TODO: Warn, we didn't find the end comment boundary.
  // Retry if any event replaying was blocked on this.
  retryIfBlockedOn(hydrationInstance);
}

export function clearActivityBoundary(
  parentInstance: Instance,
  activityInstance: ActivityInstance,
): void {
  clearHydrationBoundary(parentInstance, activityInstance);
}

export function clearSuspenseBoundary(
  parentInstance: Instance,
  suspenseInstance: SuspenseInstance,
): void {
  clearHydrationBoundary(parentInstance, suspenseInstance);
}

function clearHydrationBoundaryFromContainer(
  container: Container,
  hydrationInstance: SuspenseInstance | ActivityInstance,
): void {
  let parentNode: DocumentFragment | Element;
  if (container.nodeType === DOCUMENT_NODE) {
    parentNode = (container as any).body;
  } else if (
    !disableCommentsAsDOMContainers &&
    container.nodeType === COMMENT_NODE
  ) {
    parentNode = container.parentNode as any;
  } else if (container.nodeName === 'HTML') {
    parentNode = container.ownerDocument.body as any;
  } else {
    parentNode = container as any;
  }
  clearHydrationBoundary(parentNode, hydrationInstance);
  // Retry if any event replaying was blocked on this.
  retryIfBlockedOn(container);
}

export function clearActivityBoundaryFromContainer(
  container: Container,
  activityInstance: ActivityInstance,
): void {
  clearHydrationBoundaryFromContainer(container, activityInstance);
}

export function clearSuspenseBoundaryFromContainer(
  container: Container,
  suspenseInstance: SuspenseInstance,
): void {
  clearHydrationBoundaryFromContainer(container, suspenseInstance);
}

function hideOrUnhideDehydratedBoundary(
  suspenseInstance: SuspenseInstance | ActivityInstance,
  isHidden: boolean,
) {
  let node: Node = suspenseInstance;
  // Unhide all nodes within this suspense boundary.
  let depth = 0;
  do {
    const nextNode = node.nextSibling;
    if (node.nodeType === ELEMENT_NODE) {
      const instance = node as any as HTMLElement & {_stashedDisplay?: string};
      if (isHidden) {
        instance._stashedDisplay = instance.style.display;
        instance.style.display = 'none';
      } else {
        instance.style.display = instance._stashedDisplay || '';
        if (instance.getAttribute('style') === '') {
          instance.removeAttribute('style');
        }
      }
    } else if (node.nodeType === TEXT_NODE) {
      const textNode = node as any as Text & {_stashedText?: string};
      if (isHidden) {
        textNode._stashedText = textNode.nodeValue;
        textNode.nodeValue = '';
      } else {
        textNode.nodeValue = textNode._stashedText || '';
      }
    }
    if (nextNode && nextNode.nodeType === COMMENT_NODE) {
      const data = (nextNode as any).data as string;
      if (data === SUSPENSE_END_DATA) {
        if (depth === 0) {
          return;
        } else {
          depth--;
        }
      } else if (
        data === SUSPENSE_START_DATA ||
        data === SUSPENSE_PENDING_START_DATA ||
        data === SUSPENSE_QUEUED_START_DATA ||
        data === SUSPENSE_FALLBACK_START_DATA
      ) {
        depth++;
      }
      // TODO: Should we hide preamble contribution in this case?
    }
    // $FlowFixMe[incompatible-type] we bail out when we get a null
    node = nextNode;
  } while (node);
}

export function hideDehydratedBoundary(
  suspenseInstance: SuspenseInstance,
): void {
  hideOrUnhideDehydratedBoundary(suspenseInstance, true);
}

export function hideInstance(instance: Instance): void {
  // TODO: Does this work for all element types? What about MathML? Should we
  // pass host context to this method?
  instance = instance as any as HTMLElement;
  const style = instance.style;
  // $FlowFixMe[method-unbinding]
  if (typeof style.setProperty === 'function') {
    style.setProperty('display', 'none', 'important');
  } else {
    style.display = 'none';
  }
}

export function hideTextInstance(textInstance: TextInstance): void {
  textInstance.nodeValue = '';
}

export function unhideDehydratedBoundary(
  dehydratedInstance: SuspenseInstance | ActivityInstance,
): void {
  hideOrUnhideDehydratedBoundary(dehydratedInstance, false);
}

export function unhideInstance(instance: Instance, props: Props): void {
  instance = instance as any as HTMLElement;
  const styleProp = props[STYLE];
  const display =
    styleProp !== undefined &&
    // $FlowFixMe[invalid-compare]
    styleProp !== null &&
    styleProp.hasOwnProperty('display')
      ? styleProp.display
      : null;
  instance.style.display =
    display == null || typeof display === 'boolean'
      ? ''
      : // The value would've errored already if it wasn't safe.
        // eslint-disable-next-line react-internal/safe-string-coercion
        ('' + display).trim();
}

export function unhideTextInstance(
  textInstance: TextInstance,
  text: string,
): void {
  textInstance.nodeValue = text;
}

function warnForBlockInsideInline(instance: HTMLElement) {
  if (__DEV__) {
    let nextNode = instance.firstChild;
    outer: while (nextNode != null) {
      let node: Node = nextNode;
      if (
        node.nodeType === ELEMENT_NODE &&
        getComputedStyle(node as any).display === 'block'
      ) {
        const fiber =
          getInstanceFromNode(node) || getInstanceFromNode(instance);
        runWithFiberInDEV(
          fiber,
          (parentTag: string, childTag: string) => {
            console.error(
              "You're about to start a <ViewTransition> around a display: inline " +
                'element <%s>, which itself has a display: block element <%s> inside it. ' +
                'This might trigger a bug in Safari which causes the View Transition to ' +
                'be skipped with a duplicate name error.\n' +
                'https://bugs.webkit.org/show_bug.cgi?id=290923',
              parentTag.toLocaleLowerCase(),
              childTag.toLocaleLowerCase(),
            );
          },
          instance.tagName,
          (node as any).tagName,
        );
        break;
      }
      if (node.firstChild != null) {
        nextNode = node.firstChild;
        continue;
      }
      if (node === instance) {
        break;
      }
      while (node.nextSibling == null) {
        if (node.parentNode == null || node.parentNode === instance) {
          break;
        }
        node = node.parentNode;
      }
      nextNode = node.nextSibling;
    }
  }
}

function countClientRects(rects: Array<ClientRect>): number {
  if (rects.length === 1) {
    return 1;
  }
  // Count non-zero rects.
  let count = 0;
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    if (rect.width > 0 && rect.height > 0) {
      count++;
    }
  }
  return count;
}

export function applyViewTransitionName(
  instance: Instance,
  name: string,
  className: ?string,
): void {
  instance = instance as any as HTMLElement;
  // If the name isn't valid CSS identifier, base64 encode the name instead.
  // This doesn't let you select it in custom CSS selectors but it does work in current
  // browsers.
  const escapedName =
    CSS.escape(name) !== name ? 'r-' + btoa(name).replace(/=/g, '') : name;
  // $FlowFixMe[prop-missing]
  instance.style.viewTransitionName = escapedName;
  if (className != null) {
    // $FlowFixMe[prop-missing]
    instance.style.viewTransitionClass = className;
  }
  const computedStyle = getComputedStyle(instance);
  if (computedStyle.display === 'inline') {
    // WebKit has a bug where assigning a name to display: inline elements errors
    // if they have display: block children. We try to work around this bug in the
    // simple case by converting it automatically to display: inline-block.
    // https://bugs.webkit.org/show_bug.cgi?id=290923
    const rects = instance.getClientRects();
    if (
      // $FlowFixMe[incompatible-type]
      countClientRects(rects) === 1
    ) {
      // If the instance has a single client rect, that means that it can be
      // expressed as a display: inline-block or block.
      // This will cause layout thrash but we live with it since inline view transitions
      // are unusual.
      const style = instance.style;
      // If there's literally only one rect, then it's likely on a single line like an
      // inline-block. If it's multiple rects but all but one of them are empty it's
      // likely because it's a single block that caused a line break.
      style.display = rects.length === 1 ? 'inline-block' : 'block';
      // Margin doesn't apply to inline so should be zero. However, padding top/bottom
      // applies to inline-block positioning which we can offset by setting the margin
      // to the negative padding to get it back into original position.
      style.marginTop = '-' + computedStyle.paddingTop;
      style.marginBottom = '-' + computedStyle.paddingBottom;
    } else {
      // This case cannot be easily fixed if it has blocks but it's also fine if
      // it doesn't have blocks. So we only warn in DEV about this being an issue.
      warnForBlockInsideInline(instance);
    }
  }
}

export function restoreViewTransitionName(
  instance: Instance,
  props: Props,
): void {
  instance = instance as any as HTMLElement;
  const style = instance.style;
  const styleProp = props[STYLE];
  const viewTransitionName =
    styleProp != null
      ? styleProp.hasOwnProperty('viewTransitionName')
        ? styleProp.viewTransitionName
        : styleProp.hasOwnProperty('view-transition-name')
          ? styleProp['view-transition-name']
          : null
      : null;
  // $FlowFixMe[prop-missing]
  style.viewTransitionName =
    viewTransitionName == null || typeof viewTransitionName === 'boolean'
      ? ''
      : // The value would've errored already if it wasn't safe.
        // eslint-disable-next-line react-internal/safe-string-coercion
        ('' + viewTransitionName).trim();
  const viewTransitionClass =
    styleProp != null
      ? styleProp.hasOwnProperty('viewTransitionClass')
        ? styleProp.viewTransitionClass
        : styleProp.hasOwnProperty('view-transition-class')
          ? styleProp['view-transition-class']
          : null
      : null;
  // $FlowFixMe[prop-missing]
  style.viewTransitionClass =
    viewTransitionClass == null || typeof viewTransitionClass === 'boolean'
      ? ''
      : // The value would've errored already if it wasn't safe.
        // eslint-disable-next-line react-internal/safe-string-coercion
        ('' + viewTransitionClass).trim();
  if (style.display === 'inline-block') {
    // We might have overridden the style. Reset it to what it should be.
    if (styleProp == null) {
      style.display = style.margin = '';
    } else {
      const display = styleProp.display;
      style.display =
        display == null || typeof display === 'boolean' ? '' : display;
      const margin = styleProp.margin;
      if (margin != null) {
        style.margin = margin;
      } else {
        const marginTop = styleProp.hasOwnProperty('marginTop')
          ? styleProp.marginTop
          : styleProp['margin-top'];
        style.marginTop =
          marginTop == null || typeof marginTop === 'boolean' ? '' : marginTop;
        const marginBottom = styleProp.hasOwnProperty('marginBottom')
          ? styleProp.marginBottom
          : styleProp['margin-bottom'];
        style.marginBottom =
          marginBottom == null || typeof marginBottom === 'boolean'
            ? ''
            : marginBottom;
      }
    }
  }
}

export function cancelViewTransitionName(
  instance: Instance,
  oldName: string,
  props: Props,
): void {
  // To cancel the "new" state and paint this instance as part of the parent, all we have to do
  // is remove the view-transition-name before we exit startViewTransition.
  restoreViewTransitionName(instance, props);
  // There isn't a way to cancel an "old" state but what we can do is hide it by animating it.
  // Since it is already removed from the old state of the parent, this technique only works
  // if the parent also isn't transitioning. Therefore we should only cancel the root most
  // ViewTransitions.
  const documentElement = instance.ownerDocument.documentElement;
  if (documentElement !== null) {
    documentElement.animate(
      {opacity: [0, 0], pointerEvents: ['none', 'none']},
      // $FlowFixMe[incompatible-type]
      {
        duration: 0,
        fill: 'forwards',
        pseudoElement: '::view-transition-group(' + oldName + ')',
      },
    );
  }
}

export function cancelRootViewTransitionName(rootContainer: Container): void {
  const documentElement: null | HTMLElement =
    rootContainer.nodeType === DOCUMENT_NODE
      ? (rootContainer as any).documentElement
      : rootContainer.ownerDocument.documentElement;

  if (
    !disableCommentsAsDOMContainers &&
    rootContainer.nodeType === COMMENT_NODE
  ) {
    if (__DEV__) {
      console.warn(
        'Cannot cancel root view transition on a comment node. All view transitions will be globally scoped.',
      );
    }
    return;
  }

  if (
    documentElement !== null &&
    // $FlowFixMe[prop-missing]
    documentElement.style.viewTransitionName === ''
  ) {
    // $FlowFixMe[prop-missing]
    documentElement.style.viewTransitionName = 'none';
    documentElement.animate(
      {opacity: [0, 0], pointerEvents: ['none', 'none']},
      // $FlowFixMe[incompatible-type]
      {
        duration: 0,
        fill: 'forwards',
        pseudoElement: '::view-transition-group(root)',
      },
    );
    // By default the root ::view-transition selector captures all pointer events,
    // which means nothing gets interactive. We want to let whatever is not animating
    // remain interactive during the transition. To do that, we set the size to nothing
    // so that the transition doesn't capture any clicks. We don't set pointer-events
    // on this one as that would apply to all running transitions. This lets animations
    // that are running to block clicks so that they don't end up incorrectly hitting
    // whatever is below the animation.
    documentElement.animate(
      {width: [0, 0], height: [0, 0]},
      // $FlowFixMe[incompatible-call]
      // $FlowFixMe[incompatible-type]
      {
        duration: 0,
        fill: 'forwards',
        pseudoElement: '::view-transition',
      },
    );
  }
}

export function restoreRootViewTransitionName(rootContainer: Container): void {
  let containerInstance: Instance;
  if (rootContainer.nodeType === DOCUMENT_NODE) {
    containerInstance = (rootContainer as any).body;
  } else if (rootContainer.nodeName === 'HTML') {
    containerInstance = rootContainer.ownerDocument.body as any;
  } else {
    // If the container is not the whole document, then we ideally should probably
    // clone the whole document outside of the React too.
    containerInstance = rootContainer as any;
  }
  if (
    !disableCommentsAsDOMContainers &&
    containerInstance.nodeType === COMMENT_NODE
  ) {
    return;
  }
  if (
    // $FlowFixMe[prop-missing]
    containerInstance.style.viewTransitionName === 'root'
  ) {
    // If we moved the root view transition name to the container in a gesture
    // we need to restore it now.
    containerInstance.style.viewTransitionName = '';
  }
  const documentElement: null | HTMLElement =
    containerInstance.ownerDocument.documentElement;
  if (
    documentElement !== null &&
    // $FlowFixMe[prop-missing]
    documentElement.style.viewTransitionName === 'none'
  ) {
    // $FlowFixMe[prop-missing]
    documentElement.style.viewTransitionName = '';
  }
}

function getComputedTransform(style: CSSStyleDeclaration): string {
  // Gets the merged transform of all the short hands.
  const computedStyle: any = style;
  let transform: string = computedStyle.transform;
  if (transform === 'none') {
    transform = '';
  }
  const scale: string = computedStyle.scale;
  if (scale !== 'none' && scale !== '') {
    const parts = scale.split(' ');
    transform =
      (parts.length === 3 ? 'scale3d' : 'scale') +
      '(' +
      parts.join(', ') +
      ') ' +
      transform;
  }
  const rotate: string = computedStyle.rotate;
  if (rotate !== 'none' && rotate !== '') {
    const parts = rotate.split(' ');
    if (parts.length === 1) {
      transform = 'rotate(' + parts[0] + ') ' + transform;
    } else if (parts.length === 2) {
      transform =
        'rotate' + parts[0].toUpperCase() + '(' + parts[1] + ') ' + transform;
    } else {
      transform = 'rotate3d(' + parts.join(', ') + ') ' + transform;
    }
  }
  const translate: string = computedStyle.translate;
  if (translate !== 'none' && translate !== '') {
    const parts = translate.split(' ');
    transform =
      (parts.length === 3 ? 'translate3d' : 'translate') +
      '(' +
      parts.join(', ') +
      ') ' +
      transform;
  }
  return transform;
}

function moveOutOfViewport(
  originalStyle: CSSStyleDeclaration,
  element: HTMLElement,
): void {
  // Apply a transform that safely puts the whole element outside the viewport
  // while still letting it paint its "old" state to a snapshot.
  const transform = getComputedTransform(originalStyle);
  // Clear the long form properties.
  // $FlowFixMe[prop-missing]
  element.style.translate = 'none';
  // $FlowFixMe[prop-missing]
  element.style.scale = 'none';
  // $FlowFixMe[prop-missing]
  element.style.rotate = 'none';
  // Apply a translate to move it way out of the viewport. This is applied first
  // so that it is in the coordinate space of the parent and not after applying
  // other transforms. That's why we need to merge the long form properties.
  // TODO: Ideally we'd adjust for the parent's rotate/scale. Otherwise when
  // we move back the ::view-transition-group we might overshoot or undershoot.
  element.style.transform = 'translate(-20000px, -20000px) ' + transform;
}

function moveOldFrameIntoViewport(keyframe: any): void {
  // In the resulting View Transition Animation, the first frame will be offset.
  const computedTransform: ?string = keyframe.transform;
  if (computedTransform != null) {
    let transform = computedTransform === 'none' ? '' : computedTransform;
    transform = 'translate(20000px, 20000px) ' + transform;
    keyframe.transform = transform;
  }
}

export function cloneRootViewTransitionContainer(
  rootContainer: Container,
): Instance {
  // This implies that we're not going to animate the root document but instead
  // the clone so we first clear the name of the root container.
  const documentElement: null | HTMLElement =
    rootContainer.nodeType === DOCUMENT_NODE
      ? (rootContainer as any).documentElement
      : rootContainer.ownerDocument.documentElement;
  if (
    documentElement !== null &&
    // $FlowFixMe[prop-missing]
    documentElement.style.viewTransitionName === ''
  ) {
    // $FlowFixMe[prop-missing]
    documentElement.style.viewTransitionName = 'none';
  }

  let containerInstance: HTMLElement;
  if (rootContainer.nodeType === DOCUMENT_NODE) {
    containerInstance = (rootContainer as any).body;
  } else if (rootContainer.nodeName === 'HTML') {
    containerInstance = rootContainer.ownerDocument.body as any;
  } else if (
    !disableCommentsAsDOMContainers &&
    rootContainer.nodeType === COMMENT_NODE
  ) {
    throw new Error(
      'Cannot use a startGestureTransition() with a comment node root.',
    );
  } else {
    // If the container is not the whole document, then we ideally should probably
    // clone the whole document outside of the React too.
    containerInstance = rootContainer as any;
  }

  const containerParent = containerInstance.parentNode;
  if (containerParent === null) {
    throw new Error(
      'Cannot use a startGestureTransition() on a detached root.',
    );
  }

  const clone: HTMLElement = containerInstance.cloneNode(false);

  const computedStyle = getComputedStyle(containerInstance);

  if (
    computedStyle.position === 'absolute' ||
    computedStyle.position === 'fixed'
  ) {
    // If the style is already absolute, we don't have to do anything because it'll appear
    // in the same place.
  } else {
    // Otherwise we need to absolutely position the clone in the same location as the original.
    let positionedAncestor: HTMLElement = containerParent;
    while (
      positionedAncestor.parentNode != null &&
      positionedAncestor.parentNode.nodeType !== DOCUMENT_NODE
    ) {
      if (getComputedStyle(positionedAncestor).position !== 'static') {
        break;
      }
      // $FlowFixMe[incompatible-type]: This is refined.
      positionedAncestor = positionedAncestor.parentNode;
    }

    const positionedAncestorStyle: any = positionedAncestor.style;
    const containerInstanceStyle: any = containerInstance.style;
    // Clear the transform while we're measuring since it affects the bounding client rect.
    const prevAncestorTranslate = positionedAncestorStyle.translate;
    const prevAncestorScale = positionedAncestorStyle.scale;
    const prevAncestorRotate = positionedAncestorStyle.rotate;
    const prevAncestorTransform = positionedAncestorStyle.transform;
    const prevTranslate = containerInstanceStyle.translate;
    const prevScale = containerInstanceStyle.scale;
    const prevRotate = containerInstanceStyle.rotate;
    const prevTransform = containerInstanceStyle.transform;
    positionedAncestorStyle.translate = 'none';
    positionedAncestorStyle.scale = 'none';
    positionedAncestorStyle.rotate = 'none';
    positionedAncestorStyle.transform = 'none';
    containerInstanceStyle.translate = 'none';
    containerInstanceStyle.scale = 'none';
    containerInstanceStyle.rotate = 'none';
    containerInstanceStyle.transform = 'none';

    const ancestorRect = positionedAncestor.getBoundingClientRect();
    const rect = containerInstance.getBoundingClientRect();

    const cloneStyle = clone.style;
    cloneStyle.position = 'absolute';
    cloneStyle.top = rect.top - ancestorRect.top + 'px';
    cloneStyle.left = rect.left - ancestorRect.left + 'px';
    cloneStyle.width = rect.width + 'px';
    cloneStyle.height = rect.height + 'px';
    cloneStyle.margin = '0px';
    cloneStyle.boxSizing = 'border-box';

    positionedAncestorStyle.translate = prevAncestorTranslate;
    positionedAncestorStyle.scale = prevAncestorScale;
    positionedAncestorStyle.rotate = prevAncestorRotate;
    positionedAncestorStyle.transform = prevAncestorTransform;
    containerInstanceStyle.translate = prevTranslate;
    containerInstanceStyle.scale = prevScale;
    containerInstanceStyle.rotate = prevRotate;
    containerInstanceStyle.transform = prevTransform;
  }

  // For this transition the container will act as the root. Nothing outside of it should
  // be affected anyway. This lets us transition from the cloned container to the original.
  // $FlowFixMe[prop-missing]
  clone.style.viewTransitionName = 'root';

  // Move out of the viewport so that it's still painted for the snapshot but is not visible
  // for the frame where the snapshot happens.
  moveOutOfViewport(computedStyle, clone);

  // Insert the clone after the root container as a sibling. This may inject a body
  // as the next sibling of an existing body. document.body will still point to the
  // first one and any id selectors will still find the first one. That's why it's
  // important that it's after the existing node.
  containerInstance.parentNode.insertBefore(
    clone,
    containerInstance.nextSibling,
  );

  return clone;
}

export function removeRootViewTransitionClone(
  rootContainer: Container,
  clone: Instance,
): void {
  let containerInstance: Instance;
  if (rootContainer.nodeType === DOCUMENT_NODE) {
    containerInstance = (rootContainer as any).body;
  } else if (rootContainer.nodeName === 'HTML') {
    containerInstance = rootContainer.ownerDocument.body as any;
  } else {
    // If the container is not the whole document, then we ideally should probably
    // clone the whole document outside of the React too.
    containerInstance = rootContainer as any;
  }
  const containerParent = containerInstance.parentNode;
  if (containerParent === null) {
    throw new Error(
      'Cannot use a startGestureTransition() on a detached root.',
    );
  }
  // We assume that the clone is still within the same parent.
  containerParent.removeChild(clone);

  // Now the root is on the containerInstance itself until we call restoreRootViewTransitionName.
  containerInstance.style.viewTransitionName = 'root';
}

export type InstanceMeasurement = {
  rect: ClientRect | DOMRect,
  abs: boolean, // is absolutely positioned
  clip: boolean, // is a clipping parent
  view: boolean, // is in viewport bounds
};

function createMeasurement(
  rect: ClientRect | DOMRect,
  computedStyle: CSSStyleDeclaration,
  element: Element,
): InstanceMeasurement {
  const ownerWindow = element.ownerDocument.defaultView;
  return {
    rect: rect,
    abs:
      // Absolutely positioned instances don't contribute their size to the parent.
      computedStyle.position === 'absolute' ||
      computedStyle.position === 'fixed',
    clip:
      // If a ViewTransition boundary acts as a clipping parent group we should
      // always mark it to animate if its children do so that we can clip them.
      // This doesn't actually have any effect yet until browsers implement
      // layered capture and nested view transitions.
      computedStyle.clipPath !== 'none' ||
      computedStyle.overflow !== 'visible' ||
      computedStyle.filter !== 'none' ||
      computedStyle.mask !== 'none' ||
      computedStyle.mask !== 'none' ||
      computedStyle.borderRadius !== '0px',
    view:
      // If the instance was within the bounds of the viewport. We don't care as
      // much about if it was fully occluded because then it can still pop out.
      rect.bottom >= 0 &&
      rect.right >= 0 &&
      rect.top <= ownerWindow.innerHeight &&
      rect.left <= ownerWindow.innerWidth,
  };
}

export function measureInstance(instance: Instance): InstanceMeasurement {
  const rect = instance.getBoundingClientRect();
  const computedStyle = getComputedStyle(instance);
  return createMeasurement(rect, computedStyle, instance);
}

export function measureClonedInstance(instance: Instance): InstanceMeasurement {
  const measuredRect = instance.getBoundingClientRect();
  // Adjust the DOMRect based on the translate that put it outside the viewport.
  // TODO: This might not be completely correct if the parent also has a transform.
  const rect = new DOMRect(
    measuredRect.x + 20000,
    measuredRect.y + 20000,
    measuredRect.width,
    measuredRect.height,
  );
  const computedStyle = getComputedStyle(instance);
  return createMeasurement(rect, computedStyle, instance);
}

export function wasInstanceInViewport(
  measurement: InstanceMeasurement,
): boolean {
  return measurement.view;
}

export function hasInstanceChanged(
  oldMeasurement: InstanceMeasurement,
  newMeasurement: InstanceMeasurement,
): boolean {
  // Note: This is not guaranteed from the same instance in the case that the Instance of the
  // ViewTransition swaps out but it's still the same ViewTransition instance.
  if (newMeasurement.clip) {
    // If we're a clipping parent, we always animate if any of our children do so that we can clip
    // them. This doesn't yet until browsers implement layered capture and nested view transitions.
    return true;
  }
  const oldRect = oldMeasurement.rect;
  const newRect = newMeasurement.rect;
  return (
    oldRect.y !== newRect.y ||
    oldRect.x !== newRect.x ||
    oldRect.height !== newRect.height ||
    oldRect.width !== newRect.width
  );
}

export function hasInstanceAffectedParent(
  oldMeasurement: InstanceMeasurement,
  newMeasurement: InstanceMeasurement,
): boolean {
  // Note: This is not guaranteed from the same instance in the case that the Instance of the
  // ViewTransition swaps out but it's still the same ViewTransition instance.
  // If the instance has resized, it might have affected the parent layout.
  if (newMeasurement.abs) {
    // Absolutely positioned elements don't affect the parent layout, unless they
    // previously were not absolutely positioned.
    return !oldMeasurement.abs;
  }
  const oldRect = oldMeasurement.rect;
  const newRect = newMeasurement.rect;
  return oldRect.height !== newRect.height || oldRect.width !== newRect.width;
}

// How long to wait for new fonts to load before just committing anyway.
// This freezes the screen. It needs to be short enough that it doesn't cause too much of
// an issue when it's a new load and slow, yet long enough that you have a chance to load
// it. Otherwise we wait for no reason. The assumption here is that you likely have
// either cached the font or preloaded it earlier.
// This timeout is also used for Suspensey Images when they're blocking a View Transition.
const SUSPENSEY_FONT_AND_IMAGE_TIMEOUT = 500;

function customizeViewTransitionError(
  error: Object,
  ignoreAbort: boolean,
): mixed {
  if (typeof error === 'object' && error !== null) {
    switch (error.name) {
      case 'TimeoutError': {
        // We assume that the only reason a Timeout can happen is because the Navigation
        // promise. We expect any other work to either be fast or have a timeout (fonts).
        if (__DEV__) {
          // eslint-disable-next-line react-internal/prod-error-codes
          return new Error(
            'A ViewTransition timed out because a Navigation stalled. ' +
              'This can happen if a Navigation is blocked on React itself. ' +
              "Such as if it's resolved inside useEffect. " +
              'This can be solved by moving the resolution to useLayoutEffect.',
            {cause: error},
          );
        }
        break;
      }
      case 'AbortError': {
        if (ignoreAbort) {
          return null;
        }
        if (__DEV__) {
          // eslint-disable-next-line react-internal/prod-error-codes
          return new Error(
            'A ViewTransition was aborted early. This might be because you have ' +
              'other View Transition libraries on the page and only one can run at ' +
              "a time. To avoid this, use only React's built-in <ViewTransition> " +
              'to coordinate.',
            {cause: error},
          );
        }
        break;
      }
      case 'InvalidStateError': {
        if (
          error.message ===
            'View transition was skipped because document visibility state is hidden.' ||
          error.message ===
            'Skipping view transition because document visibility state has become hidden.' ||
          error.message ===
            'Skipping view transition because viewport size changed.' ||
          // Chrome uses a generic error message instead of specific reasons. It will log a
          // more specific reason in the console but the user might not look there.
          // Some of these errors are important to surface like duplicate name errors but
          // it's too noisy for unactionable cases like the document was hidden. Therefore,
          // we hide all of them and hopefully it surfaces in another browser.
          error.message === 'Transition was aborted because of invalid state'
        ) {
          // Skip logging this. This is not considered an error.
          return null;
        }
        break;
      }
    }
  }
  return error;
}

/** @noinline */
function forceLayout(ownerDocument: Document) {
  // This function exists to trick minifiers to not remove this unused member expression.
  return (ownerDocument.documentElement as any).clientHeight;
}

function waitForImageToLoad(this: HTMLImageElement, resolve: () => void) {
  // TODO: Use decode() instead of the load event here once the fix in
  // https://issues.chromium.org/issues/420748301 has propagated fully.
  this.addEventListener('load', resolve);
  this.addEventListener('error', resolve);
}

export function startViewTransition(
  suspendedState: null | SuspendedState,
  rootContainer: Container,
  transitionTypes: null | TransitionTypes,
  mutationCallback: () => void,
  layoutCallback: () => void,
  afterMutationCallback: () => void,
  spawnedWorkCallback: () => void,
  passiveCallback: () => mixed,
  errorCallback: mixed => void,
  blockedCallback: string => void, // Profiling-only
  finishedAnimation: () => void, // Profiling-only
): null | RunningViewTransition {
  const ownerDocument: Document =
    rootContainer.nodeType === DOCUMENT_NODE
      ? (rootContainer as any)
      : rootContainer.ownerDocument;
  try {
    // $FlowFixMe[prop-missing]
    const transition = ownerDocument.startViewTransition({
      update() {
        // Note: We read the existence of a pending navigation before we apply the
        // mutations. That way we're not waiting on a navigation that we spawned
        // from this update. Only navigations that started before this commit.
        const ownerWindow = ownerDocument.defaultView;
        const pendingNavigation =
          ownerWindow.navigation && ownerWindow.navigation.transition;
        // $FlowFixMe[prop-missing]
        const previousFontLoadingStatus = ownerDocument.fonts.status;
        mutationCallback();
        const blockingPromises: Array<Promise<any>> = [];
        if (previousFontLoadingStatus === 'loaded') {
          // Force layout calculation to trigger font loading.
          forceLayout(ownerDocument);
          if (
            // $FlowFixMe[prop-missing]
            ownerDocument.fonts.status === 'loading'
          ) {
            // The mutation lead to new fonts being loaded. We should wait on them before continuing.
            // This avoids waiting for potentially unrelated fonts that were already loading before.
            // Either in an earlier transition or as part of a sync optimistic state. This doesn't
            // include preloads that happened earlier.
            blockingPromises.push(ownerDocument.fonts.ready);
          }
        }
        const blockingIndexSnapshot = blockingPromises.length;
        if (suspendedState !== null) {
          // Suspend on any images that still haven't loaded and are in the viewport.
          const suspenseyImages = suspendedState.suspenseyImages;
          let imgBytes = 0;
          for (let i = 0; i < suspenseyImages.length; i++) {
            const suspenseyImage = suspenseyImages[i];
            if (!suspenseyImage.complete) {
              const rect = suspenseyImage.getBoundingClientRect();
              const inViewport =
                rect.bottom > 0 &&
                rect.right > 0 &&
                rect.top < ownerWindow.innerHeight &&
                rect.left < ownerWindow.innerWidth;
              if (inViewport) {
                imgBytes += estimateImageBytes(suspenseyImage);
                if (imgBytes > estimatedBytesWithinLimit) {
                  // We don't think we'll be able to download all the images within
                  // the timeout. Give up. Rewind to only block on fonts, if any.
                  blockingPromises.length = blockingIndexSnapshot;
                  break;
                }
                const loadingImage = new Promise(
                  waitForImageToLoad.bind(suspenseyImage),
                );
                blockingPromises.push(loadingImage);
              }
            }
          }
        }
        if (blockingPromises.length > 0) {
          if (enableProfilerTimer) {
            const blockedReason =
              blockingIndexSnapshot > 0
                ? blockingPromises.length > blockingIndexSnapshot
                  ? 'Waiting on Fonts and Images'
                  : 'Waiting on Fonts'
                : 'Waiting on Images';
            blockedCallback(blockedReason);
          }
          const blockingReady = Promise.race([
            Promise.all(blockingPromises),
            new Promise(resolve =>
              setTimeout(resolve, SUSPENSEY_FONT_AND_IMAGE_TIMEOUT),
            ),
          ]).then(layoutCallback, layoutCallback);
          const allReady = pendingNavigation
            ? Promise.allSettled([pendingNavigation.finished, blockingReady])
            : blockingReady;
          return allReady.then(afterMutationCallback, afterMutationCallback);
        }
        layoutCallback();
        if (pendingNavigation) {
          return pendingNavigation.finished.then(
            afterMutationCallback,
            afterMutationCallback,
          );
        } else {
          afterMutationCallback();
        }
      },
      types: transitionTypes,
    });
    // $FlowFixMe[prop-missing]
    ownerDocument.__reactViewTransition = transition;

    const viewTransitionAnimations: Array<Animation> = [];

    const readyCallback = () => {
      const documentElement: Element = ownerDocument.documentElement as any;
      // Loop through all View Transition Animations.
      // $FlowFixMe[prop-missing]
      // $FlowFixMe[incompatible-type]
      const animations = documentElement.getAnimations({subtree: true});
      for (let i = 0; i < animations.length; i++) {
        const animation = animations[i];
        const effect: KeyframeEffect = animation.effect as any;
        // $FlowFixMe[prop-missing]
        const pseudoElement: ?string = effect.pseudoElement;
        if (
          pseudoElement != null &&
          pseudoElement.startsWith('::view-transition')
        ) {
          viewTransitionAnimations.push(animation);
          const keyframes = effect.getKeyframes();
          // Next, we're going to try to optimize this animation in case the auto-generated
          // width/height keyframes are unnecessary.
          let width;
          let height;
          let unchangedDimensions = true;
          for (let j = 0; j < keyframes.length; j++) {
            const keyframe = keyframes[j];
            const w = keyframe.width;
            if (width === undefined) {
              width = w;
            } else if (width !== w) {
              unchangedDimensions = false;
              break;
            }
            const h = keyframe.height;
            if (height === undefined) {
              height = h;
            } else if (height !== h) {
              unchangedDimensions = false;
              break;
            }
            // We're clearing the keyframes in case we are going to apply the optimization.
            delete keyframe.width;
            delete keyframe.height;
            if (keyframe.transform === 'none') {
              delete keyframe.transform;
            }
          }
          if (
            unchangedDimensions &&
            width !== undefined &&
            height !== undefined
          ) {
            // Replace the keyframes with ones that don't animate the width/height.
            // $FlowFixMe[incompatible-type]
            effect.setKeyframes(keyframes);
            // Read back the new animation to see what the underlying width/height of the pseudo-element was.
            const computedStyle = getComputedStyle(
              // $FlowFixMe[incompatible-type]
              effect.target,
              // $FlowFixMe[prop-missing]
              effect.pseudoElement,
            );
            if (
              computedStyle.width !== width ||
              computedStyle.height !== height
            ) {
              // Oops. Turns out that the pseudo-element had a different width/height so we need to let it
              // be overridden. Add it back.
              const first = keyframes[0];
              first.width = width;
              first.height = height;
              const last = keyframes[keyframes.length - 1];
              last.width = width;
              last.height = height;
              // $FlowFixMe[incompatible-type]
              effect.setKeyframes(keyframes);
            }
          }
        }
      }
      spawnedWorkCallback();
    };
    const handleError = (error: mixed) => {
      // $FlowFixMe[prop-missing]
      if (ownerDocument.__reactViewTransition === transition) {
        // $FlowFixMe[prop-missing]
        ownerDocument.__reactViewTransition = null;
      }
      try {
        error = customizeViewTransitionError(error, false);
        if (error !== null) {
          errorCallback(error);
        }
      } finally {
        // Continue the reset of the work.
        // If the error happened in the snapshot phase before the update callback
        // was invoked, then we need to first finish the mutation and layout phases.
        // If they're already invoked it's still safe to call them due the status check.
        mutationCallback();
        layoutCallback();
        // Skip afterMutationCallback() since we're not animating.
        spawnedWorkCallback();
        if (enableProfilerTimer) {
          finishedAnimation();
        }
      }
    };
    transition.ready.then(readyCallback, handleError);
    transition.finished.finally(() => {
      for (let i = 0; i < viewTransitionAnimations.length; i++) {
        // In Safari, we need to manually cancel all manually started animations
        // or it'll block or interfer with future transitions.
        // We can't use getAnimations() due to #35336 so we collect them in an array.
        viewTransitionAnimations[i].cancel();
      }
      // $FlowFixMe[prop-missing]
      if (ownerDocument.__reactViewTransition === transition) {
        // $FlowFixMe[prop-missing]
        ownerDocument.__reactViewTransition = null;
      }
      if (enableProfilerTimer) {
        finishedAnimation();
      }
      passiveCallback();
    });
    return transition;
  } catch (x) {
    // We use the error as feature detection.
    // The only thing that should throw is if startViewTransition is missing
    // or if it doesn't accept the object form. Other errors are async.
    // I.e. it's before the View Transitions v2 spec. We only support View
    // Transitions v2 otherwise we fallback to not animating to ensure that
    // we're not animating with the wrong animation mapped.
    // Flush remaining work synchronously.
    mutationCallback();
    layoutCallback();
    // Skip afterMutationCallback(). We don't need it since we're not animating.
    if (enableProfilerTimer) {
      finishedAnimation();
    }
    spawnedWorkCallback();
    // Skip passiveCallback(). Spawned work will schedule a task.
    return null;
  }
}

export type RunningViewTransition = {
  skipTransition(): void,
  finished: Promise<void>,
  ...
};

function mergeTranslate(translateA: ?string, translateB: ?string): string {
  if (!translateA || translateA === 'none') {
    return translateB || '';
  }
  if (!translateB || translateB === 'none') {
    // $FlowFixMe[constant-condition]
    return translateA || '';
  }
  const partsA = translateA.split(' ');
  const partsB = translateB.split(' ');
  let i;
  let result = '';
  for (i = 0; i < partsA.length && i < partsB.length; i++) {
    if (i > 0) {
      result += ' ';
    }
    result += 'calc(' + partsA[i] + ' + ' + partsB[i] + ')';
  }
  for (; i < partsA.length; i++) {
    result += ' ' + partsA[i];
  }
  for (; i < partsB.length; i++) {
    result += ' ' + partsB[i];
  }
  return result;
}

function animateGesture(
  keyframes: any,
  targetElement: Element,
  pseudoElement: string,
  timeline: GestureTimeline,
  viewTransitionAnimations: Array<Animation>,
  customTimelineCleanup: Array<() => void>,
  rangeStart: number,
  rangeEnd: number,
  moveFirstFrameIntoViewport: boolean,
  moveAllFramesIntoViewport: boolean,
) {
  let width;
  let height;
  let unchangedDimensions = true;
  for (let i = 0; i < keyframes.length; i++) {
    const keyframe = keyframes[i];
    // Delete any easing since we always apply linear easing to gestures.
    delete keyframe.easing;
    delete keyframe.computedOffset;
    const w = keyframe.width;
    if (width === undefined) {
      width = w;
    } else if (width !== w) {
      unchangedDimensions = false;
    }
    const h = keyframe.height;
    if (height === undefined) {
      height = h;
    } else if (height !== h) {
      unchangedDimensions = false;
    }
    // Chrome returns "auto" for width/height which is not a valid value to
    // animate to. Similarly, transform: "none" is actually lack of transform.
    if (keyframe.width === 'auto') {
      delete keyframe.width;
    }
    if (keyframe.height === 'auto') {
      delete keyframe.height;
    }
    if (keyframe.transform === 'none') {
      delete keyframe.transform;
    }
    if (moveAllFramesIntoViewport) {
      if (keyframe.transform == null) {
        // If a transform is not explicitly specified to override the auto
        // generated one on the pseudo element, then we need to adjust it to
        // put it back into the viewport. We don't know the offset relative to
        // the screen so instead we use the translate prop to do a relative
        // adjustment.
        // TODO: If the "transform" was manually overridden on the pseudo
        // element itself and no longer the auto generated one, then we shouldn't
        // adjust it. I'm not sure how to detect this.
        if (keyframe.translate == null || keyframe.translate === '') {
          // TODO: If there's a CSS rule targeting translate on the pseudo element
          // already we need to merge it.
          const elementTranslate: ?string = (
            getComputedStyle(targetElement, pseudoElement) as any
          ).translate;
          keyframe.translate = mergeTranslate(
            elementTranslate,
            '20000px 20000px',
          );
        } else {
          keyframe.translate = mergeTranslate(
            keyframe.translate,
            '20000px 20000px',
          );
        }
      }
    }
  }
  if (moveFirstFrameIntoViewport) {
    // If this is the generated animation that does a FLIP matrix translation
    // from the old position, we need to adjust it from the out of viewport
    // position. If this is going from old to new it only applies to first
    // keyframe. Otherwise it applies to every keyframe.
    moveOldFrameIntoViewport(keyframes[0]);
  }
  if (unchangedDimensions && width !== undefined && height !== undefined) {
    // Read the underlying width/height of the pseudo-element. The previous animation
    // should have already been cancelled so we should observe the underlying element.
    const computedStyle = getComputedStyle(targetElement, pseudoElement);
    if (computedStyle.width === width && computedStyle.height === height) {
      for (let i = 0; i < keyframes.length; i++) {
        const keyframe = keyframes[i];
        delete keyframe.width;
        delete keyframe.height;
      }
    }
  }

  // TODO: Reverse the reverse if the original direction is reverse.
  const reverse = rangeStart > rangeEnd;
  if (timeline instanceof AnimationTimeline) {
    // Native Timeline
    // $FlowFixMe[incompatible-type]
    const animation = targetElement.animate(keyframes, {
      pseudoElement: pseudoElement,
      // Set the timeline to the current gesture timeline to drive the updates.
      timeline: timeline,
      // We reset all easing functions to linear so that it feels like you
      // have direct impact on the transition and to avoid double bouncing
      // from scroll bouncing.
      easing: 'linear',
      // We fill in both direction for overscroll.
      fill: 'both', // TODO: Should we preserve the fill instead?
      // We play all gestures in reverse, except if we're in reverse direction
      // in which case we need to play it in reverse of the reverse.
      direction: reverse ? 'normal' : 'reverse',
      // Range start needs to be higher than range end. If it goes in reverse
      // we reverse the whole animation below.
      rangeStart: (reverse ? rangeEnd : rangeStart) + '%',
      rangeEnd: (reverse ? rangeStart : rangeEnd) + '%',
    });
    viewTransitionAnimations.push(animation);
  } else {
    // Custom Timeline
    // $FlowFixMe[incompatible-type]
    const animation = targetElement.animate(keyframes, {
      pseudoElement: pseudoElement,
      // We reset all easing functions to linear so that it feels like you
      // have direct impact on the transition and to avoid double bouncing
      // from scroll bouncing.
      easing: 'linear',
      // We fill in both direction for overscroll.
      fill: 'both', // TODO: Should we preserve the fill instead?
      // We play all gestures in reverse, except if we're in reverse direction
      // in which case we need to play it in reverse of the reverse.
      direction: reverse ? 'normal' : 'reverse',
      // We set the delay and duration to represent the span of the range.
      delay: reverse ? rangeEnd : rangeStart,
      duration: reverse ? rangeStart - rangeEnd : rangeEnd - rangeStart,
    });
    viewTransitionAnimations.push(animation);
    // Let the custom timeline take control of driving the animation.
    const cleanup = timeline.animate(animation);
    if (cleanup) {
      customTimelineCleanup.push(cleanup);
    }
  }
}

export function startGestureTransition(
  suspendedState: null | SuspendedState,
  rootContainer: Container,
  timeline: GestureTimeline,
  rangeStart: number,
  rangeEnd: number,
  transitionTypes: null | TransitionTypes,
  mutationCallback: () => void,
  animateCallback: () => void,
  errorCallback: mixed => void,
  finishedAnimation: () => void, // Profiling-only
): null | RunningViewTransition {
  const ownerDocument: Document =
    rootContainer.nodeType === DOCUMENT_NODE
      ? (rootContainer as any)
      : rootContainer.ownerDocument;
  try {
    // Force layout before we start the Transition. This works around a bug in Safari
    // if one of the clones end up being a stylesheet that isn't loaded or uncached.
    // https://bugs.webkit.org/show_bug.cgi?id=290146
    forceLayout(ownerDocument);
    // $FlowFixMe[prop-missing]
    const transition = ownerDocument.startViewTransition({
      update: mutationCallback,
      types: transitionTypes,
    });
    // $FlowFixMe[prop-missing]
    ownerDocument.__reactViewTransition = transition;
    const customTimelineCleanup: Array<() => void> = []; // Cleanup Animations started in a CustomTimeline
    const viewTransitionAnimations: Array<Animation> = [];
    const readyCallback = () => {
      const documentElement: Element = ownerDocument.documentElement as any;
      // Loop through all View Transition Animations.
      // $FlowFixMe[prop-missing]
      // $FlowFixMe[incompatible-type]
      const animations = documentElement.getAnimations({subtree: true});
      // First do a pass to collect all known group and new items so we can look
      // up if they exist later.
      const foundGroups: Set<string> = new Set();
      const foundNews: Set<string> = new Set();
      // Collect the longest duration of any view-transition animation including delay.
      let longestDuration = 0;
      for (let i = 0; i < animations.length; i++) {
        const effect: KeyframeEffect = animations[i].effect as any;
        // $FlowFixMe[prop-missing]
        const pseudoElement: ?string = effect.pseudoElement;
        if (pseudoElement == null) {
        } else if (
          pseudoElement.startsWith('::view-transition') &&
          effect.target === documentElement
        ) {
          const timing = effect.getTiming();
          const duration =
            // $FlowFixMe[prop-missing]
            typeof timing.duration === 'number' ? timing.duration : 0;
          // TODO: Consider interation count higher than 1.
          // $FlowFixMe[prop-missing]
          // $FlowFixMe[unsafe-addition]
          const durationWithDelay = timing.delay + duration;
          if (durationWithDelay > longestDuration) {
            longestDuration = durationWithDelay;
          }
          if (pseudoElement.startsWith('::view-transition-group')) {
            foundGroups.add(pseudoElement.slice(23));
          } else if (pseudoElement.startsWith('::view-transition-new')) {
            // TODO: This is not really a sufficient detection because if the new
            // pseudo element might exist but have animations disabled on it.
            foundNews.add(pseudoElement.slice(21));
          }
        }
      }
      const durationToRangeMultipler =
        (rangeEnd - rangeStart) / longestDuration;
      for (let i = 0; i < animations.length; i++) {
        const anim = animations[i];
        if (anim.playState !== 'running') {
          continue;
        }
        const effect: KeyframeEffect = anim.effect as any;
        // $FlowFixMe[prop-missing]
        const pseudoElement: ?string = effect.pseudoElement;
        if (
          pseudoElement != null &&
          pseudoElement.startsWith('::view-transition') &&
          effect.target === documentElement
        ) {
          // Ideally we could mutate the existing animation but unfortunately
          // the mutable APIs seem less tested and therefore are lacking or buggy.
          // Therefore we create a new animation instead.
          anim.cancel();
          let isGeneratedGroupAnim = false;
          let isExitGroupAnim = false;
          if (pseudoElement.startsWith('::view-transition-group')) {
            const groupName = pseudoElement.slice(23);
            if (foundNews.has(groupName)) {
              // If this has both "new" and "old" state we expect this to be an auto-generated
              // animation that started outside the viewport. We need to adjust this first frame
              // to be inside the viewport.
              // $FlowFixMe[prop-missing]
              const animationName: ?string = anim.animationName;
              isGeneratedGroupAnim =
                animationName != null &&
                // $FlowFixMe[prop-missing]
                animationName.startsWith('-ua-view-transition-group-anim-');
            } else {
              // If this has only an "old" state then the pseudo element will be outside
              // the viewport. If any keyframes don't override "transform" we need to
              // adjust them.
              isExitGroupAnim = true;
            }
            // TODO: If this has only an old state and no new state,
          }
          // Adjust the range based on how long the animation would've ran as time based.
          // Since we're running animations in reverse from how they normally would run,
          // therefore the timing is from the rangeEnd to the start.
          const timing = effect.getTiming();
          const duration =
            // $FlowFixMe[prop-missing]
            typeof timing.duration === 'number' ? timing.duration : 0;
          let adjustedRangeStart =
            // $FlowFixMe[unsafe-addition]
            // $FlowFixMe[prop-missing]
            rangeEnd - (duration + timing.delay) * durationToRangeMultipler;
          let adjustedRangeEnd =
            rangeEnd -
            // $FlowFixMe[prop-missing]
            // $FlowFixMe[unsafe-arithmetic]
            timing.delay * durationToRangeMultipler;
          if (
            timing.direction === 'reverse' ||
            timing.direction === 'alternate-reverse'
          ) {
            // This animation was originally in reverse so we have to play it in flipped range.
            const temp = adjustedRangeStart;
            adjustedRangeStart = adjustedRangeEnd;
            adjustedRangeEnd = temp;
          }
          animateGesture(
            effect.getKeyframes(),
            // $FlowFixMe[incompatible-type]: Always documentElement atm.
            effect.target,
            pseudoElement,
            timeline,
            viewTransitionAnimations,
            customTimelineCleanup,
            adjustedRangeStart,
            adjustedRangeEnd,
            isGeneratedGroupAnim,
            isExitGroupAnim,
          );
          if (pseudoElement.startsWith('::view-transition-old')) {
            const groupName = pseudoElement.slice(21);
            if (!foundGroups.has(groupName) && !foundNews.has(groupName)) {
              foundGroups.add(groupName);
              // We haven't seen any group animation with this name. Since the old
              // state was outside the viewport we need to put it back. Since we
              // can't programmatically target the element itself, we use an
              // animation to adjust it.
              // This usually happens for exit animations where the element has
              // the old position.
              // If we also have a "new" state then we skip this because it means
              // someone manually disabled the auto-generated animation. We need to
              // treat the old state as having the position of the "new" state which
              // will happen by default.
              const pseudoElementName = '::view-transition-group' + groupName;
              animateGesture(
                [{}, {}],
                // $FlowFixMe[incompatible-type]: Always documentElement atm.
                effect.target,
                pseudoElementName,
                timeline,
                viewTransitionAnimations,
                customTimelineCleanup,
                rangeStart,
                rangeEnd,
                false,
                true, // We let the helper apply the translate
              );
            }
          }
        }
      }
      // View Transitions with ScrollTimeline has a quirk where they end if the
      // ScrollTimeline ever reaches 100% but that doesn't mean we're done because
      // you can swipe back again. We can prevent this by adding a paused Animation
      // that never stops. This seems to keep all running Animations alive until
      // we explicitly abort (or something forces the View Transition to cancel).
      // $FlowFixMe[incompatible-call]
      // $FlowFixMe[incompatible-type]
      const blockingAnim = documentElement.animate([{}, {}], {
        pseudoElement: '::view-transition',
        duration: 1,
      });
      blockingAnim.pause();
      viewTransitionAnimations.push(blockingAnim);
      animateCallback();
    };
    // In Chrome, "new" animations are not ready in the ready callback. We have to wait
    // until requestAnimationFrame before we can observe them through getAnimations().
    // However, in Safari, that would cause a flicker because we're applying them late.
    // TODO: Think of a feature detection for this instead.
    const readyForAnimations =
      navigator.userAgent.indexOf('Chrome') !== -1
        ? () => requestAnimationFrame(readyCallback)
        : readyCallback;
    const handleError = (error: mixed) => {
      // $FlowFixMe[prop-missing]
      if (ownerDocument.__reactViewTransition === transition) {
        // $FlowFixMe[prop-missing]
        ownerDocument.__reactViewTransition = null;
      }
      try {
        error = customizeViewTransitionError(error, true);
        if (error !== null) {
          errorCallback(error);
        }
      } finally {
        // Continue the reset of the work.
        // If the error happened in the snapshot phase before the update callback
        // was invoked, then we need to first finish the mutation and layout phases.
        // If they're already invoked it's still safe to call them due the status check.
        mutationCallback();
        // Skip readyCallback() and go straight to animateCallbck() since we're not animating.
        // animateCallback() is still required to restore states.
        animateCallback();
        if (enableProfilerTimer) {
          finishedAnimation();
        }
      }
    };
    transition.ready.then(readyForAnimations, handleError);
    transition.finished.finally(() => {
      for (let i = 0; i < viewTransitionAnimations.length; i++) {
        // In Safari, we need to manually cancel all manually started animations
        // or it'll block or interfer with future transitions.
        // We can't use getAnimations() due to #35336 so we collect them in an array.
        viewTransitionAnimations[i].cancel();
      }
      for (let i = 0; i < customTimelineCleanup.length; i++) {
        const cleanup = customTimelineCleanup[i];
        cleanup();
      }
      // $FlowFixMe[prop-missing]
      if (ownerDocument.__reactViewTransition === transition) {
        // $FlowFixMe[prop-missing]
        ownerDocument.__reactViewTransition = null;
      }
      if (enableProfilerTimer) {
        // Signal that the Transition was unable to continue. We do that here
        // instead of when we stop the running View Transition to ensure that
        // we cover cases when something else stops it early.
        finishedAnimation();
      }
    });
    return transition;
  } catch (x) {
    // We use the error as feature detection.
    // The only thing that should throw is if startViewTransition is missing
    // or if it doesn't accept the object form. Other errors are async.
    // I.e. it's before the View Transitions v2 spec. We only support View
    // Transitions v2 otherwise we fallback to not animating to ensure that
    // we're not animating with the wrong animation mapped.
    // Run through the sequence to put state back into a consistent state.
    mutationCallback();
    animateCallback();
    if (enableProfilerTimer) {
      finishedAnimation();
    }
    return null;
  }
}

export function stopViewTransition(transition: RunningViewTransition) {
  transition.skipTransition();
}

export function addViewTransitionFinishedListener(
  transition: RunningViewTransition,
  callback: () => void,
) {
  transition.finished.finally(callback);
}

interface ViewTransitionPseudoElementType extends mixin$Animatable {
  _scope: HTMLElement;
  _selector: string;
  getComputedStyle(): CSSStyleDeclaration;
}

function ViewTransitionPseudoElement(
  this: ViewTransitionPseudoElementType,
  pseudo: string,
  name: string,
) {
  // TODO: Get the owner document from the root container.
  this._scope = document.documentElement as any;
  this._selector = '::view-transition-' + pseudo + '(' + name + ')';
}
// $FlowFixMe[prop-missing]
ViewTransitionPseudoElement.prototype.animate = function (
  this: ViewTransitionPseudoElementType,
  keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
  options?: number | KeyframeAnimationOptions,
): Animation {
  const opts: any =
    typeof options === 'number'
      ? {
          duration: options,
        }
      : Object.assign(
          // $FlowFixMe[prop-missing]
          // $FlowFixMe[incompatible-type]
          {} as KeyframeAnimationOptions,
          options,
        );
  opts.pseudoElement = this._selector;
  // TODO: Handle multiple child instances.
  return this._scope.animate(keyframes, opts);
};
// $FlowFixMe[prop-missing]
ViewTransitionPseudoElement.prototype.getAnimations = function (
  this: ViewTransitionPseudoElementType,
  options?: GetAnimationsOptions,
): Animation[] {
  const scope = this._scope;
  const selector = this._selector;
  const animations = scope.getAnimations(
    // $FlowFixMe[prop-missing]
    // $FlowFixMe[incompatible-type]
    {subtree: true},
  );
  const result = [];
  for (let i = 0; i < animations.length; i++) {
    const effect: null | {
      target?: Element,
      pseudoElement?: string,
      ...
    } = animations[i].effect as any;
    // TODO: Handle multiple child instances.
    if (
      effect !== null &&
      effect.target === scope &&
      effect.pseudoElement === selector
    ) {
      result.push(animations[i]);
    }
  }
  return result;
};
// $FlowFixMe[prop-missing]
ViewTransitionPseudoElement.prototype.getComputedStyle = function (
  this: ViewTransitionPseudoElementType,
): CSSStyleDeclaration {
  const scope = this._scope;
  const selector = this._selector;
  return getComputedStyle(scope, selector);
};

export function createViewTransitionInstance(
  name: string,
): ViewTransitionInstance {
  return {
    name: name,
    group: new (ViewTransitionPseudoElement as any)('group', name),
    imagePair: new (ViewTransitionPseudoElement as any)('image-pair', name),
    old: new (ViewTransitionPseudoElement as any)('old', name),
    new: new (ViewTransitionPseudoElement as any)('new', name),
  };
}

interface CustomTimeline {
  currentTime: number;
  animate(animation: Animation): void | (() => void);
}

export type GestureTimeline = AnimationTimeline | CustomTimeline;

export function getCurrentGestureOffset(timeline: GestureTimeline): number {
  const time = timeline.currentTime;
  if (time === null) {
    throw new Error(
      'Cannot start a gesture with a disconnected AnimationTimeline.',
    );
  }
  return typeof time === 'number' ? time : time.value;
}

type StoredEventListener = {
  type: string,
  listener: EventListener,
  optionsOrUseCapture: void | EventListenerOptionsOrUseCapture,
};

export type FragmentInstanceType = {
  _fragmentFiber: Fiber,
  _eventListeners: null | Array<StoredEventListener>,
  _observers: null | Set<IntersectionObserver | ResizeObserver>,
  addEventListener(
    type: string,
    listener: EventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture,
  ): void,
  removeEventListener(
    type: string,
    listener: EventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture,
  ): void,
  dispatchEvent(event: Event): boolean,
  focus(focusOptions?: FocusOptions): void,
  focusLast(focusOptions?: FocusOptions): void,
  blur(): void,
  observeUsing(observer: IntersectionObserver | ResizeObserver): void,
  unobserveUsing(observer: IntersectionObserver | ResizeObserver): void,
  getClientRects(): Array<DOMRect>,
  getRootNode(getRootNodeOptions?: {
    composed: boolean,
  }): Document | ShadowRoot | FragmentInstanceType,
  compareDocumentPosition(otherNode: Instance): number,
  scrollIntoView(alignToTop?: boolean): void,
};

function FragmentInstance(this: FragmentInstanceType, fragmentFiber: Fiber) {
  this._fragmentFiber = fragmentFiber;
  this._eventListeners = null;
  this._observers = null;
}

// $FlowFixMe[prop-missing]
FragmentInstance.prototype.addEventListener = function (
  this: FragmentInstanceType,
  type: string,
  listener: EventListener,
  optionsOrUseCapture?: EventListenerOptionsOrUseCapture,
): void {
  if (this._eventListeners === null) {
    this._eventListeners = [];
  }

  const listeners = this._eventListeners;
  // Element.addEventListener will only apply uniquely new event listeners by default. Since we
  // need to collect the listeners to apply to appended children, we track them ourselves and use
  // custom equality check for the options.
  const isNewEventListener =
    indexOfEventListener(listeners, type, listener, optionsOrUseCapture) === -1;
  if (isNewEventListener) {
    listeners.push({type, listener, optionsOrUseCapture});
    traverseFragmentInstancesAndTextInstances(
      this._fragmentFiber,
      addEventListenerToChild,
      type,
      listener,
      optionsOrUseCapture,
    );
  }
  this._eventListeners = listeners;
};
function addEventListenerToChild(
  child: Fiber,
  type: string,
  listener: EventListener,
  optionsOrUseCapture?: EventListenerOptionsOrUseCapture,
): boolean {
  const instance = getInstanceFromHostFiber<Instance | TextInstance>(child);
  instance.addEventListener(type, listener, optionsOrUseCapture);
  return false;
}
// $FlowFixMe[prop-missing]
FragmentInstance.prototype.removeEventListener = function (
  this: FragmentInstanceType,
  type: string,
  listener: EventListener,
  optionsOrUseCapture?: EventListenerOptionsOrUseCapture,
): void {
  const listeners = this._eventListeners;
  if (listeners === null) {
    return;
  }
  if (typeof listeners !== 'undefined' && listeners.length > 0) {
    traverseFragmentInstancesAndTextInstances(
      this._fragmentFiber,
      removeEventListenerFromChild,
      type,
      listener,
      optionsOrUseCapture,
    );
    const index = indexOfEventListener(
      listeners,
      type,
      listener,
      optionsOrUseCapture,
    );
    if (this._eventListeners !== null) {
      this._eventListeners.splice(index, 1);
    }
  }
};
function removeEventListenerFromChild(
  child: Fiber,
  type: string,
  listener: EventListener,
  optionsOrUseCapture?: EventListenerOptionsOrUseCapture,
): boolean {
  const instance = getInstanceFromHostFiber<Instance | TextInstance>(child);
  instance.removeEventListener(type, listener, optionsOrUseCapture);
  return false;
}
function normalizeListenerOptions(
  opts: ?EventListenerOptionsOrUseCapture,
): string {
  if (opts == null) {
    return '0';
  }

  if (typeof opts === 'boolean') {
    return `c=${opts ? '1' : '0'}`;
  }

  return `c=${opts.capture ? '1' : '0'}`;
}
function indexOfEventListener(
  eventListeners: Array<StoredEventListener>,
  type: string,
  listener: EventListener,
  optionsOrUseCapture: void | EventListenerOptionsOrUseCapture,
): number {
  if (eventListeners.length === 0) {
    return -1;
  }
  const normalizedOptions = normalizeListenerOptions(optionsOrUseCapture);
  for (let i = 0; i < eventListeners.length; i++) {
    const item = eventListeners[i];
    if (
      item.type === type &&
      item.listener === listener &&
      normalizeListenerOptions(item.optionsOrUseCapture) === normalizedOptions
    ) {
      return i;
    }
  }
  return -1;
}
// $FlowFixMe[prop-missing]
FragmentInstance.prototype.dispatchEvent = function (
  this: FragmentInstanceType,
  event: Event,
): boolean {
  const parentHostFiber = getFragmentParentInstanceOrContainerFiber(
    this._fragmentFiber,
  );
  if (parentHostFiber === null) {
    return true;
  }
  const parentHostInstance = getInstanceFromHostFiber<Instance | Container>(
    parentHostFiber,
  );
  const eventListeners = this._eventListeners;
  if (
    (eventListeners !== null && eventListeners.length > 0) ||
    !event.bubbles
  ) {
    const temp = document.createTextNode('');
    if (eventListeners) {
      for (let i = 0; i < eventListeners.length; i++) {
        const {type, listener, optionsOrUseCapture} = eventListeners[i];
        temp.addEventListener(type, listener, optionsOrUseCapture);
      }
    }
    parentHostInstance.appendChild(temp);
    const cancelable = temp.dispatchEvent(event);
    if (eventListeners) {
      for (let i = 0; i < eventListeners.length; i++) {
        const {type, listener, optionsOrUseCapture} = eventListeners[i];
        temp.removeEventListener(type, listener, optionsOrUseCapture);
      }
    }
    parentHostInstance.removeChild(temp);
    return cancelable;
  } else {
    return parentHostInstance.dispatchEvent(event);
  }
};
// $FlowFixMe[prop-missing]
FragmentInstance.prototype.focus = function (
  this: FragmentInstanceType,
  focusOptions?: FocusOptions,
): void {
  traverseFragmentInstancesAndTextInstancesDeeply(
    this._fragmentFiber,
    setFocusOnFiberIfFocusable,
    focusOptions,
  );
};
function setFocusOnFiberIfFocusable(
  fiber: Fiber,
  focusOptions?: FocusOptions,
): boolean {
  if (enableFragmentRefsTextNodes) {
    // Skip text nodes - they are not focusable
    if (fiber.tag === HostText) {
      return false;
    }
  }
  const instance = getInstanceFromHostFiber<Instance>(fiber);
  return setFocusIfFocusable(instance, focusOptions);
}
// $FlowFixMe[prop-missing]
FragmentInstance.prototype.focusLast = function (
  this: FragmentInstanceType,
  focusOptions?: FocusOptions,
): void {
  const children: Array<Fiber> = [];
  traverseFragmentInstancesAndTextInstancesDeeply(
    this._fragmentFiber,
    collectChildren,
    children,
  );
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (setFocusOnFiberIfFocusable(child, focusOptions)) {
      break;
    }
  }
};
function collectChildren(child: Fiber, collection: Array<Fiber>): boolean {
  collection.push(child);
  return false;
}
// $FlowFixMe[prop-missing]
FragmentInstance.prototype.blur = function (this: FragmentInstanceType): void {
  // Early exit if activeElement is not within the fragment's parent
  const parentHostFiber = getFragmentParentInstanceOrContainerFiber(
    this._fragmentFiber,
  );
  if (parentHostFiber === null) {
    return;
  }
  const parentInstanceOrContainer = getInstanceFromHostFiber<
    Instance | Container,
  >(parentHostFiber);
  // Instance is included in the Container type for DOM.
  const ownerDocument = getOwnerDocumentFromRootContainer(
    parentInstanceOrContainer,
  );
  const activeElement = ownerDocument.activeElement;
  if (
    activeElement === null ||
    !parentInstanceOrContainer.contains(activeElement)
  ) {
    return;
  }

  traverseFragmentInstancesAndTextInstances(
    this._fragmentFiber,
    blurActiveElementWithinFragment,
    activeElement,
  );
};
function blurActiveElementWithinFragment(
  child: Fiber,
  activeElement: Element,
): boolean {
  // Skip text nodes - they can't be focused
  if (enableFragmentRefsTextNodes && child.tag === HostText) {
    return false;
  }
  const instance = getInstanceFromHostFiber<Instance>(child);
  if (instance === activeElement) {
    // $FlowFixMe[prop-missing]
    instance.blur();
    return true;
  }
  return false;
}
// $FlowFixMe[prop-missing]
FragmentInstance.prototype.observeUsing = function (
  this: FragmentInstanceType,
  observer: IntersectionObserver | ResizeObserver,
): void {
  if (__DEV__) {
    if (enableFragmentRefsTextNodes) {
      let hasText = false;
      let hasElement = false;
      traverseFragmentInstancesAndTextInstances(
        this._fragmentFiber,
        (child: Fiber) => {
          if (child.tag === HostText) {
            hasText = true;
          } else {
            // Stop traversal, found element
            hasElement = true;
            return true;
          }
          return false;
        },
      );
      if (hasText && !hasElement) {
        console.error(
          'observeUsing() was called on a FragmentInstance with only text children. ' +
            'Observers do not work on text nodes.',
        );
      }
    }
  }
  if (this._observers === null) {
    this._observers = new Set();
  }
  this._observers.add(observer);
  traverseFragmentInstancesAndTextInstances(
    this._fragmentFiber,
    observeChild,
    observer,
  );
};
function observeChild(
  child: Fiber,
  observer: IntersectionObserver | ResizeObserver,
) {
  if (enableFragmentRefsTextNodes) {
    // Skip text nodes - observers don't work on them
    if (child.tag === HostText) {
      return false;
    }
  }
  const instance = getInstanceFromHostFiber<Instance>(child);
  observer.observe(instance);
  return false;
}
// $FlowFixMe[prop-missing]
FragmentInstance.prototype.unobserveUsing = function (
  this: FragmentInstanceType,
  observer: IntersectionObserver | ResizeObserver,
): void {
  const observers = this._observers;
  if (observers === null || !observers.has(observer)) {
    if (__DEV__) {
      console.error(
        'You are calling unobserveUsing() with an observer that is not being observed with this fragment ' +
          'instance. First attach the observer with observeUsing()',
      );
    }
  } else {
    observers.delete(observer);
    traverseFragmentInstancesAndTextInstances(
      this._fragmentFiber,
      unobserveChild,
      observer,
    );
  }
};
function unobserveChild(
  child: Fiber,
  observer: IntersectionObserver | ResizeObserver,
) {
  if (enableFragmentRefsTextNodes) {
    // Skip text nodes - they were never observed
    if (child.tag === HostText) {
      return false;
    }
  }
  const instance = getInstanceFromHostFiber<Instance>(child);
  observer.unobserve(instance);
  return false;
}
// $FlowFixMe[prop-missing]
FragmentInstance.prototype.getClientRects = function (
  this: FragmentInstanceType,
): Array<DOMRect> {
  const rects: Array<DOMRect> = [];
  traverseFragmentInstancesAndTextInstances(
    this._fragmentFiber,
    collectClientRects,
    rects,
  );
  return rects;
};
function collectClientRects(child: Fiber, rects: Array<DOMRect>): boolean {
  if (enableFragmentRefsTextNodes && child.tag === HostText) {
    const textNode: Text = child.stateNode;
    const range = textNode.ownerDocument.createRange();
    range.selectNodeContents(textNode);
    // $FlowFixMe[method-unbinding]
    rects.push.apply(rects, range.getClientRects());
  } else {
    const instance = getInstanceFromHostFiber<Instance>(child);
    // $FlowFixMe[method-unbinding]
    rects.push.apply(rects, instance.getClientRects());
  }
  return false;
}
// $FlowFixMe[prop-missing]
FragmentInstance.prototype.getRootNode = function (
  this: FragmentInstanceType,
  getRootNodeOptions?: {composed: boolean},
): Document | ShadowRoot | FragmentInstanceType {
  const parentHostFiber = getFragmentParentInstanceOrContainerFiber(
    this._fragmentFiber,
  );
  if (parentHostFiber === null) {
    return this;
  }
  const parentHostInstance = getInstanceFromHostFiber<Instance | Container>(
    parentHostFiber,
  );
  const rootNode =
    // $FlowFixMe[incompatible-type] Flow expects Node
    parentHostInstance.getRootNode(getRootNodeOptions) as Document | ShadowRoot;
  return rootNode;
};
// $FlowFixMe[prop-missing]
FragmentInstance.prototype.compareDocumentPosition = function (
  this: FragmentInstanceType,
  otherNode: Instance,
): number {
  const parentHostFiber = getFragmentParentInstanceOrContainerFiber(
    this._fragmentFiber,
  );
  if (parentHostFiber === null) {
    return Node.DOCUMENT_POSITION_DISCONNECTED;
  }
  const children: Array<Fiber> = [];
  traverseFragmentInstancesAndTextInstances(
    this._fragmentFiber,
    collectChildren,
    children,
  );
  const parentHostInstance = getInstanceFromHostFiber<Instance | Container>(
    parentHostFiber,
  );

  if (children.length === 0) {
    return compareDocumentPositionForEmptyFragment(
      this._fragmentFiber,
      parentHostInstance,
      otherNode,
      getInstanceFromHostFiber,
    );
  }

  const firstNode = getInstanceFromHostFiber<Instance | TextInstance>(
    children[0],
  );
  const lastNode = getInstanceFromHostFiber<Instance | TextInstance>(
    children[children.length - 1],
  );

  // If the fragment has been portaled into another host instance, we need to
  // our best guess is to use the parent of the child instance, rather than
  // the fiber tree host parent.
  const parentHostInstanceFromDOM = fiberIsPortaledIntoHost(this._fragmentFiber)
    ? (firstNode.parentElement as ?Instance)
    : parentHostInstance;

  if (parentHostInstanceFromDOM == null) {
    return Node.DOCUMENT_POSITION_DISCONNECTED;
  }

  // Check if first and last node are actually in the expected document position
  // before relying on them as source of truth for other contained nodes
  const firstNodeIsContained =
    parentHostInstanceFromDOM.compareDocumentPosition(firstNode) &
    Node.DOCUMENT_POSITION_CONTAINED_BY;
  const lastNodeIsContained =
    parentHostInstanceFromDOM.compareDocumentPosition(lastNode) &
    Node.DOCUMENT_POSITION_CONTAINED_BY;
  const firstResult = firstNode.compareDocumentPosition(otherNode);
  const lastResult = lastNode.compareDocumentPosition(otherNode);

  const otherNodeIsFirstOrLastChild =
    (firstNodeIsContained && firstNode === otherNode) ||
    (lastNodeIsContained && lastNode === otherNode);
  const otherNodeIsFirstOrLastChildDisconnected =
    (!firstNodeIsContained && firstNode === otherNode) ||
    (!lastNodeIsContained && lastNode === otherNode);
  const otherNodeIsWithinFirstOrLastChild =
    firstResult & Node.DOCUMENT_POSITION_CONTAINED_BY ||
    lastResult & Node.DOCUMENT_POSITION_CONTAINED_BY;
  const otherNodeIsBetweenFirstAndLastChildren =
    firstNodeIsContained &&
    lastNodeIsContained &&
    firstResult & Node.DOCUMENT_POSITION_FOLLOWING &&
    lastResult & Node.DOCUMENT_POSITION_PRECEDING;

  let result = Node.DOCUMENT_POSITION_DISCONNECTED;
  if (
    otherNodeIsFirstOrLastChild ||
    otherNodeIsWithinFirstOrLastChild ||
    otherNodeIsBetweenFirstAndLastChildren
  ) {
    result = Node.DOCUMENT_POSITION_CONTAINED_BY;
  } else if (otherNodeIsFirstOrLastChildDisconnected) {
    // otherNode has been portaled into another container
    result = Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
  } else {
    result = firstResult;
  }

  if (
    result & Node.DOCUMENT_POSITION_DISCONNECTED ||
    result & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC
  ) {
    return result;
  }

  // Now that we have the result from the DOM API, we double check it matches
  // the state of the React tree. If it doesn't, we have a case of portaled or
  // otherwise injected elements and we return DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC.
  const documentPositionMatchesFiberPosition =
    validateDocumentPositionWithFiberTree(
      result,
      this._fragmentFiber,
      children[0],
      children[children.length - 1],
      otherNode,
    );
  if (documentPositionMatchesFiberPosition) {
    return result;
  }
  return Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
};

function validateDocumentPositionWithFiberTree(
  documentPosition: number,
  fragmentFiber: Fiber,
  precedingBoundaryFiber: Fiber,
  followingBoundaryFiber: Fiber,
  otherNode: Instance,
): boolean {
  const otherFiber = getClosestInstanceFromNode(otherNode);
  if (documentPosition & Node.DOCUMENT_POSITION_CONTAINED_BY) {
    return (
      !!otherFiber && isFiberContainedByFragment(otherFiber, fragmentFiber)
    );
  }
  if (documentPosition & Node.DOCUMENT_POSITION_CONTAINS) {
    if (otherFiber === null) {
      // otherFiber could be null if its the document or body element
      const ownerDocument = otherNode.ownerDocument;
      // $FlowFixMe[invalid-compare]
      return otherNode === ownerDocument || otherNode === ownerDocument.body;
    }
    return isFragmentContainedByFiber(fragmentFiber, otherFiber);
  }
  if (documentPosition & Node.DOCUMENT_POSITION_PRECEDING) {
    return (
      !!otherFiber &&
      (otherFiber === precedingBoundaryFiber ||
        isFiberPreceding(precedingBoundaryFiber, otherFiber))
    );
  }
  if (documentPosition & Node.DOCUMENT_POSITION_FOLLOWING) {
    return (
      !!otherFiber &&
      (otherFiber === followingBoundaryFiber ||
        isFiberFollowing(followingBoundaryFiber, otherFiber))
    );
  }

  return false;
}

function scrollTextNodeIntoView(
  textNode: TextInstance,
  resolvedAlignToTop: boolean,
): void {
  const range = textNode.ownerDocument.createRange();
  range.selectNodeContents(textNode);
  const rect = range.getBoundingClientRect();
  const scrollY = resolvedAlignToTop
    ? window.scrollY + rect.top
    : window.scrollY + rect.bottom - window.innerHeight;
  window.scrollTo(window.scrollX + rect.left, scrollY);
}

if (enableFragmentRefsScrollIntoView) {
  // $FlowFixMe[prop-missing]
  FragmentInstance.prototype.scrollIntoView = function (
    this: FragmentInstanceType,
    alignToTop?: boolean,
  ): void {
    if (typeof alignToTop === 'object') {
      throw new Error(
        'FragmentInstance.scrollIntoView() does not support ' +
          'scrollIntoViewOptions. Use the alignToTop boolean instead.',
      );
    }
    // First, get the children nodes
    const children: Array<Fiber> = [];
    traverseFragmentInstancesAndTextInstances(
      this._fragmentFiber,
      collectChildren,
      children,
    );

    const resolvedAlignToTop = alignToTop !== false;

    // If there are no children, we can use the parent and siblings to determine a position
    if (children.length === 0) {
      const hostSiblings = getFragmentInstanceOrTextInstanceSiblings(
        this._fragmentFiber,
      );
      const targetFiber = resolvedAlignToTop
        ? hostSiblings[1] ||
          hostSiblings[0] ||
          getFragmentParentInstanceOrContainerFiber(this._fragmentFiber)
        : hostSiblings[0] || hostSiblings[1];

      if (targetFiber === null) {
        if (__DEV__) {
          console.warn(
            'You are attempting to scroll a FragmentInstance that has no ' +
              'children, siblings, or parent. No scroll was performed.',
          );
        }
        return;
      }
      // For text node siblings, use Range API to scroll to their position
      if (enableFragmentRefsTextNodes && targetFiber.tag === HostText) {
        const textNode = getInstanceFromHostFiber<TextInstance>(targetFiber);
        scrollTextNodeIntoView(textNode, resolvedAlignToTop);
        return;
      }
      const target = getInstanceFromHostFiber<Instance | Container>(
        targetFiber,
      );
      // If the parent host fiber is a HostRoot, the target is a Container
      // which is not necessarily an Element with a scrollIntoView method.
      if (target.nodeType === DOCUMENT_NODE) {
        // A Document is always in view.
      } else if (target.nodeType === DOCUMENT_FRAGMENT_NODE) {
        const fragment = target as any as DocumentFragment;
        // ShadowRoot always has a host: https://dom.spec.whatwg.org/#ref-for-concept-documentfragment-host%E2%91%A5
        // A generic DocumentFragment doesn't implement this property but conceptually
        // host is a nullable Element: https://dom.spec.whatwg.org/#concept-documentfragment-host
        const host =
          'host' in fragment ? (fragment as any as ShadowRoot).host : null;
        if (host !== null) {
          // The ShadowRoot's host element marks the position where the
          // fragment's content would appear.
          host.scrollIntoView(alignToTop);
        } else if (__DEV__) {
          console.warn(
            'You are attempting to scroll a FragmentInstance that is only ' +
              'mounted inside a detached DocumentFragment. No scroll was ' +
              'performed.',
          );
        }
        return;
      } else {
        // Narrowed down to Element by nodeType check above, but Flow doesn't know that.
        const element = target as any as Element;
        element.scrollIntoView(alignToTop);
      }
    }

    let i = resolvedAlignToTop ? children.length - 1 : 0;
    while (i !== (resolvedAlignToTop ? -1 : children.length)) {
      const child = children[i];
      // For text nodes, use Range API to scroll to their position
      if (enableFragmentRefsTextNodes && child.tag === HostText) {
        const textNode = getInstanceFromHostFiber<TextInstance>(child);
        scrollTextNodeIntoView(textNode, resolvedAlignToTop);
        i += resolvedAlignToTop ? -1 : 1;
        continue;
      }
      const instance = getInstanceFromHostFiber<Instance>(child);
      instance.scrollIntoView(alignToTop);
      i += resolvedAlignToTop ? -1 : 1;
    }
  };
}

function addFragmentHandleToFiber(
  child: Fiber,
  fragmentInstance: FragmentInstanceType,
): boolean {
  if (enableFragmentRefsInstanceHandles) {
    const instance = getInstanceFromHostFiber<Instance | TextInstance>(
      child,
    ) as any as HostNodeWithFragmentHandles;
    addFragmentHandleToInstance(instance, fragmentInstance);
  }
  return false;
}

function addFragmentHandleToInstance(
  instance: HostNodeWithFragmentHandles,
  fragmentInstance: FragmentInstanceType,
): void {
  if (enableFragmentRefsInstanceHandles) {
    if (instance.reactFragments == null) {
      instance.reactFragments = new Set();
    }
    instance.reactFragments.add(fragmentInstance);
  }
}

export function createFragmentInstance(
  fragmentFiber: Fiber,
): FragmentInstanceType {
  const fragmentInstance = new (FragmentInstance as any)(fragmentFiber);
  if (enableFragmentRefsInstanceHandles) {
    traverseFragmentInstancesAndTextInstances(
      fragmentFiber,
      addFragmentHandleToFiber,
      fragmentInstance,
    );
  }
  return fragmentInstance;
}

export function updateFragmentInstanceFiber(
  fragmentFiber: Fiber,
  instance: FragmentInstanceType,
): void {
  instance._fragmentFiber = fragmentFiber;
}

export function commitNewChildToFragmentInstance(
  childInstance: InstanceWithFragmentHandles | Text,
  fragmentInstance: FragmentInstanceType,
): void {
  if (childInstance.nodeType === TEXT_NODE) {
    return;
  }
  const instance: InstanceWithFragmentHandles = childInstance as any;
  const eventListeners = fragmentInstance._eventListeners;
  if (eventListeners !== null) {
    for (let i = 0; i < eventListeners.length; i++) {
      const {type, listener, optionsOrUseCapture} = eventListeners[i];
      instance.addEventListener(type, listener, optionsOrUseCapture);
    }
  }
  if (fragmentInstance._observers !== null) {
    fragmentInstance._observers.forEach(observer => {
      observer.observe(instance);
    });
  }
  if (enableFragmentRefsInstanceHandles) {
    addFragmentHandleToInstance(instance, fragmentInstance);
  }
}

export function deleteChildFromFragmentInstance(
  childInstance: InstanceWithFragmentHandles | Text,
  fragmentInstance: FragmentInstanceType,
): void {
  if (childInstance.nodeType === TEXT_NODE) {
    return;
  }
  const instance: InstanceWithFragmentHandles = childInstance as any;
  const eventListeners = fragmentInstance._eventListeners;
  if (eventListeners !== null) {
    for (let i = 0; i < eventListeners.length; i++) {
      const {type, listener, optionsOrUseCapture} = eventListeners[i];
      instance.removeEventListener(type, listener, optionsOrUseCapture);
    }
  }
  if (enableFragmentRefsInstanceHandles) {
    if (instance.reactFragments != null) {
      instance.reactFragments.delete(fragmentInstance);
    }
  }
}

export function clearContainer(container: Container): void {
  const nodeType = container.nodeType;
  if (nodeType === DOCUMENT_NODE) {
    clearContainerSparingly(container);
  } else if (nodeType === ELEMENT_NODE) {
    switch (container.nodeName) {
      case 'HEAD':
      case 'HTML':
      case 'BODY':
        clearContainerSparingly(container);
        return;
      default: {
        container.textContent = '';
      }
    }
  }
}

function clearContainerSparingly(container: Node) {
  let node;
  let nextNode: ?Node = container.firstChild;
  if (nextNode && nextNode.nodeType === DOCUMENT_TYPE_NODE) {
    nextNode = nextNode.nextSibling;
  }
  while (nextNode) {
    node = nextNode;
    nextNode = nextNode.nextSibling;
    switch (node.nodeName) {
      case 'HTML':
      case 'HEAD':
      case 'BODY': {
        const element: Element = node as any;
        clearContainerSparingly(element);
        // If these singleton instances had previously been rendered with React they
        // may still hold on to references to the previous fiber tree. We detatch them
        // prospectively to reset them to a baseline starting state since we cannot create
        // new instances.
        detachDeletedInstance(element);
        continue;
      }
      // Script tags are retained to avoid an edge case bug. Normally scripts will execute if they
      // are ever inserted into the DOM. However when streaming if a script tag is opened but not
      // yet closed some browsers create and insert the script DOM Node but the script cannot execute
      // yet until the closing tag is parsed. If something causes React to call clearContainer while
      // this DOM node is in the document but not yet executable the DOM node will be removed from the
      // document and when the script closing tag comes in the script will not end up running. This seems
      // to happen in Chrome/Firefox but not Safari at the moment though this is not necessarily specified
      // behavior so it could change in future versions of browsers. While leaving all scripts is broader
      // than strictly necessary this is the least amount of additional code to avoid this breaking
      // edge case.
      //
      // Style tags are retained because they may likely come from 3rd party scripts and extensions
      case 'SCRIPT':
      case 'STYLE': {
        continue;
      }
      // Stylesheet tags are retained because they may likely come from 3rd party scripts and extensions
      case 'LINK': {
        if (
          (node as any as HTMLLinkElement).rel.toLowerCase() === 'stylesheet'
        ) {
          continue;
        }
      }
    }
    container.removeChild(node);
  }
  return;
}

function clearHead(head: Element): void {
  let node = head.firstChild;
  while (node) {
    const nextNode = node.nextSibling;
    const nodeName = node.nodeName;
    if (
      isMarkedHoistable(node) ||
      nodeName === 'SCRIPT' ||
      nodeName === 'STYLE' ||
      (nodeName === 'LINK' &&
        (node as any as HTMLLinkElement).rel.toLowerCase() === 'stylesheet')
    ) {
      // retain these nodes
    } else {
      head.removeChild(node);
    }
    node = nextNode;
  }
  return;
}

// Making this so we can eventually move all of the instance caching to the commit phase.
// Currently this is only used to associate fiber and props to instances for hydrating
// HostSingletons. The reason we need it here is we only want to make this binding on commit
// because only one fiber can own the instance at a time and render can fail/restart
export function bindInstance(
  instance: Instance,
  props: Props,
  internalInstanceHandle: mixed,
) {
  precacheFiberNode(internalInstanceHandle as any, instance);
  updateFiberProps(instance, props);
}

// -------------------
//     Hydration
// -------------------

export const supportsHydration = true;

export function canHydrateInstance(
  instance: HydratableInstance,
  type: string,
  props: Props,
  inRootOrSingleton: boolean,
): null | Instance {
  while (instance.nodeType === ELEMENT_NODE) {
    const element: Element = instance as any;
    const anyProps = props as any;
    if (element.nodeName.toLowerCase() !== type.toLowerCase()) {
      if (!inRootOrSingleton) {
        // Usually we error for mismatched tags.
        if (
          element.nodeName === 'INPUT' &&
          (element as any).type === 'hidden'
        ) {
          // If we have extra hidden inputs, we don't mismatch. This allows us to embed
          // extra form data in the original form.
        } else {
          return null;
        }
      }
      // In root or singleton parents we skip past mismatched instances.
    } else if (!inRootOrSingleton) {
      // Match
      if (type === 'input' && (element as any).type === 'hidden') {
        if (__DEV__) {
          checkAttributeStringCoercion(anyProps.name, 'name');
        }
        const name = anyProps.name == null ? null : '' + anyProps.name;
        if (
          anyProps.type !== 'hidden' ||
          element.getAttribute('name') !== name
        ) {
          // Skip past hidden inputs unless that's what we're looking for. This allows us
          // embed extra form data in the original form.
        } else {
          return element;
        }
      } else {
        return element;
      }
    } else if (isMarkedHoistable(element)) {
      // We've already claimed this as a hoistable which isn't hydrated this way so we skip past it.
    } else {
      // We have an Element with the right type.

      // We are going to try to exclude it if we can definitely identify it as a hoisted Node or if
      // we can guess that the node is likely hoisted or was inserted by a 3rd party script or browser extension
      // using high entropy attributes for certain types. This technique will fail for strange insertions like
      // extension prepending <div> in the <body> but that already breaks before and that is an edge case.
      switch (type) {
        // case 'title':
        //We assume all titles are matchable. You should only have one in the Document, at least in a hoistable scope
        // and if you are a HostComponent with type title we must either be in an <svg> context or this title must have an `itemProp` prop.
        case 'meta': {
          // The only way to opt out of hoisting meta tags is to give it an itemprop attribute. We assume there will be
          // not 3rd party meta tags that are prepended, accepting the cases where this isn't true because meta tags
          // are usually only functional for SSR so even in a rare case where we did bind to an injected tag the runtime
          // implications are minimal
          if (!element.hasAttribute('itemprop')) {
            // This is a Hoistable
            break;
          }
          return element;
        }
        case 'link': {
          // Links come in many forms and we do expect 3rd parties to inject them into <head> / <body>. We exclude known resources
          // and then use high-entroy attributes like href which are almost always used and almost always unique to filter out unlikely
          // matches.
          const rel = element.getAttribute('rel');
          if (rel === 'stylesheet' && element.hasAttribute('data-precedence')) {
            // This is a stylesheet resource
            break;
          } else if (
            rel !== anyProps.rel ||
            element.getAttribute('href') !==
              (anyProps.href == null || anyProps.href === ''
                ? null
                : anyProps.href) ||
            element.getAttribute('crossorigin') !==
              (anyProps.crossOrigin == null ? null : anyProps.crossOrigin) ||
            element.getAttribute('title') !==
              (anyProps.title == null ? null : anyProps.title)
          ) {
            // rel + href should usually be enough to uniquely identify a link however crossOrigin can vary for rel preconnect
            // and title could vary for rel alternate
            break;
          }
          return element;
        }
        case 'style': {
          // Styles are hard to match correctly. We can exclude known resources but otherwise we accept the fact that a non-hoisted style tags
          // in <head> or <body> are likely never going to be unmounted given their position in the document and the fact they likely hold global styles
          if (element.hasAttribute('data-precedence')) {
            // This is a style resource
            break;
          }
          return element;
        }
        case 'script': {
          // Scripts are a little tricky, we exclude known resources and then similar to links try to use high-entropy attributes
          // to reject poor matches. One challenge with scripts are inline scripts. We don't attempt to check text content which could
          // in theory lead to a hydration error later if a 3rd party injected an inline script before the React rendered nodes.
          // Falling back to client rendering if this happens should be seemless though so we will try this hueristic and revisit later
          // if we learn it is problematic
          const srcAttr = element.getAttribute('src');
          if (
            srcAttr !== (anyProps.src == null ? null : anyProps.src) ||
            element.getAttribute('type') !==
              (anyProps.type == null ? null : anyProps.type) ||
            element.getAttribute('crossorigin') !==
              (anyProps.crossOrigin == null ? null : anyProps.crossOrigin)
          ) {
            // This script is for a different src/type/crossOrigin. It may be a script resource
            // or it may just be a mistmatch
            if (
              srcAttr &&
              element.hasAttribute('async') &&
              !element.hasAttribute('itemprop')
            ) {
              // This is an async script resource
              break;
            }
          }
          return element;
        }
        default: {
          // We have excluded the most likely cases of mismatch between hoistable tags, 3rd party script inserted tags,
          // and browser extension inserted tags. While it is possible this is not the right match it is a decent hueristic
          // that should work in the vast majority of cases.
          return element;
        }
      }
    }
    const nextInstance = getNextHydratableSibling(element);
    if (nextInstance === null) {
      break;
    }
    instance = nextInstance;
  }
  // This is a suspense boundary or Text node or we got the end.
  // Suspense Boundaries are never expected to be injected by 3rd parties. If we see one it should be matched
  // and this is a hydration error.
  // Text Nodes are also not expected to be injected by 3rd parties. This is less of a guarantee for <body>
  // but it seems reasonable and conservative to reject this as a hydration error as well
  return null;
}

export function canHydrateTextInstance(
  instance: HydratableInstance,
  text: string,
  inRootOrSingleton: boolean,
): null | TextInstance {
  // Empty strings are not parsed by HTML so there won't be a correct match here.
  if (text === '') return null;

  while (instance.nodeType !== TEXT_NODE) {
    if (
      instance.nodeType === ELEMENT_NODE &&
      instance.nodeName === 'INPUT' &&
      (instance as any).type === 'hidden'
    ) {
      // If we have extra hidden inputs, we don't mismatch. This allows us to
      // embed extra form data in the original form.
    } else if (!inRootOrSingleton) {
      return null;
    }
    const nextInstance = getNextHydratableSibling(instance);
    if (nextInstance === null) {
      return null;
    }
    instance = nextInstance;
  }
  // This has now been refined to a text node.
  return instance as any as TextInstance;
}

function canHydrateHydrationBoundary(
  instance: HydratableInstance,
  inRootOrSingleton: boolean,
): null | SuspenseInstance | ActivityInstance {
  while (instance.nodeType !== COMMENT_NODE) {
    if (
      instance.nodeType === ELEMENT_NODE &&
      instance.nodeName === 'INPUT' &&
      (instance as any).type === 'hidden'
    ) {
      // If we have extra hidden inputs, we don't mismatch. This allows us to
      // embed extra form data in the original form.
    } else if (!inRootOrSingleton) {
      return null;
    }
    const nextInstance = getNextHydratableSibling(instance);
    if (nextInstance === null) {
      return null;
    }
    instance = nextInstance;
  }
  // This has now been refined to a hydration boundary node.
  return instance as any;
}

export function canHydrateActivityInstance(
  instance: HydratableInstance,
  inRootOrSingleton: boolean,
): null | ActivityInstance {
  const hydratableInstance = canHydrateHydrationBoundary(
    instance,
    inRootOrSingleton,
  );
  if (
    hydratableInstance !== null &&
    hydratableInstance.data === ACTIVITY_START_DATA
  ) {
    return hydratableInstance as any;
  }
  return null;
}

export function canHydrateSuspenseInstance(
  instance: HydratableInstance,
  inRootOrSingleton: boolean,
): null | SuspenseInstance {
  const hydratableInstance = canHydrateHydrationBoundary(
    instance,
    inRootOrSingleton,
  );
  if (
    hydratableInstance !== null &&
    hydratableInstance.data !== ACTIVITY_START_DATA
  ) {
    return hydratableInstance as any;
  }
  return null;
}

export function isSuspenseInstancePending(instance: SuspenseInstance): boolean {
  return (
    instance.data === SUSPENSE_PENDING_START_DATA ||
    instance.data === SUSPENSE_QUEUED_START_DATA
  );
}

export function isSuspenseInstanceFallback(
  instance: SuspenseInstance,
): boolean {
  return (
    instance.data === SUSPENSE_FALLBACK_START_DATA ||
    (instance.data === SUSPENSE_PENDING_START_DATA &&
      instance.ownerDocument.readyState !== DOCUMENT_READY_STATE_LOADING)
  );
}

export function getSuspenseInstanceFallbackErrorDetails(
  instance: SuspenseInstance,
): {
  digest: ?string,
  message?: string,
  stack?: string,
  componentStack?: string,
} {
  const dataset =
    instance.nextSibling &&
    (instance.nextSibling as any as HTMLElement).dataset;
  let digest, message, stack, componentStack;
  if (dataset) {
    digest = dataset.dgst;
    if (__DEV__) {
      message = dataset.msg;
      stack = dataset.stck;
      componentStack = dataset.cstck;
    }
  }
  if (__DEV__) {
    return {
      message,
      digest,
      stack,
      componentStack,
    };
  } else {
    // Object gets DCE'd if constructed in tail position and matches callsite destructuring
    return {
      digest,
    };
  }
}

export function registerSuspenseInstanceRetry(
  instance: SuspenseInstance,
  callback: () => void,
) {
  const ownerDocument = instance.ownerDocument;
  if (instance.data === SUSPENSE_QUEUED_START_DATA) {
    // The Fizz runtime has already queued this boundary for reveal. We wait for it
    // to be revealed and then retries.
    instance._reactRetry = callback;
  } else if (
    // The Fizz runtime must have put this boundary into client render or complete
    // state after the render finished but before it committed. We need to call the
    // callback now rather than wait
    instance.data !== SUSPENSE_PENDING_START_DATA ||
    // The boundary is still in pending status but the document has finished loading
    // before we could register the event handler that would have scheduled the retry
    // on load so we call the callback now.
    ownerDocument.readyState !== DOCUMENT_READY_STATE_LOADING
  ) {
    callback();
  } else {
    // We're still in pending status and the document is still loading so we attach
    // a listener to the document load even and expose the retry on the instance for
    // the Fizz runtime to trigger if it ends up resolving this boundary
    const listener = () => {
      callback();
      ownerDocument.removeEventListener('DOMContentLoaded', listener);
    };
    ownerDocument.addEventListener('DOMContentLoaded', listener);
    instance._reactRetry = listener;
  }
}

export function canHydrateFormStateMarker(
  instance: HydratableInstance,
  inRootOrSingleton: boolean,
): null | FormStateMarkerInstance {
  while (instance.nodeType !== COMMENT_NODE) {
    if (!inRootOrSingleton) {
      return null;
    }
    const nextInstance = getNextHydratableSibling(instance);
    if (nextInstance === null) {
      return null;
    }
    instance = nextInstance;
  }
  const nodeData = (instance as any).data;
  if (
    nodeData === FORM_STATE_IS_MATCHING ||
    nodeData === FORM_STATE_IS_NOT_MATCHING
  ) {
    const markerInstance: FormStateMarkerInstance = instance as any;
    return markerInstance;
  }
  return null;
}

export function isFormStateMarkerMatching(
  markerInstance: FormStateMarkerInstance,
): boolean {
  return markerInstance.data === FORM_STATE_IS_MATCHING;
}

function getNextHydratable(node: ?Node) {
  // Skip non-hydratable nodes.
  for (; node != null; node = (node as any as Node).nextSibling) {
    const nodeType = node.nodeType;
    if (nodeType === ELEMENT_NODE || nodeType === TEXT_NODE) {
      break;
    }
    if (nodeType === COMMENT_NODE) {
      const data = (node as any).data;
      if (
        data === SUSPENSE_START_DATA ||
        data === SUSPENSE_FALLBACK_START_DATA ||
        data === SUSPENSE_PENDING_START_DATA ||
        data === SUSPENSE_QUEUED_START_DATA ||
        data === ACTIVITY_START_DATA ||
        data === FORM_STATE_IS_MATCHING ||
        data === FORM_STATE_IS_NOT_MATCHING
      ) {
        break;
      }
      if (data === SUSPENSE_END_DATA || data === ACTIVITY_END_DATA) {
        return null;
      }
    }
  }
  return node as any;
}

export function getNextHydratableSibling(
  instance: HydratableInstance,
): null | HydratableInstance {
  return getNextHydratable(instance.nextSibling);
}

export function getFirstHydratableChild(
  parentInstance: Instance,
): null | HydratableInstance {
  return getNextHydratable(parentInstance.firstChild);
}

export function getFirstHydratableChildWithinContainer(
  parentContainer: Container,
): null | HydratableInstance {
  let parentElement: Element;
  switch (parentContainer.nodeType) {
    case DOCUMENT_NODE:
      parentElement = (parentContainer as any).body;
      break;
    default: {
      if (parentContainer.nodeName === 'HTML') {
        parentElement = (parentContainer as any).ownerDocument.body;
      } else {
        parentElement = parentContainer as any;
      }
    }
  }
  return getNextHydratable(parentElement.firstChild);
}

export function getFirstHydratableChildWithinActivityInstance(
  parentInstance: ActivityInstance,
): null | HydratableInstance {
  return getNextHydratable(parentInstance.nextSibling);
}

export function getFirstHydratableChildWithinSuspenseInstance(
  parentInstance: SuspenseInstance,
): null | HydratableInstance {
  return getNextHydratable(parentInstance.nextSibling);
}

// If it were possible to have more than one scope singleton in a DOM tree
// we would need to model this as a stack but since you can only have one <head>
// and head is the only singleton that is a scope in DOM we can get away with
// tracking this as a single value.
let previousHydratableOnEnteringScopedSingleton: null | HydratableInstance =
  null;

export function getFirstHydratableChildWithinSingleton(
  type: string,
  singletonInstance: Instance,
  currentHydratableInstance: null | HydratableInstance,
): null | HydratableInstance {
  if (isSingletonScope(type)) {
    previousHydratableOnEnteringScopedSingleton = currentHydratableInstance;
    return getNextHydratable(singletonInstance.firstChild);
  } else {
    return currentHydratableInstance;
  }
}

export function getNextHydratableSiblingAfterSingleton(
  type: string,
  currentHydratableInstance: null | HydratableInstance,
): null | HydratableInstance {
  if (isSingletonScope(type)) {
    const previousHydratableInstance =
      previousHydratableOnEnteringScopedSingleton;
    previousHydratableOnEnteringScopedSingleton = null;
    return previousHydratableInstance;
  } else {
    return currentHydratableInstance;
  }
}

export function describeHydratableInstanceForDevWarnings(
  instance: HydratableInstance,
): string | {type: string, props: $ReadOnly<Props>} {
  // Reverse engineer a pseudo react-element from hydratable instance
  if (instance.nodeType === ELEMENT_NODE) {
    // Reverse engineer a set of props that can print for dev warnings
    return {
      type: instance.nodeName.toLowerCase(),
      props: getPropsFromElement(instance as any),
    };
  } else if (instance.nodeType === COMMENT_NODE) {
    if (instance.data === ACTIVITY_START_DATA) {
      return {
        type: 'Activity',
        props: {},
      };
    }
    return {
      type: 'Suspense',
      props: {},
    };
  } else {
    return instance.nodeValue;
  }
}

export function validateHydratableInstance(
  type: string,
  props: Props,
  hostContext: HostContext,
): boolean {
  if (__DEV__) {
    // TODO: take namespace into account when validating.
    const hostContextDev: HostContextDev = hostContext as any;
    return validateDOMNesting(type, hostContextDev.ancestorInfo);
  }
  return true;
}

export function hydrateInstance(
  instance: Instance,
  type: string,
  props: Props,
  hostContext: HostContext,
  internalInstanceHandle: Object,
): boolean {
  precacheFiberNode(internalInstanceHandle, instance);
  // TODO: Possibly defer this until the commit phase where all the events
  // get attached.
  updateFiberProps(instance, props);

  return hydrateProperties(instance, type, props, hostContext);
}

// Returns a Map of properties that were different on the server.
export function diffHydratedPropsForDevWarnings(
  instance: Instance,
  type: string,
  props: Props,
  hostContext: HostContext,
): null | $ReadOnly<Props> {
  return diffHydratedProperties(instance, type, props, hostContext);
}

export function validateHydratableTextInstance(
  text: string,
  hostContext: HostContext,
): boolean {
  if (__DEV__) {
    const hostContextDev = hostContext as any as HostContextDev;
    const ancestor = hostContextDev.ancestorInfo.current;
    if (ancestor != null) {
      return validateTextNesting(
        text,
        ancestor.tag,
        hostContextDev.ancestorInfo.implicitRootScope,
      );
    }
  }
  return true;
}

export function hydrateTextInstance(
  textInstance: TextInstance,
  text: string,
  internalInstanceHandle: Object,
  parentInstanceProps: null | Props,
): boolean {
  precacheFiberNode(internalInstanceHandle, textInstance);

  return hydrateText(textInstance, text, parentInstanceProps);
}

// Returns the server text if it differs from the client.
export function diffHydratedTextForDevWarnings(
  textInstance: TextInstance,
  text: string,
  parentProps: null | Props,
): null | string {
  if (
    parentProps === null ||
    parentProps[SUPPRESS_HYDRATION_WARNING] !== true
  ) {
    return diffHydratedText(textInstance, text);
  }
  return null;
}

export function hydrateActivityInstance(
  activityInstance: ActivityInstance,
  internalInstanceHandle: Object,
) {
  precacheFiberNode(internalInstanceHandle, activityInstance);
}

export function hydrateSuspenseInstance(
  suspenseInstance: SuspenseInstance,
  internalInstanceHandle: Object,
) {
  precacheFiberNode(internalInstanceHandle, suspenseInstance);
}

function getNextHydratableInstanceAfterHydrationBoundary(
  hydrationInstance: SuspenseInstance | ActivityInstance,
): null | HydratableInstance {
  let node = hydrationInstance.nextSibling;
  // Skip past all nodes within this suspense boundary.
  // There might be nested nodes so we need to keep track of how
  // deep we are and only break out when we're back on top.
  let depth = 0;
  while (node) {
    if (node.nodeType === COMMENT_NODE) {
      const data = (node as any).data as string;
      if (data === SUSPENSE_END_DATA || data === ACTIVITY_END_DATA) {
        if (depth === 0) {
          return getNextHydratableSibling(node as any);
        } else {
          depth--;
        }
      } else if (
        data === SUSPENSE_START_DATA ||
        data === SUSPENSE_FALLBACK_START_DATA ||
        data === SUSPENSE_PENDING_START_DATA ||
        data === SUSPENSE_QUEUED_START_DATA ||
        data === ACTIVITY_START_DATA
      ) {
        depth++;
      }
    }
    node = node.nextSibling;
  }
  // TODO: Warn, we didn't find the end comment boundary.
  return null;
}

export function getNextHydratableInstanceAfterActivityInstance(
  activityInstance: ActivityInstance,
): null | HydratableInstance {
  return getNextHydratableInstanceAfterHydrationBoundary(activityInstance);
}

export function getNextHydratableInstanceAfterSuspenseInstance(
  suspenseInstance: SuspenseInstance,
): null | HydratableInstance {
  return getNextHydratableInstanceAfterHydrationBoundary(suspenseInstance);
}

// Returns the SuspenseInstance if this node is a direct child of a
// SuspenseInstance. I.e. if its previous sibling is a Comment with
// SUSPENSE_x_START_DATA. Otherwise, null.
export function getParentHydrationBoundary(
  targetInstance: Node,
): null | SuspenseInstance | ActivityInstance {
  let node = targetInstance.previousSibling;
  // Skip past all nodes within this suspense boundary.
  // There might be nested nodes so we need to keep track of how
  // deep we are and only break out when we're back on top.
  let depth = 0;
  while (node) {
    if (node.nodeType === COMMENT_NODE) {
      const data = (node as any).data as string;
      if (
        data === SUSPENSE_START_DATA ||
        data === SUSPENSE_FALLBACK_START_DATA ||
        data === SUSPENSE_PENDING_START_DATA ||
        data === SUSPENSE_QUEUED_START_DATA ||
        data === ACTIVITY_START_DATA
      ) {
        if (depth === 0) {
          return node as any as SuspenseInstance | ActivityInstance;
        } else {
          depth--;
        }
      } else if (data === SUSPENSE_END_DATA || data === ACTIVITY_END_DATA) {
        depth++;
      }
    }
    node = node.previousSibling;
  }
  return null;
}

export function commitHydratedContainer(container: Container): void {
  // Retry if any event replaying was blocked on this.
  retryIfBlockedOn(container);
}

export function commitHydratedActivityInstance(
  activityInstance: ActivityInstance,
): void {
  // Retry if any event replaying was blocked on this.
  retryIfBlockedOn(activityInstance);
}

export function commitHydratedSuspenseInstance(
  suspenseInstance: SuspenseInstance,
): void {
  // Retry if any event replaying was blocked on this.
  retryIfBlockedOn(suspenseInstance);
}

export function flushHydrationEvents(): void {
  if (enableHydrationChangeEvent) {
    flushEventReplaying();
  }
}

export function shouldDeleteUnhydratedTailInstances(
  parentType: string,
): boolean {
  return parentType !== 'form' && parentType !== 'button';
}

// -------------------
//     Test Selectors
// -------------------

export const supportsTestSelectors = true;

export function findFiberRoot(node: Instance): null | FiberRoot {
  const stack = [node];
  let index = 0;
  while (index < stack.length) {
    const current = stack[index++];
    if (isContainerMarkedAsRoot(current)) {
      return getInstanceFromNodeDOMTree(current) as any as FiberRoot;
    }
    stack.push(...current.children);
  }
  return null;
}

export function getBoundingRect(node: Instance): BoundingRect {
  const rect = node.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function matchAccessibilityRole(node: Instance, role: string): boolean {
  if (hasRole(node, role)) {
    return true;
  }

  return false;
}

export function getTextContent(fiber: Fiber): string | null {
  switch (fiber.tag) {
    case HostHoistable:
    case HostSingleton:
    case HostComponent:
      let textContent = '';
      const childNodes = fiber.stateNode.childNodes;
      for (let i = 0; i < childNodes.length; i++) {
        const childNode = childNodes[i];
        if (childNode.nodeType === Node.TEXT_NODE) {
          textContent += childNode.textContent;
        }
      }
      return textContent;
    case HostText:
      return fiber.stateNode.textContent;
  }

  return null;
}

export function isHiddenSubtree(fiber: Fiber): boolean {
  return fiber.tag === HostComponent && fiber.memoizedProps.hidden === true;
}

export function setFocusIfFocusable(
  node: Instance,
  focusOptions?: FocusOptions,
): boolean {
  // The logic for determining if an element is focusable is kind of complex,
  // and since we want to actually change focus anyway- we can just skip it.
  // Instead we'll just listen for a "focus" event to verify that focus was set.
  //
  // We could compare the node to document.activeElement after focus,
  // but this would not handle the case where application code managed focus to automatically blur.
  const element = node as any as HTMLElement;

  // If this element is already the active element, it's focusable and already
  // focused. Calling .focus() on it would be a no-op (no focus event fires),
  // so we short-circuit here.
  if (element.ownerDocument.activeElement === element) {
    return true;
  }

  let didFocus = false;
  const handleFocus = () => {
    didFocus = true;
  };

  try {
    // Listen on the document in the capture phase so we detect focus even when
    // it lands on a different element than the one we called .focus() on. This
    // happens with <label> elements (focus delegates to the associated input)
    // and shadow hosts with delegatesFocus.
    element.ownerDocument.addEventListener('focus', handleFocus, true);
    // $FlowFixMe[method-unbinding]
    (element.focus || HTMLElement.prototype.focus).call(element, focusOptions);
  } finally {
    element.ownerDocument.removeEventListener('focus', handleFocus, true);
  }

  return didFocus;
}

type RectRatio = {
  ratio: number,
  rect: BoundingRect,
};

export function setupIntersectionObserver(
  targets: Array<Instance>,
  callback: ObserveVisibleRectsCallback,
  options?: IntersectionObserverOptions,
): {
  disconnect: () => void,
  observe: (instance: Instance) => void,
  unobserve: (instance: Instance) => void,
} {
  const rectRatioCache: Map<Instance, RectRatio> = new Map();
  targets.forEach(target => {
    rectRatioCache.set(target, {
      rect: getBoundingRect(target),
      ratio: 0,
    });
  });

  const handleIntersection = (entries: Array<IntersectionObserverEntry>) => {
    entries.forEach(entry => {
      const {boundingClientRect, intersectionRatio, target} = entry;
      rectRatioCache.set(target, {
        rect: {
          x: boundingClientRect.left,
          y: boundingClientRect.top,
          width: boundingClientRect.width,
          height: boundingClientRect.height,
        },
        ratio: intersectionRatio,
      });
    });

    callback(Array.from(rectRatioCache.values()));
  };

  const observer = new IntersectionObserver(handleIntersection, options);
  targets.forEach(target => {
    observer.observe(target as any);
  });

  return {
    disconnect: () => observer.disconnect(),
    observe: target => {
      rectRatioCache.set(target, {
        rect: getBoundingRect(target),
        ratio: 0,
      });
      observer.observe(target as any);
    },
    unobserve: target => {
      rectRatioCache.delete(target);
      observer.unobserve(target as any);
    },
  };
}

export function requestPostPaintCallback(callback: (time: number) => void) {
  localRequestAnimationFrame(() => {
    localRequestAnimationFrame(time => callback(time));
  });
}

// -------------------
//     Singletons
// -------------------

export const supportsSingletons = true;

export function isHostSingletonType(type: string): boolean {
  return type === 'html' || type === 'head' || type === 'body';
}

export function resolveSingletonInstance(
  type: string,
  props: Props,
  rootContainerInstance: Container,
  hostContext: HostContext,
  validateDOMNestingDev: boolean,
): Instance {
  if (__DEV__) {
    const hostContextDev = hostContext as any as HostContextDev;
    if (validateDOMNestingDev) {
      validateDOMNesting(type, hostContextDev.ancestorInfo);
    }
  }
  const ownerDocument = getOwnerDocumentFromRootContainer(
    rootContainerInstance,
  );
  switch (type) {
    case 'html': {
      const documentElement = ownerDocument.documentElement;
      if (!documentElement) {
        throw new Error(
          'React expected an <html> element (document.documentElement) to exist in the Document but one was' +
            ' not found. React never removes the documentElement for any Document it renders into so' +
            ' the cause is likely in some other script running on this page.',
        );
      }
      return documentElement;
    }
    case 'head': {
      const head = ownerDocument.head;
      if (!head) {
        throw new Error(
          'React expected a <head> element (document.head) to exist in the Document but one was' +
            ' not found. React never removes the head for any Document it renders into so' +
            ' the cause is likely in some other script running on this page.',
        );
      }
      return head;
    }
    case 'body': {
      const body = ownerDocument.body;
      if (!body) {
        throw new Error(
          'React expected a <body> element (document.body) to exist in the Document but one was' +
            ' not found. React never removes the body for any Document it renders into so' +
            ' the cause is likely in some other script running on this page.',
        );
      }
      return body;
    }
    default: {
      throw new Error(
        'resolveSingletonInstance was called with an element type that is not supported. This is a bug in React.',
      );
    }
  }
}

export function acquireSingletonInstance(
  type: string,
  props: Props,
  instance: Instance,
  internalInstanceHandle: Object,
): void {
  if (__DEV__) {
    if (
      // If this instance is the container then it is invalid to acquire it as a singleton however
      // the DOM nesting validation will already warn for this and the message below isn't semantically
      // aligned with the actual fix you need to make so we omit the warning in this case
      !isContainerMarkedAsRoot(instance) &&
      // If this instance isn't the root but is currently owned by a different HostSingleton instance then
      // we need to warn that you are rendering more than one singleton at a time.
      getInstanceFromNodeDOMTree(instance)
    ) {
      const tagName = instance.tagName.toLowerCase();
      console.error(
        'You are mounting a new %s component when a previous one has not first unmounted. It is an' +
          ' error to render more than one %s component at a time and attributes and children of these' +
          ' components will likely fail in unpredictable ways. Please only render a single instance of' +
          ' <%s> and if you need to mount a new one, ensure any previous ones have unmounted first.',
        tagName,
        tagName,
        tagName,
      );
    }
    switch (type) {
      case 'html':
      case 'head':
      case 'body': {
        break;
      }
      default: {
        console.error(
          'acquireSingletonInstance was called with an element type that is not supported. This is a bug in React.',
        );
      }
    }
  }

  const attributes = instance.attributes;
  while (attributes.length) {
    instance.removeAttributeNode(attributes[0]);
  }

  setInitialProperties(instance, type, props);
  precacheFiberNode(internalInstanceHandle, instance);
  updateFiberProps(instance, props);
}

export function releaseSingletonInstance(instance: Instance): void {
  const attributes = instance.attributes;
  while (attributes.length) {
    instance.removeAttributeNode(attributes[0]);
  }
  detachDeletedInstance(instance);
}

// -------------------
//     Resources
// -------------------

export const supportsResources = true;

type HoistableTagType = 'link' | 'meta' | 'title';
type TResource<
  T: 'stylesheet' | 'style' | 'script' | 'void',
  S: null | {...},
> = {
  type: T,
  instance: null | Instance,
  count: number,
  state: S,
};
type StylesheetResource = TResource<'stylesheet', StylesheetState>;
type StyleTagResource = TResource<'style', null>;
type StyleResource = StyleTagResource | StylesheetResource;
type ScriptResource = TResource<'script', null>;
type VoidResource = TResource<'void', null>;
export type Resource = StyleResource | ScriptResource | VoidResource;

type LoadingState = number;
const NotLoaded = /*       */ 0b000;
const Loaded = /*          */ 0b001;
const Errored = /*         */ 0b010;
const Settled = /*         */ 0b011;
const Inserted = /*        */ 0b100;

type StylesheetState = {
  loading: LoadingState,
  preload: null | HTMLLinkElement,
};

type StyleTagProps = {
  'data-href': string,
  'data-precedence': string,
  [string]: mixed,
};
type StylesheetProps = {
  rel: 'stylesheet',
  href: string,
  'data-precedence': string,
  [string]: mixed,
};

type ScriptProps = {
  src: string,
  async: true,
  [string]: mixed,
};

type PreloadProps = {
  rel: 'preload',
  href: ?string,
  [string]: mixed,
};
type PreloadModuleProps = {
  rel: 'modulepreload',
  href: string,
  [string]: mixed,
};

export type RootResources = {
  hoistableStyles: Map<string, StyleResource>,
  hoistableScripts: Map<string, ScriptResource>,
};

export function prepareToCommitHoistables() {
  tagCaches = null;
}

// global collections of Resources
const preloadPropsMap: Map<string, PreloadProps | PreloadModuleProps> =
  new Map();
const preconnectsSet: Set<string> = new Set();

export type HoistableRoot = Document | ShadowRoot;

// getRootNode is missing from IE and old jsdom versions
export function getHoistableRoot(container: Container): HoistableRoot {
  // $FlowFixMe[method-unbinding]
  if (typeof container.getRootNode === 'function') {
    const rootNode = container.getRootNode();
    if (rootNode.nodeType === DOCUMENT_NODE) {
      return rootNode as any as Document;
    }
    if (rootNode.nodeType === DOCUMENT_FRAGMENT_NODE) {
      return rootNode as any as ShadowRoot;
    }
  }
  return container.nodeType === DOCUMENT_NODE
    ? (container as any as Document)
    : container.ownerDocument;
}

function getCurrentResourceRoot(): null | HoistableRoot {
  const currentContainer = getCurrentRootHostContainer();
  return currentContainer ? getHoistableRoot(currentContainer) : null;
}

function getDocumentFromRoot(root: HoistableRoot): Document {
  return root.ownerDocument || root;
}

const previousDispatcher =
  ReactDOMSharedInternals.d; /* ReactDOMCurrentDispatcher */
ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */ = {
  f /* flushSyncWork */: disableLegacyMode
    ? flushSyncWork
    : previousDispatcher.f /* flushSyncWork */,
  r: requestFormReset,
  D /* prefetchDNS */: prefetchDNS,
  C /* preconnect */: preconnect,
  L /* preload */: preload,
  m /* preloadModule */: preloadModule,
  X /* preinitScript */: preinitScript,
  S /* preinitStyle */: preinitStyle,
  M /* preinitModuleScript */: preinitModuleScript,
};

function flushSyncWork() {
  if (disableLegacyMode) {
    const previousWasRendering = previousDispatcher.f(); /* flushSyncWork */
    const wasRendering = flushSyncWorkOnAllRoots();
    // Since multiple dispatchers can flush sync work during a single flushSync call
    // we need to return true if any of them were rendering.
    return previousWasRendering || wasRendering;
  } else {
    throw new Error(
      'flushSyncWork should not be called from builds that support legacy mode. This is a bug in React.',
    );
  }
}

function requestFormReset(form: HTMLFormElement) {
  const formInst = getInstanceFromNodeDOMTree(form);
  if (
    formInst !== null &&
    formInst.tag === HostComponent &&
    formInst.type === 'form'
  ) {
    requestFormResetOnFiber(formInst);
  } else {
    // This form was either not rendered by this React renderer (or it's an
    // invalid type). Try the next one.
    //
    // The last implementation in the sequence will throw an error.
    previousDispatcher.r(/* requestFormReset */ form);
  }
}

// We expect this to get inlined. It is a function mostly to communicate the special nature of
// how we resolve the HoistableRoot for ReactDOM.pre*() methods. Because we support calling
// these methods outside of render there is no way to know which Document or ShadowRoot is 'scoped'
// and so we have to fall back to something universal. Currently we just refer to the global document.
// This is notable because nowhere else in ReactDOM do we actually reference the global document or window
// because we may be rendering inside an iframe.
const globalDocument = typeof document === 'undefined' ? null : document;
function getGlobalDocument(): ?Document {
  return globalDocument;
}

function preconnectAs(
  rel: 'preconnect' | 'dns-prefetch',
  href: string,
  crossOrigin: ?CrossOriginEnum,
) {
  const ownerDocument = getGlobalDocument();
  if (ownerDocument && typeof href === 'string' && href) {
    const limitedEscapedHref =
      escapeSelectorAttributeValueInsideDoubleQuotes(href);
    let key = `link[rel="${rel}"][href="${limitedEscapedHref}"]`;
    if (typeof crossOrigin === 'string') {
      key += `[crossorigin="${crossOrigin}"]`;
    }
    if (!preconnectsSet.has(key)) {
      preconnectsSet.add(key);

      const preconnectProps = {rel, crossOrigin, href};
      if (null === ownerDocument.querySelector(key)) {
        const instance = ownerDocument.createElement('link');
        setInitialProperties(instance, 'link', preconnectProps);
        markNodeAsHoistable(instance);
        (ownerDocument.head as any).appendChild(instance);
      }
    }
  }
}

function prefetchDNS(href: string) {
  previousDispatcher.D(/* prefetchDNS */ href);
  preconnectAs('dns-prefetch', href, null);
}

function preconnect(href: string, crossOrigin?: ?CrossOriginEnum) {
  previousDispatcher.C(/* preconnect */ href, crossOrigin);
  preconnectAs('preconnect', href, crossOrigin);
}

function preload(href: string, as: string, options?: ?PreloadImplOptions) {
  previousDispatcher.L(/* preload */ href, as, options);
  const ownerDocument = getGlobalDocument();
  if (ownerDocument && href && as) {
    let preloadSelector = `link[rel="preload"][as="${escapeSelectorAttributeValueInsideDoubleQuotes(
      as,
    )}"]`;
    if (as === 'image') {
      if (options && options.imageSrcSet) {
        preloadSelector += `[imagesrcset="${escapeSelectorAttributeValueInsideDoubleQuotes(
          options.imageSrcSet,
        )}"]`;
        if (typeof options.imageSizes === 'string') {
          preloadSelector += `[imagesizes="${escapeSelectorAttributeValueInsideDoubleQuotes(
            options.imageSizes,
          )}"]`;
        }
      } else {
        preloadSelector += `[href="${escapeSelectorAttributeValueInsideDoubleQuotes(
          href,
        )}"]`;
      }
    } else {
      preloadSelector += `[href="${escapeSelectorAttributeValueInsideDoubleQuotes(
        href,
      )}"]`;
    }
    // Some preloads are keyed under their selector. This happens when the preload is for
    // an arbitrary type. Other preloads are keyed under the resource key they represent a preload for.
    // Here we figure out which key to use to determine if we have a preload already.
    let key = preloadSelector;
    switch (as) {
      case 'style':
        key = getStyleKey(href);
        break;
      case 'script':
        key = getScriptKey(href);
        break;
    }
    if (!preloadPropsMap.has(key)) {
      const preloadProps = Object.assign(
        {
          rel: 'preload',
          // There is a bug in Safari where imageSrcSet is not respected on preload links
          // so we omit the href here if we have imageSrcSet b/c safari will load the wrong image.
          // This harms older browers that do not support imageSrcSet by making their preloads not work
          // but this population is shrinking fast and is already small so we accept this tradeoff.
          href:
            as === 'image' && options && options.imageSrcSet ? undefined : href,
          as,
        } as PreloadProps,
        options,
      );
      preloadPropsMap.set(key, preloadProps);

      if (null === ownerDocument.querySelector(preloadSelector)) {
        if (
          as === 'style' &&
          ownerDocument.querySelector(getStylesheetSelectorFromKey(key))
        ) {
          // We already have a stylesheet for this key. We don't need to preload it.
          return;
        } else if (
          as === 'script' &&
          ownerDocument.querySelector(getScriptSelectorFromKey(key))
        ) {
          // We already have a script for this key. We don't need to preload it.
          return;
        }
        const instance = ownerDocument.createElement('link');
        setInitialProperties(instance, 'link', preloadProps);
        if (as === 'style') {
          // Stash a loading state on the preload link. it will clean itself up once settled
          markNodeAsPendingLoad(instance);
          instance.onload = instance.onerror = () => {
            clearPendingLoadOnNode(instance);
          };
        }
        markNodeAsHoistable(instance);
        (ownerDocument.head as any).appendChild(instance);
      }
    }
  }
}

function preloadModule(href: string, options?: ?PreloadModuleImplOptions) {
  previousDispatcher.m(/* preloadModule */ href, options);
  const ownerDocument = getGlobalDocument();
  if (ownerDocument && href) {
    const as =
      options && typeof options.as === 'string' ? options.as : 'script';
    const preloadSelector = `link[rel="modulepreload"][as="${escapeSelectorAttributeValueInsideDoubleQuotes(
      as,
    )}"][href="${escapeSelectorAttributeValueInsideDoubleQuotes(href)}"]`;
    // Some preloads are keyed under their selector. This happens when the preload is for
    // an arbitrary type. Other preloads are keyed under the resource key they represent a preload for.
    // Here we figure out which key to use to determine if we have a preload already.
    let key = preloadSelector;
    switch (as) {
      case 'audioworklet':
      case 'paintworklet':
      case 'serviceworker':
      case 'sharedworker':
      case 'worker':
      case 'script': {
        key = getScriptKey(href);
        break;
      }
    }

    if (!preloadPropsMap.has(key)) {
      const props: PreloadModuleProps = Object.assign(
        {
          rel: 'modulepreload',
          href,
        } as PreloadModuleProps,
        options,
      );
      preloadPropsMap.set(key, props);

      if (null === ownerDocument.querySelector(preloadSelector)) {
        switch (as) {
          case 'audioworklet':
          case 'paintworklet':
          case 'serviceworker':
          case 'sharedworker':
          case 'worker':
          case 'script': {
            if (ownerDocument.querySelector(getScriptSelectorFromKey(key))) {
              return;
            }
          }
        }
        const instance = ownerDocument.createElement('link');
        setInitialProperties(instance, 'link', props);
        markNodeAsHoistable(instance);
        (ownerDocument.head as any).appendChild(instance);
      }
    }
  }
}

function preinitStyle(
  href: string,
  precedence: ?string,
  options?: ?PreinitStyleOptions,
) {
  previousDispatcher.S(/* preinitStyle */ href, precedence, options);

  const ownerDocument = getGlobalDocument();
  if (ownerDocument && href) {
    const styles = getResourcesFromRoot(ownerDocument).hoistableStyles;

    const key = getStyleKey(href);
    precedence = precedence || 'default';

    // Check if this resource already exists
    let resource = styles.get(key);
    if (resource) {
      // We can early return. The resource exists and there is nothing
      // more to do
      return;
    }

    const state = {
      loading: NotLoaded,
      preload: null,
    };

    // Attempt to hydrate instance from DOM
    let instance: null | Instance = ownerDocument.querySelector(
      getStylesheetSelectorFromKey(key),
    );
    if (instance) {
      state.loading = Loaded | Inserted;
    } else {
      // Construct a new instance and insert it
      const stylesheetProps = Object.assign(
        {
          rel: 'stylesheet',
          href,
          'data-precedence': precedence,
        } as StylesheetProps,
        options,
      );
      const preloadProps = preloadPropsMap.get(key);
      if (preloadProps) {
        adoptPreloadPropsForStylesheet(stylesheetProps, preloadProps);
      }
      const link = (instance = ownerDocument.createElement('link'));
      markNodeAsHoistable(link);
      setInitialProperties(link, 'link', stylesheetProps);

      (link as any)._p = new Promise((resolve, reject) => {
        link.onload = resolve;
        link.onerror = reject;
      });
      link.addEventListener('load', () => {
        state.loading |= Loaded;
      });
      link.addEventListener('error', () => {
        state.loading |= Errored;
      });

      state.loading |= Inserted;
      insertStylesheet(instance, precedence, ownerDocument);
    }

    // Construct a Resource and cache it
    // $FlowFixMe[incompatible-type]
    resource = {
      type: 'stylesheet',
      instance,
      count: 1,
      state,
    };
    // $FlowFixMe[incompatible-type]
    styles.set(key, resource);
    return;
  }
}

function preinitScript(src: string, options?: ?PreinitScriptOptions) {
  previousDispatcher.X(/* preinitScript */ src, options);

  const ownerDocument = getGlobalDocument();
  if (ownerDocument && src) {
    const scripts = getResourcesFromRoot(ownerDocument).hoistableScripts;

    const key = getScriptKey(src);

    // Check if this resource already exists
    let resource = scripts.get(key);
    if (resource) {
      // We can early return. The resource exists and there is nothing
      // more to do
      return;
    }

    // Attempt to hydrate instance from DOM
    let instance: null | Instance = ownerDocument.querySelector(
      getScriptSelectorFromKey(key),
    );
    if (!instance) {
      // Construct a new instance and insert it
      const scriptProps = Object.assign(
        {
          src,
          async: true,
        } as ScriptProps,
        options,
      );
      // Adopt certain preload props
      const preloadProps = preloadPropsMap.get(key);
      if (preloadProps) {
        adoptPreloadPropsForScript(scriptProps, preloadProps);
      }
      instance = ownerDocument.createElement('script');
      markNodeAsHoistable(instance);
      setInitialProperties(instance, 'link', scriptProps);
      (ownerDocument.head as any).appendChild(instance);
    }

    // Construct a Resource and cache it
    resource = {
      type: 'script',
      instance,
      count: 1,
      state: null,
    };
    scripts.set(key, resource);
    return;
  }
}

function preinitModuleScript(
  src: string,
  options?: ?PreinitModuleScriptOptions,
) {
  previousDispatcher.M(/* preinitModuleScript */ src, options);

  const ownerDocument = getGlobalDocument();
  if (ownerDocument && src) {
    const scripts = getResourcesFromRoot(ownerDocument).hoistableScripts;

    const key = getScriptKey(src);

    // Check if this resource already exists
    let resource = scripts.get(key);
    if (resource) {
      // We can early return. The resource exists and there is nothing
      // more to do
      return;
    }

    // Attempt to hydrate instance from DOM
    let instance: null | Instance = ownerDocument.querySelector(
      getScriptSelectorFromKey(key),
    );
    if (!instance) {
      // Construct a new instance and insert it
      const scriptProps = Object.assign(
        {
          src,
          async: true,
          type: 'module',
        } as ScriptProps,
        options,
      );
      // Adopt certain preload props
      const preloadProps = preloadPropsMap.get(key);
      if (preloadProps) {
        adoptPreloadPropsForScript(scriptProps, preloadProps);
      }
      instance = ownerDocument.createElement('script');
      markNodeAsHoistable(instance);
      setInitialProperties(instance, 'link', scriptProps);
      (ownerDocument.head as any).appendChild(instance);
    }

    // Construct a Resource and cache it
    resource = {
      type: 'script',
      instance,
      count: 1,
      state: null,
    };
    scripts.set(key, resource);
    return;
  }
}

type StyleTagQualifyingProps = {
  href: string,
  precedence: string,
  [string]: mixed,
};

type StylesheetQualifyingProps = {
  rel: 'stylesheet',
  href: string,
  precedence: string,
  [string]: mixed,
};

// This function is called in begin work and we should always have a currentDocument set
export function getResource(
  type: string,
  currentProps: any,
  pendingProps: any,
  currentResource: null | Resource,
): null | Resource {
  const resourceRoot = getCurrentResourceRoot();
  if (!resourceRoot) {
    throw new Error(
      '"resourceRoot" was expected to exist. This is a bug in React.',
    );
  }
  switch (type) {
    case 'meta':
    case 'title': {
      return null;
    }
    case 'style': {
      if (
        typeof pendingProps.precedence === 'string' &&
        typeof pendingProps.href === 'string'
      ) {
        const key = getStyleKey(pendingProps.href);
        const styles = getResourcesFromRoot(resourceRoot).hoistableStyles;
        let resource = styles.get(key);
        if (!resource) {
          resource = {
            type: 'style',
            instance: null,
            count: 0,
            state: null,
          };
          styles.set(key, resource);
        }
        return resource;
      }
      return {
        type: 'void',
        instance: null,
        count: 0,
        state: null,
      };
    }
    case 'link': {
      if (
        pendingProps.rel === 'stylesheet' &&
        typeof pendingProps.href === 'string' &&
        typeof pendingProps.precedence === 'string'
      ) {
        const qualifiedProps: StylesheetQualifyingProps = pendingProps;
        const key = getStyleKey(qualifiedProps.href);

        const styles = getResourcesFromRoot(resourceRoot).hoistableStyles;

        let resource = styles.get(key);
        if (!resource) {
          // We asserted this above but Flow can't figure out that the type satisfies
          const ownerDocument = getDocumentFromRoot(resourceRoot);
          resource = {
            type: 'stylesheet',
            instance: null,
            count: 0,
            state: {
              loading: NotLoaded,
              preload: null,
            },
          } as StylesheetResource;
          styles.set(key, resource);
          const instance = ownerDocument.querySelector(
            getStylesheetSelectorFromKey(key),
          );
          if (instance) {
            const loadingState: ?Promise<mixed> = (instance as any)._p;
            if (loadingState) {
              // This instance is inserted as part of a boundary reveal and is not yet
              // loaded
            } else {
              // This instance is already loaded
              resource.instance = instance;
              resource.state.loading = Loaded | Inserted;
            }
          } else {
            // We don't have an instance we need to preload it instead
            // $FlowFixMe[incompatible-type] -- the key we use here can only match non module preloads
            let preloadProps: void | PreloadProps = preloadPropsMap.get(key);
            if (!preloadProps) {
              preloadProps = preloadPropsFromStylesheet(qualifiedProps);
              preloadPropsMap.set(key, preloadProps);
            }

            preloadStylesheet(ownerDocument, key, preloadProps, resource.state);
          }
        }
        if (currentProps && currentResource === null) {
          // This node was previously an Instance type and is becoming a Resource type
          // For now we error because we don't support flavor changes
          let diff = '';
          if (__DEV__) {
            diff = `

  - ${describeLinkForResourceErrorDEV(currentProps)}
  + ${describeLinkForResourceErrorDEV(pendingProps)}`;
          }
          throw new Error(
            'Expected <link> not to update to be updated to a stylesheet with precedence.' +
              ' Check the `rel`, `href`, and `precedence` props of this component.' +
              ' Alternatively, check whether two different <link> components render in the same slot or share the same key.' +
              diff,
          );
        }
        return resource;
      } else {
        if (currentProps && currentResource !== null) {
          // This node was previously a Resource type and is becoming an Instance type
          // For now we error because we don't support flavor changes
          let diff = '';
          if (__DEV__) {
            diff = `

  - ${describeLinkForResourceErrorDEV(currentProps)}
  + ${describeLinkForResourceErrorDEV(pendingProps)}`;
          }
          throw new Error(
            'Expected stylesheet with precedence to not be updated to a different kind of <link>.' +
              ' Check the `rel`, `href`, and `precedence` props of this component.' +
              ' Alternatively, check whether two different <link> components render in the same slot or share the same key.' +
              diff,
          );
        }
        return null;
      }
    }
    case 'script': {
      const async = pendingProps.async;
      const src = pendingProps.src;
      if (
        typeof src === 'string' &&
        async &&
        typeof async !== 'function' &&
        typeof async !== 'symbol'
      ) {
        const key = getScriptKey(src);
        const scripts = getResourcesFromRoot(resourceRoot).hoistableScripts;

        let resource = scripts.get(key);
        if (!resource) {
          resource = {
            type: 'script',
            instance: null,
            count: 0,
            state: null,
          };
          scripts.set(key, resource);
        }
        return resource;
      }
      return {
        type: 'void',
        instance: null,
        count: 0,
        state: null,
      };
    }
    default: {
      throw new Error(
        `getResource encountered a type it did not expect: "${type}". this is a bug in React.`,
      );
    }
  }
}

function describeLinkForResourceErrorDEV(props: any) {
  if (__DEV__) {
    let describedProps = 0;

    let description = '<link';
    if (typeof props.rel === 'string') {
      describedProps++;
      description += ` rel="${props.rel}"`;
    } else if (hasOwnProperty.call(props, 'rel')) {
      describedProps++;
      description += ` rel="${
        props.rel === null ? 'null' : 'invalid type ' + typeof props.rel
      }"`;
    }
    if (typeof props.href === 'string') {
      describedProps++;
      description += ` href="${props.href}"`;
    } else if (hasOwnProperty.call(props, 'href')) {
      describedProps++;
      description += ` href="${
        props.href === null ? 'null' : 'invalid type ' + typeof props.href
      }"`;
    }
    if (typeof props.precedence === 'string') {
      describedProps++;
      description += ` precedence="${props.precedence}"`;
    } else if (hasOwnProperty.call(props, 'precedence')) {
      describedProps++;
      description += ` precedence={${
        props.precedence === null
          ? 'null'
          : 'invalid type ' + typeof props.precedence
      }}`;
    }
    if (Object.getOwnPropertyNames(props).length > describedProps) {
      description += ' ...';
    }
    description += ' />';
    return description;
  }
  return '';
}

function styleTagPropsFromRawProps(
  rawProps: StyleTagQualifyingProps,
): StyleTagProps {
  return {
    ...rawProps,
    'data-href': rawProps.href,
    'data-precedence': rawProps.precedence,
    href: null,
    precedence: null,
  };
}

function getStyleKey(href: string) {
  const limitedEscapedHref =
    escapeSelectorAttributeValueInsideDoubleQuotes(href);
  return `href="${limitedEscapedHref}"`;
}

function getStyleTagSelector(href: string) {
  const limitedEscapedHref =
    escapeSelectorAttributeValueInsideDoubleQuotes(href);
  return `style[data-href~="${limitedEscapedHref}"]`;
}

function getStylesheetSelectorFromKey(key: string) {
  return `link[rel="stylesheet"][${key}]`;
}

function getPreloadStylesheetSelectorFromKey(key: string) {
  return `link[rel="preload"][as="style"][${key}]`;
}

function stylesheetPropsFromRawProps(
  rawProps: StylesheetQualifyingProps,
): StylesheetProps {
  return {
    ...rawProps,
    'data-precedence': rawProps.precedence,
    precedence: null,
  };
}
function preloadStylesheet(
  ownerDocument: Document,
  key: string,
  preloadProps: PreloadProps,
  state: StylesheetState,
) {
  let instance = ownerDocument.querySelector(
    getPreloadStylesheetSelectorFromKey(key),
  );
  if (instance) {
    if (!isNodePendingLoad(instance)) {
      // If we find a preload already it was SSR'd and we won't have an actual
      // loading state to track. For now we will just assume it is loaded
      state.loading = Loaded;
      return;
    } else {
      // fall through and attach loading listeners
    }
  } else {
    instance = ownerDocument.createElement('link');
    markNodeAsPendingLoad(instance);
    instance.onload = instance.onerror = clearPendingLoadOnNode.bind(
      null,
      instance,
    );
    setInitialProperties(instance, 'link', preloadProps);
    markNodeAsHoistable(instance);
    (ownerDocument.head as any).appendChild(instance);
  }
  // $FlowFixMe[incompatible-type] -- if instance is an Element it will also be an HTMLLinkElement
  state.preload = instance;
  instance.addEventListener('load', () => (state.loading |= Loaded));
  instance.addEventListener('error', () => (state.loading |= Errored));
}

function preloadPropsFromStylesheet(
  props: StylesheetQualifyingProps,
): PreloadProps {
  return {
    rel: 'preload',
    as: 'style',
    href: props.href,
    crossOrigin: props.crossOrigin,
    integrity: props.integrity,
    media: props.media,
    hrefLang: props.hrefLang,
    referrerPolicy: props.referrerPolicy,
  };
}

function getScriptKey(src: string): string {
  const limitedEscapedSrc = escapeSelectorAttributeValueInsideDoubleQuotes(src);
  return `[src="${limitedEscapedSrc}"]`;
}

function getScriptSelectorFromKey(key: string): string {
  return 'script[async]' + key;
}

export function acquireResource(
  hoistableRoot: HoistableRoot,
  resource: Resource,
  props: any,
): null | Instance {
  resource.count++;
  if (resource.instance === null) {
    switch (resource.type) {
      case 'style': {
        const qualifiedProps: StyleTagQualifyingProps = props;

        // Attempt to hydrate instance from DOM
        let instance: null | Instance = hoistableRoot.querySelector(
          getStyleTagSelector(qualifiedProps.href),
        );
        if (instance) {
          resource.instance = instance;
          markNodeAsHoistable(instance);
          return instance;
        }

        const styleProps = styleTagPropsFromRawProps(props);
        const ownerDocument = getDocumentFromRoot(hoistableRoot);
        instance = ownerDocument.createElement('style');

        markNodeAsHoistable(instance);
        setInitialProperties(instance, 'style', styleProps);

        // TODO: `style` does not have loading state for tracking insertions. I
        // guess because these aren't suspensey? Not sure whether this is a
        // factoring smell.
        // resource.state.loading |= Inserted;
        insertStylesheet(instance, qualifiedProps.precedence, hoistableRoot);
        resource.instance = instance;

        return instance;
      }
      case 'stylesheet': {
        // This typing is enforce by `getResource`. If we change the logic
        // there for what qualifies as a stylesheet resource we need to ensure
        // this cast still makes sense;
        const qualifiedProps: StylesheetQualifyingProps = props;
        const key = getStyleKey(qualifiedProps.href);

        // Attempt to hydrate instance from DOM
        let instance: null | Instance = hoistableRoot.querySelector(
          getStylesheetSelectorFromKey(key),
        );
        if (instance) {
          resource.state.loading |= Inserted;
          resource.instance = instance;
          markNodeAsHoistable(instance);
          return instance;
        }

        const stylesheetProps = stylesheetPropsFromRawProps(props);
        const preloadProps = preloadPropsMap.get(key);
        if (preloadProps) {
          adoptPreloadPropsForStylesheet(stylesheetProps, preloadProps);
        }

        // Construct and insert a new instance
        const ownerDocument = getDocumentFromRoot(hoistableRoot);
        instance = ownerDocument.createElement('link');
        markNodeAsHoistable(instance);
        const linkInstance: HTMLLinkElement = instance as any;
        (linkInstance as any)._p = new Promise((resolve, reject) => {
          linkInstance.onload = resolve;
          linkInstance.onerror = reject;
        });
        setInitialProperties(instance, 'link', stylesheetProps);
        resource.state.loading |= Inserted;
        insertStylesheet(instance, qualifiedProps.precedence, hoistableRoot);
        resource.instance = instance;

        return instance;
      }
      case 'script': {
        // This typing is enforce by `getResource`. If we change the logic
        // there for what qualifies as a stylesheet resource we need to ensure
        // this cast still makes sense;
        const borrowedScriptProps: ScriptProps = props;
        const key = getScriptKey(borrowedScriptProps.src);

        // Attempt to hydrate instance from DOM
        let instance: null | Instance = hoistableRoot.querySelector(
          getScriptSelectorFromKey(key),
        );
        if (instance) {
          resource.instance = instance;
          markNodeAsHoistable(instance);
          return instance;
        }

        let scriptProps = borrowedScriptProps;
        const preloadProps = preloadPropsMap.get(key);
        if (preloadProps) {
          scriptProps = {...borrowedScriptProps};
          adoptPreloadPropsForScript(scriptProps, preloadProps);
        }

        // Construct and insert a new instance
        const ownerDocument = getDocumentFromRoot(hoistableRoot);
        instance = ownerDocument.createElement('script');
        markNodeAsHoistable(instance);
        setInitialProperties(instance, 'link', scriptProps);
        (ownerDocument.head as any).appendChild(instance);
        resource.instance = instance;

        return instance;
      }
      case 'void': {
        return null;
      }
      default: {
        throw new Error(
          `acquireResource encountered a resource type it did not expect: "${resource.type}". this is a bug in React.`,
        );
      }
    }
  } else {
    // In the case of stylesheets, they might have already been assigned an
    // instance during `suspendResource`. But that doesn't mean they were
    // inserted, because the commit might have been interrupted. So we need to
    // check now.
    //
    // The other resource types are unaffected because they are not
    // yet suspensey.
    //
    // TODO: This is a bit of a code smell. Consider refactoring how
    // `suspendResource` and `acquireResource` work together. The idea is that
    // `suspendResource` does all the same stuff as `acquireResource` except
    // for the insertion.
    if (
      resource.type === 'stylesheet' &&
      (resource.state.loading & Inserted) === NotLoaded
    ) {
      const qualifiedProps: StylesheetQualifyingProps = props;
      const instance: Instance = resource.instance;
      resource.state.loading |= Inserted;
      insertStylesheet(instance, qualifiedProps.precedence, hoistableRoot);
    }
  }
  return resource.instance;
}

export function releaseResource(resource: Resource): void {
  resource.count--;
}

function insertStylesheet(
  instance: Element,
  precedence: string,
  root: HoistableRoot,
): void {
  const nodes = root.querySelectorAll(
    'link[rel="stylesheet"][data-precedence],style[data-precedence]',
  );
  const last = nodes.length ? nodes[nodes.length - 1] : null;
  let prior = last;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    // $FlowFixMe[prop-missing]
    const nodePrecedence = node.dataset.precedence;
    if (nodePrecedence === precedence) {
      prior = node;
    } else if (prior !== last) {
      break;
    }
  }

  if (prior) {
    // We get the prior from the document so we know it is in the tree.
    // We also know that links can't be the topmost Node so the parentNode
    // must exist.
    (prior.parentNode as any as Node).insertBefore(instance, prior.nextSibling);
  } else {
    const parent =
      root.nodeType === DOCUMENT_NODE
        ? ((root as any as Document).head as any as Element)
        : (root as any as ShadowRoot);
    parent.insertBefore(instance, parent.firstChild);
  }
}

function adoptPreloadPropsForStylesheet(
  stylesheetProps: StylesheetProps,
  preloadProps: PreloadProps | PreloadModuleProps,
): void {
  if (stylesheetProps.crossOrigin == null)
    stylesheetProps.crossOrigin = preloadProps.crossOrigin;
  if (stylesheetProps.referrerPolicy == null)
    stylesheetProps.referrerPolicy = preloadProps.referrerPolicy;
  if (stylesheetProps.title == null) stylesheetProps.title = preloadProps.title;
}

function adoptPreloadPropsForScript(
  scriptProps: ScriptProps,
  preloadProps: PreloadProps | PreloadModuleProps,
): void {
  if (scriptProps.crossOrigin == null)
    scriptProps.crossOrigin = preloadProps.crossOrigin;
  if (scriptProps.referrerPolicy == null)
    scriptProps.referrerPolicy = preloadProps.referrerPolicy;
  if (scriptProps.integrity == null)
    scriptProps.integrity = preloadProps.integrity;
}

type KeyedTagCache = Map<string, Array<Element>>;
type DocumentTagCaches = Map<Document, KeyedTagCache>;
let tagCaches: null | DocumentTagCaches = null;

export function hydrateHoistable(
  hoistableRoot: HoistableRoot,
  type: HoistableTagType,
  props: any,
  internalInstanceHandle: Object,
): Instance {
  const ownerDocument = getDocumentFromRoot(hoistableRoot);

  let instance: ?Instance = null;
  getInstance: switch (type) {
    case 'title': {
      instance = ownerDocument.getElementsByTagName('title')[0];
      if (
        !instance ||
        isOwnedInstance(instance) ||
        instance.namespaceURI === SVG_NAMESPACE ||
        instance.hasAttribute('itemprop')
      ) {
        instance = ownerDocument.createElement(type);
        (ownerDocument.head as any).insertBefore(
          instance,
          ownerDocument.querySelector('head > title'),
        );
      }
      setInitialProperties(instance, type, props);
      precacheFiberNode(internalInstanceHandle, instance);
      markNodeAsHoistable(instance);
      return instance;
    }
    case 'link': {
      const cache = getHydratableHoistableCache('link', 'href', ownerDocument);
      const key = type + (props.href || '');
      const maybeNodes = cache.get(key);
      if (maybeNodes) {
        const nodes = maybeNodes;
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (
            node.getAttribute('href') !==
              (props.href == null || props.href === '' ? null : props.href) ||
            node.getAttribute('rel') !==
              (props.rel == null ? null : props.rel) ||
            node.getAttribute('title') !==
              (props.title == null ? null : props.title) ||
            node.getAttribute('crossorigin') !==
              (props.crossOrigin == null ? null : props.crossOrigin)
          ) {
            // mismatch, try the next node;
            continue;
          }
          instance = node;
          nodes.splice(i, 1);
          break getInstance;
        }
      }
      instance = ownerDocument.createElement(type);
      setInitialProperties(instance, type, props);
      (ownerDocument.head as any).appendChild(instance);
      break;
    }
    case 'meta': {
      const cache = getHydratableHoistableCache(
        'meta',
        'content',
        ownerDocument,
      );
      const key = type + (props.content || '');
      const maybeNodes = cache.get(key);
      if (maybeNodes) {
        const nodes = maybeNodes;
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];

          // We coerce content to string because it is the most likely one to
          // use a `toString` capable value. For the rest we just do identity match
          // passing non-strings here is not really valid anyway.
          if (__DEV__) {
            checkAttributeStringCoercion(props.content, 'content');
          }
          if (
            node.getAttribute('content') !==
              (props.content == null ? null : '' + props.content) ||
            node.getAttribute('name') !==
              (props.name == null ? null : props.name) ||
            node.getAttribute('property') !==
              (props.property == null ? null : props.property) ||
            node.getAttribute('http-equiv') !==
              (props.httpEquiv == null ? null : props.httpEquiv) ||
            node.getAttribute('charset') !==
              (props.charSet == null ? null : props.charSet)
          ) {
            // mismatch, try the next node;
            continue;
          }
          instance = node;
          nodes.splice(i, 1);
          break getInstance;
        }
      }
      instance = ownerDocument.createElement(type);
      setInitialProperties(instance, type, props);
      (ownerDocument.head as any).appendChild(instance);
      break;
    }
    default:
      throw new Error(
        `getNodesForType encountered a type it did not expect: "${type}". This is a bug in React.`,
      );
  }

  // This node is a match
  precacheFiberNode(internalInstanceHandle, instance);
  markNodeAsHoistable(instance);
  return instance;
}

function getHydratableHoistableCache(
  type: HoistableTagType,
  keyAttribute: string,
  ownerDocument: Document,
): KeyedTagCache {
  let cache: KeyedTagCache;
  let caches: DocumentTagCaches;
  if (tagCaches === null) {
    cache = new Map();
    caches = tagCaches = new Map();
    caches.set(ownerDocument, cache);
  } else {
    caches = tagCaches;
    const maybeCache = caches.get(ownerDocument);
    if (!maybeCache) {
      cache = new Map();
      caches.set(ownerDocument, cache);
    } else {
      cache = maybeCache;
    }
  }

  if (cache.has(type)) {
    // We use type as a special key that signals that this cache has been seeded for this type
    return cache;
  }

  // Mark this cache as seeded for this type
  cache.set(type, null as any);

  const nodes = ownerDocument.getElementsByTagName(type);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (
      !isOwnedInstance(node) &&
      (type !== 'link' || node.getAttribute('rel') !== 'stylesheet') &&
      node.namespaceURI !== SVG_NAMESPACE
    ) {
      const nodeKey = node.getAttribute(keyAttribute) || '';
      const key = type + nodeKey;
      const existing = cache.get(key);
      if (existing) {
        existing.push(node);
      } else {
        cache.set(key, [node]);
      }
    }
  }

  return cache;
}

export function mountHoistable(
  hoistableRoot: HoistableRoot,
  type: HoistableTagType,
  instance: Instance,
): void {
  const ownerDocument = getDocumentFromRoot(hoistableRoot);
  (ownerDocument.head as any).insertBefore(
    instance,
    type === 'title' ? ownerDocument.querySelector('head > title') : null,
  );
}

export function unmountHoistable(instance: Instance): void {
  (instance.parentNode as any).removeChild(instance);
}

export function isHostHoistableType(
  type: string,
  props: RawProps,
  hostContext: HostContext,
): boolean {
  let outsideHostContainerContext: boolean;
  let hostContextProd: HostContextProd;
  if (__DEV__) {
    const hostContextDev: HostContextDev = hostContext as any;
    // We can only render resources when we are not within the host container context
    outsideHostContainerContext =
      !hostContextDev.ancestorInfo.containerTagInScope;
    hostContextProd = hostContextDev.context;
  } else {
    hostContextProd = hostContext as any;
  }

  // Global opt out of hoisting for anything in SVG Namespace or anything with an itemProp inside an itemScope
  if (hostContextProd === HostContextNamespaceSvg || props.itemProp != null) {
    if (__DEV__) {
      if (
        outsideHostContainerContext &&
        props.itemProp != null &&
        (type === 'meta' ||
          type === 'title' ||
          type === 'style' ||
          type === 'link' ||
          type === 'script')
      ) {
        console.error(
          'Cannot render a <%s> outside the main document if it has an `itemProp` prop. `itemProp` suggests the tag belongs to an' +
            ' `itemScope` which can appear anywhere in the DOM. If you were intending for React to hoist this <%s> remove the `itemProp` prop.' +
            ' Otherwise, try moving this tag into the <head> or <body> of the Document.',
          type,
          type,
        );
      }
    }
    return false;
  }

  switch (type) {
    case 'meta':
    case 'title': {
      return true;
    }
    case 'style': {
      if (
        typeof props.precedence !== 'string' ||
        typeof props.href !== 'string' ||
        props.href === ''
      ) {
        if (__DEV__) {
          if (outsideHostContainerContext) {
            console.error(
              'Cannot render a <style> outside the main document without knowing its precedence and a unique href key.' +
                ' React can hoist and deduplicate <style> tags if you provide a `precedence` prop along with an `href` prop that' +
                ' does not conflict with the `href` values used in any other hoisted <style> or <link rel="stylesheet" ...> tags. ' +
                ' Note that hoisting <style> tags is considered an advanced feature that most will not use directly.' +
                ' Consider moving the <style> tag to the <head> or consider adding a `precedence="default"` and `href="some unique resource identifier"`.',
            );
          }
        }
        return false;
      }
      return true;
    }
    case 'link': {
      if (
        typeof props.rel !== 'string' ||
        typeof props.href !== 'string' ||
        props.href === '' ||
        props.onLoad ||
        props.onError
      ) {
        if (__DEV__) {
          if (
            props.rel === 'stylesheet' &&
            typeof props.precedence === 'string'
          ) {
            validateLinkPropsForStyleResource(props);
          }
          if (outsideHostContainerContext) {
            if (
              typeof props.rel !== 'string' ||
              typeof props.href !== 'string' ||
              props.href === ''
            ) {
              console.error(
                'Cannot render a <link> outside the main document without a `rel` and `href` prop.' +
                  ' Try adding a `rel` and/or `href` prop to this <link> or moving the link into the <head> tag',
              );
            } else if (props.onError || props.onLoad) {
              console.error(
                'Cannot render a <link> with onLoad or onError listeners outside the main document.' +
                  ' Try removing onLoad={...} and onError={...} or moving it into the root <head> tag or' +
                  ' somewhere in the <body>.',
              );
            }
          }
        }
        return false;
      }
      switch (props.rel) {
        case 'stylesheet': {
          const {precedence, disabled} = props;
          if (__DEV__) {
            if (typeof precedence !== 'string') {
              if (outsideHostContainerContext) {
                console.error(
                  'Cannot render a <link rel="stylesheet" /> outside the main document without knowing its precedence.' +
                    ' Consider adding precedence="default" or moving it into the root <head> tag.',
                );
              }
            }
          }
          return typeof precedence === 'string' && disabled == null;
        }
        default: {
          return true;
        }
      }
    }
    case 'script': {
      const isAsync =
        props.async &&
        typeof props.async !== 'function' &&
        typeof props.async !== 'symbol';
      if (
        !isAsync ||
        props.onLoad ||
        props.onError ||
        !props.src ||
        typeof props.src !== 'string'
      ) {
        if (__DEV__) {
          if (outsideHostContainerContext) {
            if (!isAsync) {
              console.error(
                'Cannot render a sync or defer <script> outside the main document without knowing its order.' +
                  ' Try adding async="" or moving it into the root <head> tag.',
              );
            } else if (props.onLoad || props.onError) {
              console.error(
                'Cannot render a <script> with onLoad or onError listeners outside the main document.' +
                  ' Try removing onLoad={...} and onError={...} or moving it into the root <head> tag or' +
                  ' somewhere in the <body>.',
              );
            } else {
              console.error(
                'Cannot render a <script> outside the main document without `async={true}` and a non-empty `src` prop.' +
                  ' Ensure there is a valid `src` and either make the script async or move it into the root <head> tag or' +
                  ' somewhere in the <body>.',
              );
            }
          }
        }
        return false;
      }
      return true;
    }
    case 'noscript':
    case 'template': {
      if (__DEV__) {
        if (outsideHostContainerContext) {
          console.error(
            'Cannot render <%s> outside the main document. Try moving it into the root <head> tag.',
            type,
          );
        }
      }
      return false;
    }
  }
  return false;
}

export function maySuspendCommit(type: Type, props: Props): boolean {
  if (!enableSuspenseyImages && !enableViewTransition) {
    return false;
  }
  // Suspensey images are the default, unless you opt-out of with either
  // loading="lazy" or onLoad={...} which implies you're ok waiting.
  return (
    type === 'img' &&
    props.src != null &&
    props.src !== '' &&
    props.onLoad == null &&
    props.loading !== 'lazy'
  );
}

export function maySuspendCommitOnUpdate(
  type: Type,
  oldProps: Props,
  newProps: Props,
): boolean {
  return (
    maySuspendCommit(type, newProps) &&
    (newProps.src !== oldProps.src || newProps.srcSet !== oldProps.srcSet)
  );
}

export function maySuspendCommitInSyncRender(
  type: Type,
  props: Props,
): boolean {
  // TODO: Allow sync lanes to suspend too with an opt-in.
  return false;
}

export function mayResourceSuspendCommit(resource: Resource): boolean {
  return (
    resource.type === 'stylesheet' &&
    (resource.state.loading & Inserted) === NotLoaded
  );
}

export function preloadInstance(
  instance: Instance,
  type: Type,
  props: Props,
): boolean {
  // We don't need to preload Suspensey images because the browser will
  // load them early once we set the src.
  // If we return true here, we'll still get a suspendInstance call in the
  // pre-commit phase to determine if we still need to decode the image or
  // if was dropped from cache. This just avoids rendering Suspense fallback.
  return !!(instance as any).complete;
}

export function preloadResource(resource: Resource): boolean {
  if (
    resource.type === 'stylesheet' &&
    (resource.state.loading & Settled) === NotLoaded
  ) {
    // Return false to indicate this resource should suspend
    return false;
  }

  // Return true to indicate this resource should not suspend
  return true;
}

export opaque type SuspendedState = {
  stylesheets: null | Map<StylesheetResource, HoistableRoot>,
  count: number, // suspensey css and active view transitions
  imgCount: number, // suspensey images pending to load
  imgBytes: number, // number of bytes we estimate needing to download
  suspenseyImages: Array<HTMLImageElement>, // instances of suspensey images (whether loaded or not)
  waitingForImages: boolean, // false when we're no longer blocking on images
  waitingForViewTransition: boolean,
  unsuspend: null | (() => void),
};

export function startSuspendingCommit(): SuspendedState {
  return {
    stylesheets: null,
    count: 0,
    imgCount: 0,
    imgBytes: 0,
    suspenseyImages: [],
    waitingForImages: true,
    waitingForViewTransition: false,
    // We use a noop function when we begin suspending because if possible we want the
    // waitfor step to finish synchronously. If it doesn't we'll return a function to
    // provide the actual unsuspend function and that will get completed when the count
    // hits zero or it will get cancelled if the root starts new work.
    unsuspend: noop,
  };
}

function estimateImageBytes(instance: HTMLImageElement): number {
  const width: number = instance.width || 100;
  const height: number = instance.height || 100;
  const pixelRatio: number =
    typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  const pixelsToDownload = width * height * pixelRatio;
  const AVERAGE_BYTE_PER_PIXEL = 0.25;
  return pixelsToDownload * AVERAGE_BYTE_PER_PIXEL;
}

export function suspendInstance(
  state: SuspendedState,
  instance: Instance,
  type: Type,
  props: Props,
): void {
  if (!enableSuspenseyImages && !enableViewTransition) {
    return;
  }
  if (
    // $FlowFixMe[prop-missing]
    typeof instance.decode === 'function'
  ) {
    // If this browser supports decode() API, we use it to suspend waiting on the image.
    // The loading should have already started at this point, so it should be enough to
    // just call decode() which should also wait for the data to finish loading.
    state.imgCount++;
    // Estimate the byte size that we're about to download based on the width/height
    // specified in the props. This is best practice to know ahead of time but if it's
    // unspecified we'll fallback to a guess of 100x100 pixels.
    if (!(instance as any).complete) {
      state.imgBytes += estimateImageBytes(instance as any);
      state.suspenseyImages.push(instance as any);
    }
    const ping = onUnsuspendImg.bind(state);
    // $FlowFixMe[prop-missing]
    instance.decode().then(ping, ping);
  }
}

export function suspendResource(
  state: SuspendedState,
  hoistableRoot: HoistableRoot,
  resource: Resource,
  props: any,
): void {
  if (resource.type === 'stylesheet') {
    if (typeof props.media === 'string') {
      // If we don't currently match media we avoid suspending on this resource
      // and let it insert on the mutation path
      if (matchMedia(props.media).matches === false) {
        return;
      }
    }
    if ((resource.state.loading & Inserted) === NotLoaded) {
      if (resource.instance === null) {
        const qualifiedProps: StylesheetQualifyingProps = props;
        const key = getStyleKey(qualifiedProps.href);

        // Attempt to hydrate instance from DOM
        let instance: null | Instance = hoistableRoot.querySelector(
          getStylesheetSelectorFromKey(key),
        );
        if (instance) {
          // If this instance has a loading state it came from the Fizz runtime.
          // If there is not loading state it is assumed to have been server rendered
          // as part of the preamble and therefore synchronously loaded. It could have
          // errored however which we still do not yet have a means to detect. For now
          // we assume it is loaded.
          const maybeLoadingState: ?Promise<mixed> = (instance as any)._p;
          if (
            maybeLoadingState !== null &&
            typeof maybeLoadingState === 'object' &&
            // $FlowFixMe[method-unbinding]
            typeof maybeLoadingState.then === 'function'
          ) {
            const loadingState = maybeLoadingState;
            state.count++;
            const ping = onUnsuspend.bind(state);
            loadingState.then(ping, ping);
          }
          resource.state.loading |= Inserted;
          resource.instance = instance;
          markNodeAsHoistable(instance);
          return;
        }

        const ownerDocument = getDocumentFromRoot(hoistableRoot);

        const stylesheetProps = stylesheetPropsFromRawProps(props);
        const preloadProps = preloadPropsMap.get(key);
        if (preloadProps) {
          adoptPreloadPropsForStylesheet(stylesheetProps, preloadProps);
        }

        // Construct and insert a new instance
        instance = ownerDocument.createElement('link');
        markNodeAsHoistable(instance);
        const linkInstance: HTMLLinkElement = instance as any;
        // This Promise is a loading state used by the Fizz runtime. We need this incase there is a race
        // between this resource being rendered on the client and being rendered with a late completed boundary.
        (linkInstance as any)._p = new Promise((resolve, reject) => {
          linkInstance.onload = resolve;
          linkInstance.onerror = reject;
        });
        setInitialProperties(instance, 'link', stylesheetProps);
        resource.instance = instance;
      }

      if (state.stylesheets === null) {
        state.stylesheets = new Map();
      }
      state.stylesheets.set(resource, hoistableRoot);

      const preloadEl = resource.state.preload;
      if (preloadEl && (resource.state.loading & Settled) === NotLoaded) {
        state.count++;
        const ping = onUnsuspend.bind(state);
        preloadEl.addEventListener('load', ping);
        preloadEl.addEventListener('error', ping);
      }
    }
  }
}

export function suspendOnActiveViewTransition(
  state: SuspendedState,
  rootContainer: Container,
): void {
  const ownerDocument =
    rootContainer.nodeType === DOCUMENT_NODE
      ? rootContainer
      : rootContainer.ownerDocument;
  // $FlowFixMe[prop-missing]
  const activeViewTransition = ownerDocument.__reactViewTransition;
  if (activeViewTransition == null) {
    return;
  }
  state.count++;
  state.waitingForViewTransition = true;
  const ping = onUnsuspend.bind(state);
  activeViewTransition.finished.then(ping, ping);
}

const SUSPENSEY_STYLESHEET_TIMEOUT = 60000;

const SUSPENSEY_IMAGE_TIMEOUT = 800;

const SUSPENSEY_IMAGE_TIME_ESTIMATE = 500;

let estimatedBytesWithinLimit: number = 0;

export function waitForCommitToBeReady(
  state: SuspendedState,
  timeoutOffset: number,
): null | ((() => void) => () => void) {
  if (state.stylesheets && state.count === 0) {
    // We are not currently blocked but we have not inserted all stylesheets.
    // If this insertion happens and loads or errors synchronously then we can
    // avoid suspending the commit. To do this we check the count again immediately after
    insertSuspendedStylesheets(state, state.stylesheets);
  }

  // We need to check the count again because the inserted stylesheets may have led to new
  // tasks to wait on.
  if (state.count > 0 || state.imgCount > 0) {
    return commit => {
      // We almost never want to show content before its styles have loaded. But
      // eventually we will give up and allow unstyled content. So this number is
      // somewhat arbitrary — big enough that you'd only reach it under
      // extreme circumstances.
      // TODO: Figure out what the browser engines do during initial page load and
      // consider aligning our behavior with that.
      const stylesheetTimer = setTimeout(() => {
        if (state.stylesheets) {
          insertSuspendedStylesheets(state, state.stylesheets);
        }
        if (state.unsuspend) {
          const unsuspend = state.unsuspend;
          state.unsuspend = null;
          unsuspend();
        }
      }, SUSPENSEY_STYLESHEET_TIMEOUT + timeoutOffset);

      if (state.imgBytes > 0 && estimatedBytesWithinLimit === 0) {
        // Estimate how many bytes we can download in 500ms.
        const mbps = estimateBandwidth();
        estimatedBytesWithinLimit = mbps * 125 * SUSPENSEY_IMAGE_TIME_ESTIMATE;
      }
      // If we have more images to download than we expect to fit in the timeout, then
      // don't wait for images longer than 50ms. The 50ms lets us still do decoding and
      // hitting caches if it turns out that they're already in the HTTP cache.
      const imgTimeout =
        state.imgBytes > estimatedBytesWithinLimit
          ? 50
          : SUSPENSEY_IMAGE_TIMEOUT;
      const imgTimer = setTimeout(() => {
        // We're no longer blocked on images. If CSS resolves after this we can commit.
        state.waitingForImages = false;
        if (state.count === 0) {
          if (state.stylesheets) {
            insertSuspendedStylesheets(state, state.stylesheets);
          }
          if (state.unsuspend) {
            const unsuspend = state.unsuspend;
            state.unsuspend = null;
            unsuspend();
          }
        }
      }, imgTimeout + timeoutOffset);

      state.unsuspend = commit;

      return () => {
        state.unsuspend = null;
        clearTimeout(stylesheetTimer);
        clearTimeout(imgTimer);
      };
    };
  }
  return null;
}

export function getSuspendedCommitReason(
  state: SuspendedState,
  rootContainer: Container,
): null | string {
  if (state.waitingForViewTransition) {
    return 'Waiting for the previous Animation';
  }
  if (state.count > 0) {
    if (state.imgCount > 0) {
      return 'Suspended on CSS and Images';
    }
    return 'Suspended on CSS';
  }
  if (state.imgCount === 1) {
    return 'Suspended on an Image';
  }
  if (state.imgCount > 0) {
    return 'Suspended on Images';
  }
  return null;
}

function checkIfFullyUnsuspended(state: SuspendedState) {
  if (state.count === 0 && (state.imgCount === 0 || !state.waitingForImages)) {
    if (state.stylesheets) {
      // If we haven't actually inserted the stylesheets yet we need to do so now before starting the commit.
      // The reason we do this after everything else has finished is because we want to have all the stylesheets
      // load synchronously right before mutating. Ideally the new styles will cause a single recalc only on the
      // new tree. When we filled up stylesheets we only inlcuded stylesheets with matching media attributes so we
      // wait for them to load before actually continuing. We expect this to increase the count above zero
      insertSuspendedStylesheets(state, state.stylesheets);
    } else if (state.unsuspend) {
      const unsuspend = state.unsuspend;
      state.unsuspend = null;
      unsuspend();
    }
  }
}

function onUnsuspend(this: SuspendedState) {
  this.count--;
  checkIfFullyUnsuspended(this);
}

function onUnsuspendImg(this: SuspendedState) {
  this.imgCount--;
  checkIfFullyUnsuspended(this);
}

// We use a value that is type distinct from precedence to track which one is last.
// This ensures there is no collision with user defined precedences. Normally we would
// just track this in module scope but since the precedences are tracked per HoistableRoot
// we need to associate it to something other than a global scope hence why we try to
// colocate it with the map of precedences in the first place
const LAST_PRECEDENCE = null;

// This is typecast to non-null because it will always be set before read.
// it is important that this not be used except when the stack guarantees it exists.
// Currentlyt his is only during insertSuspendedStylesheet.
let precedencesByRoot: Map<
  HoistableRoot,
  Map<string | typeof LAST_PRECEDENCE, Instance>,
> = null as any;

function insertSuspendedStylesheets(
  state: SuspendedState,
  resources: Map<StylesheetResource, HoistableRoot>,
): void {
  // We need to clear this out so we don't try to reinsert after the stylesheets have loaded
  state.stylesheets = null;

  if (state.unsuspend === null) {
    // The suspended commit was cancelled. We don't need to insert any stylesheets.
    return;
  }

  // Temporarily increment count. we don't want any synchronously loaded stylesheets to try to unsuspend
  // before we finish inserting all stylesheets.
  state.count++;

  precedencesByRoot = new Map();
  resources.forEach(insertStylesheetIntoRoot, state);
  precedencesByRoot = null as any;

  // We can remove our temporary count and if we're still at zero we can unsuspend.
  // If we are in the synchronous phase before deciding if the commit should suspend and this
  // ends up hitting the unsuspend path it will just invoke the noop unsuspend.
  onUnsuspend.call(state);
}

function insertStylesheetIntoRoot(
  this: SuspendedState,
  root: HoistableRoot,
  resource: StylesheetResource,
  map: Map<StylesheetResource, HoistableRoot>,
) {
  if (resource.state.loading & Inserted) {
    // This resource was inserted by another root committing. we don't need to insert it again
    return;
  }

  let last;
  let precedences = precedencesByRoot.get(root);
  if (!precedences) {
    precedences = new Map();
    precedencesByRoot.set(root, precedences);
    const nodes = root.querySelectorAll(
      'link[data-precedence],style[data-precedence]',
    );
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (
        node.nodeName === 'LINK' ||
        // We omit style tags with media="not all" because they are not in the right position
        // and will be hoisted by the Fizz runtime imminently.
        node.getAttribute('media') !== 'not all'
      ) {
        precedences.set(
          // $FlowFixMe[prop-missing]
          node.dataset.precedence,
          node,
        );
        last = node;
      }
    }
    if (last) {
      precedences.set(LAST_PRECEDENCE, last);
    }
  } else {
    last = precedences.get(LAST_PRECEDENCE);
  }

  // We only call this after we have constructed an instance so we assume it here
  const instance: HTMLLinkElement = resource.instance as any;
  // We will always have a precedence for stylesheet instances
  const precedence: string = instance.getAttribute('data-precedence') as any;

  const prior = precedences.get(precedence) || last;
  if (prior === last) {
    precedences.set(LAST_PRECEDENCE, instance);
  }
  precedences.set(precedence, instance);

  this.count++;
  const onComplete = onUnsuspend.bind(this);
  instance.addEventListener('load', onComplete);
  instance.addEventListener('error', onComplete);

  if (prior) {
    (prior.parentNode as any).insertBefore(instance, prior.nextSibling);
  } else {
    const parent =
      root.nodeType === DOCUMENT_NODE
        ? ((root as any as Document).head as any as Element)
        : (root as any as ShadowRoot);
    parent.insertBefore(instance, parent.firstChild);
  }
  resource.state.loading |= Inserted;
}

export const NotPendingTransition: TransitionStatus = NotPending;
export const HostTransitionContext: ReactContext<TransitionStatus> = {
  $$typeof: REACT_CONTEXT_TYPE,
  Provider: null as any,
  Consumer: null as any,
  _currentValue: NotPendingTransition,
  _currentValue2: NotPendingTransition,
  _threadCount: 0,
};

export type FormInstance = HTMLFormElement;
export function resetFormInstance(form: FormInstance): void {
  ReactBrowserEventEmitterSetEnabled(true);
  form.reset();
  ReactBrowserEventEmitterSetEnabled(false);
}
