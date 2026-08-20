'use strict';

const fs = require('fs');
const path = require('path');

const {execFileAsync, repoRoot, noopLogger} = require('./utils');

function readChangelogSnippet(preferredPackage) {
  const cacheKey =
    preferredPackage === 'eslint-plugin-react-hooks'
      ? preferredPackage
      : 'root';
  if (!readChangelogSnippet.cache) {
    readChangelogSnippet.cache = new Map();
  }
  const cache = readChangelogSnippet.cache;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const targetPath =
    preferredPackage === 'eslint-plugin-react-hooks'
      ? path.join(
          repoRoot,
          'packages',
          'eslint-plugin-react-hooks',
          'CHANGELOG.md'
        )
      : path.join(repoRoot, 'CHANGELOG.md');

  let content = '';
  try {
    content = fs.readFileSync(targetPath, 'utf8');
  } catch {
    content = '';
  }

  const snippet = content.slice(0, 4000);
  cache.set(cacheKey, snippet);
  return snippet;
}

function sanitizeSummary(text) {
  if (!text) {
    return '';
  }

  const trimmed = text.trim();
  const withoutBullet = trimmed.replace(/^([-*]\s+|\d+\s*[\.)]\s+)/, '');

  return withoutBullet.replace(/\s+/g, ' ').trim();
}

async function summarizePackages({
  summarizer,
  packageSpecs,
  packageTargets,
  commitsByPackage,
  log,
}) {
  const summariesByPackage = new Map();
  if (!summarizer) {
    packageSpecs.forEach(spec => {
      const commits = commitsByPackage.get(spec.name) || [];
      const summaryMap = new Map();
      for (let i = 0; i < commits.length; i++) {
        const commit = commits[i];
        summaryMap.set(commit.sha, commit.subject);
      }
      summariesByPackage.set(spec.name, summaryMap);
    });
    return summariesByPackage;
  }

  const tasks = packageSpecs.map(spec => {
    const commits = commitsByPackage.get(spec.name) || [];
    return summarizePackageCommits({
      summarizer,
      spec,
      commits,
      packageTargets,
      allPackageSpecs: packageSpecs,
      log,
    });
  });

  const results = await Promise.all(tasks);
  results.forEach(entry => {
    summariesByPackage.set(entry.packageName, entry.summaries);
  });
  return summariesByPackage;
}

async function summarizePackageCommits({
  summarizer,
  spec,
  commits,
  packageTargets,
  allPackageSpecs,
  log,
}) {
  const summaries = new Map();
  if (commits.length === 0) {
    return {packageName: spec.name, summaries};
  }

  const rootStyle = readChangelogSnippet('root');
  const hooksStyle = readChangelogSnippet('eslint-plugin-react-hooks');
  const targetList = allPackageSpecs.map(
    targetSpec =>
      `${targetSpec.name}@${targetSpec.displayVersion || targetSpec.version}`
  );
  const payload = commits.map(commit => {
    const packages = Array.from(commit.packages || []).sort();
    const usesHooksStyle = (commit.packages || new Set()).has(
      'eslint-plugin-react-hooks'
    );
    const packagesWithVersions = packages.map(pkgName => {
      const targetSpec = packageTargets.get(pkgName);
      if (!targetSpec) {
        return pkgName;
      }
      return `${pkgName}@${targetSpec.displayVersion || targetSpec.version}`;
    });
    return {
      sha: commit.sha,
      packages,
      packagesWithVersions,
      style: usesHooksStyle ? 'eslint-plugin-react-hooks' : 'root',
      subject: commit.subject,
      body: commit.body || '',
    };
  });

  const promptParts = [
    `You are preparing changelog summaries for ${spec.name} ${
      spec.displayVersion || spec.version
    }.`,
    'The broader release includes:',
    ...targetList.map(line => `- ${line}`),
    '',
    'For each commit payload, write a single concise sentence without a leading bullet.',
    'Match the tone and formatting of the provided style samples. Do not mention commit hashes.',
    'Return a JSON array where each element has the shape `{ "sha": "<sha>", "summary": "<text>" }`.',
    'The JSON must contain one entry per commit in the same order they are provided.',
    'Use `"root"` style unless the payload specifies `"eslint-plugin-react-hooks"`, in which case use that style sample.',
    '',
    '--- STYLE: root ---',
    rootStyle,
    '--- END STYLE ---',
    '',
    '--- STYLE: eslint-plugin-react-hooks ---',
    hooksStyle,
    '--- END STYLE ---',
    '',
    `Commits affecting ${spec.name}:`,
  ];

  payload.forEach((item, index) => {
    promptParts.push(
      `Commit ${index + 1}:`,
      `sha: ${item.sha}`,
      `style: ${item.style}`,
      `packages: ${item.packagesWithVersions.join(', ') || 'none'}`,
      `subject: ${item.subject}`,
      'body:',
      item.body || '(empty)',
      ''
    );
  });
  promptParts.push('Return ONLY the JSON array.', '');

  const prompt = promptParts.join('\n');
  log(
    `Invoking ${summarizer} for ${payload.length} commit summaries targeting ${spec.name}.`
  );
  log(`Summarizer prompt length: ${prompt.length} characters.`);

  try {
    const raw = await runSummarizer(summarizer, prompt);
    log(`Summarizer output length: ${raw.length}`);
    const parsed = parseSummariesResponse(raw);
    if (!parsed) {
      throw new Error('Unable to parse summarizer output.');
    }
    parsed.forEach(entry => {
      const summary = sanitizeSummary(entry.summary || '');
      if (summary) {
        summaries.set(entry.sha, summary);
      }
    });
  } catch (error) {
    if (log !== noopLogger) {
      log(
        `Warning: failed to summarize commits for ${spec.name} with ${summarizer}. Falling back to subjects. ${error.message}`
      );
      if (error && error.stack) {
        log(error.stack);
      }
    }
  }

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    if (!summaries.has(commit.sha)) {
      summaries.set(commit.sha, commit.subject);
    }
  }

  log(`Summaries available for ${summaries.size} commit(s) for ${spec.name}.`);

  return {packageName: spec.name, summaries};
}

async function runSummarizer(command, prompt) {
  const options = {cwd: repoRoot, maxBuffer: 5 * 1024 * 1024};

  if (command === 'codex') {
    const {stdout} = await execFileAsync(
      'codex',
      ['exec', '--json', prompt],
      options
    );
    return parseCodexSummary(stdout);
  }

  if (command === 'claude') {
    const {stdout} = await execFileAsync('claude', ['-p', prompt], options);
    return stripClaudeBanner(stdout);
  }

  throw new Error(`Unsupported summarizer command: ${command}`);
}

function parseCodexSummary(output) {
  let last = '';
  const lines = output.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      continue;
    }
    try {
      const event = JSON.parse(trimmed);
      if (
        event.type === 'item.completed' &&
        event.item?.type === 'agent_message'
      ) {
        last = event.item.text || '';
      }
    } catch {
      last = trimmed;
    }
  }
  return last || output;
}

function stripClaudeBanner(text) {
  return text
    .split('\n')
    .filter(
      line =>
        line.trim() !==
        'Claude Code at Meta (https://fburl.com/claude.code.users)'
    )
    .join('\n')
    .trim();
}

function parseSummariesResponse(output) {
  const trimmed = output.trim();
  const candidates = trimmed
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  for (let i = candidates.length - 1; i >= 0; i--) {
    const candidate = candidates[i];
    if (!candidate) {
      continue;
    }
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Try the next candidate.
    }
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Fall through.
  }

  return null;
}

module.exports = {
  summarizePackages,
};
