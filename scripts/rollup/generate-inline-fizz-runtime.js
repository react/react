'use strict';

const fs = require('fs');
const ClosureCompiler = require('google-closure-compiler').compiler;
const prettier = require('prettier');

const instructionDir =
  './packages/react-dom-bindings/src/server/fizz-instruction-set';

// This is the name of the generated file that exports the inline instruction
// set as strings.
const inlineCodeStringsFilename =
  instructionDir + '/ReactDOMFizzInstructionSetInlineCodeStrings.js';

const config = [
  {
    entry: 'ReactDOMFizzInlineShellTime.js',
    exportName: 'markShellTime',
  },
  {
    entry: 'ReactDOMFizzInlineClientRenderBoundary.js',
    exportName: 'clientRenderBoundary',
  },
  {
    entry: 'ReactDOMFizzInlineCompleteBoundary.js',
    exportName: 'completeBoundary',
  },
  {
    entry: 'ReactDOMFizzInlineCompleteBoundaryUpgradeToViewTransitions.js',
    exportName: 'completeBoundaryUpgradeToViewTransitions',
  },
  {
    entry: 'ReactDOMFizzInlineCompleteBoundaryWithStyles.js',
    exportName: 'completeBoundaryWithStyles',
  },
  {
    entry: 'ReactDOMFizzInlineCompleteSegment.js',
    exportName: 'completeSegment',
  },
  {
    entry: 'ReactDOMFizzInlineFormReplaying.js',
    exportName: 'formReplaying',
  },
];

const prettierConfig = require('../../.prettierrc.js');

async function main() {
  const exportStatements = await Promise.all(
    config.map(async ({entry, exportName}) => {
      const fullEntryPath = instructionDir + '/' + entry;
      const compiler = new ClosureCompiler({
        entry_point: fullEntryPath,
        js: [
          require.resolve('./externs/closure-externs.js'),
          fullEntryPath,
          instructionDir + '/ReactDOMFizzInstructionSetShared.js',
        ],
        compilation_level: 'ADVANCED',
        language_in: 'ECMASCRIPT_2020',
        language_out: 'ECMASCRIPT5_STRICT',
        module_resolution: 'NODE',
        // This is necessary to prevent Closure from inlining a Promise polyfill
        rewrite_polyfills: false,
      });

      const code = await new Promise((resolve, reject) => {
        compiler.run((exitCode, stdOut, stdErr) => {
          if (exitCode !== 0) {
            reject(new Error(stdErr));
          } else {
            resolve(stdOut);
          }
        });
      });

      return `export const ${exportName} = ${JSON.stringify(code.trim().replace('\n', ''))};`;
    })
  );

  let outputCode = [
    '// This is a generated file. The source files are in react-dom-bindings/src/server/fizz-instruction-set.',
    '// The build script is at scripts/rollup/generate-inline-fizz-runtime.js.',
    '// Run `yarn generate-inline-fizz-runtime` to generate.',
    ...exportStatements,
  ].join('\n');

  // This replaces "window.$globalVar" with "$globalVar". There's probably a
  // better way to do this with Closure, with externs or something, but I
  // couldn't figure it out. Good enough for now. This only affects the inline
  // Fizz runtime, and should break immediately if there were a mistake, so I'm
  // not too worried about it.
  outputCode = outputCode.replace(
    /window\.(\$[A-z0-9_]*|matchMedia)/g,
    (_, variableName) => variableName
  );

  const prettyOutputCode = await prettier.format(outputCode, prettierConfig);

  fs.writeFileSync(inlineCodeStringsFilename, prettyOutputCode, 'utf8');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
