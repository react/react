/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

/* eslint-disable no-for-of-loops/no-for-of-loops */

// Turns `sizebot-results.json` into the body of the sizebot pull request
// comment. Runs from a checkout of the default branch, never from the pull
// request branch, so the thresholds, the critical bundle list and the table
// itself cannot be influenced by the pull request being measured. Everything it
// reads out of the results file is therefore treated as untrusted input.
//
// Reads `sizebot-context.json` (written by the resolve step) and, when the build
// produced one, `sizebot-results.json`. Writes `sizebot-comment.md`, plus
// `sizebot-message.md` when the report is too large to fit in a comment and
// `sizebot-problem.txt` when the build configuration no longer matches this
// file's expectations.

const {existsSync, readFileSync, writeFileSync} = require('fs');

// Results shapes this file knows how to read. `compare-sizes.js` on the pull
// request branch may be older or newer than this list.
const SUPPORTED_VERSIONS = new Set([1]);
const SUPPORTED_STATUSES = new Set([
  'ok',
  'base-artifacts-unavailable',
  'base-build-not-found',
]);

const CRITICAL_THRESHOLD = 0.02;
const SIGNIFICANCE_THRESHOLD = 0.002;
const CRITICAL_ARTIFACT_PATHS = new Set([
  // We always report changes to these bundles, even if the change is
  // insignificant or non-existent.
  'oss-stable/react-dom/cjs/react-dom.production.js',
  'oss-stable/react-dom/cjs/react-dom-client.production.js',
  'oss-experimental/react-dom/cjs/react-dom.production.js',
  'oss-experimental/react-dom/cjs/react-dom-client.production.js',
  'facebook-www/ReactDOM-prod.classic.js',
  'facebook-www/ReactDOM-prod.modern.js',
]);

// GitHub comments are limited to 65536 characters.
const MAX_COMMENT_LENGTH = 65536;

// Both the notice and the report are delimited so each can be rewritten without
// disturbing the other, and so a report can be read back out of a comment
// verbatim when a newer build supersedes it. Relying on "everything after the
// notice" instead would swallow the footer and append a second one every time.
const MARKER_PREFIX = '<!-- sizebot-comment';
const NOTICE_START = '<!-- sizebot-notice-start -->';
const NOTICE_END = '<!-- sizebot-notice-end -->';
const REPORT_START = '<!-- sizebot-report-start -->';
const REPORT_END = '<!-- sizebot-report-end -->';

const CONTEXT_PATH = 'sizebot-context.json';
const RESULTS_PATH = 'sizebot-results.json';
const COMMENT_PATH = 'sizebot-comment.md';
const MESSAGE_PATH = 'sizebot-message.md';
const PROBLEM_PATH = 'sizebot-problem.txt';

// Build artifact paths end up inside markdown link text and inside a URL, so
// anything that could break out of either is rejected rather than escaped.
const SAFE_ARTIFACT_PATH = /^[A-Za-z0-9_@./+-]+$/;

function isSafeArtifactPath(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length < 512 &&
    SAFE_ARTIFACT_PATH.test(value) &&
    !value.includes('..') &&
    !value.startsWith('/')
  );
}

function isSize(value) {
  return value === null || (Number.isFinite(value) && value >= 0);
}

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{7,40}$/.test(value);
}

const kilobyteFormatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'kilobyte',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function kbs(bytes) {
  // An artifact that exists on only one side has no size on the other. The
  // report has always shown that as 0.00 kB rather than an empty cell.
  return kilobyteFormatter.format((bytes === null ? 0 : bytes) / 1000);
}

const percentFormatter = new Intl.NumberFormat('en', {
  style: 'percent',
  signDisplay: 'exceptZero',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function ratio(baseSize, headSize) {
  if (baseSize === null) {
    return Infinity;
  }
  if (headSize === null) {
    return -1;
  }
  return (headSize - baseSize) / baseSize;
}

function change(decimal) {
  if (decimal === Infinity) {
    return 'New file';
  }
  if (decimal === -1) {
    return 'Deleted';
  }
  // Compare the magnitude, not the signed value. Testing `decimal < 0.0001`
  // reported every size decrease as unchanged, which is why `signDisplay:
  // 'exceptZero'` above never had a negative number to render.
  if (Math.abs(decimal) < 0.0001) {
    return '=';
  }
  return percentFormatter.format(decimal);
}

const header = `| Name | +/- | Base | Current | +/- gzip | Base gzip | Current gzip |
| ---- | --- | ---- | ------- | -------- | --------- | ------------ |`;

function row(result, baseSha, headSha) {
  const diffViewUrl = `https://react-builds.vercel.app/commits/${headSha}/files/${result.path}?compare=${baseSha}`;
  const rowArr = [
    `| [${result.path}](${diffViewUrl})`,
    `**${change(result.change)}**`,
    `${kbs(result.baseSize)}`,
    `${kbs(result.headSize)}`,
    `${change(result.changeGzip)}`,
    `${kbs(result.baseSizeGzip)}`,
    `${kbs(result.headSizeGzip)}`,
  ];
  return rowArr.join(' | ');
}

function validateResults(raw) {
  if (raw === null || typeof raw !== 'object') {
    return {ok: false, reason: 'malformed'};
  }
  // Checked before anything else so a shape this file cannot read produces a
  // clear message instead of a misrendered table.
  if (!SUPPORTED_VERSIONS.has(raw.version)) {
    return {ok: false, reason: 'unsupported-version'};
  }
  if (!SUPPORTED_STATUSES.has(raw.status)) {
    return {ok: false, reason: 'malformed'};
  }
  if (raw.status === 'base-artifacts-unavailable') {
    return {ok: true, results: {status: raw.status}};
  }
  if (raw.status === 'base-build-not-found') {
    return {
      ok: true,
      results: {
        status: raw.status,
        baseSha: isSha(raw.baseSha) ? raw.baseSha : null,
      },
    };
  }
  if (!isSha(raw.baseSha) || !isSha(raw.headSha)) {
    return {ok: false, reason: 'malformed'};
  }
  if (!Array.isArray(raw.artifacts)) {
    return {ok: false, reason: 'malformed'};
  }
  for (const artifact of raw.artifacts) {
    if (artifact === null || typeof artifact !== 'object') {
      return {ok: false, reason: 'malformed'};
    }
    if (!isSafeArtifactPath(artifact.path)) {
      return {ok: false, reason: 'malformed'};
    }
    if (
      !isSize(artifact.baseSize) ||
      !isSize(artifact.baseSizeGzip) ||
      !isSize(artifact.headSize) ||
      !isSize(artifact.headSizeGzip)
    ) {
      return {ok: false, reason: 'malformed'};
    }
    if (artifact.baseSize === null && artifact.headSize === null) {
      return {ok: false, reason: 'malformed'};
    }
  }
  return {ok: true, results: raw};
}

function renderTable(results) {
  const {baseSha, headSha} = results;

  const resultsMap = new Map();
  for (const artifact of results.artifacts) {
    resultsMap.set(artifact.path, {
      ...artifact,
      change: ratio(artifact.baseSize, artifact.headSize),
      changeGzip: ratio(artifact.baseSizeGzip, artifact.headSizeGzip),
    });
  }

  const sorted = Array.from(resultsMap.values());
  sorted.sort((a, b) => b.change - a.change);

  const criticalResults = [];
  const missingCriticalPaths = [];
  for (const artifactPath of CRITICAL_ARTIFACT_PATHS) {
    const result = resultsMap.get(artifactPath);
    if (result === undefined) {
      missingCriticalPaths.push(artifactPath);
      continue;
    }
    criticalResults.push(row(result, baseSha, headSha));
  }

  const significantResults = [];
  for (const result of sorted) {
    // If result exceeds critical threshold, add to top section.
    if (
      (Math.abs(result.change) > CRITICAL_THRESHOLD ||
        // New file
        result.change === Infinity ||
        // Deleted file
        result.change === -1) &&
      // Skip critical artifacts. We added those earlier, in a fixed order.
      !CRITICAL_ARTIFACT_PATHS.has(result.path)
    ) {
      criticalResults.push(row(result, baseSha, headSha));
    }

    // Do the same for results that exceed the significant threshold. These
    // will go into the bottom, collapsed section. Intentionally including
    // critical artifacts in this section, too.
    if (
      Math.abs(result.change) > SIGNIFICANCE_THRESHOLD ||
      result.change === Infinity ||
      result.change === -1
    ) {
      significantResults.push(row(result, baseSha, headSha));
    }
  }

  const markdown = `Comparing: ${baseSha}...${headSha}

## Critical size changes

Includes critical production bundles, as well as any change greater than ${
    CRITICAL_THRESHOLD * 100
  }%:

${header}
${criticalResults.join('\n')}

## Significant size changes

Includes any change greater than ${SIGNIFICANCE_THRESHOLD * 100}%:

${
  significantResults.length > 0
    ? `<details>
<summary>Expand to show</summary>

${header}
${significantResults.join('\n')}
</details>`
    : '(No significant changes)'
}`;

  return {markdown, missingCriticalPaths};
}

function renderCompletedReport(context) {
  const {runConclusion, runUrl, devtoolsOnly} = context;

  // The common outcome for a first-time contributor's pull request: the run is
  // created but held until a maintainer approves it.
  if (runConclusion === 'action_required') {
    return {
      markdown: `[The build for this commit](${runUrl}) needs maintainer approval before it can run, so there is no size report yet.`,
      missingCriticalPaths: [],
    };
  }

  if (runConclusion !== 'success') {
    return {
      markdown: `The build for this commit did not complete, so there is no size report. See [the workflow run](${runUrl}) for details.`,
      missingCriticalPaths: [],
    };
  }

  if (devtoolsOnly) {
    return {
      markdown:
        'No size report: this pull request only touches `packages/react-devtools`, which does not affect production bundle size.',
      missingCriticalPaths: [],
    };
  }

  if (!existsSync(RESULTS_PATH)) {
    return {
      markdown: `The build succeeded but produced no size results, so there is no size report. See [the workflow run](${runUrl}) for details.`,
      missingCriticalPaths: [],
    };
  }

  let raw;
  try {
    raw = JSON.parse(readFileSync(RESULTS_PATH, 'utf8'));
  } catch {
    raw = null;
  }

  const validated = validateResults(raw);
  if (!validated.ok) {
    if (validated.reason === 'unsupported-version') {
      return {
        markdown:
          'This pull request produced a size report in a format this repository no longer reads. ' +
          'Merge the latest changes from the `main` branch to pick up the current one.',
        missingCriticalPaths: [],
      };
    }
    return {
      markdown: `The size results for this commit could not be read, so there is no size report. See [the workflow run](${runUrl}) for details.`,
      missingCriticalPaths: [],
    };
  }

  if (validated.results.status === 'base-artifacts-unavailable') {
    return {
      markdown:
        "Failed to read build artifacts. It's possible a build configuration has changed upstream. " +
        'Try pulling the latest changes from the `main` branch.',
      missingCriticalPaths: [],
    };
  }

  if (validated.results.status === 'base-build-not-found') {
    const {baseSha} = validated.results;
    return {
      markdown:
        `No build was found for the base commit${
          baseSha === null ? '' : ` (${baseSha})`
        } that this pull request diverged from, so there is no size report. ` +
        'The build for that commit may have failed, or its artifacts may be ' +
        'older than the retention window. Rebase the pull request onto a ' +
        'newer `main` to compare against a base commit that has a build.',
      missingCriticalPaths: [],
      problem: `No base build found for ${
        baseSha === null ? 'the merge-base' : baseSha
      }`,
    };
  }

  return renderTable(validated.results);
}

function renderNotice(context, reportHead) {
  const {action, prHeadSha, runHeadSha, runStatus, runUrl} = context;
  const lines = [];

  // One rule covers both the case where an older run's results arrive after the
  // head moved, and the case where a new build supersedes a report already on
  // display: the report simply is not about the pull request's current head.
  if (reportHead !== null && reportHead !== prHeadSha) {
    lines.push(
      `These sizes are for ${reportHead}, which is no longer the head of this pull request.`
    );
    if (action === 'requested') {
      lines.push(`A build for ${runHeadSha} is in progress.`);
    }
  } else if (action === 'requested' && runStatus === 'waiting') {
    lines.push(
      `[The build for this commit](${runUrl}) is waiting for maintainer approval before it can run.`
    );
  }

  if (lines.length === 0) {
    return '';
  }
  return lines.map(line => `> ${line}`).join('\n> \n');
}

function renderBody(context) {
  let reportHead;
  let report;
  let missingCriticalPaths = [];
  let problem;

  if (context.action === 'requested') {
    // Only a comment that names the commit it describes holds real numbers. A
    // previous placeholder has body text too, but carrying that forward would
    // pin the comment to a stale run link instead of refreshing it.
    if (
      context.existingReportHead !== null &&
      context.existingReport !== null
    ) {
      // Keep the numbers from the previous build visible. The notice below
      // explains that they describe an older commit.
      reportHead = context.existingReportHead;
      report = context.existingReport;
    } else {
      reportHead = null;
      report = `A size report will appear here when [the build](${context.runUrl}) finishes.`;
    }
  } else {
    reportHead = context.runHeadSha;
    const rendered = renderCompletedReport(context);
    report = rendered.markdown;
    missingCriticalPaths = rendered.missingCriticalPaths;
    problem = rendered.problem;
  }

  if (missingCriticalPaths.length > 0) {
    report =
      '> [!CAUTION]\n' +
      '> These critical bundles are missing from the build. If that was an intentional\n' +
      '> change to the build configuration, update `CRITICAL_ARTIFACT_PATHS` in\n' +
      '> `scripts/sizebot/render-comment.js`:\n' +
      missingCriticalPaths.map(p => `> - \`${p}\``).join('\n') +
      '\n\n' +
      report;
  }

  const notice = renderNotice(context, reportHead);
  const footerSha = reportHead === null ? context.runHeadSha : reportHead;

  function assemble(reportRegion) {
    return `${MARKER_PREFIX} report-head=${
      reportHead === null ? 'none' : reportHead
    } -->
${NOTICE_START}
${notice === '' ? '' : `> [!WARNING]\n${notice}\n`}${NOTICE_END}
${REPORT_START}
${reportRegion}
${REPORT_END}

<sub>Generated by sizebot against ${footerSha}</sub>
`;
  }

  return {
    body: assemble(report),
    report,
    assemble,
    reportHead,
    missingCriticalPaths,
    problem,
  };
}

// Reads the report region back out of a comment, so a completed report can be
// carried forward when a new build is requested for a newer commit.
function extractReport(body) {
  const start = body.indexOf(REPORT_START);
  const end = body.indexOf(REPORT_END);
  if (start === -1 || end === -1 || end < start) {
    return null;
  }
  const report = body.slice(start + REPORT_START.length, end).trim();
  return report === '' ? null : report;
}

function parseReportHead(body) {
  const match =
    /<!-- sizebot-comment report-head=([0-9a-f]{7,40}|none) -->/.exec(body);
  if (match === null || match[1] === 'none') {
    return null;
  }
  return match[1];
}

function main() {
  const context = JSON.parse(readFileSync(CONTEXT_PATH, 'utf8'));
  const {body, report, assemble, missingCriticalPaths, problem} =
    renderBody(context);

  let comment = body;
  if (body.length > MAX_COMMENT_LENGTH) {
    // The link resolves because the artifact is uploaded to this same run,
    // before the comment is posted.
    writeFileSync(MESSAGE_PATH, report + '\n');
    comment = assemble(
      `The size diff is too large to display in a single comment. [This workflow run](${context.commentRunUrl}) contains an artifact called \`sizebot-message.md\` with the full report.`
    );
  }
  writeFileSync(COMMENT_PATH, comment);

  if (missingCriticalPaths.length > 0) {
    writeFileSync(
      PROBLEM_PATH,
      `Missing expected bundles:\n${missingCriticalPaths.join('\n')}\n`
    );
  }
  if (problem !== undefined) {
    writeFileSync(PROBLEM_PATH, problem + '\n');
  }

  process.stdout.write(comment);
}

module.exports = {
  MARKER_PREFIX,
  extractReport,
  parseReportHead,
  renderBody,
};

if (require.main === module) {
  main();
}
