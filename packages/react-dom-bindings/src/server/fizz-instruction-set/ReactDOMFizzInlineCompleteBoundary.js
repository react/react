import {
  revealCompletedBoundaries,
  completeBoundary,
} from './ReactDOMFizzInstructionSetShared';

// This is a string so Closure's advanced compilation mode doesn't mangle it.
// eslint-disable-next-line dot-notation
window['$RB'] = [];
// Flag to track whether the visibilitychange listener has been registered.
// eslint-disable-next-line dot-notation
window['$RVL'] = false;
// eslint-disable-next-line dot-notation
window['$RV'] = revealCompletedBoundaries;
// eslint-disable-next-line dot-notation
window['$RC'] = completeBoundary;
