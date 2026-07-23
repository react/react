# `eslint-plugin-react-hooks`

The official ESLint plugin for [React](https://react.dev) which enforces the [Rules of React](https://react.dev/reference/eslint-plugin-react-hooks) and other best practices.

## Installation

Assuming you already have ESLint installed, run:

```sh
# npm
npm install eslint-plugin-react-hooks --save-dev

# yarn
yarn add eslint-plugin-react-hooks --dev
```

### Flat Config (eslint.config.js|ts)

Add the `recommended` config for all recommended rules:

```js
// eslint.config.js
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  reactHooks.configs.recommended,
]);
```

If you want to try bleeding edge experimental compiler rules, use `recommended-latest`.

```js
// eslint.config.js
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  reactHooks.configs['recommended-latest'],
]);
```

### Legacy Config (.eslintrc)

If you are still using ESLint below 9.0.0, the `recommended-legacy` preset can also be used to enable all recommended rules.

```js
{
  "extends": ["plugin:react-hooks/recommended-legacy"],
  // ...
}

```

### Custom Configuration

If you want more fine-grained configuration, you can instead choose to enable specific rules. However, we strongly encourage using the recommended presets — see above — so that you will automatically receive new recommended rules as we add them in future versions of the plugin.

#### Flat Config (eslint.config.js|ts)

```js
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    files: ['**/*.{js,jsx}'],
    plugins: { 'react-hooks': reactHooks },
    // ...
    rules: {
      // Core hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // React Compiler rules
      'react-hooks/config': 'error',
      'react-hooks/error-boundaries': 'error',
      'react-hooks/gating': 'error',
      'react-hooks/globals': 'error',
      'react-hooks/immutability': 'error',
      'react-hooks/preserve-manual-memoization': 'error',
      'react-hooks/purity': 'error',
      'react-hooks/refs': 'error',
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/set-state-in-render': 'error',
      'react-hooks/static-components': 'error',
      'react-hooks/unsupported-syntax': 'warn',
      'react-hooks/use-memo': 'error',
      'react-hooks/incompatible-library': 'warn',
    }
  },
];
```

#### Legacy Config (.eslintrc)
```js
{
  "plugins": [
    // ...
    "react-hooks"
  ],
  "rules": {
    // ...
    // Core hooks rules
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // React Compiler rules
    "react-hooks/config": "error",
    "react-hooks/error-boundaries": "error",
    "react-hooks/gating": "error",
    "react-hooks/globals": "error",
    "react-hooks/immutability": "error",
    "react-hooks/preserve-manual-memoization": "error",
    "react-hooks/purity": "error",
    "react-hooks/refs": "error",
    "react-hooks/set-state-in-effect": "error",
    "react-hooks/set-state-in-render": "error",
    "react-hooks/static-components": "error",
    "react-hooks/unsupported-syntax": "warn",
    "react-hooks/use-memo": "error",
    "react-hooks/incompatible-library": "warn"
  }
}
```

## Advanced Configuration

`exhaustive-deps` can be configured to validate dependencies of custom Hooks with the `additionalHooks` option.
This option accepts a regex to match the names of custom Hooks that have dependencies.

```js
{
  rules: {
    // ...
    "react-hooks/exhaustive-deps": ["warn", {
      additionalHooks: "(useMyCustomHook|useMyOtherCustomHook)"
    }]
  }
}
```

We suggest to use this option **very sparingly, if at all**. Generally saying, we recommend most custom Hooks to not use the dependencies argument, and instead provide a higher-level API that is more focused around a specific use case.

## Valid and Invalid Examples

Please refer to the [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks) documentation to learn more about this rule.

## License

MIT
