/* eslint-disable dot-notation */

// Instruction set for the Fizz external runtime

import {
  clientRenderBoundary,
  completeBoundary,
  completeBoundaryWithStyles,
  completeSegment,
  listenToFormSubmissionsForReplaying,
  revealCompletedBoundaries,
  revealCompletedBoundariesWithViewTransitions,
} from './ReactDOMFizzInstructionSetShared';

// This is a string so Closure's advanced compilation mode doesn't mangle it.
// These will be renamed to local references by the external-runtime-plugin.
window['$RM'] = new Map();
window['$RB'] = [];
window['$RX'] = clientRenderBoundary;
window['$RV'] = revealCompletedBoundariesWithViewTransitions.bind(
  null,
  revealCompletedBoundaries,
);
window['$RC'] = completeBoundary;
window['$RR'] = completeBoundaryWithStyles;
window['$RS'] = completeSegment;

listenToFormSubmissionsForReplaying();

// Track the paint time of the shell.
const entries = performance.getEntriesByType
  ? performance.getEntriesByType('paint')
  : [];
if (entries.length > 0) {
  // We might have already painted before this external runtime loaded. In that case we
  // try to get the first paint from the performance metrics to avoid delaying further
  // than necessary.
  window['$RT'] = entries[0].startTime;
} else if (document.visibilityState === 'hidden') {
  // rAF never fires in hidden/occluded tabs; set $RT eagerly so
  // completeBoundary uses the setTimeout flush path.
  // See https://github.com/facebook/react/issues/36741
  window['$RT'] = performance.now();
} else {
  // Otherwise we wait for the next rAF for it.
  requestAnimationFrame(() => {
    window['$RT'] = performance.now();
  });
}
