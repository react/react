# `eslint-plugin-react-compiler`

ESLint plugin surfacing problematic React code found by the React compiler.

## Status

The React Compiler lint rules are now distributed through
[`eslint-plugin-react-hooks`](../../../packages/eslint-plugin-react-hooks).
Install and configure `eslint-plugin-react-hooks` instead of the standalone
`eslint-plugin-react-compiler` package.

## Usage

### Flat Config

Use the recommended config from `eslint-plugin-react-hooks`:

```js
// eslint.config.js
import reactHooks from 'eslint-plugin-react-hooks';
import {defineConfig} from 'eslint/config';

export default defineConfig([
  reactHooks.configs.flat.recommended,
]);
```

If you want to try bleeding edge experimental compiler rules, use
`recommended-latest`.

```js
// eslint.config.js
import reactHooks from 'eslint-plugin-react-hooks';
import {defineConfig} from 'eslint/config';

export default defineConfig([
  reactHooks.configs.flat['recommended-latest'],
]);
```

### Legacy config (`.eslintrc`)

If you are still using ESLint below 9.0.0, extend the recommended
`eslint-plugin-react-hooks` preset:

```js
{
  "extends": ["plugin:react-hooks/recommended"]
}
```

Specific React Compiler rules are exposed under the `react-hooks` plugin name.
For example:

```js
{
  "rules": {
    "react-hooks/static-components": "error",
    "react-hooks/refs": "error"
  }
}
```

## Rules

See the
[`eslint-plugin-react-hooks` README](../../../packages/eslint-plugin-react-hooks)
for the current list of React Compiler rules.
