/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {RefreshIcon, ShareIcon} from '@heroicons/react/outline';
import {CheckIcon} from '@heroicons/react/solid';
import clsx from 'clsx';
import Link from 'next/link';
import {useSnackbar} from 'notistack';
import {
  useState,
  startTransition,
  unstable_addTransitionType as addTransitionType,
} from 'react';
import {defaultStore} from '../lib/defaultStore';
import {IconGitHub} from './Icons/IconGitHub';
import Logo from './Logo';
import {useStore, useStoreDispatch} from './StoreContext';
import {TOGGLE_INTERNALS_TRANSITION} from '../lib/transitionTypes';

export default function Header(): JSX.Element {
  const [showCheck, setShowCheck] = useState(false);
  const store = useStore();
  const dispatchStore = useStoreDispatch();
  const {enqueueSnackbar, closeSnackbar} = useSnackbar();

  const handleReset: () => void = () => {
    if (confirm('Are you sure you want to reset the playground?')) {
      /**
       * Close open snackbars if any. This is necessary because when displaying
       * outputs (Preview or not), we only close previous snackbars if we received
       * new messages, which is needed in order to display "Bad URL" or success
       * messages when loading Playground for the first time. Otherwise, messages
       * such as "Bad URL" will be closed by the outputs calling `closeSnackbar`.
       */
      closeSnackbar();
      dispatchStore({type: 'setStore', payload: {store: defaultStore}});
    }
  };

  const handleShare: () => void = () => {
    navigator.clipboard.writeText(location.href).then(() => {
      enqueueSnackbar('URL copied to clipboard');
      setShowCheck(true);
      // Show the check mark icon briefly after URL is copied
      setTimeout(() => setShowCheck(false), 1000);
    });
  };

  return (
    <div className="fixed z-10 flex items-center justify-between w-screen px-5 py-3 bg-white border-b border-gray-200 h-14">
      <div className="flex items-center flex-none h-full gap-2 text-lg">
        <Logo
          className={clsx(
            'w-8 h-8 text-link',
            process.env.NODE_ENV === 'development' && 'text-yellow-600',
          )}
        />
        <p className="hidden select-none sm:block">React Compiler Playground</p>
      </div>
      <div className="flex items-center text-[15px] gap-4">
        <div className="flex items-center gap-2">
          <label className="show-internals relative inline-block w-[34px] h-5">
            <input
              type="checkbox"
              checked={store.showInternals}
              onChange={() =>
                startTransition(() => {
                  addTransitionType(TOGGLE_INTERNALS_TRANSITION);
                  dispatchStore({type: 'toggleInternals'});
                })
              }
              className="absolute opacity-0 cursor-pointer h-full w-full m-0"
            />
            <span
              className={clsx(
                'absolute inset-0 rounded-full cursor-pointer transition-all duration-250',
                "before:content-[''] before:absolute before:w-4 before:h-4 before:left-0.5 before:bottom-0.5",
                'before:bg-white before:rounded-full before:transition-transform before:duration-250',
                'focus-within:shadow-[0_0_1px_#2196F3]',
                store.showInternals
                  ? 'bg-link before:translate-x-3.5'
                  : 'bg-gray-300',
              )}></span>
          </label>
          <span className="text-secondary">Show Internals</span>
        </div>
        <button
          title="Reset Playground"
          aria-label="Reset Playground"
          className="flex items-center gap-1 transition-colors duration-150 ease-in text-secondary hover:text-link"
          onClick={handleReset}>
          <RefreshIcon className="w-5 h-5" />
          <p className="hidden sm:block">Reset</p>
        </button>
        <button
          title="Copy sharable URL"
          aria-label="Copy sharable URL"
          className="flex items-center gap-1 transition-colors duration-150 ease-in text-secondary hover:text-link"
          onClick={handleShare}
          disabled={showCheck}>
          {!showCheck ? (
            <ShareIcon className="w-5 h-5" />
          ) : (
            <CheckIcon className="w-5 h-5 fill-blue-50" />
          )}
          <p className="hidden sm:block">Share</p>
        </button>
        <Link
          href="https://github.com/facebook/react"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Open on GitHub"
          className="flex items-center gap-1 transition-colors duration-150 ease-in text-secondary hover:text-link">
          <IconGitHub />
        </Link>
      </div>
    </div>
  );
}
