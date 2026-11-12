import {Stringify, useIdentity} from 'shared-runtime';

const i18n = {
  locale: 'fr',
  t(strings, ...values) {
    return `[${this.locale}] ` + String.raw({raw: strings}, ...values);
  },
};

// i18n.t must be called as a method, even with a hook in the interpolation
function Greeting(props) {
  const message = props.i18n.t`Hello ${useIdentity(props.name)}`;
  return <Stringify message={message} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Greeting,
  params: [{i18n, name: 'Alice'}],
};
