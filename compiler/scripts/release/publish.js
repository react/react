#!/usr/bin/env node
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const ora = require('ora');
const path = require('path');
const yargs = require('yargs');
const {hashElement} = require('folder-hash');
const promptForOTP = require('./prompt-for-otp');
const {PUBLISHABLE_PACKAGES} = require('./shared/packages');
const {
  execHelper,
  getDateStringForCommit,
  spawnHelper,
} = require('./shared/utils');
const {buildPackages} = require('./shared/build-packages');
const {readJson, writeJson} = require('fs-extra');

/**
 * Script for publishing PUBLISHABLE_PACKAGES to npm. By default, this runs in tarball mode, meaning
 * the script will only print out what the contents of the files included in the npm tarball would
 * be.
 *
 * Please run this first (ie `yarn npm:publish`) and double check the contents of the files that
 * will be pushed to npm.
 *
 * If it looks good, you can run `yarn npm:publish --for-real` to really publish to npm. You must
 * have 2FA enabled first and the script will prompt you to enter a 2FA code before proceeding.
 * There's a small annoying delay before the packages are actually pushed to give you time to panic
 * cancel. In this mode, we will bump the version field of each package's package.json, and git
 * commit it. Then, the packages will be published to npm.
 *
 * Optionally, you can add the `--debug` flag to `yarn npm:publish --debug --for-real` to run all
 * steps, but the final npm publish step will have the `--dry-run` flag added to it. This will make
 * the command only report what it would have done, instead of actually publishing to npm.
 */
async function main() {
  const argv = yargs(process.argv.slice(2))
    .option('packages', {
      description: 'which packages to publish, defaults to all',
      choices: PUBLISHABLE_PACKAGES,
      default: PUBLISHABLE_PACKAGES,
    })
    .option('for-real', {
      alias: 'frfr',
      description:
        'whether to publish to npm (npm publish) or dryrun (npm publish --dry-run)',
      type: 'boolean',
      default: false,
    })
    .option('debug', {
      description:
        'If enabled, will always run npm commands in dry run mode irregardless of the for-real flag',
      type: 'boolean',
      default: false,
    })
    .option('ci', {
      description: 'Publish packages via CI',
      type: 'boolean',
      default: false,
    })
    .option('tag', {
      description: 'Tag to publish to npm',
      type: 'choices',
      choices: ['experimental', 'beta', 'rc', 'latest'],
      default: 'experimental',
    })
    .option('tag-version', {
      description:
        'Optional tag version to append to tag name, eg `1` becomes 0.0.0-rc.1',
      type: 'number',
      default: null,
    })
    .option('version-name', {
      description: 'Version name',
      type: 'string',
      default: '0.0.0',
    })
    .help('help')
    .strict()
    .parseSync();

  if (argv.debug === false) {
    const currBranchName = await execHelper('git rev-parse --abbrev-ref HEAD');
    const isPristine = (await execHelper('git status --porcelain')) === '';
    if (currBranchName !== 'main' || isPristine === false) {
      throw new Error(
        'This script must be run from the `main` branch with no uncommitted changes'
      );
    }
  }

  let pkgNames = argv.packages;
  if (Array.isArray(argv.packages) === false) {
    pkgNames = [argv.packages];
  }
  const spinner = ora(
    `Preparing to publish ${argv.versionName}@${argv.tag} ${
      argv.forReal === true ? '(for real)' : '(dry run)'
    } [debug=${argv.debug}]`
  ).info();

  await buildPackages(pkgNames);

  if (argv.forReal === false) {
    spinner.info('Dry run: Report tarball contents');
    for (const pkgName of pkgNames) {
      console.log(`\n========== ${pkgName} ==========\n`);
      spinner.start(`Running npm pack --dry-run\n`);
      try {
        await spawnHelper('npm', ['pack', '--dry-run'], {
          cwd: path.resolve(__dirname, `../../packages/${pkgName}`),
          stdio: 'inherit',
        });
      } catch (e) {
        spinner.fail(e.toString());
        throw e;
      }
      spinner.stop(`Successfully packed ${pkgName} (dry run)`);
    }
    spinner.succeed(
      'Please confirm contents of packages before publishing. You can run this command again with --for-real to publish to npm'
    );
  }

  if (argv.forReal === true) {
    const commit = await execHelper(
      'git show -s --no-show-signature --format=%h',
      {
        cwd: path.resolve(__dirname, '..'),
      }
    );
    const dateString = await getDateStringForCommit(commit);
    const otp =
      argv.ci === false && argv.debug === false ? await promptForOTP() : null;
    const {hash} = await hashElement(path.resolve(__dirname, '../..'), {
      encoding: 'hex',
      folders: {exclude: ['node_modules']},
      files: {exclude: ['.DS_Store']},
    });
    const truncatedHash = hash.slice(0, 7);
    let newVersion;
    if (argv.tag === 'latest') {
      newVersion = argv.versionName;
    } else {
      newVersion =
        argv.tagVersion == null || argv.tagVersion === ''
          ? `${argv.versionName}-${argv.tag}`
          : `${argv.versionName}-${argv.tag}.${argv.tagVersion}`;
    }
    if (argv.tag === 'experimental' || argv.tag === 'beta') {
      newVersion = `${newVersion}-${truncatedHash}-${dateString}`;
    }

    for (const pkgName of pkgNames) {
      const pkgDir = path.resolve(__dirname, `../../packages/${pkgName}`);
      const pkgJsonPath = path.resolve(
        __dirname,
        `../../packages/${pkgName}/package.json`
      );

      spinner.start(`Writing package.json for ${pkgName}@${newVersion}`);
      await writeJson(
        pkgJsonPath,
        {
          ...(await readJson(pkgJsonPath)),
          version: newVersion,
        },
        {spaces: 2}
      );
      spinner.succeed(`Wrote package.json for ${pkgName}@${newVersion}`);

      console.log(`\n========== ${pkgName} ==========\n`);
      spinner.start(`Publishing ${pkgName}@${newVersion} to npm\n`);

      let opts = [];
      if (argv.debug === true) {
        opts.push('--dry-run');
      }
      if (otp != null) {
        opts.push(`--otp=${otp}`);
      }

      opts.push(`--tag=${argv.tag}`);

      try {
        await spawnHelper(
          'npm',
          ['publish', ...opts, '--registry=https://registry.npmjs.org'],
          {
            cwd: pkgDir,
            stdio: 'inherit',
          }
        );
        console.log('\n');
      } catch (e) {
        spinner.fail(e.toString());
        throw e;
      }
      spinner.succeed(`Successfully published ${pkgName} to npm`);

      spinner.start('Pushing tags to npm');
      if (typeof argv.tag === 'string') {
        try {
          let opts = ['dist-tag', 'add', `${pkgName}@${newVersion}`, argv.tag];
          if (otp != null) {
            opts.push(`--otp=${otp}`);
          }
          if (argv.debug === true) {
            spinner.info(`dry-run: npm ${opts.join(' ')}`);
          } else {
            await spawnHelper('npm', opts, {
              cwd: pkgDir,
              stdio: 'inherit',
            });
          }
        } catch (e) {
          spinner.fail(e.toString());
          throw e;
        }
        spinner.succeed(
          `Successfully pushed dist-tag ${argv.tag} for ${pkgName} to npm`
        );
      }
    }

    console.log('\n\n✅ All done');
  }
}

main();
