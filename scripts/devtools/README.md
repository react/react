# Releasing DevTools

To release DevTools, do the following steps (in order):
1. [Prepare a release](#prepare-a-release)
2. [Build and test a release](#build-and-test-a-release)
3. [Publish a release](#publish-a-release)

Each of the scripts can be run with a `--dry` flag to test without committing or publishing any changes.

### Prepare a release
To increment version numbers and update the [CHANGELOG](https://github.com/react/react/blob/main/packages/react-devtools/CHANGELOG.md), run the `prepare-release` script:
```sh
./prepare-release.js
```

You'll need to follow the instructions at the end of the script to push the committed changes to the main fork on GitHub.

### Build and test a release
To build and test a release, run the `build-and-test` script:
```sh
./build-and-test.js
```

### Publish a release
To publish a release to NPM, run the `publish-release` script:
```sh
./publish-release.js
```

You'll need to follow the instructions at the end of the script to upload the extension to Chrome, Edge, and Firefox stores.
