'use strict';

const {stablePackages} = require('../../../ReactVersions');
const {parseArgs} = require('./args');
const {
  fetchNpmInfo,
  collectCommitsSince,
  loadCommitDetails,
  extractPrNumber,
  fetchPullRequestMetadata,
} = require('./data');
const {summarizePackages} = require('./summaries');
const {buildChangelogEntries, renderChangelog} = require('./formatters');
const {noopLogger} = require('./utils');

async function main() {
  const {packageSpecs, summarizer, debug, format} = parseArgs(
    process.argv.slice(2)
  );
  const log = debug
    ? (...args) => console.log('[generate-changelog]', ...args)
    : noopLogger;

  const allStablePackages = Object.keys(stablePackages);
  const packageTargets = new Map();
  for (let i = 0; i < packageSpecs.length; i++) {
    const spec = packageSpecs[i];
    if (!allStablePackages.includes(spec.name)) {
      throw new Error(
        `Package "${spec.name}" is not listed in stablePackages.`
      );
    }
    if (packageTargets.has(spec.name)) {
      throw new Error(`Package "${spec.name}" was specified more than once.`);
    }
    packageTargets.set(spec.name, spec);
  }

  const targetPackages = packageSpecs.map(spec => spec.name);
  log(
    `Starting changelog generation for: ${packageSpecs
      .map(spec => `${spec.name}@${spec.displayVersion || spec.version}`)
      .join(', ')}`
  );

  const packageInfoMap = new Map();
  const packageInfoResults = await Promise.all(
    targetPackages.map(async pkg => {
      const info = await fetchNpmInfo(pkg, {log});
      return {pkg, info};
    })
  );
  for (let i = 0; i < packageInfoResults.length; i++) {
    const entry = packageInfoResults[i];
    packageInfoMap.set(entry.pkg, entry.info);
  }

  const commitPackagesMap = new Map();
  const commitCollections = await Promise.all(
    targetPackages.map(async pkg => {
      const {gitHead} = packageInfoMap.get(pkg);
      const commits = await collectCommitsSince(pkg, gitHead, {log});
      log(`Package ${pkg} has ${commits.length} commit(s) since ${gitHead}.`);
      return {pkg, commits};
    })
  );
  for (let i = 0; i < commitCollections.length; i++) {
    const entry = commitCollections[i];
    const pkg = entry.pkg;
    const commits = entry.commits;
    for (let j = 0; j < commits.length; j++) {
      const sha = commits[j];
      if (!commitPackagesMap.has(sha)) {
        commitPackagesMap.set(sha, new Set());
      }
      commitPackagesMap.get(sha).add(pkg);
    }
  }
  log(`Found ${commitPackagesMap.size} commits touching target packages.`);

  if (commitPackagesMap.size === 0) {
    console.log('No commits found for the selected packages.');
    return;
  }

  const commitDetails = await Promise.all(
    Array.from(commitPackagesMap.entries()).map(
      async ([sha, packagesTouched]) => {
        const detail = await loadCommitDetails(sha, {log});
        detail.packages = packagesTouched;
        detail.prNumber = extractPrNumber(detail.subject, detail.body);
        return detail;
      }
    )
  );

  commitDetails.sort((a, b) => a.timestamp - b.timestamp);
  log(`Ordered ${commitDetails.length} commit(s) chronologically.`);

  const commitsByPackage = new Map();
  commitDetails.forEach(commit => {
    commit.packages.forEach(pkgName => {
      if (!commitsByPackage.has(pkgName)) {
        commitsByPackage.set(pkgName, []);
      }
      commitsByPackage.get(pkgName).push(commit);
    });
  });

  const uniquePrNumbers = Array.from(
    new Set(commitDetails.map(commit => commit.prNumber).filter(Boolean))
  );
  log(`Identified ${uniquePrNumbers.length} unique PR number(s).`);

  const prMetadata = new Map();
  log(`Summarizer selected: ${summarizer || 'none (using commit titles)'}`);
  const prMetadataResults = await Promise.all(
    uniquePrNumbers.map(async prNumber => {
      const meta = await fetchPullRequestMetadata(prNumber, {log});
      return {prNumber, meta};
    })
  );
  for (let i = 0; i < prMetadataResults.length; i++) {
    const entry = prMetadataResults[i];
    if (entry.meta) {
      prMetadata.set(entry.prNumber, entry.meta);
    }
  }
  log(`Fetched metadata for ${prMetadata.size} PR(s).`);

  const summariesByPackage = await summarizePackages({
    summarizer,
    packageSpecs,
    packageTargets,
    commitsByPackage,
    log,
  });

  const changelogEntries = buildChangelogEntries({
    packageSpecs,
    commitsByPackage,
    summariesByPackage,
    prMetadata,
  });

  log('Generated changelog sections.');
  const output = renderChangelog(changelogEntries, format);
  console.log(output);
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
} else {
  module.exports = main;
}
