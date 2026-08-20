import {
  revealCompletedBoundaries,
  completeBoundary,
} from './ReactDOMFizzInstructionSetShared';

// This is a string so Closure's advanced compilation mode doesn't mangle it.
// eslint-disable-next-line dot-notation
window['$RB'] = [];
// eslint-disable-next-line dot-notation
window['$RV'] = revealCompletedBoundaries;
// eslint-disable-next-line dot-notation
window['$RC'] = completeBoundary;
