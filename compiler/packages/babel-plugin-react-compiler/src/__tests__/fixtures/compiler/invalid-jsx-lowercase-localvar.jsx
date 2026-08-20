import {Throw} from 'shared-runtime';

/**
 * Note: this is disabled in the evaluator due to different devmode errors.
 * Found differences in evaluator results
 *  Non-forget (expected):
 *  (kind: ok) <invalidtag val="[object Object]"></invalidtag>
 *  logs: ['Warning: <%s /> is using incorrect casing. Use PascalCase for React components, or lowercase for HTML elements.%s','invalidTag']
 *
 *  Forget:
 *  (kind: ok) <invalidtag val="[object Object]"></invalidtag>
 *  logs: [
 *   'Warning: <%s /> is using incorrect casing. Use PascalCase for React components, or lowercase for HTML elements.%s','invalidTag',
 *   'Warning: The tag <%s> is unrecognized in this browser. If you meant to render a React component, start its name with an uppercase letter.%s','invalidTag',
 *  ]
 */
function useFoo() {
  const invalidTag = Throw;
  /**
   * Need to be careful to not parse `invalidTag` as a localVar (i.e. render
   * Throw). Note that the jsx transform turns this into a string tag:
   * `jsx("invalidTag"...
   */
  return <invalidTag val={{val: 2}} />;
}
export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};
