/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  ElementTypeClass,
  ElementTypeFunction,
  ElementTypeRoot,
  ElementTypeHostComponent,
  ElementTypeOtherOrUnknown,
} from 'react-devtools-shared/src/frontend/types';
import {getUID, utfEncodeString, printOperationsArray} from '../../utils';
import {
  cleanForBridge,
  copyWithDelete,
  copyWithRename,
  copyWithSet,
  serializeToString,
} from '../utils';
import {
  deletePathInObject,
  getDisplayName,
  getInObject,
  renamePathInObject,
  setInObject,
} from 'react-devtools-shared/src/utils';
import {
  __DEBUG__,
  TREE_OPERATION_ADD,
  TREE_OPERATION_REMOVE,
  TREE_OPERATION_REORDER_CHILDREN,
  SUSPENSE_TREE_OPERATION_ADD,
  SUSPENSE_TREE_OPERATION_REMOVE,
  UNKNOWN_SUSPENDERS_NONE,
} from '../../constants';
import {decorateMany, forceUpdate, restoreMany} from './utils';

import type {
  DevToolsHook,
  GetElementIDForHostInstance,
  InspectedElementPayload,
  InstanceAndStyle,
  HostInstance,
  PathFrame,
  PathMatch,
  RendererInterface,
} from '../types';
import type {
  ComponentFilter,
  ElementType,
} from 'react-devtools-shared/src/frontend/types';
import type {InspectedElement, SerializedElement} from '../types';

export type InternalInstance = Object;
type LegacyRenderer = Object;

function getData(internalInstance: InternalInstance) {
  let displayName = null;
  let key = null;

  // != used deliberately here to catch undefined and null
  if (internalInstance._currentElement != null) {
    if (internalInstance._currentElement.key) {
      key = String(internalInstance._currentElement.key);
    }

    const elementType = internalInstance._currentElement.type;
    if (typeof elementType === 'string') {
      displayName = elementType;
    } else if (typeof elementType === 'function') {
      displayName = getDisplayName(elementType);
    }
  }

  return {
    displayName,
    key,
  };
}

function getElementType(internalInstance: InternalInstance): ElementType {
  // != used deliberately here to catch undefined and null
  if (internalInstance._currentElement != null) {
    const elementType = internalInstance._currentElement.type;
    if (typeof elementType === 'function') {
      const publicInstance = internalInstance.getPublicInstance();
      if (publicInstance !== null) {
        return ElementTypeClass;
      } else {
        return ElementTypeFunction;
      }
    } else if (typeof elementType === 'string') {
      return ElementTypeHostComponent;
    }
  }
  return ElementTypeOtherOrUnknown;
}

function getChildren(internalInstance: Object): Array<any> {
  const children = [];

  // If the parent is a native node without rendered children, but with
  // multiple string children, then the `element` that gets passed in here is
  // a plain value -- a string or number.
  if (typeof internalInstance !== 'object') {
    // No children
  } else if (
    internalInstance._currentElement === null ||
    internalInstance._currentElement === false
  ) {
    // No children
  } else if (internalInstance._renderedComponent) {
    const child = internalInstance._renderedComponent;
    if (getElementType(child) !== ElementTypeOtherOrUnknown) {
      children.push(child);
    }
  } else if (internalInstance._renderedChildren) {
    const renderedChildren = internalInstance._renderedChildren;
    for (const name in renderedChildren) {
      const child = renderedChildren[name];
      if (getElementType(child) !== ElementTypeOtherOrUnknown) {
        children.push(child);
      }
    }
  }
  // Note: we skip the case where children are just strings or numbers
  // because the new DevTools skips over host text nodes anyway.
  return children;
}

export function attach(
  hook: DevToolsHook,
  rendererID: number,
  renderer: LegacyRenderer,
  global: Object,
): RendererInterface {
  const idToInternalInstanceMap: Map<number, InternalInstance> = new Map();
  const internalInstanceToIDMap: WeakMap<InternalInstance, number> =
    new WeakMap();
  const internalInstanceToRootIDMap: WeakMap<InternalInstance, number> =
    new WeakMap();

  let getElementIDForHostInstance: GetElementIDForHostInstance =
    null as any as GetElementIDForHostInstance;
  let findHostInstanceForInternalID: (id: number) => ?HostInstance;
  let getNearestMountedDOMNode = (node: Element): null | Element => {
    // Not implemented.
    return null;
  };

  if (renderer.ComponentTree) {
    getElementIDForHostInstance = node => {
      const internalInstance =
        renderer.ComponentTree.getClosestInstanceFromNode(node);
      return internalInstanceToIDMap.get(internalInstance) || null;
    };
    findHostInstanceForInternalID = (id: number) => {
      const internalInstance = idToInternalInstanceMap.get(id);
      return renderer.ComponentTree.getNodeFromInstance(internalInstance);
    };
    getNearestMountedDOMNode = (node: Element): null | Element => {
      const internalInstance =
        renderer.ComponentTree.getClosestInstanceFromNode(node);
      if (internalInstance != null) {
        return renderer.ComponentTree.getNodeFromInstance(internalInstance);
      }
      return null;
    };
  } else if (renderer.Mount.getID && renderer.Mount.getNode) {
    getElementIDForHostInstance = node => {
      // Not implemented.
      return null;
    };
    findHostInstanceForInternalID = (id: number) => {
      // Not implemented.
      return null;
    };
  }

  const supportsTogglingSuspense = false;

  function getDisplayNameForElementID(id: number): string | null {
    const internalInstance = idToInternalInstanceMap.get(id);
    return internalInstance ? getData(internalInstance).displayName : null;
  }

  function getID(internalInstance: InternalInstance): number {
    if (typeof internalInstance !== 'object' || internalInstance === null) {
      throw new Error('Invalid internal instance: ' + internalInstance);
    }
    if (!internalInstanceToIDMap.has(internalInstance)) {
      const id = getUID();
      internalInstanceToIDMap.set(internalInstance, id);
      idToInternalInstanceMap.set(id, internalInstance);
    }
    return internalInstanceToIDMap.get(internalInstance) as any as number;
  }

  function areEqualArrays(a: Array<any>, b: Array<any>) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  // This is shared mutable state that lets us keep track of where we are.
  let parentIDStack = [];

  let oldReconcilerMethods = null;
  if (renderer.Reconciler) {
    // React 15
    oldReconcilerMethods = decorateMany(renderer.Reconciler, {
      mountComponent(fn, args) {
        const internalInstance = args[0];
        const hostContainerInfo = args[3];
        if (getElementType(internalInstance) === ElementTypeOtherOrUnknown) {
          // $FlowFixMe[object-this-reference] found when upgrading Flow
          return fn.apply(this, args);
        }
        if (hostContainerInfo._topLevelWrapper === undefined) {
          // SSR
          // $FlowFixMe[object-this-reference] found when upgrading Flow
          return fn.apply(this, args);
        }

        const id = getID(internalInstance);
        // Push the operation.
        const parentID =
          parentIDStack.length > 0
            ? parentIDStack[parentIDStack.length - 1]
            : 0;
        recordMount(internalInstance, id, parentID);
        parentIDStack.push(id);

        // Remember the root.
        internalInstanceToRootIDMap.set(
          internalInstance,
          getID(hostContainerInfo._topLevelWrapper),
        );

        try {
          // $FlowFixMe[object-this-reference] found when upgrading Flow
          const result = fn.apply(this, args);
          parentIDStack.pop();
          return result;
        } catch (err) {
          parentIDStack = [];
          throw err;
        } finally {
          if (parentIDStack.length === 0) {
            const rootID = internalInstanceToRootIDMap.get(internalInstance);
            if (rootID === undefined) {
              throw new Error('Expected to find root ID.');
            }
            flushPendingEvents(rootID);
          }
        }
      },
      performUpdateIfNecessary(fn, args) {
        const internalInstance = args[0];
        if (getElementType(internalInstance) === ElementTypeOtherOrUnknown) {
          // $FlowFixMe[object-this-reference] found when upgrading Flow
          return fn.apply(this, args);
        }

        const id = getID(internalInstance);
        parentIDStack.push(id);

        const prevChildren = getChildren(internalInstance);
        try {
          // $FlowFixMe[object-this-reference] found when upgrading Flow
          const result = fn.apply(this, args);

          const nextChildren = getChildren(internalInstance);
          if (!areEqualArrays(prevChildren, nextChildren)) {
            // Push the operation
            recordReorder(internalInstance, id, nextChildren);
          }

          parentIDStack.pop();
          return result;
        } catch (err) {
          parentIDStack = [];
          throw err;
        } finally {
          if (parentIDStack.length === 0) {
            const rootID = internalInstanceToRootIDMap.get(internalInstance);
            if (rootID === undefined) {
              throw new Error('Expected to find root ID.');
            }
            flushPendingEvents(rootID);
          }
        }
      },
      receiveComponent(fn, args) {
        const internalInstance = args[0];
        if (getElementType(internalInstance) === ElementTypeOtherOrUnknown) {
          // $FlowFixMe[object-this-reference] found when upgrading Flow
          return fn.apply(this, args);
        }

        const id = getID(internalInstance);
        parentIDStack.push(id);

        const prevChildren = getChildren(internalInstance);
        try {
          // $FlowFixMe[object-this-reference] found when upgrading Flow
          const result = fn.apply(this, args);

          const nextChildren = getChildren(internalInstance);
          if (!areEqualArrays(prevChildren, nextChildren)) {
            // Push the operation
            recordReorder(internalInstance, id, nextChildren);
          }

          parentIDStack.pop();
          return result;
        } catch (err) {
          parentIDStack = [];
          throw err;
        } finally {
          if (parentIDStack.length === 0) {
            const rootID = internalInstanceToRootIDMap.get(internalInstance);
            if (rootID === undefined) {
              throw new Error('Expected to find root ID.');
            }
            flushPendingEvents(rootID);
          }
        }
      },
      unmountComponent(fn, args) {
        const internalInstance = args[0];
        if (getElementType(internalInstance) === ElementTypeOtherOrUnknown) {
          // $FlowFixMe[object-this-reference] found when upgrading Flow
          return fn.apply(this, args);
        }

        const id = getID(internalInstance);
        parentIDStack.push(id);
        try {
          // $FlowFixMe[object-this-reference] found when upgrading Flow
          const result = fn.apply(this, args);
          parentIDStack.pop();

          // Push the operation.
          recordUnmount(internalInstance, id);

          return result;
        } catch (err) {
          parentIDStack = [];
          throw err;
        } finally {
          if (parentIDStack.length === 0) {
            const rootID = internalInstanceToRootIDMap.get(internalInstance);
            if (rootID === undefined) {
              throw new Error('Expected to find root ID.');
            }
            flushPendingEvents(rootID);
          }
        }
      },
    });
  }

  function cleanup() {
    if (oldReconcilerMethods !== null) {
      if (renderer.Component) {
        restoreMany(renderer.Component.Mixin, oldReconcilerMethods);
      } else {
        restoreMany(renderer.Reconciler, oldReconcilerMethods);
      }
    }
    oldReconcilerMethods = null;
  }

  function recordMount(
    internalInstance: InternalInstance,
    id: number,
    parentID: number,
  ) {
    const isRoot = parentID === 0;

    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      console.log(
        '%crecordMount()',
        'color: green; font-weight: bold;',
        id,
        getData(internalInstance).displayName,
      );
    }

    if (isRoot) {
      // TODO Is this right? For all versions?
      const hasOwnerMetadata =
        internalInstance._currentElement != null &&
        internalInstance._currentElement._owner != null;

      pushOperation(TREE_OPERATION_ADD);
      pushOperation(id);
      pushOperation(ElementTypeRoot);
      pushOperation(0); // StrictMode compliant?
      pushOperation(0); // Profiling flag
      pushOperation(0); // StrictMode supported?
      pushOperation(hasOwnerMetadata ? 1 : 0);

      pushOperation(SUSPENSE_TREE_OPERATION_ADD);
      pushOperation(id);
      pushOperation(parentID);
      pushOperation(getStringID(null)); // name
      pushOperation(0); // isSuspended
      // TODO: Measure rect of root
      pushOperation(-1);
    } else {
      const type = getElementType(internalInstance);
      const {displayName, key} = getData(internalInstance);

      const ownerID =
        internalInstance._currentElement != null &&
        internalInstance._currentElement._owner != null
          ? getID(internalInstance._currentElement._owner)
          : 0;

      const displayNameStringID = getStringID(displayName);
      const keyStringID = getStringID(key);
      pushOperation(TREE_OPERATION_ADD);
      pushOperation(id);
      pushOperation(type);
      pushOperation(parentID);
      pushOperation(ownerID);
      pushOperation(displayNameStringID);
      pushOperation(keyStringID);
      pushOperation(getStringID(null)); // name prop
    }
  }

  function recordReorder(
    internalInstance: InternalInstance,
    id: number,
    nextChildren: Array<InternalInstance>,
  ) {
    pushOperation(TREE_OPERATION_REORDER_CHILDREN);
    pushOperation(id);
    const nextChildIDs = nextChildren.map(getID);
    pushOperation(nextChildIDs.length);
    for (let i = 0; i < nextChildIDs.length; i++) {
      pushOperation(nextChildIDs[i]);
    }
  }

  function recordUnmount(internalInstance: InternalInstance, id: number) {
    const isRoot = parentIDStack.length === 0;
    if (isRoot) {
      pendingUnmountedRootID = id;
    } else {
      pendingUnmountedIDs.push(id);
    }
    idToInternalInstanceMap.delete(id);
  }

  function crawlAndRecordInitialMounts(
    id: number,
    parentID: number,
    rootID: number,
  ) {
    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      console.group('crawlAndRecordInitialMounts() id:', id);
    }

    const internalInstance = idToInternalInstanceMap.get(id);
    if (internalInstance != null) {
      internalInstanceToRootIDMap.set(internalInstance, rootID);
      recordMount(internalInstance, id, parentID);
      getChildren(internalInstance).forEach(child =>
        crawlAndRecordInitialMounts(getID(child), id, rootID),
      );
    }

    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      console.groupEnd();
    }
  }

  function flushInitialOperations() {
    // Crawl roots though and register any nodes that mounted before we were injected.

    const roots =
      renderer.Mount._instancesByReactRootID ||
      renderer.Mount._instancesByContainerID;

    for (const key in roots) {
      const internalInstance = roots[key];
      const id = getID(internalInstance);
      crawlAndRecordInitialMounts(id, 0, id);
      flushPendingEvents(id);
    }
  }

  const pendingOperations: Array<number> = [];
  const pendingStringTable: Map<string, number> = new Map();
  let pendingUnmountedIDs: Array<number> = [];
  let pendingStringTableLength: number = 0;
  let pendingUnmountedRootID: number | null = null;

  function flushPendingEvents(rootID: number) {
    if (
      pendingOperations.length === 0 &&
      pendingUnmountedIDs.length === 0 &&
      pendingUnmountedRootID === null
    ) {
      return;
    }

    const numUnmountIDs =
      pendingUnmountedIDs.length + (pendingUnmountedRootID === null ? 0 : 1);

    const operations = new Array<number>(
      // Identify which renderer this update is coming from.
      2 + // [rendererID, rootFiberID]
        // How big is the string table?
        1 + // [stringTableLength]
        // Then goes the actual string table.
        pendingStringTableLength +
        // All unmounts are batched in a single message.
        // [TREE_OPERATION_REMOVE, removedIDLength, ...ids]
        (numUnmountIDs > 0 ? 2 + numUnmountIDs : 0) +
        // [SUSPENSE_TREE_OPERATION_REMOVE, 1, pendingUnmountedRootID]
        (pendingUnmountedRootID === null ? 0 : 3) +
        // Mount operations
        pendingOperations.length,
    );

    // Identify which renderer this update is coming from.
    // This enables roots to be mapped to renderers,
    // Which in turn enables fiber properations, states, and hooks to be inspected.
    let i = 0;
    operations[i++] = rendererID;
    operations[i++] = rootID;

    // Now fill in the string table.
    // [stringTableLength, str1Length, ...str1, str2Length, ...str2, ...]
    operations[i++] = pendingStringTableLength;
    pendingStringTable.forEach((value, key) => {
      operations[i++] = key.length;
      const encodedKey = utfEncodeString(key);
      for (let j = 0; j < encodedKey.length; j++) {
        operations[i + j] = encodedKey[j];
      }
      i += key.length;
    });

    if (numUnmountIDs > 0) {
      // All unmounts except roots are batched in a single message.
      operations[i++] = TREE_OPERATION_REMOVE;
      // The first number is how many unmounted IDs we're gonna send.
      operations[i++] = numUnmountIDs;
      // Fill in the unmounts
      for (let j = 0; j < pendingUnmountedIDs.length; j++) {
        operations[i++] = pendingUnmountedIDs[j];
      }
      // The root ID should always be unmounted last.
      if (pendingUnmountedRootID !== null) {
        operations[i] = pendingUnmountedRootID;
        i++;

        operations[i++] = SUSPENSE_TREE_OPERATION_REMOVE;
        operations[i++] = 1;
        operations[i++] = pendingUnmountedRootID;
      }
    }

    // Fill in the rest of the operations.
    for (let j = 0; j < pendingOperations.length; j++) {
      operations[i + j] = pendingOperations[j];
    }
    i += pendingOperations.length;

    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      printOperationsArray(operations);
    }

    // If we've already connected to the frontend, just pass the operations through.
    hook.emit('operations', operations);

    pendingOperations.length = 0;
    pendingUnmountedIDs = [];
    pendingUnmountedRootID = null;
    pendingStringTable.clear();
    pendingStringTableLength = 0;
  }

  function pushOperation(op: number): void {
    if (__DEV__) {
      if (!Number.isInteger(op)) {
        console.error(
          'pushOperation() was called but the value is not an integer.',
          op,
        );
      }
    }
    pendingOperations.push(op);
  }

  function getStringID(str: string | null): number {
    if (str === null) {
      return 0;
    }
    const existingID = pendingStringTable.get(str);
    if (existingID !== undefined) {
      return existingID;
    }
    const stringID = pendingStringTable.size + 1;
    pendingStringTable.set(str, stringID);
    // The string table total length needs to account
    // both for the string length, and for the array item
    // that contains the length itself. Hence + 1.
    pendingStringTableLength += str.length + 1;
    return stringID;
  }

  let currentlyInspectedElementID: number | null = null;
  let currentlyInspectedPaths: Object = {};

  // Track the intersection of currently inspected paths,
  // so that we can send their data along if the element is re-rendered.
  function mergeInspectedPaths(path: Array<string | number>) {
    let current = currentlyInspectedPaths;
    path.forEach(key => {
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    });
  }

  function createIsPathAllowed(key: string) {
    // This function helps prevent previously-inspected paths from being dehydrated in updates.
    // This is important to avoid a bad user experience where expanded toggles collapse on update.
    return function isPathAllowed(path: Array<string | number>): boolean {
      let current = currentlyInspectedPaths[key];
      if (!current) {
        return false;
      }
      for (let i = 0; i < path.length; i++) {
        current = current[path[i]];
        if (!current) {
          return false;
        }
      }
      return true;
    };
  }

  // Fast path props lookup for React Native style editor.
  function getInstanceAndStyle(id: number): InstanceAndStyle {
    let instance = null;
    let style = null;

    const internalInstance = idToInternalInstanceMap.get(id);
    if (internalInstance != null) {
      instance = internalInstance._instance || null;

      const element = internalInstance._currentElement;
      if (element != null && element.props != null) {
        style = element.props.style || null;
      }
    }

    return {
      instance,
      style,
    };
  }

  function updateSelectedElement(id: number): void {
    const internalInstance = idToInternalInstanceMap.get(id);
    if (internalInstance == null) {
      console.warn(`Could not find instance with id "${id}"`);
      return;
    }

    switch (getElementType(internalInstance)) {
      case ElementTypeClass:
        global.$r = internalInstance._instance;
        break;
      case ElementTypeFunction:
        const element = internalInstance._currentElement;
        if (element == null) {
          console.warn(`Could not find element with id "${id}"`);
          return;
        }

        global.$r = {
          props: element.props,
          type: element.type,
        };
        break;
      default:
        global.$r = null;
        break;
    }
  }

  function storeAsGlobal(
    id: number,
    path: Array<string | number>,
    count: number,
  ): void {
    const inspectedElement = inspectElementRaw(id);
    if (inspectedElement !== null) {
      const value = getInObject(inspectedElement, path);
      const key = `$reactTemp${count}`;

      window[key] = value;

      console.log(key);
      console.log(value);
    }
  }

  function getSerializedElementValueByPath(
    id: number,
    path: Array<string | number>,
  ): ?string {
    const inspectedElement = inspectElementRaw(id);
    if (inspectedElement !== null) {
      const valueToCopy = getInObject(inspectedElement, path);

      return serializeToString(valueToCopy);
    }
  }

  function inspectElement(
    requestID: number,
    id: number,
    path: Array<string | number> | null,
    forceFullData: boolean,
  ): InspectedElementPayload {
    if (forceFullData || currentlyInspectedElementID !== id) {
      currentlyInspectedElementID = id;
      currentlyInspectedPaths = {};
    }

    const inspectedElement = inspectElementRaw(id);
    if (inspectedElement === null) {
      return {
        id,
        responseID: requestID,
        type: 'not-found',
      };
    }

    if (path !== null) {
      mergeInspectedPaths(path);
    }

    // Any time an inspected element has an update,
    // we should update the selected $r value as wel.
    // Do this before dehydration (cleanForBridge).
    updateSelectedElement(id);

    inspectedElement.context = cleanForBridge(
      inspectedElement.context,
      createIsPathAllowed('context'),
    );
    inspectedElement.props = cleanForBridge(
      inspectedElement.props,
      createIsPathAllowed('props'),
    );
    inspectedElement.state = cleanForBridge(
      inspectedElement.state,
      createIsPathAllowed('state'),
    );
    inspectedElement.suspendedBy = cleanForBridge(
      inspectedElement.suspendedBy,
      createIsPathAllowed('suspendedBy'),
    );

    return {
      id,
      responseID: requestID,
      type: 'full-data',
      value: inspectedElement,
    };
  }

  function inspectElementRaw(id: number): InspectedElement | null {
    const internalInstance = idToInternalInstanceMap.get(id);

    if (internalInstance == null) {
      return null;
    }

    const rootID = internalInstanceToRootIDMap.get(internalInstance);
    if (rootID === undefined) {
      throw new Error('Expected to find root ID.');
    }
    const isRoot = rootID === id;
    return isRoot
      ? inspectRootsRaw(rootID)
      : inspectInternalInstanceRaw(id, internalInstance);
  }

  function inspectInternalInstanceRaw(
    id: number,
    internalInstance: InternalInstance,
  ): InspectedElement | null {
    const {key} = getData(internalInstance);
    const type = getElementType(internalInstance);

    let context = null;
    let owners = null;
    let props = null;
    let state = null;

    const element = internalInstance._currentElement;
    if (element !== null) {
      props = element.props;

      let owner = element._owner;
      if (owner) {
        owners = [] as Array<SerializedElement>;
        while (owner != null) {
          owners.push({
            displayName: getData(owner).displayName || 'Unknown',
            id: getID(owner),
            key: element.key,
            env: null,
            stack: null,
            type: getElementType(owner),
          });
          if (owner._currentElement) {
            owner = owner._currentElement._owner;
          }
        }
      }
    }

    const publicInstance = internalInstance._instance;
    if (publicInstance != null) {
      context = publicInstance.context || null;
      state = publicInstance.state || null;
    }

    // Not implemented
    const errors: Array<[string, number]> = [];
    const warnings: Array<[string, number]> = [];

    return {
      id,

      // Does the current renderer support editable hooks and function props?
      canEditHooks: false,
      canEditFunctionProps: false,

      // Does the current renderer support advanced editing interface?
      canEditHooksAndDeletePaths: false,
      canEditHooksAndRenamePaths: false,
      canEditFunctionPropsDeletePaths: false,
      canEditFunctionPropsRenamePaths: false,

      // Toggle error boundary did not exist in legacy versions
      canToggleError: false,
      isErrored: false,

      // Suspense did not exist in legacy versions
      canToggleSuspense: false,
      isSuspended: null,

      source: null,

      stack: null,

      // Only legacy context exists in legacy versions.
      hasLegacyContext: true,

      type: type,

      key: key != null ? key : null,

      // Inspectable properties.
      context,
      hooks: null,
      props,
      state,
      errors,
      warnings,

      // Not supported in legacy renderers.
      suspendedBy: [],
      suspendedByRange: null,
      unknownSuspenders: UNKNOWN_SUSPENDERS_NONE,

      // List of owners
      owners,

      env: null,

      rootType: null,
      rendererPackageName: null,
      rendererVersion: null,

      plugins: {
        stylex: null,
      },

      nativeTag: null,
    };
  }

  function inspectRootsRaw(arbitraryRootID: number): InspectedElement | null {
    const roots =
      renderer.Mount._instancesByReactRootID ||
      renderer.Mount._instancesByContainerID;

    const inspectedRoots: InspectedElement = {
      // invariants
      id: arbitraryRootID,
      type: ElementTypeRoot,
      // Properties we merge
      isErrored: false,
      errors: [],
      warnings: [],
      suspendedBy: [],
      suspendedByRange: null,
      // TODO: How to merge these?
      unknownSuspenders: UNKNOWN_SUSPENDERS_NONE,
      // Properties where merging doesn't make sense so we ignore them entirely in the UI
      rootType: null,
      plugins: {stylex: null},
      nativeTag: null,
      env: null,
      source: null,
      stack: null,
      // TODO: We could make the Frontend accept an array to display
      // a list of unique renderers contributing to this Screen.
      rendererPackageName: null,
      rendererVersion: null,
      // These don't make sense for a Root. They're just bottom values.
      key: null,
      canEditFunctionProps: false,
      canEditHooks: false,
      canEditFunctionPropsDeletePaths: false,
      canEditFunctionPropsRenamePaths: false,
      canEditHooksAndDeletePaths: false,
      canEditHooksAndRenamePaths: false,
      canToggleError: false,
      canToggleSuspense: false,
      isSuspended: false,
      hasLegacyContext: false,
      context: null,
      hooks: null,
      props: null,
      state: null,
      owners: null,
    };

    let minSuspendedByRange = Infinity;
    let maxSuspendedByRange = -Infinity;

    for (const rootKey in roots) {
      const internalInstance = roots[rootKey];
      const id = getID(internalInstance);
      const inspectedRoot = inspectInternalInstanceRaw(id, internalInstance);

      if (inspectedRoot === null) {
        return null;
      }

      if (inspectedRoot.isErrored) {
        inspectedRoots.isErrored = true;
      }
      for (let i = 0; i < inspectedRoot.errors.length; i++) {
        inspectedRoots.errors.push(inspectedRoot.errors[i]);
      }
      for (let i = 0; i < inspectedRoot.warnings.length; i++) {
        inspectedRoots.warnings.push(inspectedRoot.warnings[i]);
      }
      for (let i = 0; i < inspectedRoot.suspendedBy.length; i++) {
        inspectedRoots.suspendedBy.push(inspectedRoot.suspendedBy[i]);
      }
      const suspendedByRange = inspectedRoot.suspendedByRange;
      if (suspendedByRange !== null) {
        if (suspendedByRange[0] < minSuspendedByRange) {
          minSuspendedByRange = suspendedByRange[0];
        }
        if (suspendedByRange[1] > maxSuspendedByRange) {
          maxSuspendedByRange = suspendedByRange[1];
        }
      }
    }

    if (minSuspendedByRange !== Infinity || maxSuspendedByRange !== -Infinity) {
      inspectedRoots.suspendedByRange = [
        minSuspendedByRange,
        maxSuspendedByRange,
      ];
    }

    return inspectedRoots;
  }

  function logElementToConsole(id: number): void {
    const result = inspectElementRaw(id);
    if (result === null) {
      console.warn(`Could not find element with id "${id}"`);
      return;
    }

    const displayName = getDisplayNameForElementID(id);

    const supportsGroup = typeof console.groupCollapsed === 'function';
    if (supportsGroup) {
      console.groupCollapsed(
        `[Click to expand] %c<${displayName || 'Component'} />`,
        // --dom-tag-name-color is the CSS variable Chrome styles HTML elements with in the console.
        'color: var(--dom-tag-name-color); font-weight: normal;',
      );
    }
    if (result.props !== null) {
      console.log('Props:', result.props);
    }
    if (result.state !== null) {
      console.log('State:', result.state);
    }
    if (result.context !== null) {
      console.log('Context:', result.context);
    }
    const hostInstance = findHostInstanceForInternalID(id);
    if (hostInstance !== null) {
      console.log('Node:', hostInstance);
    }
    if (window.chrome || /firefox/i.test(navigator.userAgent)) {
      console.log(
        'Right-click any value to save it as a global variable for further inspection.',
      );
    }
    if (supportsGroup) {
      console.groupEnd();
    }
  }

  function getElementAttributeByPath(
    id: number,
    path: Array<string | number>,
  ): mixed {
    const inspectedElement = inspectElementRaw(id);
    if (inspectedElement !== null) {
      return getInObject(inspectedElement, path);
    }
    return undefined;
  }

  function getElementSourceFunctionById(id: number): null | Function {
    const internalInstance = idToInternalInstanceMap.get(id);
    if (internalInstance == null) {
      console.warn(`Could not find instance with id "${id}"`);
      return null;
    }

    const element = internalInstance._currentElement;
    if (element == null) {
      console.warn(`Could not find element with id "${id}"`);
      return null;
    }

    return element.type;
  }

  function deletePath(
    type: 'context' | 'hooks' | 'props' | 'state',
    id: number,
    hookID: ?number,
    path: Array<string | number>,
  ): void {
    const internalInstance = idToInternalInstanceMap.get(id);
    if (internalInstance != null) {
      const publicInstance = internalInstance._instance;
      if (publicInstance != null) {
        switch (type) {
          case 'context':
            deletePathInObject(publicInstance.context, path);
            forceUpdate(publicInstance);
            break;
          case 'hooks':
            throw new Error('Hooks not supported by this renderer');
          case 'props':
            const element = internalInstance._currentElement;
            internalInstance._currentElement = {
              ...element,
              props: copyWithDelete(element.props, path),
            };
            forceUpdate(publicInstance);
            break;
          case 'state':
            deletePathInObject(publicInstance.state, path);
            forceUpdate(publicInstance);
            break;
        }
      }
    }
  }

  function renamePath(
    type: 'context' | 'hooks' | 'props' | 'state',
    id: number,
    hookID: ?number,
    oldPath: Array<string | number>,
    newPath: Array<string | number>,
  ): void {
    const internalInstance = idToInternalInstanceMap.get(id);
    if (internalInstance != null) {
      const publicInstance = internalInstance._instance;
      if (publicInstance != null) {
        switch (type) {
          case 'context':
            renamePathInObject(publicInstance.context, oldPath, newPath);
            forceUpdate(publicInstance);
            break;
          case 'hooks':
            throw new Error('Hooks not supported by this renderer');
          case 'props':
            const element = internalInstance._currentElement;
            internalInstance._currentElement = {
              ...element,
              props: copyWithRename(element.props, oldPath, newPath),
            };
            forceUpdate(publicInstance);
            break;
          case 'state':
            renamePathInObject(publicInstance.state, oldPath, newPath);
            forceUpdate(publicInstance);
            break;
        }
      }
    }
  }

  function overrideValueAtPath(
    type: 'context' | 'hooks' | 'props' | 'state',
    id: number,
    hookID: ?number,
    path: Array<string | number>,
    value: any,
  ): void {
    const internalInstance = idToInternalInstanceMap.get(id);
    if (internalInstance != null) {
      const publicInstance = internalInstance._instance;
      if (publicInstance != null) {
        switch (type) {
          case 'context':
            setInObject(publicInstance.context, path, value);
            forceUpdate(publicInstance);
            break;
          case 'hooks':
            throw new Error('Hooks not supported by this renderer');
          case 'props':
            const element = internalInstance._currentElement;
            internalInstance._currentElement = {
              ...element,
              props: copyWithSet(element.props, path, value),
            };
            forceUpdate(publicInstance);
            break;
          case 'state':
            setInObject(publicInstance.state, path, value);
            forceUpdate(publicInstance);
            break;
        }
      }
    }
  }

  // v16+ only features
  const getProfilingData = () => {
    throw new Error('getProfilingData not supported by this renderer');
  };
  const handleCommitFiberRoot = () => {
    throw new Error('handleCommitFiberRoot not supported by this renderer');
  };
  const handleCommitFiberUnmount = () => {
    throw new Error('handleCommitFiberUnmount not supported by this renderer');
  };
  const handlePostCommitFiberRoot = () => {
    throw new Error('handlePostCommitFiberRoot not supported by this renderer');
  };
  const overrideError = () => {
    throw new Error('overrideError not supported by this renderer');
  };
  const overrideSuspense = () => {
    throw new Error('overrideSuspense not supported by this renderer');
  };
  const overrideSuspenseMilestone = () => {
    throw new Error('overrideSuspenseMilestone not supported by this renderer');
  };
  const startProfiling = () => {
    // Do not throw, since this would break a multi-root scenario where v15 and v16 were both present.
  };
  const stopProfiling = () => {
    // Do not throw, since this would break a multi-root scenario where v15 and v16 were both present.
  };

  function getBestMatchForTrackedPath(): PathMatch | null {
    // Not implemented.
    return null;
  }

  function getPathForElement(id: number): Array<PathFrame> | null {
    // Not implemented.
    return null;
  }

  function updateComponentFilters(componentFilters: Array<ComponentFilter>) {
    // Not implemented.
  }

  function getEnvironmentNames(): Array<string> {
    // No RSC support.
    return [];
  }

  function setTraceUpdatesEnabled(enabled: boolean) {
    // Not implemented.
  }

  function setTrackedPath(path: Array<PathFrame> | null) {
    // Not implemented.
  }

  function getOwnersList(id: number): Array<SerializedElement> | null {
    // Not implemented.
    return null;
  }

  function clearErrorsAndWarnings() {
    // Not implemented
  }

  function clearErrorsForElementID(id: number) {
    // Not implemented
  }

  function clearWarningsForElementID(id: number) {
    // Not implemented
  }

  function hasElementWithId(id: number): boolean {
    return idToInternalInstanceMap.has(id);
  }

  return {
    clearErrorsAndWarnings,
    clearErrorsForElementID,
    clearWarningsForElementID,
    cleanup,
    getSerializedElementValueByPath,
    deletePath,
    flushInitialOperations,
    getBestMatchForTrackedPath,
    getDisplayNameForElementID,
    getNearestMountedDOMNode,
    getElementIDForHostInstance,
    getSuspenseNodeIDForHostInstance(id: number): null {
      return null;
    },
    getInstanceAndStyle,
    findHostInstancesForElementID: (id: number) => {
      const hostInstance = findHostInstanceForInternalID(id);
      return hostInstance == null ? null : [hostInstance];
    },
    findLastKnownRectsForID() {
      return null;
    },
    getOwnersList,
    getPathForElement,
    getProfilingData,
    handleCommitFiberRoot,
    handleCommitFiberUnmount,
    handlePostCommitFiberRoot,
    hasElementWithId,
    inspectElement,
    logElementToConsole,
    overrideError,
    overrideSuspense,
    overrideSuspenseMilestone,
    overrideValueAtPath,
    renamePath,
    getElementAttributeByPath,
    getElementSourceFunctionById,
    renderer,
    setTraceUpdatesEnabled,
    setTrackedPath,
    startProfiling,
    stopProfiling,
    storeAsGlobal,
    supportsTogglingSuspense,
    updateComponentFilters,
    getEnvironmentNames,
  };
}
