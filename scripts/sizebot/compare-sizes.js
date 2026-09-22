/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

/* eslint-disable no-for-of-loops/no-for-of-loops */

// Measures every build artifact in `build` against the base revision's artifacts
// in `base-build` and writes the raw numbers to `sizebot-results.json`.
//
// This runs in the `pull_request` half of CI, where the GitHub token is
// read-only, so it never talks to the API and never renders anything
// user-facing. `render-comment.js` turns this JSON into the pull request comment
// from a trusted checkout. See `.github/workflows/runtime_sizebot_comment.yml`
// for why the two halves are separate.
//
// This comment exists to give the demonstration pull request a non-empty
// diff. It should be removed when the demonstration closes.

const {promisify} = require('util');
const glob = promisify(require('glob'));
const gzipSize = require('gzip-size');
const {readFileSync, statSync, writeFileSync} = require('fs');

// Bump on any incompatible change to the JSON below: added required fields,
// renamed or removed fields, or a changed meaning for an existing one. Purely
// additive optional fields do not need a bump. The reader lives on the default
// branch while the writer lives on the pull request branch, so the two can
// legitimately disagree and `render-comment.js` needs to be able to tell.
const RESULTS_VERSION = 1;

const RESULTS_PATH = 'sizebot-results.json';
const BASE_DIR = 'base-build';
const HEAD_DIR = 'build';

function measure(dir, artifactPath) {
  const file = dir + '/' + artifactPath;
  return {
    size: statSync(file).size,
    sizeGzip: gzipSize.fileSync(file),
  };
}

function writeResults(results) {
  writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2) + '\n');
}

(async function () {
  let headSha;
  let baseSha;
  try {
    headSha = String(readFileSync(HEAD_DIR + '/COMMIT_SHA')).trim();
    baseSha = String(readFileSync(BASE_DIR + '/COMMIT_SHA')).trim();
  } catch {
    // Let the renderer explain this one. It is expected to happen whenever the
    // build configuration changes upstream, which is not a CI failure.
    writeResults({
      version: RESULTS_VERSION,
      status: 'base-artifacts-unavailable',
    });
    return;
  }

  // A missing size is recorded as null rather than 0, so the renderer can tell
  // "this artifact does not exist on that side" apart from "this artifact is
  // empty". It derives the new-file and deleted-file cases from those nulls.
  const artifactsByPath = new Map();

  const headArtifactPaths = await glob('**/*.js', {cwd: HEAD_DIR});
  for (const artifactPath of headArtifactPaths) {
    let base;
    try {
      base = measure(BASE_DIR, artifactPath);
    } catch {
      // There's no matching base artifact. This is a new file.
      base = null;
    }
    const head = measure(HEAD_DIR, artifactPath);
    artifactsByPath.set(artifactPath, {
      path: artifactPath,
      baseSize: base === null ? null : base.size,
      baseSizeGzip: base === null ? null : base.sizeGzip,
      headSize: head.size,
      headSizeGzip: head.sizeGzip,
    });
  }

  // Check for base artifacts that were deleted in the head.
  const baseArtifactPaths = await glob('**/*.js', {cwd: BASE_DIR});
  for (const artifactPath of baseArtifactPaths) {
    if (!artifactsByPath.has(artifactPath)) {
      const base = measure(BASE_DIR, artifactPath);
      artifactsByPath.set(artifactPath, {
        path: artifactPath,
        baseSize: base.size,
        baseSizeGzip: base.sizeGzip,
        headSize: null,
        headSizeGzip: null,
      });
    }
  }

  // Every artifact is reported, with no threshold filtering. The thresholds and
  // the critical bundle list belong to the renderer, so that a pull request
  // cannot quietly widen them to hide a regression.
  writeResults({
    version: RESULTS_VERSION,
    status: 'ok',
    baseSha,
    headSha,
    artifacts: Array.from(artifactsByPath.values()),
  });
})();
