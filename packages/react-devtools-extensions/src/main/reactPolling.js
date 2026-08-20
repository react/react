import {evalInInspectedWindow} from './evalInInspectedWindow';

class CouldNotFindReactOnThePageError extends Error {
  constructor() {
    super("Could not find React, or it hasn't been loaded yet");

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CouldNotFindReactOnThePageError);
    }

    this.name = 'CouldNotFindReactOnThePageError';
  }
}

export function startReactPolling(
  onReactFound,
  attemptsThreshold,
  onCouldNotFindReactAfterReachingAttemptsThreshold,
) {
  let status = 'idle';

  function abort() {
    status = 'aborted';
  }

  // This function will call onSuccess only if React was found and polling is not aborted, onError will be called for every other case
  function checkIfReactPresentInInspectedWindow(onSuccess, onError) {
    evalInInspectedWindow(
      'checkIfReactPresentInInspectedWindow',
      [],
      (pageHasReact, exceptionInfo) => {
        if (status === 'aborted') {
          onError(
            'Polling was aborted, user probably navigated to the other page',
          );
          return;
        }

        if (exceptionInfo) {
          const {code, description, isError, isException, value} =
            exceptionInfo;

          if (isException) {
            onError(
              `Received error while checking if react has loaded: ${value}`,
            );
            return;
          }

          if (isError) {
            onError(
              `Received error with code ${code} while checking if react has loaded: "${description}"`,
            );
            return;
          }
        }

        if (pageHasReact) {
          onSuccess();
          return;
        }

        onError(new CouldNotFindReactOnThePageError());
      },
    );
  }

  // Just a Promise wrapper around `checkIfReactPresentInInspectedWindow`
  // returns a Promise, which will resolve only if React has been found on the page
  function poll(attempt) {
    return new Promise((resolve, reject) => {
      checkIfReactPresentInInspectedWindow(resolve, reject);
    }).catch(error => {
      if (error instanceof CouldNotFindReactOnThePageError) {
        if (attempt === attemptsThreshold) {
          onCouldNotFindReactAfterReachingAttemptsThreshold();
        }

        // Start next attempt in 0.5s
        return new Promise(r => setTimeout(r, 500)).then(() =>
          poll(attempt + 1),
        );
      }

      // Propagating every other Error
      throw error;
    });
  }

  poll(1)
    .then(onReactFound)
    .catch(error => {
      // Log propagated errors only if polling was not aborted
      // Some errors are expected when user performs in-tab navigation and `.eval()` is still being executed
      if (status === 'aborted') {
        return;
      }

      console.error(error);
    });

  return {abort};
}
