import {completeBoundaryWithStyles} from './ReactDOMFizzInstructionSetShared';

// This is a string so Closure's advanced compilation mode doesn't mangle it.
// eslint-disable-next-line dot-notation
window['$RM'] = new Map();
// eslint-disable-next-line dot-notation
window['$RR'] = completeBoundaryWithStyles;
