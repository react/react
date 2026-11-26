# Fix: Preserving Painted SSR Suspense Fallback Across Client Hydration Re-Suspend

## 1. Problem Overview
When rendering on the server with React 19 / Fizz, a client component using `use(browser())` or a browser-gated API triggers a server-side suspension on a recoverable boundary. The server renders and flushes the `<Suspense>` fallback into the initial HTML document.

When the client loads that HTML and starts hydrating:
1. `use(browser())` succeeds in the browser environment.
2. If the component subsequently calls `use(promise)` with a client-side asynchronous operation (such as `localStorage`, `IndexedDB`, `window.setTimeout`, or a client fetch), the boundary re-suspends on the client.
3. In previous React versions, React entered `mountSuspenseFallbackAfterRetryWithoutHydrating`, deleting the server-rendered fallback DOM nodes from the container and mounting an identical client-rendered fallback.

### The Impact
Deleting and remounting the fallback drops existing DOM state and restarts all CSS animations (such as indeterminate progress bars, skeleton shimmers, or spinners). For users, this creates a jarring visual glitch where loading bars jump back to 0% mid-load.

---

## 2. Root Cause Analysis
During dehydrated Suspense component hydration (`updateDehydratedSuspenseComponent`):
- When the primary render pass suspends again on a client promise, React assumes that hydration has failed and falls back to a clean client mount (`mountSuspenseFallbackAfterRetryWithoutHydrating`).
- The dehydrated fallback fragment (`DehydratedFragment`) had already been placed on `workInProgress.deletions` for removal.
- When React commits, it tears down the existing server-rendered HTML nodes and mounts new DOM elements for the fallback, restarting all animation states.

---

## 3. The Solution
Instead of deleting the painted server-rendered fallback DOM and creating a new one:
1. **Preserve Dehydrated Fallback Fragment**:
   - In `updateDehydratedSuspenseComponent`, check if the boundary has a recoverable digest (`REACT_RECOVERABLE_DIGEST`) and a valid `DehydratedFragment`.
   - Remove the `DehydratedFragment` from `workInProgress.deletions`.
   - Attach the existing `DehydratedFragment` as the sibling of the hidden offscreen primary child.
2. **Prevent Re-Rendering the Dehydrated Fallback**:
   - In `updateSuspenseFallbackChildren` and `updateSuspenseComponent`, check if `fallbackChildFragment.tag === DehydratedFragment`.
   - Because the server HTML is already painted and valid, do not clone or re-execute the fallback children—leave the existing live DOM elements undisturbed.
3. **Primary Child Offscreen Preservation**:
   - Render the primary child into an offscreen hidden container (`mountWorkInProgressOffscreenFiber`) with `OffscreenVisible` state so that once the client promise resolves, React smoothly commits the loaded content without ever tearing down the fallback.

---

## 4. Verification
- Regression tests added to `packages/react-dom/src/__tests__/ReactDOMFizzServer-test.js`:
  - Verified that `container.querySelector('span')` remains the exact same DOM node reference before and after client hydration.
  - Verified multiple chained client promises (re-suspending multiple times) continue to hold the same painted fallback DOM until completion.
  - Verified that error fallbacks (non-recoverable digests) still follow standard error boundary recovery flows.
