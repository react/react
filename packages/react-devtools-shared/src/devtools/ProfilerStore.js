/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import EventEmitter from '../events';
import {prepareProfilingDataFrontendFromBackendAndStore} from './views/Profiler/utils';
import ProfilingCache from './ProfilingCache';
import MemoryProfilingCache from './MemoryProfilingCache';
import Store from './store';
import {logEvent} from 'react-devtools-shared/src/Logger';

import type {FrontendBridge} from 'react-devtools-shared/src/bridge';
import type {
  ProfilingDataBackend,
  MemoryProfilingData,
  MemorySnapshot,
  LeakDetectionResult,
} from 'react-devtools-shared/src/backend/types';
import type {
  CommitDataFrontend,
  ProfilingDataForRootFrontend,
  ProfilingDataFrontend,
  SnapshotNode,
} from './views/Profiler/types';

export default class ProfilerStore extends EventEmitter<{
  isProcessingData: [],
  isProfiling: [],
  profilingData: [],
  memoryProfilingData: [],
  memorySnapshot: [],
  memoryLeakDetected: [],
  isMemoryProfiling: [],
}> {
  _bridge: FrontendBridge;

  // Suspense cache for lazily calculating derived profiling data.
  _cache: ProfilingCache;

  // Cache for memory profiling data
  _memoryCache: MemoryProfilingCache;

  // Temporary store of profiling data from the backend renderer(s).
  // This data will be converted to the ProfilingDataFrontend format after being collected from all renderers.
  _dataBackends: Array<ProfilingDataBackend> = [];

  // Data from the most recently completed profiling session,
  // or data that has been imported from a previously exported session.
  // This object contains all necessary data to drive the Profiler UI interface,
  // even though some of it is lazily parsed/derived via the ProfilingCache.
  _dataFrontend: ProfilingDataFrontend | null = null;

  // Snapshot of all attached renderer IDs.
  // Once profiling is finished, this snapshot will be used to query renderers for profiling data.
  //
  // This map is initialized when profiling starts and updated when a new root is added while profiling;
  // Upon completion, it is converted into the exportable ProfilingDataFrontend format.
  _initialRendererIDs: Set<number> = new Set();

  // Snapshot of the state of the main Store (including all roots) when profiling started.
  // Once profiling is finished, this snapshot can be used along with "operations" messages emitted during profiling,
  // to reconstruct the state of each root for each commit.
  // It's okay to use a single root to store this information because node IDs are unique across all roots.
  //
  // This map is initialized when profiling starts and updated when a new root is added while profiling;
  // Upon completion, it is converted into the exportable ProfilingDataFrontend format.
  _initialSnapshotsByRootID: Map<number, Map<number, SnapshotNode>> = new Map();

  // Map of root (id) to a list of tree mutation that occur during profiling.
  // Once profiling is finished, these mutations can be used, along with the initial tree snapshots,
  // to reconstruct the state of each root for each commit.
  //
  // This map is only updated while profiling is in progress;
  // Upon completion, it is converted into the exportable ProfilingDataFrontend format.
  _inProgressOperationsByRootID: Map<number, Array<Array<number>>> = new Map();

  // The backend is currently profiling.
  // When profiling is in progress, operations are stored so that we can later reconstruct past commit trees.
  _isBackendProfiling: boolean = false;

  // Mainly used for optimistic UI.
  // This could be false, but at the same time _isBackendProfiling could be true
  // for cases when Backend is busy serializing a chunky payload.
  _isProfilingBasedOnUserInput: boolean = false;

  // Tracks whether a specific renderer logged any profiling data during the most recent session.
  _rendererIDsThatReportedProfilingData: Set<number> = new Set();

  // After profiling, data is requested from each attached renderer using this queue.
  // So long as this queue is not empty, the store is retrieving and processing profiling data from the backend.
  _rendererQueue: Set<number> = new Set();

  _store: Store;

  // Memory profiling state
  _memoryProfilingData: MemoryProfilingData | null = null;
  _isMemoryProfiling: boolean = false;
  _memoryLeakWarnings: Array<LeakDetectionResult> = [];
  _latestMemorySnapshot: MemorySnapshot | null = null;

  constructor(
    bridge: FrontendBridge,
    store: Store,
    defaultIsProfiling: boolean,
  ) {
    super();

    this._bridge = bridge;
    this._isBackendProfiling = defaultIsProfiling;
    this._isProfilingBasedOnUserInput = defaultIsProfiling;
    this._store = store;

    bridge.addListener('operations', this.onBridgeOperations);
    bridge.addListener('profilingData', this.onBridgeProfilingData);
    bridge.addListener('profilingStatus', this.onProfilingStatus);
    bridge.addListener('shutdown', this.onBridgeShutdown);

    // Memory profiling event listeners
    bridge.addListener('memoryProfilingData', this.onMemoryProfilingData);
    bridge.addListener('memorySnapshot', this.onMemorySnapshot);
    bridge.addListener('memoryLeakDetected', this.onMemoryLeakDetected);
    bridge.addListener('memoryProfilingStatus', this.onMemoryProfilingStatus);

    // It's possible that profiling has already started (e.g. "reload and start profiling")
    // so the frontend needs to ask the backend for its status after mounting.
    bridge.send('getProfilingStatus');
    bridge.send('getMemoryProfilingStatus');

    this._cache = new ProfilingCache(this);
    this._memoryCache = new MemoryProfilingCache(this);
  }

  getCommitData(rootID: number, commitIndex: number): CommitDataFrontend {
    if (this._dataFrontend !== null) {
      const dataForRoot = this._dataFrontend.dataForRoots.get(rootID);
      if (dataForRoot != null) {
        const commitDatum = dataForRoot.commitData[commitIndex];
        if (commitDatum != null) {
          return commitDatum;
        }
      }
    }

    throw Error(
      `Could not find commit data for root "${rootID}" and commit "${commitIndex}"`,
    );
  }

  getDataForRoot(rootID: number): ProfilingDataForRootFrontend {
    if (this._dataFrontend !== null) {
      const dataForRoot = this._dataFrontend.dataForRoots.get(rootID);
      if (dataForRoot != null) {
        return dataForRoot;
      }
    }

    throw Error(`Could not find commit data for root "${rootID}"`);
  }

  // Profiling data has been recorded for at least one root.
  get didRecordCommits(): boolean {
    return (
      this._dataFrontend !== null && this._dataFrontend.dataForRoots.size > 0
    );
  }

  get isProcessingData(): boolean {
    return this._rendererQueue.size > 0 || this._dataBackends.length > 0;
  }

  get isProfilingBasedOnUserInput(): boolean {
    return this._isProfilingBasedOnUserInput;
  }

  get profilingCache(): ProfilingCache {
    return this._cache;
  }

  get memoryProfilingCache(): MemoryProfilingCache {
    return this._memoryCache;
  }

  get profilingData(): ProfilingDataFrontend | null {
    return this._dataFrontend;
  }
  set profilingData(value: ProfilingDataFrontend | null): void {
    if (this._isBackendProfiling) {
      console.warn(
        'Profiling data cannot be updated while profiling is in progress.',
      );
      return;
    }

    this._dataBackends.splice(0);
    this._dataFrontend = value;
    this._initialRendererIDs.clear();
    this._initialSnapshotsByRootID.clear();
    this._inProgressOperationsByRootID.clear();
    this._cache.invalidate();

    this.emit('profilingData');
  }

  // Memory profiling getters and setters
  get memoryProfilingData(): MemoryProfilingData | null {
    return this._memoryProfilingData;
  }

  get isMemoryProfiling(): boolean {
    return this._isMemoryProfiling;
  }

  get memoryLeakWarnings(): Array<LeakDetectionResult> {
    return this._memoryLeakWarnings;
  }

  get latestMemorySnapshot(): MemorySnapshot | null {
    return this._latestMemorySnapshot;
  }

  clear(): void {
    this._dataBackends.splice(0);
    this._dataFrontend = null;
    this._initialRendererIDs.clear();
    this._initialSnapshotsByRootID.clear();
    this._inProgressOperationsByRootID.clear();
    this._rendererQueue.clear();

    // Invalidate suspense cache if profiling data is being (re-)recorded.
    // Note that we clear now because any existing data is "stale".
    this._cache.invalidate();

    this.emit('profilingData');
  }

  startProfiling(): void {
    this.clear();

    this._bridge.send('startProfiling', {
      recordChangeDescriptions: this._store.recordChangeDescriptions,
      recordTimeline: this._store.supportsTimeline,
    });

    this._isProfilingBasedOnUserInput = true;
    this.emit('isProfiling');

    // Don't actually update the local profiling boolean yet!
    // Wait for onProfilingStatus() to confirm the status has changed.
    // This ensures the frontend and backend are in sync wrt which commits were profiled.
    // We do this to avoid mismatches on e.g. CommitTreeBuilder that would cause errors.
  }

  stopProfiling(): void {
    this._bridge.send('stopProfiling');

    // Backend might be busy serializing the payload, so we are going to display
    // optimistic UI to the user that profiling is stopping.
    this._isProfilingBasedOnUserInput = false;
    this.emit('isProfiling');

    // Wait for onProfilingStatus() to confirm the status has changed, this will update _isBackendProfiling.
    // This ensures the frontend and backend are in sync wrt which commits were profiled.
    // We do this to avoid mismatches on e.g. CommitTreeBuilder that would cause errors.
  }

  startMemoryProfiling(settings?: {
    snapshotInterval?: number,
    leakThreshold?: number,
  }): void {
    this._memoryProfilingData = null;
    this._memoryLeakWarnings = [];
    this._latestMemorySnapshot = null;

    this._bridge.send('startMemoryProfiling', {
      recordChangeDescriptions: this._store.recordChangeDescriptions,
      recordTimeline: this._store.supportsTimeline,
      enableMemoryProfiling: true,
      memorySnapshotInterval: settings?.snapshotInterval || 1000,
      memoryLeakThreshold: settings?.leakThreshold || 1024 * 100,
    });

    this._isMemoryProfiling = true;
    this.emit('isMemoryProfiling');
  }

  stopMemoryProfiling(): void {
    this._bridge.send('stopMemoryProfiling');

    this._isMemoryProfiling = false;
    this.emit('isMemoryProfiling');
  }

  clearMemoryLeakWarnings(): void {
    this._memoryLeakWarnings = [];
    this.emit('memoryLeakDetected');
  }

  _takeProfilingSnapshotRecursive: (
    elementID: number,
    profilingSnapshots: Map<number, SnapshotNode>,
  ) => void = (elementID, profilingSnapshots) => {
    const element = this._store.getElementByID(elementID);
    if (element !== null) {
      const snapshotNode: SnapshotNode = {
        id: elementID,
        children: element.children.slice(0),
        displayName: element.displayName,
        hocDisplayNames: element.hocDisplayNames,
        key: element.key,
        type: element.type,
        compiledWithForget: element.compiledWithForget,
      };
      profilingSnapshots.set(elementID, snapshotNode);

      element.children.forEach(childID =>
        this._takeProfilingSnapshotRecursive(childID, profilingSnapshots),
      );
    }
  };

  onBridgeOperations: (operations: Array<number>) => void = operations => {
    // The first two values are always rendererID and rootID
    const rendererID = operations[0];
    const rootID = operations[1];

    if (this._isBackendProfiling) {
      let profilingOperations = this._inProgressOperationsByRootID.get(rootID);
      if (profilingOperations == null) {
        profilingOperations = [operations];
        this._inProgressOperationsByRootID.set(rootID, profilingOperations);
      } else {
        profilingOperations.push(operations);
      }

      if (!this._initialRendererIDs.has(rendererID)) {
        this._initialRendererIDs.add(rendererID);
      }

      if (!this._initialSnapshotsByRootID.has(rootID)) {
        this._initialSnapshotsByRootID.set(rootID, new Map());
      }

      this._rendererIDsThatReportedProfilingData.add(rendererID);
    }
  };

  onBridgeProfilingData: (dataBackend: ProfilingDataBackend) => void =
    dataBackend => {
      if (this._isBackendProfiling) {
        // This should never happen, but if it does, then ignore previous profiling data.
        return;
      }

      const {rendererID} = dataBackend;

      if (!this._rendererQueue.has(rendererID)) {
        throw Error(
          `Unexpected profiling data update from renderer "${rendererID}"`,
        );
      }

      this._dataBackends.push(dataBackend);
      this._rendererQueue.delete(rendererID);

      if (this._rendererQueue.size === 0) {
        this._dataFrontend = prepareProfilingDataFrontendFromBackendAndStore(
          this._dataBackends,
          this._inProgressOperationsByRootID,
          this._initialSnapshotsByRootID,
        );

        this._dataBackends.splice(0);

        this.emit('isProcessingData');
      }
    };

  onBridgeShutdown: () => void = () => {
    this._bridge.removeListener('operations', this.onBridgeOperations);
    this._bridge.removeListener('profilingData', this.onBridgeProfilingData);
    this._bridge.removeListener('profilingStatus', this.onProfilingStatus);
    this._bridge.removeListener('shutdown', this.onBridgeShutdown);

    // Remove memory profiling listeners
    this._bridge.removeListener(
      'memoryProfilingData',
      this.onMemoryProfilingData,
    );
    this._bridge.removeListener('memorySnapshot', this.onMemorySnapshot);
    this._bridge.removeListener(
      'memoryLeakDetected',
      this.onMemoryLeakDetected,
    );
    this._bridge.removeListener(
      'memoryProfilingStatus',
      this.onMemoryProfilingStatus,
    );
  };

  onProfilingStatus: (isProfiling: boolean) => void = isProfiling => {
    if (this._isBackendProfiling === isProfiling) {
      return;
    }

    if (isProfiling) {
      this._dataBackends.splice(0);
      this._dataFrontend = null;
      this._initialRendererIDs.clear();
      this._initialSnapshotsByRootID.clear();
      this._inProgressOperationsByRootID.clear();
      this._rendererIDsThatReportedProfilingData.clear();
      this._rendererQueue.clear();

      // Record all renderer IDs initially too (in case of unmount)
      // eslint-disable-next-line no-for-of-loops/no-for-of-loops
      for (const rendererID of this._store.rootIDToRendererID.values()) {
        if (!this._initialRendererIDs.has(rendererID)) {
          this._initialRendererIDs.add(rendererID);
        }
      }

      // Record snapshot of tree at the time profiling is started.
      // This info is required to handle cases of e.g. nodes being removed during profiling.
      this._store.roots.forEach(rootID => {
        const profilingSnapshots = new Map<number, SnapshotNode>();
        this._initialSnapshotsByRootID.set(rootID, profilingSnapshots);
        this._takeProfilingSnapshotRecursive(rootID, profilingSnapshots);
      });
    }

    this._isBackendProfiling = isProfiling;
    // _isProfilingBasedOnUserInput should already be updated from startProfiling, stopProfiling, or constructor.
    if (this._isProfilingBasedOnUserInput !== isProfiling) {
      logEvent({
        event_name: 'error',
        error_message: `Unexpected profiling status. Expected ${this._isProfilingBasedOnUserInput.toString()}, but received ${isProfiling.toString()}.`,
        error_stack: new Error().stack,
        error_component_stack: null,
      });

      // If happened, fallback to displaying the value from Backend
      this._isProfilingBasedOnUserInput = isProfiling;
    }

    // Invalidate suspense cache if profiling data is being (re-)recorded.
    // Note that we clear again, in case any views read from the cache while profiling.
    // (That would have resolved a now-stale value without any profiling data.)
    this._cache.invalidate();

    // If we've just finished a profiling session, we need to fetch data stored in each renderer interface
    // and re-assemble it on the front-end into a format (ProfilingDataFrontend) that can power the Profiler UI.
    // During this time, DevTools UI should probably not be interactive.
    if (!isProfiling) {
      this._dataBackends.splice(0);
      this._rendererQueue.clear();

      // Only request data from renderers that actually logged it.
      // This avoids unnecessary bridge requests and also avoids edge case mixed renderer bugs.
      // (e.g. when v15 and v16 are both present)
      this._rendererIDsThatReportedProfilingData.forEach(rendererID => {
        if (!this._rendererQueue.has(rendererID)) {
          this._rendererQueue.add(rendererID);

          this._bridge.send('getProfilingData', {rendererID});
        }
      });

      this.emit('isProcessingData');
    }
  };

  // Memory profiling event handlers
  onMemoryProfilingData: (data: MemoryProfilingData) => void = data => {
    this._memoryProfilingData = data;

    // Store leak warnings
    if (data.leaks && data.leaks.leaks.length > 0) {
      this._memoryLeakWarnings.push(data.leaks);
    }

    // Invalidate cache since data changed
    this._memoryCache.invalidate();

    this.emit('memoryProfilingData');
  };

  onMemorySnapshot: (snapshot: MemorySnapshot) => void = snapshot => {
    this._latestMemorySnapshot = snapshot;
    this.emit('memorySnapshot');
  };

  onMemoryLeakDetected: (result: LeakDetectionResult) => void = result => {
    this._memoryLeakWarnings.push(result);
    this.emit('memoryLeakDetected');
  };

  onMemoryProfilingStatus: (isProfiling: boolean) => void = isProfiling => {
    if (this._isMemoryProfiling !== isProfiling) {
      this._isMemoryProfiling = isProfiling;
      this.emit('isMemoryProfiling');
    }

    // Clear data when stopping
    if (!isProfiling) {
      // Data will be sent via onMemoryProfilingData
    }
  };
}
