# eslint-plugin-react-compiler

ESLint plugin surfacing problematic React code found by the React compiler.

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `eslint-plugin-react-compiler`:

```sh
npm install eslint-plugin-react-compiler --save-dev
```

## Usage

### Flat config

Edit your eslint 8+ config (for example `eslint.config.mjs`) with the recommended configuration:

```diff
+ import reactCompiler from "eslint-plugin-react-compiler"
import react from "eslint-plugin-react"

export default [
    // Your existing config
    { ...pluginReact.configs.flat.recommended, settings: { react: { version: "detect" } } },
+   reactCompiler.configs.recommended    
]
```

### Legacy config (`.eslintrc`)

Add `react-compiler` to the plugins section of your configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": [
        "react-compiler"
    ]
}
```


Then configure the rules you want to use under the rules section.

```json
{
    "rules": {
        "react-compiler/react-compiler": "error"
    }
}
```

## Rules

<!-- begin auto-generated rules list -->
TODO: Run eslint-doc-generator to generate the rules list.
<!-- end auto-generated rules list -->
