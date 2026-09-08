# Publishing Rust Compiler Crates

## Bump the version

1. Open the repository's **Actions** tab.
2. Select **(Compiler) Update Rust Crate Version**.
3. Click **Run workflow**, enter the new version, and run it from `main`.
4. Review and merge the pull request created by the workflow.

All Rust compiler crates use the same version and are published together.

## Publish

1. After the version pull request is merged, open the **Actions** tab.
2. Select **(Compiler) Publish Rust Crates**.
3. Click **Run workflow**, select `main`, and leave **Validate packages without publishing** unchecked.
4. Confirm that the workflow succeeds and that the new versions appear on [crates.io](https://crates.io/crates/react_compiler/versions).

Use the validation checkbox to check packaging without publishing. Published crate versions cannot be deleted.
