#!/usr/bin/env node

'use strict';

const {exec} = require('child-process-promise');
const {join} = require('path');
const puppeteer = require('puppeteer');
const server = require('pushstate-server');
const theme = require('../theme');
const {logPromise} = require('../utils');

const validate = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:9000/fixtures/packaging');

  try {
    return await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe');

      if (iframes.length === 0) {
        return 'No iframes were found.';
      }

      for (let i = 0; i < iframes.length; i++) {
        const iframe = iframes[i];
        // Don't include the <script> Babel tag
        const container =
          iframe.contentDocument.body.getElementsByTagName('div')[0];
        if (container.textContent !== 'Hello World!') {
          return `Unexpected fixture content, "${container.textContent}"`;
        }
      }

      return null;
    });
  } finally {
    await browser.close();
  }
};

const run = async ({cwd}) => {
  await logPromise(
    exec('node build-all.js', {cwd: join(cwd, 'fixtures/packaging')}),
    'Generating "packaging" fixture',
    20000 // This takes roughly 20 seconds
  );

  let errorMessage;
  let response;

  try {
    response = server.start({
      port: 9000,
      directory: cwd,
    });

    errorMessage = await logPromise(
      validate(),
      'Verifying "packaging" fixture'
    );
  } finally {
    response.close();
  }

  if (errorMessage) {
    console.error(
      theme.error('✗'),
      'Verifying "packaging" fixture\n ',
      theme.error(errorMessage)
    );
    process.exit(1);
  }
};

module.exports = run;
