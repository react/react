'use strict';

const fs = require('fs');
const path = require('path');
const {execFile} = require('child_process');
const {promisify} = require('util');

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(__dirname, '..', '..', '..');

function isCommandAvailable(command) {
  const paths = (process.env.PATH || '').split(path.delimiter);
  const extensions =
    process.platform === 'win32' && process.env.PATHEXT
      ? process.env.PATHEXT.split(';')
      : [''];

  for (let i = 0; i < paths.length; i++) {
    const dir = paths[i];
    if (!dir) {
      continue;
    }
    for (let j = 0; j < extensions.length; j++) {
      const ext = extensions[j];
      const fullPath = path.join(dir, `${command}${ext}`);
      try {
        fs.accessSync(fullPath, fs.constants.X_OK);
        return true;
      } catch {
        // Keep searching.
      }
    }
  }
  return false;
}

function noopLogger() {}

function escapeCsvValue(value) {
  if (value == null) {
    return '';
  }

  const stringValue = String(value).replace(/\r?\n|\r/g, ' ');
  if (stringValue.includes('"') || stringValue.includes(',')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsvRow(values) {
  return values.map(escapeCsvValue).join(',');
}

module.exports = {
  execFileAsync,
  repoRoot,
  isCommandAvailable,
  noopLogger,
  escapeCsvValue,
  toCsvRow,
};
