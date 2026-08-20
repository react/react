// @gating
import {Stringify} from 'shared-runtime';

const ErrorView = (error, _retry) => <Stringify error={error}></Stringify>;

const Renderer = props => (
  <div>
    <span></span>
    <ErrorView></ErrorView>
  </div>
);

export default Renderer;

export const FIXTURE_ENTRYPOINT = {
  fn: eval('Renderer'),
  params: [{}],
};
