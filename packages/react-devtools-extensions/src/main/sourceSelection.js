import {evalInInspectedWindow} from './evalInInspectedWindow';

export function viewAttributeSource(rendererID, elementID, path) {
  evalInInspectedWindow(
    'viewAttributeSource',
    [{rendererID, elementID, path}],
    (didInspect, evalError) => {
      if (evalError) {
        console.error(evalError);
      }
    },
  );
}

export function viewElementSource(rendererID, elementID, onComplete) {
  evalInInspectedWindow(
    'viewElementSource',
    [{rendererID, elementID}],
    (didInspect, evalError) => {
      if (onComplete) {
        onComplete(didInspect === true && !evalError);
      } else if (evalError) {
        console.error(evalError);
      }
    },
  );
}
