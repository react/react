// @flow
function Greetings() {
  function greeting(greeting) {
    return 'Hello ' + greeting;
  }
  return <div>{greeting('World')}</div>;
}
