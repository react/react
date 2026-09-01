'use strict';

const semver = require('semver');
const yargs = require('yargs/yargs');

const {stablePackages} = require('../../../ReactVersions');
const {isCommandAvailable} = require('./utils');

function parseArgs(argv) {
  const parser = yargs(argv)
    .usage(
      'Usage: yarn generate-changelog [--codex|--claude] [--debug] [--format <text|csv|json>] [<pkg@version> ...]'
    )
    .example(
      '$0 --codex eslint-plugin-react-hooks@7.0.1',
      'Generate changelog for a single package using Codex.'
    )
    .example(
      '$0 --claude react@19.3 react-dom@19.3',
      'Generate changelog entries for multiple packages using Claude.'
    )
    .example(
      '$0 --codex',
      'Generate changelog for all stable packages using recorded versions.'
    )
    .option('codex', {
      type: 'boolean',
      describe: 'Use Codex for commit summarization.',
    })
    .option('claude', {
      type: 'boolean',
      describe: 'Use Claude for commit summarization.',
    })
    .option('debug', {
      type: 'boolean',
      describe: 'Enable verbose debug logging.',
      default: false,
    })
    .option('format', {
      type: 'string',
      describe: 'Output format for the generated changelog.',
      choices: ['text', 'csv', 'json'],
      default: 'text',
    })
    .help('help')
    .alias('h', 'help')
    .version(false)
    .parserConfiguration({
      'parse-numbers': false,
      'parse-positional-numbers': false,
    });

  const args = parser.scriptName('generate-changelog').parse();
  const packageSpecs = [];
  const debug = !!args.debug;
  const format = args.format || 'text';
  let summarizer = null;

  if (args.codex && args.claude) {
    throw new Error('Choose either --codex or --claude, not both.');
  }
  if (args.codex) {
    summarizer = 'codex';
  } else if (args.claude) {
    summarizer = 'claude';
  }

  const positionalArgs = Array.isArray(args._) ? args._ : [];
  for (let i = 0; i < positionalArgs.length; i++) {
    const token = String(positionalArgs[i]).trim();
    if (!token) {
      continue;
    }

    const atIndex = token.lastIndexOf('@');
    if (atIndex <= 0 || atIndex === token.length - 1) {
      throw new Error(`Invalid package specification: ${token}`);
    }

    const packageName = token.slice(0, atIndex);
    const versionText = token.slice(atIndex + 1);
    const validVersion =
      semver.valid(versionText) || semver.valid(semver.coerce(versionText));
    if (!validVersion) {
      throw new Error(`Invalid version for ${packageName}: ${versionText}`);
    }

    packageSpecs.push({
      name: packageName,
      version: validVersion,
      displayVersion: versionText,
    });
  }

  if (packageSpecs.length === 0) {
    Object.keys(stablePackages).forEach(pkgName => {
      const versionText = stablePackages[pkgName];
      const validVersion = semver.valid(versionText);
      if (!validVersion) {
        throw new Error(
          `Invalid stable version configured for ${pkgName}: ${versionText}`
        );
      }
      packageSpecs.push({
        name: pkgName,
        version: validVersion,
        displayVersion: versionText,
      });
    });
  }

  if (summarizer && !isCommandAvailable(summarizer)) {
    throw new Error(
      `Requested summarizer "${summarizer}" is not available on the PATH.`
    );
  }

  return {
    debug,
    format,
    summarizer,
    packageSpecs,
  };
}

module.exports = {
  parseArgs,
};
