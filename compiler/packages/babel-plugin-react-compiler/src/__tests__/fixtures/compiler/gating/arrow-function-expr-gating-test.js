// @gating
import {Stringify} from 'shared-runtime';
const ErrorView = ({error, _retry}) => <Stringify error={error}></Stringify>;

export default ErrorView;

export const FIXTURE_ENTRYPOINT = {
  fn: eval('ErrorView'),
  params: [{}],
};
