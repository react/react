/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

/* eslint-disable no-for-of-loops/no-for-of-loops */

// The GitHub API half of sizebot, called from `actions/github-script` steps in
// `.github/workflows/runtime_sizebot_comment.yml`.
//
// `resolve` figures out which pull request a `workflow_run` event belongs to,
// finds any comment sizebot has already left on it, and decides whether this
// event should write at all. `post` creates or updates the comment from the body
// that `render-comment.js` produced in between.

const {readFileSync, writeFileSync} = require('fs');
const {
  MARKER_PREFIX,
  extractReport,
  parseReportHead,
} = require('./render-comment');

const CONTEXT_PATH = 'sizebot-context.json';
const COMMENT_PATH = 'sizebot-comment.md';

const COMMENT_AUTHOR = 'github-actions[bot]';

// `pulls.listFiles` stops paginating here, so a pull request larger than this
// cannot be shown to touch only DevTools.
const MAX_LISTABLE_FILES = 3000;

const DEVTOOLS_PATH = 'packages/react-devtools';

async function findExistingComment(github, context, prNumber) {
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
    per_page: 100,
  });
  for (const comment of comments) {
    if (
      comment.user.login === COMMENT_AUTHOR &&
      comment.body.startsWith(MARKER_PREFIX)
    ) {
      return comment;
    }
  }
  return null;
}

// `workflow_run.pull_requests` is empty for runs triggered by a fork, and
// neither `commits/{sha}/pulls` nor the search API index fork pull request head
// commits. Looking the branch up by `owner:ref` is what actually works for both
// fork and same-repo pull requests.
async function findPullRequestNumber(github, context, workflowRun) {
  if (
    workflowRun.pull_requests != null &&
    workflowRun.pull_requests.length > 0
  ) {
    return workflowRun.pull_requests[0].number;
  }

  if (workflowRun.head_repository == null) {
    return null;
  }

  const {data: pulls} = await github.rest.pulls.list({
    owner: context.repo.owner,
    repo: context.repo.repo,
    head: `${workflowRun.head_repository.owner.login}:${workflowRun.head_branch}`,
    state: 'open',
    per_page: 100,
  });
  if (pulls.length === 0) {
    return null;
  }
  return pulls[0].number;
}

async function findPullRequest(github, context, workflowRun) {
  const number = await findPullRequestNumber(github, context, workflowRun);
  if (number === null) {
    return null;
  }
  // Always finish with `pulls.get`. The list endpoint omits `changed_files`,
  // which `isDevToolsOnly` needs, and that is the endpoint the fork path uses.
  const {data} = await github.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: number,
  });
  return data;
}

async function isDevToolsOnly(github, context, pullRequest) {
  if (
    !Number.isInteger(pullRequest.changed_files) ||
    // `listFiles` would silently truncate, and a truncated list can look
    // DevTools-only when it is not.
    pullRequest.changed_files > MAX_LISTABLE_FILES
  ) {
    return false;
  }
  const files = await github.paginate(github.rest.pulls.listFiles, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pullRequest.number,
    per_page: 100,
  });
  if (files.length === 0) {
    return false;
  }
  return files.every(file => file.filename.includes(DEVTOOLS_PATH));
}

async function resolve({github, context, core}) {
  const workflowRun = context.payload.workflow_run;
  const action = context.payload.action;

  const pullRequest = await findPullRequest(github, context, workflowRun);
  if (pullRequest === null) {
    core.info('No open pull request for this run. Nothing to comment on.');
    core.setOutput('action', 'skip');
    return;
  }

  // A pull request number must never come from the build artifact, which the
  // fork controls. Confirm the one we resolved really does belong to this run.
  const runRepo = workflowRun.head_repository?.full_name ?? null;
  const pullRequestRepo = pullRequest.head.repo?.full_name ?? null;
  if (runRepo === null || pullRequestRepo === null) {
    // A deleted fork leaves us no way to check, so don't write anything.
    core.info('Head repository is unavailable. Nothing to comment on.');
    core.setOutput('action', 'skip');
    return;
  }
  if (pullRequestRepo !== runRepo) {
    core.setFailed(
      `Pull request #${pullRequest.number} has head repository ` +
        `${pullRequestRepo}, but the run came from ${runRepo}.`
    );
    return;
  }

  // Mirrors the sizebot job's own condition in runtime_build_and_test.yml.
  if (pullRequest.base.ref !== 'main') {
    core.info(
      `Pull request #${pullRequest.number} targets ${pullRequest.base.ref}, not main.`
    );
    core.setOutput('action', 'skip');
    return;
  }

  const existing = await findExistingComment(
    github,
    context,
    pullRequest.number
  );
  const existingReportHead =
    existing === null ? null : parseReportHead(existing.body);

  // The only event we ever drop: a comment already describes the current head,
  // and this event is about an older commit. Without this, a run cancelled by a
  // force push reports `cancelled` after the newer run's comment has landed and
  // replaces good numbers with a cancellation notice.
  if (
    existingReportHead !== null &&
    existingReportHead === pullRequest.head.sha &&
    workflowRun.head_sha !== pullRequest.head.sha
  ) {
    core.info(
      `Comment already reports on ${pullRequest.head.sha}; this run is for ` +
        `${workflowRun.head_sha}. Leaving it alone.`
    );
    core.setOutput('action', 'skip');
    return;
  }

  const devtoolsOnly =
    action === 'completed'
      ? await isDevToolsOnly(github, context, pullRequest)
      : false;

  writeFileSync(
    CONTEXT_PATH,
    JSON.stringify(
      {
        action,
        prNumber: pullRequest.number,
        prHeadSha: pullRequest.head.sha,
        runHeadSha: workflowRun.head_sha,
        runUrl: workflowRun.html_url,
        runStatus: workflowRun.status,
        runConclusion: workflowRun.conclusion,
        devtoolsOnly,
        existingCommentId: existing === null ? null : existing.id,
        existingReportHead,
        existingReport: existing === null ? null : extractReport(existing.body),
        commentRunUrl: `${process.env.GITHUB_SERVER_URL}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
      },
      null,
      2
    ) + '\n'
  );

  core.setOutput('action', 'continue');
  // Only a completed run can have produced results to download.
  core.setOutput('download_results', String(action === 'completed'));
}

async function post({github, context, core}) {
  const sizebotContext = JSON.parse(readFileSync(CONTEXT_PATH, 'utf8'));
  const body = readFileSync(COMMENT_PATH, 'utf8');

  async function create() {
    const {data} = await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: sizebotContext.prNumber,
      body,
    });
    core.info(`Created ${data.html_url}`);
  }

  if (sizebotContext.existingCommentId === null) {
    await create();
    return;
  }

  try {
    const {data} = await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: sizebotContext.existingCommentId,
      body,
    });
    core.info(`Updated ${data.html_url}`);
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }
    // Someone deleted the comment between resolving it and writing to it.
    core.info('Existing comment is gone, posting a new one.');
    await create();
  }
}

module.exports = {post, resolve};
