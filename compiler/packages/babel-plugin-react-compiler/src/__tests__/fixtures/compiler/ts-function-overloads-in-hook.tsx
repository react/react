function useTranslatedResource(translations: {[key: string]: string}) {
  function formatValue(key: string): string;
  function formatValue(key: string | null | undefined): string | null;
  function formatValue(key: string | null | undefined) {
    if (!key) return null;
    if (!translations[key]) return key;
    return translations[key];
  }

  return {formatValue};
}

function Component() {
  const {formatValue} = useTranslatedResource({hello: 'Hello'});
  return <div>{formatValue('hello')}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
