Harness for testing local changes to the `react-devtools-inline` and `react-devtools-shared` packages.

## Development

This target should be run in parallel with the `react-devtools-inline` package. The first step then is to run that target following the instructions in the [`react-devtools-inline` README's local development section](../react-devtools-inline/README.md#local-development).

The test harness can then be run as follows:
```sh
cd packages/react-devtools-shell

yarn start
```

Once you set both up, you can view the test harness with inlined devtools in browser at http://localhost:8080/
