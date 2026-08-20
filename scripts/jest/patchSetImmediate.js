'use strict';

export function patchSetImmediate() {
  global.setImmediate = cb => {
    setTimeout(cb, 0);
  };
}
