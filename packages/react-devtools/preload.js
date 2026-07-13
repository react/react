const {clipboard, shell, contextBridge} = require('electron');
const fs = require('fs');
const internalIP = require('internal-ip');

// Expose protected methods so that render process does not need unsafe node integration
contextBridge.exposeInMainWorld('api', {
  electron: {clipboard, shell},
  ip: {address: internalIP.v4.sync},
  getDevTools() {
    let devtools;
    try {
      devtools = require('react-devtools-core/standalone').default;
    } catch (err) {
      alert(
        err.toString() +
          '\n\nDid you run `yarn` and `yarn run build` in packages/react-devtools-core?',
      );
    }
    return devtools;
  },
  readEnv() {
    let options;
    let useHttps = false;
    try {
      if (process.env.KEY && process.env.CERT) {
        options = {
          key: fs.readFileSync(process.env.KEY),
          cert: fs.readFileSync(process.env.CERT),
        };
        useHttps = true;
      }
    } catch (err) {
      console.error('Failed to process SSL options - ', err);
      options = undefined;
    }
    const host = process.env.HOST || 'localhost';
    const protocol = useHttps ? 'https' : 'http';
    const port = +process.env.REACT_DEVTOOLS_PORT || +process.env.PORT || 8097;
    const path = process.env.REACT_DEVTOOLS_PATH || undefined;
    const clientHost = process.env.REACT_DEVTOOLS_CLIENT_HOST || undefined;
    const clientPort = process.env.REACT_DEVTOOLS_CLIENT_PORT
      ? +process.env.REACT_DEVTOOLS_CLIENT_PORT
      : undefined;
    const clientUseHttps =
      process.env.REACT_DEVTOOLS_CLIENT_USE_HTTPS === 'true' ? true : undefined;
    return {
      options,
      useHttps,
      host,
      protocol,
      port,
      path,
      clientHost,
      clientPort,
      clientUseHttps,
    };
  },
});
