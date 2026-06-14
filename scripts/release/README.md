# React Release Scripts

This document describes how to prepare and publish a release manually, using the command line.

However, most of our releases are actually *prereleases* that get continuously shipped via CI. Our automated prerelease channels are preferred whenever possible, because if they accidentally break, it won't affect production users.

Before proceeding, consider your motivation:

- **"I want to share experimental features with collaborators."** After your code lands in GitHub (behind an experimental feature flag), it will be automatically published via CI within the next weekday. So usually, all you have to do is wait.
- **"But I want to publish it now!"** You can [trigger the CI job to run automatically](#trigger-an-automated-prerelease).
- **"I want to publish a stable release with a real version number"** Refer to the ["Publishing a Stable Release"](#publishing-a-stable-release) section. If this is your first time running a stable release, consult with another team member before proceeding.
- **"I have some special use case that's not explicitly mentioned here."** Read the rest of this document, and consult with another team member before proceeding.

# Process

If this is your first time running the release scripts, go to the `scripts/release` directory and run `yarn` to install the dependencies.

The release process consists of several phases, each one represented by one of the scripts below.

A typical release cycle goes like this:
1. When a commit is pushed to the React repo, [GitHub Actions](https://github.com/facebook/react/actions) will build all release bundles and run unit tests against both the source code and the built bundles.
2. Each weekday, an automated CI cron job publishes prereleases to the `canary` and `experimental` channels, from tip of the main branch.
   You can also [trigger an automated prerelease via the GitHub UI](#trigger-an-automated-prerelease), instead of waiting until the next time the cron job runs.
3. Finally, a "canary" release can be [**promoted to stable**](#publishing-a-stable-release)<sup>1</sup> (This process is always manual.)

## Trigger an Automated Prerelease

If your code lands in the main branch, it will be automatically published to the prerelease channels within the next weekday. However, if you want to immediately publish a prerelease, you can trigger the job to run immediately via the GitHub UI:

1. Wait for the commit you want to release to finish its [(Runtime) Build and Test workflow](https://github.com/facebook/react/actions/workflows/runtime_build_and_test.yml), as the prerelease script needs to download the build from that workflow.
2. Copy the full git sha of whichever commit you are trying to release
3. Go to https://github.com/facebook/react/actions/workflows/runtime_release_from_ci.yml
4. Paste the git sha into the "Run workflow" dropdown
5. Let the job finish and it will be released on npm

This will grab the specified revision on the main branch and publish it to the Next and Experimental channels.


## Publishing an Experimental Release

Same as for a prerelease except choose `experimental-only` as the type

## Publishing Without Tags

The sections below include meaningful `--tags` in the instructions. However, keep in mind that **the `--tags` arguments is optional**, and you can omit it if you don't want to tag the release on npm at all. This can be useful when preparing breaking changes.

## Publishing a Stable Release

Stable releases should always be created from the "canary" channel. This encourages better testing of the actual release artifacts and reduces the chance of unintended changes accidentally being included in a stable release.

Before promoting, make sure the versions have been bumped:

1. [ReactVersions.js](../../ReactVersions.js)
1. `package.json` files for each package
1. [packages/shared/ReactVersion.js](../../packages/shared/ReactVersion.js)

Once the "canary" release has been tested and verified, you can promote it to stable by running the [Publish release](./actions/workflows/runtime_release_from_ci.yml) GitHub Action workflow. This workflow will prepare the release artifacts and publish them to NPM as either `stable-latest` (e.g. for `react@latest`) or `stable-backport` for an older release line that shouldn't move `@latest` (published under the `@backport` dist-tag instead).

> [!IMPORTANT]
> The designated commit must be able to build in CI. If runtime_build_and_test.yml fails for that commit, the release workflow will also fail.

### Backport

1. Pick a commit from `main` which you want to backport
1. Choose which release you want to backport it to
1. Find or create a branch for that release following our release branch naming convention `releases/**/*` e.g. `releases/19.1.x`
1. Make sure versions (`ReactVersions.js`, `ReactVersion.js`, `package.json`) are set to an unreleased version 
1. Cherry-pick desired commits
1. Push to branch
1. [Publish release](./actions/workflows/runtime_release_from_ci.yml)
   - `workflow_from` is the newly pushed commit containing cherry-picked changes,
   - `type` is either `stable-latest` (e.g. for `react@latest`) or `stable-backport` for an older release line that shouldn't move `@latest` (published under the `@backport` dist-tag instead).
1. For stable releases the workflow will prepare everything for an automated publish. However, the final publish step will require manual approval in the GitHub Actions UI.
