// @gating
import {Stringify} from 'shared-runtime';

const ErrorView = (error, _retry) => <Stringify error={error}></Stringify>;

export const Renderer = props => (
  <div>
    <span></span>
    <ErrorView></ErrorView>
  </div>
);

export const FIXTURE_ENTRYPOINT = {
  fn: eval('Renderer'),
  params: [{}],
};
