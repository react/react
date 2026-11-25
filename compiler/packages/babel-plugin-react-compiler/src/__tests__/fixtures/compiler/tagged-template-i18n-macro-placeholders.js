// @compilationMode:"infer" @customMacros:"t"
function t(strings, ...values) {
  return String.raw({raw: strings}, ...values);
}

// An i18n macro reads placeholders from source, so they must stay inline
function Greeting({user, count}) {
  return <p>{t`Hello ${user.name ?? 'guest'}, you have ${count} messages`}</p>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Greeting,
  params: [{user: {name: 'Alice'}, count: 2}],
};
