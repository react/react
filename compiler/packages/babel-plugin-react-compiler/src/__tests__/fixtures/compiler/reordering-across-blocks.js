import {Stringify} from 'shared-runtime';

function Component({config}) {
  /**
   * The original memoization is optimal in the sense that it has
   * one output (the object) and one dependency (`config`). Both
   * the `a` and `b` functions will have to be recreated whenever
   * `config` changes, cascading to update the object.
   *
   * However, we currently only consider consecutive scopes for
   * merging, so we first see the `a` scope, then the `b` scope,
   * and see that the output of the `a` scope is used later -
   * so we don't merge these scopes, and so on.
   *
   * The more optimal thing would be to build a dependency graph
   * of scopes so that we can see the data flow is along the lines
   * of:
   *
   *             config
   *            /      \
   *          [a]      [b]
   *           \       /
   *           [object]
   *
   * All the scopes (shown in []) are transitively dependent on
   * `config`, so they can be merged.
   */
  const object = useMemo(() => {
    const a = event => {
      config?.onA?.(event);
    };

    const b = event => {
      config?.onB?.(event);
    };

    return {
      b,
      a,
    };
  }, [config]);

  return <Stringify value={object} />;
}
