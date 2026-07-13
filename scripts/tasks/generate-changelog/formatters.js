'use strict';

const {toCsvRow} = require('./utils');

const NO_CHANGES_MESSAGE = 'No changes since the last release.';

function buildChangelogEntries({
  packageSpecs,
  commitsByPackage,
  summariesByPackage,
  prMetadata,
}) {
  const entries = [];

  for (let i = 0; i < packageSpecs.length; i++) {
    const spec = packageSpecs[i];
    const version = spec.displayVersion || spec.version;
    const commitsForPackage = commitsByPackage.get(spec.name) || [];

    if (commitsForPackage.length === 0) {
      entries.push({
        package: spec.name,
        version,
        hasChanges: false,
        note: NO_CHANGES_MESSAGE,
        commits: [],
      });
      continue;
    }

    const summaryMap = summariesByPackage.get(spec.name) || new Map();
    const commitEntries = commitsForPackage.map(commit => {
      let summary = summaryMap.get(commit.sha) || commit.subject;
      if (commit.prNumber) {
        const prPattern = new RegExp(`\\s*\\(#${commit.prNumber}\\)$`);
        summary = summary.replace(prPattern, '').trim();
      }

      const commitSha = commit.sha;
      const commitUrl = `https://github.com/facebook/react/commit/${commitSha}`;
      const prNumber = commit.prNumber || null;
      const prUrl = prNumber
        ? `https://github.com/facebook/react/pull/${prNumber}`
        : null;
      const prEntry = prNumber ? prMetadata.get(prNumber) : null;

      const authorLogin = prEntry?.authorLogin || null;
      const authorName = commit.authorName || null;
      const authorEmail = commit.authorEmail || null;

      let authorUrl = null;
      let authorDisplay = authorName || 'unknown author';

      if (authorLogin) {
        authorUrl = `https://github.com/${authorLogin}`;
        authorDisplay = `[@${authorLogin}](${authorUrl})`;
      } else if (authorName && authorName.startsWith('@')) {
        const username = authorName.slice(1);
        authorUrl = `https://github.com/${username}`;
        authorDisplay = `[@${username}](${authorUrl})`;
      }

      const referenceType = prNumber ? 'pr' : 'commit';
      const referenceId = prNumber ? `#${prNumber}` : commitSha.slice(0, 7);
      const referenceUrl = prNumber ? prUrl : commitUrl;
      const referenceLabel = prNumber
        ? `[#${prNumber}](${prUrl})`
        : `commit ${commitSha.slice(0, 7)}`;

      return {
        summary,
        prNumber,
        prUrl,
        commitSha,
        commitUrl,
        author: {
          login: authorLogin,
          name: authorName,
          email: authorEmail,
          url: authorUrl,
          display: authorDisplay,
        },
        reference: {
          type: referenceType,
          id: referenceId,
          url: referenceUrl,
          label: referenceLabel,
        },
      };
    });

    entries.push({
      package: spec.name,
      version,
      hasChanges: true,
      note: null,
      commits: commitEntries,
    });
  }

  return entries;
}

function renderChangelog(entries, format) {
  if (format === 'text') {
    const lines = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      lines.push(`## ${entry.package}@${entry.version}`);
      if (!entry.hasChanges) {
        lines.push(`* ${entry.note}`);
        lines.push('');
        continue;
      }

      entry.commits.forEach(commit => {
        lines.push(
          `* ${commit.summary} (${commit.reference.label} by ${commit.author.display})`
        );
      });
      lines.push('');
    }

    while (lines.length && lines[lines.length - 1] === '') {
      lines.pop();
    }

    return lines.join('\n');
  }

  if (format === 'csv') {
    const header = [
      'package',
      'version',
      'summary',
      'reference_type',
      'reference_id',
      'reference_url',
      'author_name',
      'author_login',
      'author_url',
      'author_email',
      'commit_sha',
      'commit_url',
    ];
    const rows = [header];

    entries.forEach(entry => {
      if (!entry.hasChanges) {
        rows.push([
          entry.package,
          entry.version,
          entry.note,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ]);
        return;
      }

      entry.commits.forEach(commit => {
        const authorName =
          commit.author.name ||
          (commit.author.login ? `@${commit.author.login}` : 'unknown author');
        rows.push([
          entry.package,
          entry.version,
          commit.summary,
          commit.reference.type,
          commit.reference.id,
          commit.reference.url,
          authorName,
          commit.author.login || '',
          commit.author.url || '',
          commit.author.email || '',
          commit.commitSha,
          commit.commitUrl,
        ]);
      });
    });

    return rows.map(toCsvRow).join('\n');
  }

  if (format === 'json') {
    const payload = entries.map(entry => ({
      package: entry.package,
      version: entry.version,
      hasChanges: entry.hasChanges,
      note: entry.hasChanges ? undefined : entry.note,
      commits: entry.commits.map(commit => ({
        summary: commit.summary,
        prNumber: commit.prNumber,
        prUrl: commit.prUrl,
        commitSha: commit.commitSha,
        commitUrl: commit.commitUrl,
        author: {
          login: commit.author.login,
          name: commit.author.name,
          email: commit.author.email,
          url: commit.author.url,
          display: commit.author.display,
        },
        reference: {
          type: commit.reference.type,
          id: commit.reference.id,
          url: commit.reference.url,
          label: commit.reference.label,
        },
      })),
    }));

    return JSON.stringify(payload, null, 2);
  }

  throw new Error(`Unsupported format: ${format}`);
}

module.exports = {
  buildChangelogEntries,
  renderChangelog,
};
