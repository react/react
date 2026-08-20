'use strict';

export function patchMessageChannel() {
  global.MessageChannel = class {
    constructor() {
      const port1 = {
        onmesssage: () => {},
      };

      this.port1 = port1;

      this.port2 = {
        postMessage(msg) {
          setTimeout(() => {
            port1.onmessage(msg);
          }, 0);
        },
      };
    }
  };
}
