const ReactCompiler = require('../packages/babel-plugin-react-compiler/dist');

const combinedRules = [
  {
    name: 'rules-of-hooks',
    recommended: true,
    description:
      'Validates that components and hooks follow the [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)',
  },
  {
    name: 'exhaustive-deps',
    recommended: true,
    description:
      'Validates that hooks which accept dependency arrays (`useMemo()`, `useCallback()`, `useEffect()`, etc) ' +
      'list all referenced variables in their dependency array. Referencing a value without including it in the ' +
      'dependency array can lead to stale UI or callbacks.',
  },
  ...ReactCompiler.LintRules,
];

const printed = combinedRules
  .filter(
    ruleConfig => ruleConfig.rule.recommended && ruleConfig.severity !== 'Off'
  )
  .map(ruleConfig => {
    return `
## \`react-hooks/${ruleConfig.rule.name}\`

${ruleConfig.rule.description}
    `.trim();
  })
  .join('\n\n');

console.log(printed);
