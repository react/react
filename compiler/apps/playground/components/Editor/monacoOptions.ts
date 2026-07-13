/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {EditorProps} from '@monaco-editor/react';

export const monacoOptions: Partial<EditorProps['options']> = {
  fontSize: 14,
  padding: {top: 8},
  scrollbar: {
    verticalScrollbarSize: 10,
    alwaysConsumeMouseWheel: false,
  },
  minimap: {
    enabled: false,
  },
  formatOnPaste: true,
  formatOnType: true,
  fontFamily: '"Source Code Pro", monospace',
  glyphMargin: true,

  autoClosingBrackets: 'languageDefined',
  autoClosingDelete: 'always',
  autoClosingOvertype: 'always',

  automaticLayout: true,
  wordWrap: 'on',
  wrappingIndent: 'same',

  tabSize: 2,
};

export const monacoConfigOptions: Partial<EditorProps['options']> = {
  ...monacoOptions,
  lineNumbers: 'off',
  renderLineHighlight: 'none',
  overviewRulerBorder: false,
  overviewRulerLanes: 0,
  fontSize: 12,
  scrollBeyondLastLine: false,
  glyphMargin: false,
};
