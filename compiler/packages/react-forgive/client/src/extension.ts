/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as path from 'path';
import * as vscode from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  const serverModule = context.asAbsolutePath(path.join('dist', 'server.js'));
  const documentSelector = [
    {scheme: 'file', language: 'javascriptreact'},
    {scheme: 'file', language: 'typescriptreact'},
  ];

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector,
    progressOnInitialization: true,
  };

  // Create the language client and start the client.
  try {
    client = new LanguageClient(
      'react-forgive',
      'React Analyzer',
      serverOptions,
      clientOptions,
    );
  } catch {
    vscode.window.showErrorMessage(
      `React Analyzer couldn't be started. See the output channel for details.`,
    );
    return;
  }

  client.registerProposedFeatures();
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (client !== undefined) {
    return client.stop();
  }
  return;
}
