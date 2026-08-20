import {identity} from 'shared-runtime';

const DISPLAY = true;
function Component({cond = false, id}) {
  return (
    <>
      <div className={identity(styles.a, id !== null ? styles.b : {})}></div>

      {cond === false && (
        <div className={identity(styles.c, DISPLAY ? styles.d : {})} />
      )}
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: false, id: 42}],
  sequentialRenders: [
    {cond: false, id: 4},
    {cond: true, id: 4},
    {cond: true, id: 42},
  ],
};

const styles = {
  a: 'a',
  b: 'b',
  c: 'c',
  d: 'd',
};
