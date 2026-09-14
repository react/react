import {useEffect} from 'react';

let i = 0;
const log = [];

function Component() {
  useEffect(() => {
    const runNumber = i;
    log.push(`effect ${runNumber}`);
    i += 1;
    return () => {
      log.push(`cleanup ${runNumber}`);
    };
  }, []);
  return <div>OK</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
