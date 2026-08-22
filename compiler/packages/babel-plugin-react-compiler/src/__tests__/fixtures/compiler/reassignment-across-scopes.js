function Component(props) {
  let hasErrors = false;

  const nameErrors = [];
  if (props.name === 'taken') {
    hasErrors = true;
    nameErrors.push('That name is already taken');
  }

  const settingsErrors = [];
  if (props.missingVariable) {
    hasErrors = true;
    settingsErrors.push('Pick an X variable');
  }

  return [hasErrors, nameErrors, settingsErrors];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: '', missingVariable: false}],
  sequentialRenders: [
    {name: '', missingVariable: false},
    {name: 'taken', missingVariable: false},
    {name: '', missingVariable: false},
    {name: '', missingVariable: true},
  ],
};
