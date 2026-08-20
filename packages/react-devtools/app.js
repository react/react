/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {app, BrowserWindow, shell} = require('electron'); // Module to create native browser window.
const {join} = require('path');
const os = require('os');

const argv = require('minimist')(process.argv.slice(2));
const projectRoots = argv._;

let mainWindow = null;

app.on('window-all-closed', function () {
  app.quit();
});

app.on('ready', function () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: join(__dirname, 'icons/icon128.png'),
    frame: false,
    //titleBarStyle: 'customButtonsOnHover',
    webPreferences: {
      contextIsolation: true, // protect against prototype pollution
      enableRemoteModule: false, // turn off remote
      sandbox: false, // allow preload script to access file system
      preload: join(__dirname, 'preload.js'), // use a preload script to expose node globals
    },
  });

  // set dock icon for macos
  if (os.platform() === 'darwin') {
    app.dock.setIcon(join(__dirname, 'icons/icon128.png'));
  }

  // https://stackoverflow.com/questions/32402327/
  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    shell.openExternal(url);
    return {action: 'deny'};
  });

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/app.html');
  // $FlowFixMe[incompatible-use] found when upgrading Flow
  mainWindow.webContents.executeJavaScript(
    // We use this so that RN can keep relative JSX __source filenames
    // but "click to open in editor" still works. js1 passes project roots
    // as the argument to DevTools.
    'window.devtools.setProjectRoots(' + JSON.stringify(projectRoots) + ')',
  );

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
});
