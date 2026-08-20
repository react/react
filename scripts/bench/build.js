'use strict';

const Git = require('nodegit');
const rimraf = require('rimraf');
const ncp = require('ncp').ncp;
const {existsSync} = require('fs');
const exec = require('child_process').exec;
const {join} = require('path');

const reactUrl = 'https://github.com/facebook/react.git';

function cleanDir() {
  return new Promise(_resolve => rimraf('remote-repo', _resolve));
}

function executeCommand(command) {
  return new Promise(_resolve =>
    exec(command, error => {
      if (!error) {
        _resolve();
      } else {
        console.error(error);
        process.exit(1);
      }
    })
  );
}

function asyncCopyTo(from, to) {
  return new Promise(_resolve => {
    ncp(from, to, error => {
      if (error) {
        console.error(error);
        process.exit(1);
      }
      _resolve();
    });
  });
}

function getDefaultReactPath() {
  return join(__dirname, 'remote-repo');
}

async function buildBenchmark(reactPath = getDefaultReactPath(), benchmark) {
  // get the build.js from the benchmark directory and execute it
  await require(join(__dirname, 'benchmarks', benchmark, 'build.js'))(
    reactPath,
    asyncCopyTo
  );
}

async function getMergeBaseFromLocalGitRepo(localRepo) {
  const repo = await Git.Repository.open(localRepo);
  return await Git.Merge.base(
    repo,
    await repo.getHeadCommit(),
    await repo.getBranchCommit('main')
  );
}

async function buildBenchmarkBundlesFromGitRepo(
  commitId,
  skipBuild,
  url = reactUrl,
  clean
) {
  let repo;
  const remoteRepoDir = getDefaultReactPath();

  if (!skipBuild) {
    if (clean) {
      //clear remote-repo folder
      await cleanDir(remoteRepoDir);
    }
    // check if remote-repo directory already exists
    if (existsSync(remoteRepoDir)) {
      repo = await Git.Repository.open(remoteRepoDir);
      // fetch all the latest remote changes
      await repo.fetchAll();
    } else {
      // if not, clone the repo to remote-repo folder
      repo = await Git.Clone(url, remoteRepoDir);
    }
    let commit = await repo.getBranchCommit('main');
    // reset hard to this remote head
    await Git.Reset.reset(repo, commit, Git.Reset.TYPE.HARD);
    // then we checkout the latest main head
    await repo.checkoutBranch('main');
    // make sure we pull in the latest changes
    await repo.mergeBranches('main', 'origin/main');
    // then we check if we need to move the HEAD to the merge base
    if (commitId && commitId !== 'main') {
      // as the commitId probably came from our local repo
      // we use it to lookup the right commit in our remote repo
      commit = await Git.Commit.lookup(repo, commitId);
      // then we checkout the merge base
      await Git.Checkout.tree(repo, commit);
    }
    await buildReactBundles();
  }
}

async function buildReactBundles(reactPath = getDefaultReactPath(), skipBuild) {
  if (!skipBuild) {
    await executeCommand(
      `cd ${reactPath} && yarn && yarn build react/index,react-dom/index --type=UMD_PROD`
    );
  }
}

// if run directly via CLI
if (require.main === module) {
  buildBenchmarkBundlesFromGitRepo();
}

module.exports = {
  buildReactBundles,
  buildBenchmark,
  buildBenchmarkBundlesFromGitRepo,
  getMergeBaseFromLocalGitRepo,
};
