/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use client';

import {SnackbarProvider} from 'notistack';
import {Editor, Header, StoreProvider} from '../components';
import MessageSnackbar from '../components/Message';

export default function Page(): JSX.Element {
  return (
    <StoreProvider>
      <SnackbarProvider
        preventDuplicate
        maxSnack={10}
        Components={{message: MessageSnackbar}}>
        <Header />
        <Editor />
      </SnackbarProvider>
    </StoreProvider>
  );
}
