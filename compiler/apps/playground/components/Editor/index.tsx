/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import dynamic from 'next/dynamic';

/**
 * monaco-editor is currently not compatible with ssr
 * https://github.com/vercel/next.js/issues/31692
 */
const Editor = dynamic(() => import('./EditorImpl'), {
  ssr: false,
});

export default Editor;
