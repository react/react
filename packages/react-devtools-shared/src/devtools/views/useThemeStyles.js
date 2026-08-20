/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {useContext, useMemo} from 'react';
import {SettingsContext} from './Settings/SettingsContext';
import {THEME_STYLES} from '../constants';

const useThemeStyles = (): any => {
  const {theme, displayDensity, browserTheme} = useContext(SettingsContext);

  const style = useMemo(
    () => ({
      ...THEME_STYLES[displayDensity],
      ...THEME_STYLES[theme === 'auto' ? browserTheme : theme],
    }),
    [theme, browserTheme, displayDensity],
  );

  return style;
};

export default useThemeStyles;
