/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {AnyNativeEvent} from '../PluginModuleType';
import type {DOMEventName} from '../DOMEventNames';
import type {DispatchQueue} from '../DOMPluginEventSystem';
import type {EventSystemFlags} from '../EventSystemFlags';
import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
import type {FormStatus} from 'react-dom-bindings/src/shared/ReactDOMFormActions';

import {enableTrustedTypesIntegration} from 'shared/ReactFeatureFlags';
import {getFiberCurrentPropsFromNode} from '../../client/ReactDOMComponentTree';
import {startHostTransition} from 'react-reconciler/src/ReactFiberReconciler';
import {didCurrentEventScheduleTransition} from 'react-reconciler/src/ReactFiberRootScheduler';
import sanitizeURL from 'react-dom-bindings/src/shared/sanitizeURL';
import {checkAttributeStringCoercion} from 'shared/CheckStringCoercion';

import {SyntheticEvent} from '../SyntheticEvent';

function coerceFormActionProp(
  actionProp: mixed,
): string | (FormData => void | Promise<void>) | null {
  // This should match the logic in ReactDOMComponent
  if (
    actionProp == null ||
    typeof actionProp === 'symbol' ||
    typeof actionProp === 'boolean'
  ) {
    return null;
  } else if (typeof actionProp === 'function') {
    return actionProp as any;
  } else {
    if (__DEV__) {
      checkAttributeStringCoercion(actionProp, 'action');
    }
    return sanitizeURL(
      enableTrustedTypesIntegration ? actionProp : '' + (actionProp as any),
    ) as any;
  }
}

/**
 * This plugin invokes action functions on forms, inputs and buttons if
 * the form doesn't prevent default.
 */
function extractEvents(
  dispatchQueue: DispatchQueue,
  domEventName: DOMEventName,
  maybeTargetInst: null | Fiber,
  nativeEvent: AnyNativeEvent,
  nativeEventTarget: null | EventTarget,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget,
) {
  if (domEventName !== 'submit') {
    return;
  }
  if (!maybeTargetInst || maybeTargetInst.stateNode !== nativeEventTarget) {
    // If we're inside a parent root that itself is a parent of this root, then
    // its deepest target won't be the actual form that's being submitted.
    return;
  }
  const formInst = maybeTargetInst;
  const form: HTMLFormElement = nativeEventTarget as any;
  let action = coerceFormActionProp(
    (getFiberCurrentPropsFromNode(form) as any).action,
  );
  let submitter: null | void | HTMLInputElement | HTMLButtonElement = (
    nativeEvent as any
  ).submitter;
  let submitterAction;
  if (submitter) {
    const submitterProps = getFiberCurrentPropsFromNode(submitter);
    submitterAction = submitterProps
      ? coerceFormActionProp((submitterProps as any).formAction)
      : // The built-in Flow type is ?string, wider than the spec
        (submitter.getAttribute('formAction') as any as string | null);
    if (submitterAction !== null) {
      // The submitter overrides the form action.
      action = submitterAction;
      // If the action is a function, we don't want to pass its name
      // value to the FormData since it's controlled by the server.
      submitter = null;
    }
  }

  const event = new SyntheticEvent(
    'action',
    'action',
    null,
    nativeEvent,
    nativeEventTarget,
  );

  function submitForm() {
    if (nativeEvent.defaultPrevented) {
      // An earlier event prevented form submission. If a transition update was
      // also scheduled, we should trigger a pending form status — even if
      // no action function was provided.
      if (didCurrentEventScheduleTransition()) {
        // We're going to set the pending form status, but because the submission
        // was prevented, we should not fire the action function.
        const formData = new FormData(form, submitter);
        const pendingState: FormStatus = {
          pending: true,
          data: formData,
          method: form.method,
          action: action,
        };
        if (__DEV__) {
          Object.freeze(pendingState);
        }
        startHostTransition(
          formInst,
          pendingState,
          // Pass `null` as the action
          // TODO: Consider splitting up startHostTransition into two separate
          // functions, one that sets the form status and one that invokes
          // the action.
          null,
          formData,
        );
      } else {
        // No earlier event scheduled a transition. Exit without setting a
        // pending form status.
      }
    } else if (typeof action === 'function') {
      // A form action was provided. Prevent native navigation.
      event.preventDefault();

      // Dispatch the action and set a pending form status.
      const formData = new FormData(form, submitter);
      const pendingState: FormStatus = {
        pending: true,
        data: formData,
        method: form.method,
        action: action,
      };
      if (__DEV__) {
        Object.freeze(pendingState);
      }
      startHostTransition(formInst, pendingState, action, formData);
    } else {
      // No earlier event prevented the default submission, and no action was
      // provided. Exit without setting a pending form status.
    }
  }

  dispatchQueue.push({
    event,
    listeners: [
      {
        instance: null,
        listener: submitForm,
        currentTarget: form,
      },
    ],
  });
}

export {extractEvents};

export function dispatchReplayedFormAction(
  formInst: Fiber,
  form: HTMLFormElement,
  action: FormData => void | Promise<void>,
  formData: FormData,
): void {
  const pendingState: FormStatus = {
    pending: true,
    data: formData,
    method: form.method,
    action: action,
  };
  if (__DEV__) {
    Object.freeze(pendingState);
  }
  startHostTransition(formInst, pendingState, action, formData);
}
