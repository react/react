// @enablePreserveExistingMemoizationGuarantees:false
const THEME_MAP: ReadonlyMap<string, string> = new Map([
  ['default', 'light'],
  ['dark', 'dark'],
]);

export const Component = ({theme = THEME_MAP.get('default')!}) => {
  return <div className={`theme-${theme}`}>User preferences</div>;
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{status: 'success'}],
};
