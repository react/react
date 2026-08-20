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

export function viewElementSource(rendererID, elementID) {
  evalInInspectedWindow(
    'viewElementSource',
    [{rendererID, elementID}],
    (didInspect, evalError) => {
      if (evalError) {
        console.error(evalError);
      }
    },
  );
}
