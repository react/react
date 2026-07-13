'use strict';

const https = require('https');
const path = require('path');

const {execFileAsync, repoRoot} = require('./utils');

async function fetchNpmInfo(packageName, {log}) {
  const npmArgs = ['view', `${packageName}@latest`, '--json'];
  const options = {cwd: repoRoot, maxBuffer: 10 * 1024 * 1024};
  log(`Fetching npm info for ${packageName}...`);
  const {stdout} = await execFileAsync('npm', npmArgs, options);

  let data = stdout.trim();
  if (!data) {
    throw new Error(`npm view returned empty result for ${packageName}`);
  }

  let info = JSON.parse(data);
  if (Array.isArray(info)) {
    info = info[info.length - 1];
  }

  const version = info.version || info['dist-tags']?.latest;
  let gitHead = info.gitHead || null;

  if (!gitHead) {
    const gitHeadResult = await execFileAsync(
      'npm',
      ['view', `${packageName}@${version}`, 'gitHead'],
      {cwd: repoRoot, maxBuffer: 1024 * 1024}
    );
    const possibleGitHead = gitHeadResult.stdout.trim();
    if (
      possibleGitHead &&
      possibleGitHead !== 'undefined' &&
      possibleGitHead !== 'null'
    ) {
      log(`Found gitHead for ${packageName}@${version}: ${possibleGitHead}`);
      gitHead = possibleGitHead;
    }
  }

  if (!version) {
    throw new Error(
      `Unable to determine latest published version for ${packageName}`
    );
  }
  if (!gitHead) {
    throw new Error(
      `Unable to determine git commit for ${packageName}@${version}`
    );
  }

  return {
    publishedVersion: version,
    gitHead,
  };
}

async function collectCommitsSince(packageName, sinceGitSha, {log}) {
  log(`Collecting commits for ${packageName} since ${sinceGitSha}...`);
  await execFileAsync('git', ['cat-file', '-e', `${sinceGitSha}^{commit}`], {
    cwd: repoRoot,
  });
  const {stdout} = await execFileAsync(
    'git',
    [
      'rev-list',
      '--reverse',
      `${sinceGitSha}..HEAD`,
      '--',
      path.posix.join('packages', packageName),
    ],
    {cwd: repoRoot, maxBuffer: 10 * 1024 * 1024}
  );

  return stdout
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

async function loadCommitDetails(sha, {log}) {
  log(`Loading commit details for ${sha}...`);
  const format = ['%H', '%s', '%an', '%ae', '%ct', '%B'].join('%n');
  const {stdout} = await execFileAsync(
    'git',
    ['show', '--quiet', `--format=${format}`, sha],
    {cwd: repoRoot, maxBuffer: 10 * 1024 * 1024}
  );

  const [commitSha, subject, authorName, authorEmail, timestamp, ...rest] =
    stdout.split('\n');
  const body = rest.join('\n').trim();

  return {
    sha: commitSha.trim(),
    subject: subject.trim(),
    authorName: authorName.trim(),
    authorEmail: authorEmail.trim(),
    timestamp: +timestamp.trim() || 0,
    body,
  };
}

function extractPrNumber(subject, body) {
  const patterns = [
    /\(#(\d+)\)/,
    /https:\/\/github\.com\/facebook\/react\/pull\/(\d+)/,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const subjectMatch = subject && subject.match(pattern);
    if (subjectMatch) {
      return subjectMatch[1];
    }
    const bodyMatch = body && body.match(pattern);
    if (bodyMatch) {
      return bodyMatch[1];
    }
  }

  return null;
}

async function fetchPullRequestMetadata(prNumber, {log}) {
  log(`Fetching PR metadata for #${prNumber}...`);
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
  const requestOptions = {
    hostname: 'api.github.com',
    path: `/repos/facebook/react/pulls/${prNumber}`,
    method: 'GET',
    headers: {
      'User-Agent': 'generate-changelog-script',
      Accept: 'application/vnd.github+json',
    },
  };
  if (token) {
    requestOptions.headers.Authorization = `Bearer ${token}`;
  }

  return new Promise(resolve => {
    const req = https.request(requestOptions, res => {
      let raw = '';
      res.on('data', chunk => {
        raw += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(raw);
            resolve({
              authorLogin: json.user?.login || null,
            });
          } catch (error) {
            process.stderr.write(
              `Warning: unable to parse GitHub response for PR #${prNumber}: ${error.message}\n`
            );
            resolve(null);
          }
        } else {
          process.stderr.write(
            `Warning: GitHub API request failed for PR #${prNumber} with status ${res.statusCode}\n`
          );
          resolve(null);
        }
      });
    });

    req.on('error', error => {
      process.stderr.write(
        `Warning: GitHub API request errored for PR #${prNumber}: ${error.message}\n`
      );
      resolve(null);
    });

    req.end();
  });
}

module.exports = {
  fetchNpmInfo,
  collectCommitsSince,
  loadCommitDetails,
  extractPrNumber,
  fetchPullRequestMetadata,
};
