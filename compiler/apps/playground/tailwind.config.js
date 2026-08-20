/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const defaultTheme = require('tailwindcss/defaultTheme');
const colors = require('./colors');

module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/forgetMonacoDiagnostics.ts',
  ],
  theme: {
    extend: {
      colors,
      width: {
        toast: 'min(900px, 100vw - 40px)',
        'toast-body': 'calc(100% - 60px)',
        'toast-title': 'calc(100% - 40px)',
      },
      height: {
        content: 'calc(100vh - 45px)',
        monaco: 'calc(100vh - 93px)',
        monaco_small: 'calc(100vh - 129px)',
      },
      fontFamily: {
        sans: [
          'Optimistic Display',
          '-apple-system',
          ...defaultTheme.fontFamily.sans,
        ],
      },
    },
  },
  plugins: [],
};
