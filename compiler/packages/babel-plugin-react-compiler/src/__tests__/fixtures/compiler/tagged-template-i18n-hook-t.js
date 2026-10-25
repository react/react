// @compilationMode:"infer"
import {Stringify} from 'shared-runtime';

const translators = {
  en: (strings, ...values) => String.raw({raw: strings}, ...values),
  fr: (strings, ...values) => '[fr] ' + String.raw({raw: strings}, ...values),
};

function useTranslation(locale) {
  return translators[locale];
}

// Messages are recomputed when the locale (t) or an interpolated value changes
function Greeting({locale, name, count}) {
  const t = useTranslation(locale);
  return (
    <Stringify title={t`Hello ${name}`} body={t`You have ${count} messages`} />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Greeting,
  params: [{locale: 'en', name: 'Alice', count: 1}],
  sequentialRenders: [
    {locale: 'en', name: 'Alice', count: 1},
    {locale: 'en', name: 'Alice', count: 1},
    {locale: 'fr', name: 'Alice', count: 1},
    {locale: 'fr', name: 'Bob', count: 2},
  ],
};
