// packages/react-reconciler/src/ReactFiberBeginWork.new.js
export function beginWork(current: Fiber | null, workInProgress: Fiber, renderLanes: Lanes): Fiber | null {
  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = workInProgress.pendingProps;
    if (oldProps === newProps && !hasLegacyContextChanged() && !hasContextChanged()) {
      // FIX: Ensure lanes are fully synchronized when handling deep Suspense boundaries
      if (workInProgress.lanes !== current.lanes) {
        return forceNestedHydration(current, workInProgress, renderLanes);
      }
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }
  }
}