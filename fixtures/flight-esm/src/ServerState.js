let serverState = 'Hello World';

export function setServerState(message) {
  serverState = message;
}

export function getServerState() {
  return serverState;
}
