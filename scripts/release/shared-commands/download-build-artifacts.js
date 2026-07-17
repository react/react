'use strict';

const {join} = require('path');
const theme = require('../theme');
const {exec} = require('child-process-promise');
const {existsSync, mkdtempSync, readFileSync} = require('fs');
const {logPromise} = require('../utils');
const os = require('os');

if (process.env.GH_TOKEN == null) {
  console.log(
    theme`{error Expected GH_TOKEN to be provided as an env variable}`
  );
  process.exit(1);
}

const REPO = process.env.GITHUB_REPOSITORY || 'facebook/react';
const WORKFLOW_ID = 'runtime_build_and_test.yml';
const GITHUB_HEADERS = `
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${process.env.GH_TOKEN}" \
  -H "X-GitHub-Api-Version: 2022-11-28"`.trim();

async function executableIsAvailable(name) {
  try {
    await exec(`which ${name}`);
    return true;
  } catch (_error) {
    return false;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getWorkflowId() {
  if (
    existsSync(join(__dirname, `../../../.github/workflows/${WORKFLOW_ID}`))
  ) {
    return WORKFLOW_ID;
  } else {
    throw new Error(
      `Incorrect workflow ID: .github/workflows/${WORKFLOW_ID} does not exist. Please check the name of the workflow being downloaded from.`
    );
  }
}

async function getWorkflowRun(commit) {
  const res = await exec(
    `curl -L ${GITHUB_HEADERS} https://api.github.com/repos/${REPO}/actions/workflows/${getWorkflowId()}/runs?head_sha=${commit}`
  );

  const json = JSON.parse(res.stdout);
  const workflowRun = json.workflow_runs.find(run => run.head_sha === commit);

  if (workflowRun == null || workflowRun.id == null) {
    console.log(
      theme`{error The workflow run for the specified commit (${commit}) could not be found.}`
    );
    process.exit(1);
  }

  return workflowRun;
}

async function getArtifact(workflowRunId, artifactName) {
  const res = await exec(
    `curl -L ${GITHUB_HEADERS} https://api.github.com/repos/${REPO}/actions/runs/${workflowRunId}/artifacts?per_page=100&name=${artifactName}`
  );

  const json = JSON.parse(res.stdout);
  const artifact = json.artifacts.find(
    _artifact => _artifact.name === artifactName
  );

  if (artifact == null) {
    console.log(
      theme`{error The specified workflow run (${workflowRunId}) does not contain any build artifacts.}`
    );
    process.exit(1);
  }

  return artifact;
}

async function processArtifact(artifact, opts) {
  // Download and extract artifact
  const cwd = join(__dirname, '..', '..', '..');
  const tmpDir = mkdtempSync(join(os.tmpdir(), 'react_'));
  await exec(`rm -rf ./build`, {cwd});
  await exec(
    `curl -L ${GITHUB_HEADERS} ${artifact.archive_download_url} > artifacts_combined.zip`,
    {
      cwd: tmpDir,
    }
  );

  if (opts.noVerify === true) {
    console.log(theme`{caution Skipping verification of build artifact.}`);
  } else {
    // Use https://cli.github.com/manual/gh_attestation_verify to verify artifact
    if (executableIsAvailable('gh')) {
      await exec(
        `gh attestation verify artifacts_combined.zip --repo=${REPO}`,
        {
          cwd: tmpDir,
        }
      );
    }
  }

  await exec(
    `unzip ${tmpDir}/artifacts_combined.zip -d . && rm build2.tgz && tar -xvzf build.tgz && rm build.tgz`,
    {
      cwd,
    }
  );

  // Copy to staging directory
  // TODO: Consider staging the release in a different directory from the CI
  // build artifacts: `./build/node_modules` -> `./staged-releases`
  if (!existsSync(join(cwd, 'build'))) {
    await exec(`mkdir ./build`, {cwd});
  } else {
    await exec(`rm -rf ./build/node_modules`, {cwd});
  }
  let sourceDir;
  // TODO: Rename release channel to `next`
  if (opts.releaseChannel === 'stable') {
    sourceDir = 'oss-stable';
  } else if (opts.releaseChannel === 'experimental') {
    sourceDir = 'oss-experimental';
  } else if (opts.releaseChannel === 'rc') {
    sourceDir = 'oss-stable-rc';
  } else if (opts.releaseChannel === 'latest') {
    sourceDir = 'oss-stable-semver';
  } else {
    console.error(
      'Internal error: Invalid release channel: ' + opts.releaseChannel
    );
    process.exit(opts.releaseChannel);
  }
  await exec(`cp -r ./build/${sourceDir} ./build/node_modules`, {
    cwd,
  });

  // Validate artifact
  const buildSha = readFileSync('./build/COMMIT_SHA', 'utf8').replace(
    /[\u0000-\u001F\u007F-\u009F]/g,
    ''
  );
  if (buildSha !== opts.commit) {
    throw new Error(
      `Requested commit sha does not match downloaded artifact. Expected: ${opts.commit}, got: ${buildSha}`
    );
  }
}

async function downloadArtifactsFromGitHub(opts) {
  let workflowRun;
  let retries = 0;
  // wait up to 10 mins for build to finish: 10 * 60 * 1_000) / 30_000 = 20
  while (retries < 20) {
    workflowRun = await getWorkflowRun(opts.commit);
    if (typeof workflowRun.status === 'string') {
      switch (workflowRun.status) {
        case 'queued':
        case 'in_progress':
        case 'waiting': {
          retries++;
          console.log(theme`Build still in progress, waiting 30s...`);
          await sleep(30_000);
          break;
        }
        case 'completed': {
          if (workflowRun.conclusion === 'success') {
            const artifact = await getArtifact(
              workflowRun.id,
              'artifacts_combined'
            );
            await processArtifact(artifact, opts);
            return;
          } else {
            console.log(
              theme`{error Could not download build as its conclusion was: ${workflowRun.conclusion}}`
            );
            process.exit(1);
          }
          break;
        }
        default: {
          console.log(
            theme`{error Unhandled workflow run status: ${workflowRun.status}}`
          );
          process.exit(1);
        }
      }
    } else {
      retries++;
      console.log(
        theme`{error Expected workflow run status to be a string, got: ${workflowRun.status}. Retrying...}`
      );
    }
  }

  console.log(
    theme`{error Could not download build from GitHub. Last workflow run: }

${workflowRun != null ? JSON.stringify(workflowRun, null, '\t') : workflowRun}`
  );
  process.exit(1);
}

async function downloadBuildArtifacts(opts) {
  const label = theme`commit {commit ${opts.commit}})`;
  return logPromise(
    downloadArtifactsFromGitHub(opts),
    theme`Downloading artifacts from GitHub for ${label}`
  );
}

module.exports = {
  downloadBuildArtifacts,
};
