// Round 2 HIR: SEVERITY_DIFF (1 file from OTHER)
// delete on optional chain — TS: severity Error/Syntax, Rust: severity Hint/Todo
/**
 * @flow strict-local
 */
import {} from 'PreloadingTTL';
const preloadedRequests: Map<> = new Map();
export function execute(): Promise<{error?: APIErrorEventArgs['error'], ...}> {
  if (request.params != null && !(request.params instanceof FormData)) {
    delete request.params?.__entryPointPreloaded;
  }
  if (!consumers) {
    if (APIRequestMatchingUtils.areRequestsEquivalent()) {
    }
  }
}
