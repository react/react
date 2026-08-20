// @gating
import {Stringify} from 'shared-runtime';

const ErrorView = (error, _retry) => <Stringify error={error}></Stringify>;

export default props => (
  <Foo>
    <Bar></Bar>
    <ErrorView></ErrorView>
  </Foo>
);
