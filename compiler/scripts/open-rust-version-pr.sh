#!/usr/bin/env bash

set -euo pipefail

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${BASE_SHA:?BASE_SHA is required}"
: "${VERSION:?VERSION is required}"

cd "$(dirname "$0")/../.."

branch="automated/rust-crates-$VERSION"
gh api "repos/$GITHUB_REPOSITORY/git/refs" \
  --method POST \
  --field ref="refs/heads/$branch" \
  --field sha="$BASE_SHA"

additions=$(jq -n \
  --arg manifest "$(base64 < compiler/Cargo.toml | tr -d '\n')" \
  --arg lockfile "$(base64 < compiler/Cargo.lock | tr -d '\n')" \
  '[
    {path: "compiler/Cargo.toml", contents: $manifest},
    {path: "compiler/Cargo.lock", contents: $lockfile}
  ]')
graphql_input=$(jq -n \
    --arg query 'mutation($input: CreateCommitOnBranchInput!) {
      createCommitOnBranch(input: $input) {
        commit { oid }
      }
    }' \
    --arg repository "$GITHUB_REPOSITORY" \
    --arg branch "$branch" \
    --arg headline "Update Rust compiler crates to $VERSION" \
    --arg expectedHeadOid "$BASE_SHA" \
    --argjson additions "$additions" \
    '{
      query: $query,
      variables: {
        input: {
          branch: {
            repositoryNameWithOwner: $repository,
            branchName: $branch
          },
          message: {headline: $headline},
          fileChanges: {additions: $additions},
          expectedHeadOid: $expectedHeadOid
        }
      }
    }')
commit=$(printf '%s' "$graphql_input" | gh api graphql \
  --input - \
  --jq '.data.createCommitOnBranch.commit.oid')

if [ "$(gh api "repos/$GITHUB_REPOSITORY/commits/$commit" --jq '.commit.verification.verified')" != "true" ]; then
  echo "GitHub did not sign commit $commit" >&2
  exit 1
fi

gh pr create \
  --base main \
  --head "$branch" \
  --title "Update Rust compiler crates to $VERSION" \
  --body "Update all Rust compiler crates and their internal dependency requirements to \`$VERSION\`."