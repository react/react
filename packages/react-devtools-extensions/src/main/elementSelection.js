import {evalInInspectedWindow} from './evalInInspectedWindow';

export function setBrowserSelectionFromReact() {
  // This is currently only called on demand when you press "view DOM".
  // In the future, if Chrome adds an inspect() that doesn't switch tabs,
  // we could make this happen automatically when you select another component.
  evalInInspectedWindow(
    'setBrowserSelectionFromReact',
    [],
    (didSelectionChange, evalError) => {
      if (evalError) {
        console.error(evalError);
      }
    },
  );
}

export function setReactSelectionFromBrowser(onSelectionChanged) {
  // When the user chooses a different node in the browser Elements tab,
  // copy it over to the hook object so that we can sync the selection.
  evalInInspectedWindow(
    'setReactSelectionFromBrowser',
    [],
    (didSelectionChange, evalError) => {
      if (evalError) {
        console.error(evalError);
      } else if (didSelectionChange) {
        onSelectionChanged();
      }
    },
  );
}
