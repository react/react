/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {copy} from 'clipboard-js';
import EventEmitter from '../events';
import {inspect} from 'util';
import {
  PROFILING_FLAG_BASIC_SUPPORT,
  PROFILING_FLAG_TIMELINE_SUPPORT,
  PROFILING_FLAG_PERFORMANCE_TRACKS_SUPPORT,
  TREE_OPERATION_ADD,
  TREE_OPERATION_REMOVE,
  TREE_OPERATION_REORDER_CHILDREN,
  TREE_OPERATION_SET_SUBTREE_MODE,
  TREE_OPERATION_UPDATE_ERRORS_OR_WARNINGS,
  TREE_OPERATION_UPDATE_TREE_BASE_DURATION,
  TREE_OPERATION_APPLIED_ACTIVITY_SLICE_CHANGE,
  SUSPENSE_TREE_OPERATION_ADD,
  SUSPENSE_TREE_OPERATION_REMOVE,
  SUSPENSE_TREE_OPERATION_REORDER_CHILDREN,
  SUSPENSE_TREE_OPERATION_RESIZE,
  SUSPENSE_TREE_OPERATION_SUSPENDERS,
} from '../constants';
import {
  ElementTypeRoot,
  ElementTypeActivity,
  ComponentFilterActivitySlice,
} from '../frontend/types';
import {
  getSavedComponentFilters,
  setSavedComponentFilters,
  shallowDiffers,
  utfDecodeStringWithRanges,
  parseElementDisplayNameFromBackend,
  unionOfTwoArrays,
} from '../utils';
import {localStorageGetItem, localStorageSetItem} from '../storage';
import {__DEBUG__} from '../constants';
import {printStore} from './utils';
import ProfilerStore from './ProfilerStore';
import {
  BRIDGE_PROTOCOL,
  currentBridgeProtocol,
} from 'react-devtools-shared/src/bridge';
import {
  StrictMode,
  ActivityHiddenMode,
  ActivityVisibleMode,
} from 'react-devtools-shared/src/frontend/types';
import {withPermissionsCheck} from 'react-devtools-shared/src/frontend/utils/withPermissionsCheck';

import type {
  Element,
  ComponentFilter,
  ElementType,
  SuspenseNode,
  SuspenseTimelineStep,
  Rect,
} from 'react-devtools-shared/src/frontend/types';
import type {
  FrontendBridge,
  BridgeProtocol,
} from 'react-devtools-shared/src/bridge';
import UnsupportedBridgeOperationError from 'react-devtools-shared/src/UnsupportedBridgeOperationError';
import type {DevToolsHookSettings} from '../backend/types';

import RBush from 'rbush';

// Custom version which works with our Rect data structure.
class RectRBush extends RBush<Rect> {
  toBBox(rect: Rect): {
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  } {
    return {
      minX: rect.x,
      minY: rect.y,
      maxX: rect.x + rect.width,
      maxY: rect.y + rect.height,
    };
  }
  compareMinX(a: Rect, b: Rect): number {
    return a.x - b.x;
  }
  compareMinY(a: Rect, b: Rect): number {
    return a.y - b.y;
  }
}

const debug = (methodName: string, ...args: Array<string>) => {
  // $FlowFixMe[constant-condition]
  if (__DEBUG__) {
    console.log(
      `%cStore %c${methodName}`,
      'color: green; font-weight: bold;',
      'font-weight: bold;',
      ...args,
    );
  }
};

const LOCAL_STORAGE_COLLAPSE_ROOTS_BY_DEFAULT_KEY =
  'React::DevTools::collapseNodesByDefault';
const LOCAL_STORAGE_RECORD_CHANGE_DESCRIPTIONS_KEY =
  'React::DevTools::recordChangeDescriptions';

type ErrorAndWarningTuples = Array<{id: number, index: number}>;

export type Config = {
  checkBridgeProtocolCompatibility?: boolean,
  isProfiling?: boolean,
  supportsInspectMatchingDOMElement?: boolean,
  supportsClickToInspect?: boolean,
  supportsReloadAndProfile?: boolean,
  supportsTimeline?: boolean,
  supportsTraceUpdates?: boolean,
};

const ADVANCED_PROFILING_NONE = 0;
const ADVANCED_PROFILING_TIMELINE = 1;
const ADVANCED_PROFILING_PERFORMANCE_TRACKS = 2;
type AdvancedProfiling = 0 | 1 | 2;

export type Capabilities = {
  supportsBasicProfiling: boolean,
  hasOwnerMetadata: boolean,
  supportsStrictMode: boolean,
  supportsAdvancedProfiling: AdvancedProfiling,
};

function isNonZeroRect(rect: Rect) {
  return rect.width > 0 || rect.height > 0 || rect.x > 0 || rect.y > 0;
}

/**
 * The store is the single source of truth for updates from the backend.
 * ContextProviders can subscribe to the Store for specific things they want to provide.
 */
export default class Store extends EventEmitter<{
  backendVersion: [],
  collapseNodesByDefault: [],
  componentFilters: [],
  error: [Error],
  hookSettings: [$ReadOnly<DevToolsHookSettings>],
  hostInstanceSelected: [Element['id'] | null],
  settingsUpdated: [$ReadOnly<DevToolsHookSettings>, Array<ComponentFilter>],
  mutated: [
    [
      Array<Element['id']>,
      Map<Element['id'], Element['id']>,
      Element['id'] | null,
    ],
  ],
  recordChangeDescriptions: [],
  roots: [],
  rootSupportsBasicProfiling: [],
  rootSupportsTimelineProfiling: [],
  rootSupportsPerformanceTracks: [],
  suspenseTreeMutated: [[Map<SuspenseNode['id'], SuspenseNode['id']>]],
  supportsNativeStyleEditor: [],
  supportsReloadAndProfile: [],
  unsupportedBridgeProtocolDetected: [],
  unsupportedRendererVersionDetected: [],
}> {
  // If the backend version is new enough to report its (NPM) version, this is it.
  // This version may be displayed by the frontend for debugging purposes.
  _backendVersion: string | null = null;

  _bridge: FrontendBridge;

  // Computed whenever _errorsAndWarnings Map changes.
  _cachedComponentWithErrorCount: number = 0;
  _cachedComponentWithWarningCount: number = 0;
  _cachedErrorAndWarningTuples: ErrorAndWarningTuples | null = null;

  // Should new nodes be collapsed by default when added to the tree?
  _collapseNodesByDefault: boolean = true;

  _componentFilters: Array<ComponentFilter>;

  // Map of ID to number of recorded error and warning message IDs.
  _errorsAndWarnings: Map<
    Element['id'],
    {errorCount: number, warningCount: number},
  > = new Map();

  _focusedTransition: 0 | Element['id'] = 0;

  // At least one of the injected renderers contains (DEV only) owner metadata.
  _hasOwnerMetadata: boolean = false;

  // Map of ID to (mutable) Element.
  // Elements are mutated to avoid excessive cloning during tree updates.
  // The InspectedElement Suspense cache also relies on this mutability for its WeakMap usage.
  _idToElement: Map<Element['id'], Element> = new Map();

  _idToSuspense: Map<SuspenseNode['id'], SuspenseNode> = new Map();

  // Should the React Native style editor panel be shown?
  _isNativeStyleEditorSupported: boolean = false;

  _nativeStyleEditorValidAttributes: $ReadOnlyArray<string> | null = null;

  // Older backends don't support an explicit bridge protocol,
  // so we should timeout eventually and show a downgrade message.
  _onBridgeProtocolTimeoutID: TimeoutID | null = null;

  // Map of element (id) to the set of elements (ids) it owns.
  // This map enables getOwnersListForElement() to avoid traversing the entire tree.
  _ownersMap: Map<Element['id'], Set<Element['id']>> = new Map();

  _profilerStore: ProfilerStore;

  _recordChangeDescriptions: boolean = false;

  // Incremented each time the store is mutated.
  // This enables a passive effect to detect a mutation between render and commit phase.
  _revision: number = 0;
  _revisionSuspense: number = 0;

  // This Array must be treated as immutable!
  // Passive effects will check it for changes between render and mount.
  _roots: $ReadOnlyArray<Element['id']> = [];

  _rootIDToCapabilities: Map<Element['id'], Capabilities> = new Map();

  // Renderer ID is needed to support inspection fiber props, state, and hooks.
  _rootIDToRendererID: Map<Element['id'], number> = new Map();

  // Stores all the SuspenseNode rects in an R-tree to make it fast to find overlaps.
  _rtree: RBush<Rect> = new RectRBush();

  // These options may be initially set by a configuration option when constructing the Store.
  _supportsInspectMatchingDOMElement: boolean = false;
  _supportsClickToInspect: boolean = false;
  _supportsTimeline: boolean = false;
  _supportsTraceUpdates: boolean = false;

  _isReloadAndProfileFrontendSupported: boolean = false;
  _isReloadAndProfileBackendSupported: boolean = false;

  // These options default to false but may be updated as roots are added and removed.
  _rootSupportsBasicProfiling: boolean = false;
  _rootSupportsTimelineProfiling: boolean = false;
  _rootSupportsPerformanceTracks: boolean = false;

  _bridgeProtocol: BridgeProtocol | null = null;
  _unsupportedBridgeProtocolDetected: boolean = false;
  _unsupportedRendererVersionDetected: boolean = false;

  // Total number of visible elements (within all roots).
  // Used for windowing purposes.
  _weightAcrossRoots: number = 0;

  _shouldCheckBridgeProtocolCompatibility: boolean = false;
  _hookSettings: $ReadOnly<DevToolsHookSettings> | null = null;
  _shouldShowWarningsAndErrors: boolean = false;

  // Only used in browser extension for synchronization with built-in Elements panel.
  _lastSelectedHostInstanceElementId: Element['id'] | null = null;

  // Maximum recorded node depth during the lifetime of this Store.
  // Can only increase: not guaranteed to return maximal value for currently recorded elements.
  _maximumRecordedDepth = 0;

  constructor(bridge: FrontendBridge, config?: Config) {
    super();

    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      debug('constructor', 'subscribing to Bridge');
    }

    this._collapseNodesByDefault =
      localStorageGetItem(LOCAL_STORAGE_COLLAPSE_ROOTS_BY_DEFAULT_KEY) ===
      'true';

    this._recordChangeDescriptions =
      localStorageGetItem(LOCAL_STORAGE_RECORD_CHANGE_DESCRIPTIONS_KEY) ===
      'true';

    this._componentFilters = getSavedComponentFilters();

    let isProfiling = false;
    if (config != null) {
      isProfiling = config.isProfiling === true;

      const {
        supportsInspectMatchingDOMElement,
        supportsClickToInspect,
        supportsReloadAndProfile,
        supportsTimeline,
        supportsTraceUpdates,
        checkBridgeProtocolCompatibility,
      } = config;
      if (supportsInspectMatchingDOMElement) {
        this._supportsInspectMatchingDOMElement = true;
      }
      if (supportsClickToInspect) {
        this._supportsClickToInspect = true;
      }
      if (supportsReloadAndProfile) {
        this._isReloadAndProfileFrontendSupported = true;
      }
      if (supportsTimeline) {
        this._supportsTimeline = true;
      }
      if (supportsTraceUpdates) {
        this._supportsTraceUpdates = true;
      }
      if (checkBridgeProtocolCompatibility) {
        this._shouldCheckBridgeProtocolCompatibility = true;
      }
    }

    this._bridge = bridge;
    bridge.addListener('operations', this.onBridgeOperations);
    bridge.addListener('shutdown', this.onBridgeShutdown);
    bridge.addListener(
      'isReloadAndProfileSupportedByBackend',
      this.onBackendReloadAndProfileSupported,
    );
    bridge.addListener(
      'isNativeStyleEditorSupported',
      this.onBridgeNativeStyleEditorSupported,
    );
    bridge.addListener(
      'unsupportedRendererVersion',
      this.onBridgeUnsupportedRendererVersion,
    );

    this._profilerStore = new ProfilerStore(bridge, this, isProfiling);

    bridge.addListener('backendVersion', this.onBridgeBackendVersion);
    bridge.addListener('saveToClipboard', this.onSaveToClipboard);
    bridge.addListener('hookSettings', this.onHookSettings);
    bridge.addListener('backendInitialized', this.onBackendInitialized);
    bridge.addListener('selectElement', this.onHostInstanceSelected);
  }

  // This is only used in tests to avoid memory leaks.
  assertExpectedRootMapSizes() {
    if (this.roots.length === 0) {
      // The only safe time to assert these maps are empty is when the store is empty.
      this.assertMapSizeMatchesRootCount(this._idToElement, '_idToElement');
      this.assertMapSizeMatchesRootCount(this._ownersMap, '_ownersMap');
    }

    // These maps should always be the same size as the number of roots
    this.assertMapSizeMatchesRootCount(
      this._rootIDToCapabilities,
      '_rootIDToCapabilities',
    );
    this.assertMapSizeMatchesRootCount(
      this._rootIDToRendererID,
      '_rootIDToRendererID',
    );
  }

  // This is only used in tests to avoid memory leaks.
  assertMapSizeMatchesRootCount(map: Map<any, any>, mapName: string) {
    const expectedSize = this.roots.length;
    if (map.size !== expectedSize) {
      this._throwAndEmitError(
        Error(
          `Expected ${mapName} to contain ${expectedSize} items, but it contains ${
            map.size
          } items\n\n${inspect(map, {
            depth: 20,
          })}`,
        ),
      );
    }
  }

  get backendVersion(): string | null {
    return this._backendVersion;
  }

  get collapseNodesByDefault(): boolean {
    return this._collapseNodesByDefault;
  }
  set collapseNodesByDefault(value: boolean): void {
    this._collapseNodesByDefault = value;

    localStorageSetItem(
      LOCAL_STORAGE_COLLAPSE_ROOTS_BY_DEFAULT_KEY,
      value ? 'true' : 'false',
    );

    this.emit('collapseNodesByDefault');
  }

  get componentFilters(): Array<ComponentFilter> {
    return this._componentFilters;
  }
  set componentFilters(value: Array<ComponentFilter>): void {
    if (this._profilerStore.isProfilingBasedOnUserInput) {
      // Re-mounting a tree while profiling is in progress might break a lot of assumptions.
      // If necessary, we could support this- but it doesn't seem like a necessary use case.
      this._throwAndEmitError(
        Error('Cannot modify filter preferences while profiling'),
      );
    }

    // Filter updates are expensive to apply (since they impact the entire tree).
    // Let's determine if they've changed and avoid doing this work if they haven't.
    const prevEnabledComponentFilters = this._componentFilters.filter(
      filter => filter.isEnabled,
    );
    const nextEnabledComponentFilters = value.filter(
      filter => filter.isEnabled,
    );
    let haveEnabledFiltersChanged =
      prevEnabledComponentFilters.length !== nextEnabledComponentFilters.length;
    if (!haveEnabledFiltersChanged) {
      for (let i = 0; i < nextEnabledComponentFilters.length; i++) {
        const prevFilter = prevEnabledComponentFilters[i];
        const nextFilter = nextEnabledComponentFilters[i];
        if (shallowDiffers(prevFilter, nextFilter)) {
          haveEnabledFiltersChanged = true;
          break;
        }
      }
    }

    this._componentFilters = value;

    // Update persisted filter preferences
    setSavedComponentFilters(value);
    if (this._hookSettings === null) {
      // We changed filters before we got the hook settings.
      // Wait for hook settings before persisting component filters to not overwrite
      // persisted hook settings with defaults.
      // This exists purely as a type safety check; in practice the hook settings
      // should have arrived before any filter changes could be made.
      const onHookSettings = (settings: $ReadOnly<DevToolsHookSettings>) => {
        this._bridge.removeListener('hookSettings', onHookSettings);
        this.emit('settingsUpdated', settings, value);
      };
      this._bridge.addListener('hookSettings', onHookSettings);
      this._bridge.send('getHookSettings');
    } else {
      this.emit('settingsUpdated', this._hookSettings, value);
    }

    // Notify the renderer that filter preferences have changed.
    // This is an expensive operation; it unmounts and remounts the entire tree,
    // so only do it if the set of enabled component filters has changed.
    if (haveEnabledFiltersChanged) {
      this._bridge.send('updateComponentFilters', value);
    }

    this.emit('componentFilters');
  }

  get bridgeProtocol(): BridgeProtocol | null {
    return this._bridgeProtocol;
  }

  get componentWithErrorCount(): number {
    if (!this._shouldShowWarningsAndErrors) {
      return 0;
    }

    return this._cachedComponentWithErrorCount;
  }

  get componentWithWarningCount(): number {
    if (!this._shouldShowWarningsAndErrors) {
      return 0;
    }

    return this._cachedComponentWithWarningCount;
  }

  get displayingErrorsAndWarningsEnabled(): boolean {
    return this._shouldShowWarningsAndErrors;
  }

  get hasOwnerMetadata(): boolean {
    return this._hasOwnerMetadata;
  }

  get nativeStyleEditorValidAttributes(): $ReadOnlyArray<string> | null {
    return this._nativeStyleEditorValidAttributes;
  }

  get numElements(): number {
    return this._weightAcrossRoots;
  }

  get profilerStore(): ProfilerStore {
    return this._profilerStore;
  }

  get recordChangeDescriptions(): boolean {
    return this._recordChangeDescriptions;
  }
  set recordChangeDescriptions(value: boolean): void {
    this._recordChangeDescriptions = value;

    localStorageSetItem(
      LOCAL_STORAGE_RECORD_CHANGE_DESCRIPTIONS_KEY,
      value ? 'true' : 'false',
    );

    this.emit('recordChangeDescriptions');
  }

  get revision(): number {
    return this._revision;
  }
  get revisionSuspense(): number {
    return this._revisionSuspense;
  }

  get rootIDToRendererID(): Map<number, number> {
    return this._rootIDToRendererID;
  }

  get roots(): $ReadOnlyArray<number> {
    return this._roots;
  }

  // At least one of the currently mounted roots support the Legacy profiler.
  get rootSupportsBasicProfiling(): boolean {
    return this._rootSupportsBasicProfiling;
  }

  // At least one of the currently mounted roots support the Timeline profiler.
  get rootSupportsTimelineProfiling(): boolean {
    return this._rootSupportsTimelineProfiling;
  }

  // At least one of the currently mounted roots support performance tracks.
  get rootSupportsPerformanceTracks(): boolean {
    return this._rootSupportsPerformanceTracks;
  }

  get supportsInspectMatchingDOMElement(): boolean {
    return this._supportsInspectMatchingDOMElement;
  }

  get supportsClickToInspect(): boolean {
    return this._supportsClickToInspect;
  }

  get supportsNativeStyleEditor(): boolean {
    return this._isNativeStyleEditorSupported;
  }

  get supportsReloadAndProfile(): boolean {
    return (
      this._isReloadAndProfileFrontendSupported &&
      this._isReloadAndProfileBackendSupported
    );
  }

  // This build of DevTools supports the Timeline profiler.
  // This is a static flag, controlled by the Store config.
  get supportsTimeline(): boolean {
    return this._supportsTimeline;
  }

  get supportsTraceUpdates(): boolean {
    return this._supportsTraceUpdates;
  }

  get unsupportedBridgeProtocolDetected(): boolean {
    return this._unsupportedBridgeProtocolDetected;
  }

  get unsupportedRendererVersionDetected(): boolean {
    return this._unsupportedRendererVersionDetected;
  }

  get lastSelectedHostInstanceElementId(): Element['id'] | null {
    return this._lastSelectedHostInstanceElementId;
  }

  containsElement(id: number): boolean {
    return this._idToElement.has(id);
  }

  getElementAtIndex(index: number): Element | null {
    if (index < 0 || index >= this.numElements) {
      console.warn(
        `Invalid index ${index} specified; store contains ${this.numElements} items.`,
      );

      return null;
    }

    // Find which root this element is in...
    let root;
    let rootWeight = 0;
    for (let i = 0; i < this._roots.length; i++) {
      const rootID = this._roots[i];
      root = this._idToElement.get(rootID);

      if (root === undefined) {
        this._throwAndEmitError(
          Error(
            `Couldn't find root with id "${rootID}": no matching node was found in the Store.`,
          ),
        );

        return null;
      }

      if (root.children.length === 0) {
        continue;
      }

      if (rootWeight + root.weight > index) {
        break;
      } else {
        rootWeight += root.weight;
      }
    }

    if (root === undefined) {
      return null;
    }

    // Find the element in the tree using the weight of each node...
    // Skip over the root itself, because roots aren't visible in the Elements tree.
    let currentElement: Element = root;
    let currentWeight = rootWeight - 1;

    while (index !== currentWeight) {
      const numChildren = currentElement.children.length;
      for (let i = 0; i < numChildren; i++) {
        const childID = currentElement.children[i];
        const child = this._idToElement.get(childID);

        if (child === undefined) {
          this._throwAndEmitError(
            Error(
              `Couldn't child element with id "${childID}": no matching node was found in the Store.`,
            ),
          );

          return null;
        }

        const childWeight = child.isCollapsed ? 1 : child.weight;

        if (index <= currentWeight + childWeight) {
          currentWeight++;
          currentElement = child;
          break;
        } else {
          currentWeight += childWeight;
        }
      }
    }

    return currentElement || null;
  }

  getElementIDAtIndex(index: number): number | null {
    const element = this.getElementAtIndex(index);
    return element === null ? null : element.id;
  }

  getElementByID(id: number): Element | null {
    const element = this._idToElement.get(id);
    if (element === undefined) {
      console.warn(`No element found with id "${id}"`);
      return null;
    }

    return element;
  }

  containsSuspense(id: SuspenseNode['id']): boolean {
    return this._idToSuspense.has(id);
  }

  getSuspenseByID(id: SuspenseNode['id']): SuspenseNode | null {
    const suspense = this._idToSuspense.get(id);
    if (suspense === undefined) {
      console.warn(`No suspense found with id "${id}"`);
      return null;
    }

    return suspense;
  }

  // Returns a tuple of [id, index]
  getElementsWithErrorsAndWarnings(): ErrorAndWarningTuples {
    if (!this._shouldShowWarningsAndErrors) {
      return [];
    }

    if (this._cachedErrorAndWarningTuples !== null) {
      return this._cachedErrorAndWarningTuples;
    }

    const errorAndWarningTuples: ErrorAndWarningTuples = [];

    this._errorsAndWarnings.forEach((_, id) => {
      const index = this.getIndexOfElementID(id);
      if (index !== null) {
        let low = 0;
        let high = errorAndWarningTuples.length;
        while (low < high) {
          const mid = (low + high) >> 1;
          if (errorAndWarningTuples[mid].index > index) {
            high = mid;
          } else {
            low = mid + 1;
          }
        }

        errorAndWarningTuples.splice(low, 0, {id, index});
      }
    });

    // Cache for later (at least until the tree changes again).
    this._cachedErrorAndWarningTuples = errorAndWarningTuples;
    return errorAndWarningTuples;
  }

  getErrorAndWarningCountForElementID(id: number): {
    errorCount: number,
    warningCount: number,
  } {
    if (!this._shouldShowWarningsAndErrors) {
      return {errorCount: 0, warningCount: 0};
    }

    return this._errorsAndWarnings.get(id) || {errorCount: 0, warningCount: 0};
  }

  getIndexOfElementID(id: number): number | null {
    const element = this.getElementByID(id);

    if (element === null || element.parentID === 0) {
      return null;
    }

    // Walk up the tree to the root.
    // Increment the index by one for each node we encounter,
    // and by the weight of all nodes to the left of the current one.
    // This should be a relatively fast way of determining the index of a node within the tree.
    let previousID = id;
    let currentID = element.parentID;
    let index = 0;
    while (true) {
      const current = this._idToElement.get(currentID);
      if (current === undefined) {
        return null;
      }

      const {children} = current;
      for (let i = 0; i < children.length; i++) {
        const childID = children[i];
        if (childID === previousID) {
          break;
        }

        const child = this._idToElement.get(childID);
        if (child === undefined) {
          return null;
        }

        index += child.isCollapsed ? 1 : child.weight;
      }

      if (current.parentID === 0) {
        // We found the root; stop crawling.
        break;
      }

      index++;

      previousID = current.id;
      currentID = current.parentID;
    }

    // At this point, the current ID is a root (from the previous loop).
    // We also need to offset the index by previous root weights.
    for (let i = 0; i < this._roots.length; i++) {
      const rootID = this._roots[i];
      if (rootID === currentID) {
        break;
      }

      const root = this._idToElement.get(rootID);
      if (root === undefined) {
        return null;
      }

      index += root.weight;
    }

    return index;
  }

  isDescendantOf(parentId: number, descendantId: number): boolean {
    if (descendantId === 0) {
      return false;
    }

    const descendant = this.getElementByID(descendantId);
    if (descendant === null) {
      return false;
    }

    if (descendant.parentID === parentId) {
      return true;
    }

    const parent = this.getElementByID(parentId);
    if (!parent || parent.depth >= descendant.depth) {
      return false;
    }

    return this.isDescendantOf(parentId, descendant.parentID);
  }

  /**
   * Returns index of the lowest descendant element, if available.
   * May not be the deepest element, the lowest is used in a sense of bottom-most from UI Tree representation perspective.
   */
  getIndexOfLowestDescendantElement(element: Element): number | null {
    let current: null | Element = element;
    while (current !== null) {
      if (current.isCollapsed || current.children.length === 0) {
        if (current === element) {
          return null;
        }

        return this.getIndexOfElementID(current.id);
      } else {
        const lastChildID = current.children[current.children.length - 1];
        current = this.getElementByID(lastChildID);
      }
    }

    return null;
  }

  getOwnersListForElement(ownerID: number): Array<Element> {
    const list: Array<Element> = [];
    const element = this._idToElement.get(ownerID);
    if (element !== undefined) {
      list.push({
        ...element,
        depth: 0,
      });

      const unsortedIDs = this._ownersMap.get(ownerID);
      if (unsortedIDs !== undefined) {
        const depthMap: Map<number, number> = new Map([[ownerID, 0]]);

        // Items in a set are ordered based on insertion.
        // This does not correlate with their order in the tree.
        // So first we need to order them.
        // I wish we could avoid this sorting operation; we could sort at insertion time,
        // but then we'd have to pay sorting costs even if the owners list was never used.
        // Seems better to defer the cost, since the set of ids is probably pretty small.
        const sortedIDs = Array.from(unsortedIDs).sort(
          (idA, idB) =>
            (this.getIndexOfElementID(idA) || 0) -
            (this.getIndexOfElementID(idB) || 0),
        );

        // Next we need to determine the appropriate depth for each element in the list.
        // The depth in the list may not correspond to the depth in the tree,
        // because the list has been filtered to remove intermediate components.
        // Perhaps the easiest way to do this is to walk up the tree until we reach either:
        // (1) another node that's already in the tree, or (2) the root (owner)
        // at which point, our depth is just the depth of that node plus one.
        sortedIDs.forEach(id => {
          const innerElement = this._idToElement.get(id);
          if (innerElement !== undefined) {
            let parentID = innerElement.parentID;

            let depth = 0;
            while (parentID > 0) {
              if (parentID === ownerID || unsortedIDs.has(parentID)) {
                // $FlowFixMe[unsafe-addition] addition with possible null/undefined value
                depth = depthMap.get(parentID) + 1;
                depthMap.set(id, depth);
                break;
              }
              const parent = this._idToElement.get(parentID);
              if (parent === undefined) {
                break;
              }
              parentID = parent.parentID;
            }

            if (depth === 0) {
              this._throwAndEmitError(Error('Invalid owners list'));
            }

            list.push({...innerElement, depth});
          }
        });
      }
    }

    return list;
  }

  getSuspenseLineage(
    suspenseID: SuspenseNode['id'],
  ): $ReadOnlyArray<SuspenseNode['id']> {
    const lineage: Array<SuspenseNode['id']> = [];
    let next: null | SuspenseNode = this.getSuspenseByID(suspenseID);
    while (next !== null) {
      if (next.parentID === 0) {
        next = null;
      } else {
        lineage.unshift(next.id);
        next = this.getSuspenseByID(next.parentID);
      }
    }

    return lineage;
  }

  /**
   * Like {@link getRootIDForElement} but should be used for traversing Suspense since it works with disconnected nodes.
   */
  getSuspenseRootIDForSuspense(id: SuspenseNode['id']): number | null {
    let current = this._idToSuspense.get(id);
    while (current !== undefined) {
      if (current.parentID === 0) {
        return current.id;
      } else {
        current = this._idToSuspense.get(current.parentID);
      }
    }
    return null;
  }

  /**
   * @param uniqueSuspendersOnly Filters out boundaries without unique suspenders
   */
  getSuspendableDocumentOrderSuspenseInitialPaint(
    uniqueSuspendersOnly: boolean,
  ): Array<SuspenseTimelineStep> {
    const target: Array<SuspenseTimelineStep> = [];
    const roots = this.roots;
    let rootStep: null | SuspenseTimelineStep = null;
    for (let i = 0; i < roots.length; i++) {
      const rootID = roots[i];
      const root = this.getElementByID(rootID);
      if (root === null) {
        continue;
      }
      const rendererID = this._rootIDToRendererID.get(rootID);
      if (rendererID === undefined) {
        throw new Error(
          'Failed to find renderer ID for root. This is a bug in React DevTools.',
        );
      }
      // TODO: This includes boundaries that can't be suspended due to no support from the renderer.

      const suspense = this.getSuspenseByID(rootID);
      if (suspense !== null) {
        const environments = suspense.environments;
        const environmentName =
          environments.length > 0
            ? environments[environments.length - 1]
            : null;
        if (rootStep === null) {
          // Arbitrarily use the first root as the root step id.
          rootStep = {
            id: suspense.id,
            environment: environmentName,
            endTime: suspense.endTime,
            rendererID,
          };
          target.push(rootStep);
        } else {
          if (rootStep.environment === null) {
            // If any root has an environment name, then let's use it.
            rootStep.environment = environmentName;
          }
          if (suspense.endTime > rootStep.endTime) {
            // If any root has a higher end time, let's use that.
            rootStep.endTime = suspense.endTime;
          }
        }
        this.pushTimelineStepsInDocumentOrder(
          suspense.children,
          target,
          uniqueSuspendersOnly,
          environments,
          0, // Don't pass a minimum end time at the root. The root is always first so doesn't matter.
          rendererID,
        );
      }
    }

    return target;
  }

  _pushSuspenseChildrenInDocumentOrder(
    children: Array<Element['id']>,
    target: Array<SuspenseNode['id']>,
  ): void {
    for (let i = 0; i < children.length; i++) {
      const childID = children[i];
      const suspense = this._idToSuspense.get(childID);
      if (suspense !== undefined) {
        target.push(suspense.id);
      } else {
        const childElement = this._idToElement.get(childID);
        if (childElement !== undefined) {
          this._pushSuspenseChildrenInDocumentOrder(
            childElement.children,
            target,
          );
        }
      }
    }
  }

  getSuspenseChildren(id: Element['id']): Array<SuspenseNode['id']> {
    const transitionChildren: Array<SuspenseNode['id']> = [];

    const root = this._idToElement.get(id);
    if (root === undefined) {
      return transitionChildren;
    }

    this._pushSuspenseChildrenInDocumentOrder(
      root.children,
      transitionChildren,
    );

    return transitionChildren;
  }

  /**
   * @param uniqueSuspendersOnly Filters out boundaries without unique suspenders
   */
  getSuspendableDocumentOrderSuspenseTransition(
    uniqueSuspendersOnly: boolean,
    rendererID: number,
  ): Array<SuspenseTimelineStep> {
    const target: Array<SuspenseTimelineStep> = [];
    const focusedTransitionID = this._focusedTransition;
    // $FlowFixMe[invalid-compare]
    if (focusedTransitionID === null) {
      return target;
    }

    target.push({
      id: focusedTransitionID,
      // TODO: Get environment for Activity
      environment: null,
      endTime: 0,
      rendererID,
    });

    const transitionChildren = this.getSuspenseChildren(focusedTransitionID);

    this.pushTimelineStepsInDocumentOrder(
      transitionChildren,
      target,
      uniqueSuspendersOnly,
      // TODO: Get environment for Activity
      [],
      0, // Don't pass a minimum end time at the root. The root is always first so doesn't matter.
      rendererID,
    );

    return target;
  }

  pushTimelineStepsInDocumentOrder(
    children: Array<SuspenseNode['id']>,
    target: Array<SuspenseTimelineStep>,
    uniqueSuspendersOnly: boolean,
    parentEnvironments: Array<string>,
    parentEndTime: number,
    rendererID: number,
  ): void {
    for (let i = 0; i < children.length; i++) {
      const child = this.getSuspenseByID(children[i]);
      if (child === null) {
        continue;
      }
      // Ignore any suspense boundaries that has no visual representation as this is not
      // part of the visible loading sequence.
      // TODO: Consider making visible meta data and other side-effects get virtual rects.
      const hasRects =
        child.rects !== null &&
        child.rects.length > 0 &&
        child.rects.some(isNonZeroRect);
      const childEnvironments = child.environments;
      // Since children are blocked on the parent, they're also blocked by the parent environments.
      // Only if we discover a novel environment do we add that and it becomes the name we use.
      const unionEnvironments = unionOfTwoArrays(
        parentEnvironments,
        childEnvironments,
      );
      const environmentName =
        unionEnvironments.length > 0
          ? unionEnvironments[unionEnvironments.length - 1]
          : null;
      // The end time of a child boundary can in effect never be earlier than its parent even if
      // everything unsuspended before that.
      const maxEndTime =
        parentEndTime > child.endTime ? parentEndTime : child.endTime;
      if (hasRects && (!uniqueSuspendersOnly || child.hasUniqueSuspenders)) {
        target.push({
          id: child.id,
          environment: environmentName,
          endTime: maxEndTime,
          rendererID,
        });
      }
      this.pushTimelineStepsInDocumentOrder(
        child.children,
        target,
        uniqueSuspendersOnly,
        unionEnvironments,
        maxEndTime,
        rendererID,
      );
    }
  }

  getEndTimeOrDocumentOrderSuspense(
    uniqueSuspendersOnly: boolean,
  ): $ReadOnlyArray<SuspenseTimelineStep> {
    let timeline: SuspenseTimelineStep[];
    if (this._focusedTransition === 0) {
      timeline =
        this.getSuspendableDocumentOrderSuspenseInitialPaint(
          uniqueSuspendersOnly,
        );
    } else {
      const focusedTransitionRootID = this.getRootIDForElement(
        this._focusedTransition,
      );
      if (focusedTransitionRootID === null) {
        throw new Error(
          'Failed to find root ID for focused transition. This is a bug in React DevTools.',
        );
      }
      const rendererID = this._rootIDToRendererID.get(focusedTransitionRootID);
      if (rendererID === undefined) {
        throw new Error(
          'Failed to find renderer ID for focused transition root. This is a bug in React DevTools.',
        );
      }
      timeline = this.getSuspendableDocumentOrderSuspenseTransition(
        uniqueSuspendersOnly,
        rendererID,
      );
    }

    if (timeline.length === 0) {
      return timeline;
    }
    const root = timeline[0];
    // We mutate in place since we assume we've got a fresh array.
    timeline.sort((a, b) => {
      // Root is always first
      return a === root ? -1 : b === root ? 1 : a.endTime - b.endTime;
    });
    return timeline;
  }

  getActivities(): Array<{id: Element['id'], depth: number}> {
    const target: Array<{id: Element['id'], depth: number}> = [];
    // TODO: Keep a live tree in the backend so we don't need to recalculate
    // this each time while also including filtered Activities.
    this._pushActivitiesInDocumentOrder(this.roots, target, 0);
    return target;
  }

  _pushActivitiesInDocumentOrder(
    children: $ReadOnlyArray<Element['id']>,
    target: Array<{id: Element['id'], depth: number}>,
    depth: number,
  ): void {
    for (let i = 0; i < children.length; i++) {
      const child = this._idToElement.get(children[i]);
      if (child === undefined) {
        continue;
      }
      if (child.type === ElementTypeActivity && child.nameProp !== null) {
        target.push({id: child.id, depth});
        this._pushActivitiesInDocumentOrder(child.children, target, depth + 1);
      } else {
        this._pushActivitiesInDocumentOrder(child.children, target, depth);
      }
    }
  }

  getRendererIDForElement(id: number): number | null {
    let current = this._idToElement.get(id);
    while (current !== undefined) {
      if (current.parentID === 0) {
        const rendererID = this._rootIDToRendererID.get(current.id);
        return rendererID == null ? null : rendererID;
      } else {
        current = this._idToElement.get(current.parentID);
      }
    }
    return null;
  }

  getRootIDForElement(id: number): number | null {
    let current = this._idToElement.get(id);
    while (current !== undefined) {
      if (current.parentID === 0) {
        return current.id;
      } else {
        current = this._idToElement.get(current.parentID);
      }
    }
    return null;
  }

  isInsideCollapsedSubTree(id: number): boolean {
    let current = this._idToElement.get(id);
    while (current != null) {
      if (current.parentID === 0) {
        return false;
      } else {
        current = this._idToElement.get(current.parentID);
        if (current != null && current.isCollapsed) {
          return true;
        }
      }
    }
    return false;
  }

  // TODO Maybe split this into two methods: expand() and collapse()
  toggleIsCollapsed(id: number, isCollapsed: boolean): void {
    let didMutate = false;

    const element = this.getElementByID(id);
    if (element !== null) {
      if (isCollapsed) {
        if (element.type === ElementTypeRoot) {
          this._throwAndEmitError(Error('Root nodes cannot be collapsed'));
        }

        if (!element.isCollapsed) {
          didMutate = true;
          element.isCollapsed = true;

          const weightDelta = 1 - element.weight;

          let parentElement = this._idToElement.get(element.parentID);
          while (parentElement !== undefined) {
            // We don't need to break on a collapsed parent in the same way as the expand case below.
            // That's because collapsing a node doesn't "bubble" and affect its parents.
            parentElement.weight += weightDelta;
            parentElement = this._idToElement.get(parentElement.parentID);
          }
        }
      } else {
        let currentElement: ?Element = element;
        while (currentElement != null) {
          const oldWeight = currentElement.isCollapsed
            ? 1
            : currentElement.weight;

          if (currentElement.isCollapsed) {
            didMutate = true;
            currentElement.isCollapsed = false;

            const newWeight = currentElement.isCollapsed
              ? 1
              : currentElement.weight;
            const weightDelta = newWeight - oldWeight;

            let parentElement = this._idToElement.get(currentElement.parentID);
            while (parentElement !== undefined) {
              parentElement.weight += weightDelta;
              if (parentElement.isCollapsed) {
                // It's important to break on a collapsed parent when expanding nodes.
                // That's because expanding a node "bubbles" up and expands all parents as well.
                // Breaking in this case prevents us from over-incrementing the expanded weights.
                break;
              }
              parentElement = this._idToElement.get(parentElement.parentID);
            }
          }

          currentElement =
            currentElement.parentID !== 0
              ? this.getElementByID(currentElement.parentID)
              : null;
        }
      }

      // Only re-calculate weights and emit an "update" event if the store was mutated.
      if (didMutate) {
        let weightAcrossRoots = 0;
        this._roots.forEach(rootID => {
          const {weight} = this.getElementByID(rootID) as any as Element;
          weightAcrossRoots += weight;
        });
        this._weightAcrossRoots = weightAcrossRoots;

        // The Tree context's search reducer expects an explicit list of ids for nodes that were added or removed.
        // In this  case, we can pass it empty arrays since nodes in a collapsed tree are still there (just hidden).
        // Updating the selected search index later may require auto-expanding a collapsed subtree though.
        this.emit('mutated', [[], new Map(), null]);
      }
    }
  }

  _adjustParentTreeWeight: (
    parentElement: ?Element,
    weightDelta: number,
  ) => void = (parentElement, weightDelta) => {
    let isInsideCollapsedSubTree = false;

    while (parentElement != null) {
      parentElement.weight += weightDelta;

      // Additions and deletions within a collapsed subtree should not bubble beyond the collapsed parent.
      // Their weight will bubble up when the parent is expanded.
      if (parentElement.isCollapsed) {
        isInsideCollapsedSubTree = true;
        break;
      }

      parentElement = this._idToElement.get(parentElement.parentID);
    }

    // Additions and deletions within a collapsed subtree should not affect the overall number of elements.
    if (!isInsideCollapsedSubTree) {
      this._weightAcrossRoots += weightDelta;
    }
  };

  _recursivelyUpdateSubtree(
    id: number,
    callback: (element: Element) => void,
  ): void {
    const element = this._idToElement.get(id);
    if (element) {
      callback(element);

      element.children.forEach(child =>
        this._recursivelyUpdateSubtree(child, callback),
      );
    }
  }

  onBridgeNativeStyleEditorSupported: ({
    isSupported: boolean,
    validAttributes: ?$ReadOnlyArray<string>,
  }) => void = ({isSupported, validAttributes}) => {
    this._isNativeStyleEditorSupported = isSupported;
    this._nativeStyleEditorValidAttributes = validAttributes || null;

    this.emit('supportsNativeStyleEditor');
  };

  onBridgeOperations: (operations: Array<number>) => void = operations => {
    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      console.groupCollapsed('onBridgeOperations');
      debug('onBridgeOperations', operations.join(','));
    }

    let haveRootsChanged = false;
    let haveErrorsOrWarningsChanged = false;
    let hasSuspenseTreeChanged = false;

    // The first two values are always rendererID and rootID
    const rendererID = operations[0];

    const addedElementIDs: Array<number> = [];
    // This is a mapping of removed ID -> parent ID:
    // We'll use the parent ID to adjust selection if it gets deleted.
    const removedElementIDs: Map<number, number> = new Map();
    const removedSuspenseIDs: Map<SuspenseNode['id'], SuspenseNode['id']> =
      new Map();
    let nextActivitySliceID: Element['id'] | null = null;

    let i = 2;

    // Reassemble the string table.
    const stringTable: Array<string | null> = [
      null, // ID = 0 corresponds to the null string.
    ];
    const stringTableSize = operations[i];
    i++;

    const stringTableEnd = i + stringTableSize;

    while (i < stringTableEnd) {
      const nextLength = operations[i];
      i++;

      const nextString = utfDecodeStringWithRanges(
        operations,
        i,
        i + nextLength - 1,
      );
      stringTable.push(nextString);
      i += nextLength;
    }

    while (i < operations.length) {
      const operation = operations[i];
      switch (operation) {
        case TREE_OPERATION_ADD: {
          const id = operations[i + 1];
          const type = operations[i + 2] as any as ElementType;

          i += 3;

          if (this._idToElement.has(id)) {
            this._throwAndEmitError(
              Error(
                `Cannot add node "${id}" because a node with that id is already in the Store.`,
              ),
            );
          }

          if (type === ElementTypeRoot) {
            // $FlowFixMe[constant-condition]
            if (__DEBUG__) {
              debug('Add', `new root node ${id}`);
            }

            const isStrictModeCompliant = operations[i] > 0;
            i++;

            const profilerFlags = operations[i++];
            const supportsBasicProfiling =
              (profilerFlags & PROFILING_FLAG_BASIC_SUPPORT) !== 0;
            const supportsTimeline =
              (profilerFlags & PROFILING_FLAG_TIMELINE_SUPPORT) !== 0;
            const supportsPerformanceTracks =
              (profilerFlags & PROFILING_FLAG_PERFORMANCE_TRACKS_SUPPORT) !== 0;
            let supportsAdvancedProfiling: AdvancedProfiling =
              ADVANCED_PROFILING_NONE;
            if (supportsPerformanceTracks) {
              supportsAdvancedProfiling = ADVANCED_PROFILING_PERFORMANCE_TRACKS;
            } else if (supportsTimeline) {
              supportsAdvancedProfiling = ADVANCED_PROFILING_TIMELINE;
            }

            let supportsStrictMode = false;
            let hasOwnerMetadata = false;

            // If we don't know the bridge protocol, guess that we're dealing with the latest.
            // If we do know it, we can take it into consideration when parsing operations.
            if (
              this._bridgeProtocol === null ||
              this._bridgeProtocol.version >= 2
            ) {
              supportsStrictMode = operations[i] > 0;
              i++;

              hasOwnerMetadata = operations[i] > 0;
              i++;
            }

            this._roots = this._roots.concat(id);
            this._rootIDToRendererID.set(id, rendererID);
            this._rootIDToCapabilities.set(id, {
              supportsBasicProfiling,
              hasOwnerMetadata,
              supportsStrictMode,
              supportsAdvancedProfiling,
            });

            // Not all roots support StrictMode;
            // don't flag a root as non-compliant unless it also supports StrictMode.
            const isStrictModeNonCompliant =
              !isStrictModeCompliant && supportsStrictMode;

            this._idToElement.set(id, {
              children: [],
              depth: -1,
              displayName: null,
              hocDisplayNames: null,
              id,
              isCollapsed: false, // Never collapse roots; it would hide the entire tree.
              isStrictModeNonCompliant,
              isActivityHidden: false,
              isInsideHiddenActivity: false,
              key: null,
              nameProp: null,
              ownerID: 0,
              parentID: 0,
              type,
              weight: 0,
              compiledWithForget: false,
            });

            haveRootsChanged = true;
          } else {
            const parentID = operations[i];
            i++;

            const ownerID = operations[i];
            i++;

            const displayNameStringID = operations[i];
            const displayName = stringTable[displayNameStringID];
            i++;

            const keyStringID = operations[i];
            const key = stringTable[keyStringID];
            i++;

            const namePropStringID = operations[i];
            const nameProp = stringTable[namePropStringID];
            i++;

            // $FlowFixMe[constant-condition]
            if (__DEBUG__) {
              debug(
                'Add',
                `node ${id} (${displayName || 'null'}) as child of ${parentID}`,
              );
            }

            const parentElement = this._idToElement.get(parentID);
            if (parentElement === undefined) {
              if (removedElementIDs.has(parentID)) {
                break;
              }

              this._throwAndEmitError(
                Error(
                  `Cannot add child "${id}" to parent "${parentID}" because parent node was not found in the Store.`,
                ),
              );

              break;
            }

            parentElement.children.push(id);

            const {
              formattedDisplayName: displayNameWithoutHOCs,
              hocDisplayNames,
              compiledWithForget,
            } = parseElementDisplayNameFromBackend(displayName, type);

            const elementDepth = parentElement.depth + 1;
            this._maximumRecordedDepth = Math.max(
              this._maximumRecordedDepth,
              elementDepth,
            );

            const element: Element = {
              children: [],
              depth: elementDepth,
              displayName: displayNameWithoutHOCs,
              hocDisplayNames,
              id,
              isCollapsed: this._collapseNodesByDefault,
              isStrictModeNonCompliant: parentElement.isStrictModeNonCompliant,
              isActivityHidden: false,
              isInsideHiddenActivity:
                parentElement.isInsideHiddenActivity ||
                parentElement.isActivityHidden,
              key,
              nameProp,
              ownerID,
              parentID,
              type,
              weight: 1,
              compiledWithForget,
            };

            this._idToElement.set(id, element);
            addedElementIDs.push(id);
            this._adjustParentTreeWeight(parentElement, 1);

            if (ownerID > 0) {
              let set = this._ownersMap.get(ownerID);
              if (set === undefined) {
                set = new Set();
                this._ownersMap.set(ownerID, set);
              }
              set.add(id);
            }

            const suspense = this._idToSuspense.get(id);
            if (suspense !== undefined) {
              // We're reconnecting a node.
              if (suspense.name === null) {
                suspense.name = this._guessSuspenseName(element);
              }
            }
          }
          break;
        }
        case TREE_OPERATION_REMOVE: {
          const removeLength = operations[i + 1];
          i += 2;

          for (let removeIndex = 0; removeIndex < removeLength; removeIndex++) {
            const id = operations[i];
            const element = this._idToElement.get(id);

            if (element === undefined) {
              this._throwAndEmitError(
                Error(
                  `Cannot remove node "${id}" because no matching node was found in the Store.`,
                ),
              );

              break;
            }

            i += 1;

            const {children, ownerID, parentID, weight} = element;
            if (children.length > 0) {
              this._throwAndEmitError(
                Error(`Node "${id}" was removed before its children.`),
              );
            }

            this._idToElement.delete(id);

            let parentElement: ?Element = null;
            if (parentID === 0) {
              // $FlowFixMe[constant-condition]
              if (__DEBUG__) {
                debug('Remove', `node ${id} root`);
              }

              this._roots = this._roots.filter(rootID => rootID !== id);
              this._rootIDToRendererID.delete(id);
              this._rootIDToCapabilities.delete(id);

              haveRootsChanged = true;
            } else {
              // $FlowFixMe[constant-condition]
              if (__DEBUG__) {
                debug('Remove', `node ${id} from parent ${parentID}`);
              }

              parentElement = this._idToElement.get(parentID);
              if (parentElement === undefined) {
                this._throwAndEmitError(
                  Error(
                    `Cannot remove node "${id}" from parent "${parentID}" because no matching node was found in the Store.`,
                  ),
                );

                break;
              }

              const index = parentElement.children.indexOf(id);
              parentElement.children.splice(index, 1);
            }

            this._adjustParentTreeWeight(parentElement, -weight);
            removedElementIDs.set(id, parentID);

            this._ownersMap.delete(id);
            if (ownerID > 0) {
              const set = this._ownersMap.get(ownerID);
              if (set !== undefined) {
                set.delete(id);
              }
            }

            if (this._errorsAndWarnings.has(id)) {
              this._errorsAndWarnings.delete(id);
              haveErrorsOrWarningsChanged = true;
            }
          }

          break;
        }
        case TREE_OPERATION_REORDER_CHILDREN: {
          const id = operations[i + 1];
          const numChildren = operations[i + 2];
          i += 3;

          const element = this._idToElement.get(id);
          if (element === undefined) {
            this._throwAndEmitError(
              Error(
                `Cannot reorder children for node "${id}" because no matching node was found in the Store.`,
              ),
            );

            break;
          }

          const children = element.children;
          if (children.length !== numChildren) {
            this._throwAndEmitError(
              Error(
                `Children cannot be added or removed during a reorder operation.`,
              ),
            );
          }

          for (let j = 0; j < numChildren; j++) {
            const childID = operations[i + j];
            children[j] = childID;
            if (__DEV__) {
              // This check is more expensive so it's gated by __DEV__.
              const childElement = this._idToElement.get(childID);
              if (childElement == null || childElement.parentID !== id) {
                console.error(
                  `Children cannot be added or removed during a reorder operation.`,
                );
              }
            }
          }
          i += numChildren;

          // $FlowFixMe[constant-condition]
          if (__DEBUG__) {
            debug('Re-order', `Node ${id} children ${children.join(',')}`);
          }
          break;
        }
        case TREE_OPERATION_SET_SUBTREE_MODE: {
          const id = operations[i + 1];
          const mode = operations[i + 2];

          i += 3;

          // If elements have already been mounted in this subtree, update them.
          // (In practice, this likely only applies to the root element.)
          if (mode === StrictMode) {
            this._recursivelyUpdateSubtree(id, element => {
              element.isStrictModeNonCompliant = false;
            });
          } else if (mode === ActivityHiddenMode) {
            const element = this._idToElement.get(id);
            if (element != null) {
              element.isActivityHidden = true;
              element.children.forEach(childID =>
                this._recursivelyUpdateSubtree(childID, child => {
                  child.isInsideHiddenActivity = true;
                }),
              );
              // Collapse hidden Activity subtrees by default.
              if (!element.isCollapsed) {
                element.isCollapsed = true;
                if (element.children.length > 0) {
                  const weightDelta = 1 - element.weight;
                  const parentElement = this._idToElement.get(element.parentID);
                  this._adjustParentTreeWeight(parentElement, weightDelta);
                }
              }
            }
          } else if (mode === ActivityVisibleMode) {
            const element = this._idToElement.get(id);
            if (element != null) {
              element.isActivityHidden = false;
              element.children.forEach(childID =>
                this._recursivelyUpdateSubtree(childID, child => {
                  child.isInsideHiddenActivity = false;
                }),
              );
              // Expand Activity subtree when it becomes visible.
              if (element.isCollapsed && element.children.length > 0) {
                element.isCollapsed = false;
                const weightDelta = element.weight - 1;
                const parentElement = this._idToElement.get(element.parentID);
                this._adjustParentTreeWeight(parentElement, weightDelta);
              }
            }
          }

          // $FlowFixMe[constant-condition]
          if (__DEBUG__) {
            debug(
              'Subtree mode',
              `Subtree with root ${id} set to mode ${mode}`,
            );
          }
          break;
        }
        case TREE_OPERATION_UPDATE_TREE_BASE_DURATION:
          // Base duration updates are only sent while profiling is in progress.
          // We can ignore them at this point.
          // The profiler UI uses them lazily in order to generate the tree.
          i += 3;
          break;
        case TREE_OPERATION_UPDATE_ERRORS_OR_WARNINGS: {
          const id = operations[i + 1];
          const errorCount = operations[i + 2];
          const warningCount = operations[i + 3];

          i += 4;

          if (errorCount > 0 || warningCount > 0) {
            this._errorsAndWarnings.set(id, {errorCount, warningCount});
          } else if (this._errorsAndWarnings.has(id)) {
            this._errorsAndWarnings.delete(id);
          }
          haveErrorsOrWarningsChanged = true;
          break;
        }
        case SUSPENSE_TREE_OPERATION_ADD: {
          const id = operations[i + 1];
          const parentID = operations[i + 2];
          const nameStringID = operations[i + 3];
          const isSuspended = operations[i + 4] === 1;
          const numRects = operations[i + 5] as any as number;
          let name = stringTable[nameStringID];

          if (this._idToSuspense.has(id)) {
            this._throwAndEmitError(
              Error(
                `Cannot add suspense node "${id}" because a suspense node with that id is already in the Store.`,
              ),
            );
          }

          const element = this._idToElement.get(id);
          if (element === undefined) {
            // This element isn't connected yet.
          } else {
            if (name === null) {
              // The boundary isn't explicitly named.
              // Pick a sensible default.
              if (parentID === 0) {
                // For Roots we use their display name.
                name = element.displayName;
              } else {
                name = this._guessSuspenseName(element);
              }
            }
          }

          i += 6;
          let rects: SuspenseNode['rects'];
          if (numRects === -1) {
            rects = null;
          } else {
            rects = [];
            for (let rectIndex = 0; rectIndex < numRects; rectIndex++) {
              const x = operations[i + 0] / 1000;
              const y = operations[i + 1] / 1000;
              const width = operations[i + 2] / 1000;
              const height = operations[i + 3] / 1000;
              const rect = {x, y, width, height};
              if (parentID !== 0) {
                // Track all rects except the root.
                this._rtree.insert(rect);
              }
              rects.push(rect);
              i += 4;
            }
          }

          // $FlowFixMe[constant-condition]
          if (__DEBUG__) {
            debug('Suspense Add', `node ${id} as child of ${parentID}`);
          }

          if (parentID !== 0) {
            const parentSuspense = this._idToSuspense.get(parentID);
            if (parentSuspense === undefined) {
              this._throwAndEmitError(
                Error(
                  `Cannot add suspense child "${id}" to parent suspense "${parentID}" because parent suspense node was not found in the Store.`,
                ),
              );

              break;
            }

            parentSuspense.children.push(id);
          }

          this._idToSuspense.set(id, {
            id,
            parentID,
            children: [],
            name,
            rects,
            hasUniqueSuspenders: false,
            isSuspended: isSuspended,
            environments: [],
            endTime: 0,
          });

          hasSuspenseTreeChanged = true;
          break;
        }
        case SUSPENSE_TREE_OPERATION_REMOVE: {
          const removeLength = operations[i + 1];
          i += 2;

          for (let removeIndex = 0; removeIndex < removeLength; removeIndex++) {
            const id = operations[i];
            const suspense = this._idToSuspense.get(id);

            if (suspense === undefined) {
              this._throwAndEmitError(
                Error(
                  `Cannot remove suspense node "${id}" because no matching node was found in the Store.`,
                ),
              );

              break;
            }

            i += 1;

            const {children, parentID, rects} = suspense;
            if (children.length > 0) {
              this._throwAndEmitError(
                Error(`Suspense node "${id}" was removed before its children.`),
              );
            }

            if (rects !== null && parentID !== 0) {
              // Delete all the existing rects from the R-tree
              for (let j = 0; j < rects.length; j++) {
                this._rtree.remove(rects[j]);
              }
            }

            this._idToSuspense.delete(id);
            removedSuspenseIDs.set(id, parentID);

            let parentSuspense: ?SuspenseNode = null;
            if (parentID === 0) {
              // $FlowFixMe[constant-condition]
              if (__DEBUG__) {
                debug('Suspense remove', `node ${id} root`);
              }
            } else {
              // $FlowFixMe[constant-condition]
              if (__DEBUG__) {
                debug('Suspense Remove', `node ${id} from parent ${parentID}`);
              }

              parentSuspense = this._idToSuspense.get(parentID);
              if (parentSuspense === undefined) {
                this._throwAndEmitError(
                  Error(
                    `Cannot remove suspense node "${id}" from parent "${parentID}" because no matching node was found in the Store.`,
                  ),
                );

                break;
              }

              const index = parentSuspense.children.indexOf(id);
              if (index === -1) {
                this._throwAndEmitError(
                  Error(
                    `Cannot remove suspense node "${id}" from parent "${parentID}" because it is not a child of the parent.`,
                  ),
                );
              }
              parentSuspense.children.splice(index, 1);
            }
          }

          hasSuspenseTreeChanged = true;
          break;
        }
        case SUSPENSE_TREE_OPERATION_REORDER_CHILDREN: {
          const id = operations[i + 1];
          const numChildren = operations[i + 2];
          i += 3;

          const suspense = this._idToSuspense.get(id);
          if (suspense === undefined) {
            this._throwAndEmitError(
              Error(
                `Cannot reorder children for suspense node "${id}" because no matching node was found in the Store.`,
              ),
            );

            break;
          }

          const children = suspense.children;
          if (children.length !== numChildren) {
            this._throwAndEmitError(
              Error(
                `Suspense children cannot be added or removed during a reorder operation.`,
              ),
            );
          }

          for (let j = 0; j < numChildren; j++) {
            const childID = operations[i + j];
            children[j] = childID;
            if (__DEV__) {
              // This check is more expensive so it's gated by __DEV__.
              const childSuspense = this._idToSuspense.get(childID);
              if (childSuspense == null || childSuspense.parentID !== id) {
                console.error(
                  `Suspense children cannot be added or removed during a reorder operation.`,
                );
              }
            }
          }
          i += numChildren;

          // $FlowFixMe[constant-condition]
          if (__DEBUG__) {
            debug(
              'Re-order',
              `Suspense node ${id} children ${children.join(',')}`,
            );
          }

          hasSuspenseTreeChanged = true;
          break;
        }
        case SUSPENSE_TREE_OPERATION_RESIZE: {
          const id = operations[i + 1] as any as number;
          const numRects = operations[i + 2] as any as number;
          i += 3;

          const suspense = this._idToSuspense.get(id);
          if (suspense === undefined) {
            this._throwAndEmitError(
              Error(
                `Cannot set rects for suspense node "${id}" because no matching node was found in the Store.`,
              ),
            );

            break;
          }

          const prevRects = suspense.rects;
          if (prevRects !== null && suspense.parentID !== 0) {
            // Delete all the existing rects from the R-tree
            for (let j = 0; j < prevRects.length; j++) {
              this._rtree.remove(prevRects[j]);
            }
          }

          let nextRects: SuspenseNode['rects'];
          if (numRects === -1) {
            nextRects = null;
          } else {
            nextRects = [];
            for (let rectIndex = 0; rectIndex < numRects; rectIndex++) {
              const x = operations[i + 0] / 1000;
              const y = operations[i + 1] / 1000;
              const width = operations[i + 2] / 1000;
              const height = operations[i + 3] / 1000;

              const rect = {x, y, width, height};
              if (suspense.parentID !== 0) {
                // Track all rects except the root.
                this._rtree.insert(rect);
              }
              nextRects.push(rect);

              i += 4;
            }
          }

          suspense.rects = nextRects;

          // $FlowFixMe[constant-condition]
          if (__DEBUG__) {
            debug(
              'Resize',
              `Suspense node ${id} resize to ${
                nextRects === null
                  ? 'null'
                  : nextRects
                      .map(
                        rect =>
                          `(${rect.x},${rect.y},${rect.width},${rect.height})`,
                      )
                      .join(',')
              }`,
            );
          }

          hasSuspenseTreeChanged = true;

          break;
        }
        case SUSPENSE_TREE_OPERATION_SUSPENDERS: {
          i++;
          const changeLength = operations[i++];

          for (let changeIndex = 0; changeIndex < changeLength; changeIndex++) {
            const id = operations[i++];
            const hasUniqueSuspenders = operations[i++] === 1;
            const endTime = operations[i++] / 1000;
            const isSuspended = operations[i++] === 1;
            const environmentNamesLength = operations[i++];
            const environmentNames = [];
            for (
              let envIndex = 0;
              envIndex < environmentNamesLength;
              envIndex++
            ) {
              const environmentNameStringID = operations[i++];
              const environmentName = stringTable[environmentNameStringID];
              if (environmentName != null) {
                environmentNames.push(environmentName);
              }
            }
            const suspense = this._idToSuspense.get(id);

            if (suspense === undefined) {
              this._throwAndEmitError(
                Error(
                  `Cannot update suspenders of suspense node "${id}" because no matching node was found in the Store.`,
                ),
              );

              break;
            }

            // $FlowFixMe[constant-condition]
            if (__DEBUG__) {
              const previousHasUniqueSuspenders = suspense.hasUniqueSuspenders;
              debug(
                'Suspender changes',
                `Suspense node ${id} unique suspenders set to ${String(
                  hasUniqueSuspenders,
                )} (was ${String(previousHasUniqueSuspenders)})`,
              );
            }

            suspense.hasUniqueSuspenders = hasUniqueSuspenders;
            suspense.endTime = endTime;
            suspense.isSuspended = isSuspended;
            suspense.environments = environmentNames;
          }

          hasSuspenseTreeChanged = true;

          break;
        }
        case TREE_OPERATION_APPLIED_ACTIVITY_SLICE_CHANGE: {
          i++;
          nextActivitySliceID = operations[i++];
          break;
        }
        default:
          this._throwAndEmitError(
            new UnsupportedBridgeOperationError(
              `Unsupported Bridge operation "${operation}"`,
            ),
          );
      }
    }

    this._revision++;
    if (hasSuspenseTreeChanged) {
      this._revisionSuspense++;
    }

    // Any time the tree changes (e.g. elements added, removed, or reordered) cached indices may be invalid.
    this._cachedErrorAndWarningTuples = null;

    if (haveErrorsOrWarningsChanged) {
      let componentWithErrorCount = 0;
      let componentWithWarningCount = 0;

      this._errorsAndWarnings.forEach(entry => {
        if (entry.errorCount > 0) {
          componentWithErrorCount++;
        }

        if (entry.warningCount > 0) {
          componentWithWarningCount++;
        }
      });

      this._cachedComponentWithErrorCount = componentWithErrorCount;
      this._cachedComponentWithWarningCount = componentWithWarningCount;
    }

    if (haveRootsChanged) {
      const prevRootSupportsProfiling = this._rootSupportsBasicProfiling;
      const prevRootSupportsTimelineProfiling =
        this._rootSupportsTimelineProfiling;
      const prevRootSupportsPerformanceTracks =
        this._rootSupportsPerformanceTracks;

      this._hasOwnerMetadata = false;
      this._rootSupportsBasicProfiling = false;
      this._rootSupportsTimelineProfiling = false;
      this._rootSupportsPerformanceTracks = false;
      this._rootIDToCapabilities.forEach(
        ({
          supportsBasicProfiling,
          hasOwnerMetadata,
          supportsAdvancedProfiling,
        }) => {
          if (supportsBasicProfiling) {
            this._rootSupportsBasicProfiling = true;
          }
          if (hasOwnerMetadata) {
            this._hasOwnerMetadata = true;
          }
          if (supportsAdvancedProfiling === ADVANCED_PROFILING_TIMELINE) {
            this._rootSupportsTimelineProfiling = true;
          }
          if (
            supportsAdvancedProfiling === ADVANCED_PROFILING_PERFORMANCE_TRACKS
          ) {
            this._rootSupportsPerformanceTracks = true;
          }
        },
      );

      this.emit('roots');

      if (this._rootSupportsBasicProfiling !== prevRootSupportsProfiling) {
        this.emit('rootSupportsBasicProfiling');
      }

      if (
        this._rootSupportsTimelineProfiling !==
        prevRootSupportsTimelineProfiling
      ) {
        this.emit('rootSupportsTimelineProfiling');
      }
      if (
        this._rootSupportsPerformanceTracks !==
        prevRootSupportsPerformanceTracks
      ) {
        this.emit('rootSupportsPerformanceTracks');
      }
    }

    if (hasSuspenseTreeChanged) {
      this.emit('suspenseTreeMutated', [removedSuspenseIDs]);
    }

    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      console.log(printStore(this, true));
      console.groupEnd();
    }

    if (nextActivitySliceID !== null && nextActivitySliceID !== 0) {
      let didCollapse = false;
      // The backend filtered everything above the Activity slice.
      // We need to hide everything below the Activity slice by collapsing
      // the Activities that are descendants of the next Activity slice.
      const nextActivitySlice = this._idToElement.get(nextActivitySliceID);
      if (nextActivitySlice === undefined) {
        throw new Error('Next Activity slice not found in Store.');
      }

      for (let j = 0; j < nextActivitySlice.children.length; j++) {
        didCollapse ||= this._collapseActivitiesRecursively(
          nextActivitySlice.children[j],
        );
      }

      if (didCollapse) {
        let weightAcrossRoots = 0;
        this._roots.forEach(rootID => {
          const {weight} = this.getElementByID(rootID) as any as Element;
          weightAcrossRoots += weight;
        });
        this._weightAcrossRoots = weightAcrossRoots;
      }
    }

    for (let j = 0; j < this._componentFilters.length; j++) {
      const filter = this._componentFilters[j];
      // If we're focusing an Activity, IDs may have changed.
      if (filter.type === ComponentFilterActivitySlice) {
        if (nextActivitySliceID === null || nextActivitySliceID === 0) {
          filter.isValid = false;
        } else {
          filter.activityID = nextActivitySliceID;
        }
      }
    }

    if (nextActivitySliceID !== null) {
      this._focusedTransition = nextActivitySliceID;
    }

    this.emit('mutated', [
      addedElementIDs,
      removedElementIDs,
      nextActivitySliceID,
    ]);
  };

  _collapseActivitiesRecursively(elementID: number): boolean {
    let didMutate = false;
    const element = this._idToElement.get(elementID);
    if (element === undefined) {
      throw new Error('Element not found in Store.');
    }

    if (element.type === ElementTypeActivity) {
      if (!element.isCollapsed) {
        element.isCollapsed = true;

        const weightDelta = 1 - element.weight;

        let parentElement = this._idToElement.get(element.parentID);
        while (parentElement !== undefined) {
          parentElement.weight += weightDelta;
          parentElement = this._idToElement.get(parentElement.parentID);
        }
        return true;
      }
      return false;
    }

    for (let i = 0; i < element.children.length; i++) {
      didMutate ||= this._collapseActivitiesRecursively(element.children[i]);
    }
    return didMutate;
  }

  onBridgeShutdown: () => void = () => {
    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      debug('onBridgeShutdown', 'unsubscribing from Bridge');
    }

    const bridge = this._bridge;
    bridge.removeListener('operations', this.onBridgeOperations);
    bridge.removeListener('shutdown', this.onBridgeShutdown);
    bridge.removeListener(
      'isReloadAndProfileSupportedByBackend',
      this.onBackendReloadAndProfileSupported,
    );
    bridge.removeListener(
      'isNativeStyleEditorSupported',
      this.onBridgeNativeStyleEditorSupported,
    );
    bridge.removeListener(
      'unsupportedRendererVersion',
      this.onBridgeUnsupportedRendererVersion,
    );
    bridge.removeListener('backendVersion', this.onBridgeBackendVersion);
    bridge.removeListener('bridgeProtocol', this.onBridgeProtocol);
    bridge.removeListener('saveToClipboard', this.onSaveToClipboard);
    bridge.removeListener('selectElement', this.onHostInstanceSelected);

    if (this._onBridgeProtocolTimeoutID !== null) {
      clearTimeout(this._onBridgeProtocolTimeoutID);
      this._onBridgeProtocolTimeoutID = null;
    }
  };

  onBackendReloadAndProfileSupported: (
    isReloadAndProfileSupported: boolean,
  ) => void = isReloadAndProfileSupported => {
    this._isReloadAndProfileBackendSupported = isReloadAndProfileSupported;

    this.emit('supportsReloadAndProfile');
  };

  onBridgeUnsupportedRendererVersion: () => void = () => {
    this._unsupportedRendererVersionDetected = true;

    this.emit('unsupportedRendererVersionDetected');
  };

  onBridgeBackendVersion: (backendVersion: string) => void = backendVersion => {
    this._backendVersion = backendVersion;
    this.emit('backendVersion');
  };

  onBridgeProtocol: (bridgeProtocol: BridgeProtocol) => void =
    bridgeProtocol => {
      if (this._onBridgeProtocolTimeoutID !== null) {
        clearTimeout(this._onBridgeProtocolTimeoutID);
        this._onBridgeProtocolTimeoutID = null;
      }

      this._bridgeProtocol = bridgeProtocol;

      if (bridgeProtocol.version !== currentBridgeProtocol.version) {
        // Technically newer versions of the frontend can, at least for now,
        // gracefully handle older versions of the backend protocol.
        // So for now we don't need to display the unsupported dialog.
      }
    };

  onBridgeProtocolTimeout: () => void = () => {
    this._onBridgeProtocolTimeoutID = null;

    // If we timed out, that indicates the backend predates the bridge protocol,
    // so we can set a fake version (0) to trigger the downgrade message.
    this._bridgeProtocol = BRIDGE_PROTOCOL[0];

    this.emit('unsupportedBridgeProtocolDetected');
  };

  onSaveToClipboard: (text: string) => void = text => {
    withPermissionsCheck({permissions: ['clipboardWrite']}, () => copy(text))();
  };

  onBackendInitialized: () => void = () => {
    // Verify that the frontend version is compatible with the connected backend.
    // See github.com/facebook/react/issues/21326
    if (this._shouldCheckBridgeProtocolCompatibility) {
      // Older backends don't support an explicit bridge protocol,
      // so we should timeout eventually and show a downgrade message.
      this._onBridgeProtocolTimeoutID = setTimeout(
        this.onBridgeProtocolTimeout,
        10000,
      );

      this._bridge.addListener('bridgeProtocol', this.onBridgeProtocol);
      this._bridge.send('getBridgeProtocol');
    }

    this._bridge.send('getBackendVersion');
    this._bridge.send('getIfHasUnsupportedRendererVersion');
    this._bridge.send('getHookSettings'); // Warm up cached hook settings
  };

  onHostInstanceSelected: (elementId: number | null) => void = elementId => {
    if (
      this._lastSelectedHostInstanceElementId === elementId &&
      // Force clear selection e.g. when we inspect an element in the Components panel
      // and then switch to the browser's Elements panel.
      // We wouldn't want to stay on the inspected element if we're inspecting
      // an element not owned by React when switching to the browser's Elements panel.
      elementId !== null
    ) {
      return;
    }

    this._lastSelectedHostInstanceElementId = elementId;
    // By the time we emit this, there is no guarantee that TreeContext is rendered.
    this.emit('hostInstanceSelected', elementId);
  };

  getHookSettings: () => void = () => {
    if (this._hookSettings != null) {
      this.emit('hookSettings', this._hookSettings);
    } else {
      this._bridge.send('getHookSettings');
    }
  };

  /**
   * Maximum recorded node depth during the lifetime of this Store.
   * Can only increase: not guaranteed to return maximal value for currently recorded elements.
   */
  getMaximumRecordedDepth(): number {
    return this._maximumRecordedDepth;
  }

  updateHookSettings: (settings: $ReadOnly<DevToolsHookSettings>) => void =
    settings => {
      this._hookSettings = settings;

      this._bridge.send('updateHookSettings', settings);
      this.emit('settingsUpdated', settings, this._componentFilters);
    };

  onHookSettings: (settings: $ReadOnly<DevToolsHookSettings>) => void =
    settings => {
      this._hookSettings = settings;

      this.setShouldShowWarningsAndErrors(settings.showInlineWarningsAndErrors);
      this.emit('hookSettings', settings);
    };

  setShouldShowWarningsAndErrors(status: boolean): void {
    const previousStatus = this._shouldShowWarningsAndErrors;
    this._shouldShowWarningsAndErrors = status;

    if (previousStatus !== status) {
      // Propagate to subscribers, although tree state has not changed
      this.emit('mutated', [[], new Map(), null]);
    }
  }

  // The Store should never throw an Error without also emitting an event.
  // Otherwise Store errors will be invisible to users,
  // but the downstream errors they cause will be reported as bugs.
  // For example, https://github.com/facebook/react/issues/21402
  // Emitting an error event allows the ErrorBoundary to show the original error.
  _throwAndEmitError(error: Error): empty {
    this.emit('error', error);

    // Throwing is still valuable for local development
    // and for unit testing the Store itself.
    throw error;
  }

  _guessSuspenseName(element: Element): string | null {
    const owner = this._idToElement.get(element.ownerID);
    if (owner !== undefined && owner.displayName !== null) {
      return owner.displayName;
    }

    return null;
  }
}
