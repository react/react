/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {HostContext, HostContextDev} from './ReactFiberConfigDOM';

import {HostContextNamespaceNone} from './ReactFiberConfigDOM';

import {
  registrationNameDependencies,
  possibleRegistrationNames,
} from '../events/EventRegistry';

import {checkHtmlStringCoercion} from 'shared/CheckStringCoercion';
import {checkAttributeStringCoercion} from 'shared/CheckStringCoercion';
import {checkControlledValueProps} from '../shared/ReactControlledValuePropTypes';

import {
  getValueForAttribute,
  getValueForAttributeOnCustomComponent,
  setValueForPropertyOnCustomComponent,
  setValueForKnownAttribute,
  setValueForAttribute,
  setValueForNamespacedAttribute,
} from './DOMPropertyOperations';
import {
  validateInputProps,
  initInput,
  updateInput,
  restoreControlledInputState,
} from './ReactDOMInput';
import {validateOptionProps} from './ReactDOMOption';
import {
  validateSelectProps,
  initSelect,
  restoreControlledSelectState,
  updateSelect,
} from './ReactDOMSelect';
import {
  validateTextareaProps,
  initTextarea,
  updateTextarea,
  restoreControlledTextareaState,
} from './ReactDOMTextarea';
import {setSrcObject} from './ReactDOMSrcObject';
import {validateTextNesting} from './validateDOMNesting';
import setTextContent from './setTextContent';
import {
  createDangerousStringForStyles,
  setValueForStyles,
} from './CSSPropertyOperations';
import {SVG_NAMESPACE, MATH_NAMESPACE} from './DOMNamespaces';
import isCustomElement from '../shared/isCustomElement';
import getAttributeAlias from '../shared/getAttributeAlias';
import possibleStandardNames from '../shared/possibleStandardNames';
import {validateProperties as validateARIAProperties} from '../shared/ReactDOMInvalidARIAHook';
import {validateProperties as validateInputProperties} from '../shared/ReactDOMNullInputValuePropHook';
import {validateProperties as validateUnknownProperties} from '../shared/ReactDOMUnknownPropertyHook';
import sanitizeURL from '../shared/sanitizeURL';

import noop from 'shared/noop';

import {trackHostMutation} from 'react-reconciler/src/ReactFiberMutationTracking';

import {
  enableHydrationChangeEvent,
  enableScrollEndPolyfill,
  enableSrcObject,
  enableTrustedTypesIntegration,
  enableViewTransition,
  enableViewTransitionParentEnterExit,
} from 'shared/ReactFeatureFlags';
import {
  mediaEventTypes,
  listenToNonDelegatedEvent,
} from '../events/DOMPluginEventSystem';

let didWarnControlledToUncontrolled = false;
let didWarnUncontrolledToControlled = false;
let didWarnFormActionType = false;
let didWarnFormActionName = false;
let didWarnFormActionTarget = false;
let didWarnFormActionMethod = false;
let didWarnForNewBooleanPropsWithEmptyValue: {[string]: boolean};
let didWarnPopoverTargetObject = false;
let didWarnCommandForObject = false;
if (__DEV__) {
  didWarnForNewBooleanPropsWithEmptyValue = {};
}

function validatePropertiesInDevelopment(type: string, props: any) {
  if (__DEV__) {
    validateARIAProperties(type, props);
    validateInputProperties(type, props);
    validateUnknownProperties(type, props, {
      registrationNameDependencies,
      possibleRegistrationNames,
    });
    if (
      props.contentEditable &&
      !props.suppressContentEditableWarning &&
      props.children != null
    ) {
      console.error(
        'A component is `contentEditable` and contains `children` managed by ' +
          'React. It is now your responsibility to guarantee that none of ' +
          'those nodes are unexpectedly modified or duplicated. This is ' +
          'probably not intentional.',
      );
    }
  }
}

function validateFormActionInDevelopment(
  tag: string,
  key: string,
  value: mixed,
  props: any,
) {
  if (__DEV__) {
    if (value == null) {
      return;
    }
    if (tag === 'form') {
      if (key === 'formAction') {
        console.error(
          'You can only pass the formAction prop to <input> or <button>. Use the action prop on <form>.',
        );
      } else if (typeof value === 'function') {
        if (
          (props.encType != null || props.method != null) &&
          !didWarnFormActionMethod
        ) {
          didWarnFormActionMethod = true;
          console.error(
            'Cannot specify a encType or method for a form that specifies a ' +
              'function as the action. React provides those automatically. ' +
              'They will get overridden.',
          );
        }
        if (props.target != null && !didWarnFormActionTarget) {
          didWarnFormActionTarget = true;
          console.error(
            'Cannot specify a target for a form that specifies a function as the action. ' +
              'The function will always be executed in the same window.',
          );
        }
      }
    } else if (tag === 'input' || tag === 'button') {
      if (key === 'action') {
        console.error(
          'You can only pass the action prop to <form>. Use the formAction prop on <input> or <button>.',
        );
      } else if (
        tag === 'input' &&
        props.type !== 'submit' &&
        props.type !== 'image' &&
        !didWarnFormActionType
      ) {
        didWarnFormActionType = true;
        console.error(
          'An input can only specify a formAction along with type="submit" or type="image".',
        );
      } else if (
        tag === 'button' &&
        props.type != null &&
        props.type !== 'submit' &&
        !didWarnFormActionType
      ) {
        didWarnFormActionType = true;
        console.error(
          'A button can only specify a formAction along with type="submit" or no type.',
        );
      } else if (typeof value === 'function') {
        // Function form actions cannot control the form properties
        if (props.name != null && !didWarnFormActionName) {
          didWarnFormActionName = true;
          console.error(
            'Cannot specify a "name" prop for a button that specifies a function as a formAction. ' +
              'React needs it to encode which action should be invoked. It will get overridden.',
          );
        }
        if (
          (props.formEncType != null || props.formMethod != null) &&
          !didWarnFormActionMethod
        ) {
          didWarnFormActionMethod = true;
          console.error(
            'Cannot specify a formEncType or formMethod for a button that specifies a ' +
              'function as a formAction. React provides those automatically. They will get overridden.',
          );
        }
        if (props.formTarget != null && !didWarnFormActionTarget) {
          didWarnFormActionTarget = true;
          console.error(
            'Cannot specify a formTarget for a button that specifies a function as a formAction. ' +
              'The function will always be executed in the same window.',
          );
        }
      }
    } else {
      if (key === 'action') {
        console.error('You can only pass the action prop to <form>.');
      } else {
        console.error(
          'You can only pass the formAction prop to <input> or <button>.',
        );
      }
    }
  }
}

function warnForPropDifference(
  propName: string,
  serverValue: mixed,
  clientValue: mixed,
  serverDifferences: {[propName: string]: mixed},
): void {
  if (__DEV__) {
    if (serverValue === clientValue) {
      return;
    }
    const normalizedClientValue =
      normalizeMarkupForTextOrAttribute(clientValue);
    const normalizedServerValue =
      normalizeMarkupForTextOrAttribute(serverValue);
    if (normalizedServerValue === normalizedClientValue) {
      return;
    }

    serverDifferences[propName] = serverValue;
  }
}

function hasViewTransition(htmlElement: HTMLElement): boolean {
  return !!(
    htmlElement.getAttribute('vt-share') ||
    htmlElement.getAttribute('vt-exit') ||
    htmlElement.getAttribute('vt-enter') ||
    htmlElement.getAttribute('vt-update') ||
    (enableViewTransitionParentEnterExit &&
      (htmlElement.getAttribute('vt-parent-enter') ||
        htmlElement.getAttribute('vt-parent-exit')))
  );
}

function isExpectedViewTransitionName(htmlElement: HTMLElement): boolean {
  if (!hasViewTransition(htmlElement)) {
    // We didn't expect to see a view transition name applied.
    return false;
  }
  const expectedVtName = htmlElement.getAttribute('vt-name');
  const actualVtName: string = (htmlElement.style as any)[
    'view-transition-name'
  ];
  if (expectedVtName) {
    return expectedVtName === actualVtName;
  } else {
    // Auto-generated name.
    // TODO: If Fizz starts applying a prefix to this name, we need to consider that.
    return actualVtName.startsWith('_T_');
  }
}

function warnForExtraAttributes(
  domElement: Element,
  attributeNames: Set<string>,
  serverDifferences: {[propName: string]: mixed},
) {
  if (__DEV__) {
    attributeNames.forEach(function (attributeName) {
      if (attributeName === 'style') {
        if (domElement.getAttribute(attributeName) === '') {
          // Skip empty style. It's fine.
          return;
        }
        const htmlElement = domElement as any as HTMLElement;
        const style = htmlElement.style;
        const isOnlyVTStyles =
          (style.length === 1 && style[0] === 'view-transition-name') ||
          (style.length === 2 &&
            style[0] === 'view-transition-class' &&
            style[1] === 'view-transition-name');
        if (isOnlyVTStyles && isExpectedViewTransitionName(htmlElement)) {
          // If the only extra style was the view-transition-name that we applied from the Fizz
          // runtime, then we should ignore it.
        } else {
          serverDifferences.style = getStylesObjectFromElement(domElement);
        }
      } else {
        serverDifferences[getPropNameFromAttributeName(attributeName)] =
          domElement.getAttribute(attributeName);
      }
    });
  }
}

function warnForInvalidEventListener(registrationName: string, listener: any) {
  if (__DEV__) {
    if (listener === false) {
      console.error(
        'Expected `%s` listener to be a function, instead got `false`.\n\n' +
          'If you used to conditionally omit it with %s={condition && value}, ' +
          'pass %s={condition ? value : undefined} instead.',
        registrationName,
        registrationName,
        registrationName,
      );
    } else {
      console.error(
        'Expected `%s` listener to be a function, instead got a value of `%s` type.',
        registrationName,
        typeof listener,
      );
    }
  }
}

// Parse the HTML and read it back to normalize the HTML string so that it
// can be used for comparison.
function normalizeHTML(parent: Element, html: string) {
  if (__DEV__) {
    // We could have created a separate document here to avoid
    // re-initializing custom elements if they exist. But this breaks
    // how <noscript> is being handled. So we use the same document.
    // See the discussion in https://github.com/facebook/react/pull/11157.
    const testElement =
      parent.namespaceURI === MATH_NAMESPACE ||
      parent.namespaceURI === SVG_NAMESPACE
        ? parent.ownerDocument.createElementNS(
            parent.namespaceURI as any,
            parent.tagName,
          )
        : parent.ownerDocument.createElement(parent.tagName);
    testElement.innerHTML = html;
    return testElement.innerHTML;
  }
}

// HTML parsing normalizes CR and CRLF to LF.
// It also can turn \u0000 into \uFFFD inside attributes.
// https://www.w3.org/TR/html5/single-page.html#preprocessing-the-input-stream
// If we have a mismatch, it might be caused by that.
// We will still patch up in this case but not fire the warning.
const NORMALIZE_NEWLINES_REGEX = /\r\n?/g;
const NORMALIZE_NULL_AND_REPLACEMENT_REGEX = /\u0000|\uFFFD/g;

function normalizeMarkupForTextOrAttribute(markup: mixed): string {
  if (__DEV__) {
    checkHtmlStringCoercion(markup);
  }
  const markupString =
    typeof markup === 'string' ? markup : '' + (markup as any);
  return markupString
    .replace(NORMALIZE_NEWLINES_REGEX, '\n')
    .replace(NORMALIZE_NULL_AND_REPLACEMENT_REGEX, '');
}

function checkForUnmatchedText(
  serverText: string,
  clientText: string | number | bigint,
) {
  const normalizedClientText = normalizeMarkupForTextOrAttribute(clientText);
  const normalizedServerText = normalizeMarkupForTextOrAttribute(serverText);
  if (normalizedServerText === normalizedClientText) {
    return true;
  }
  return false;
}

export function trapClickOnNonInteractiveElement(node: HTMLElement) {
  // Mobile Safari does not fire properly bubble click events on
  // non-interactive elements, which means delegated click listeners do not
  // fire. The workaround for this bug involves attaching an empty click
  // listener on the target node.
  // https://www.quirksmode.org/blog/archives/2010/09/click_event_del.html
  // Just set it using the onclick property so that we don't have to manage any
  // bookkeeping for it. Not sure if we need to clear it when the listener is
  // removed.
  // TODO: Only do this for the relevant Safaris maybe?
  node.onclick = noop;
}

const xlinkNamespace = 'http://www.w3.org/1999/xlink';
const xmlNamespace = 'http://www.w3.org/XML/1998/namespace';

function setProp(
  domElement: Element,
  tag: string,
  key: string,
  value: mixed,
  props: any,
  prevValue: mixed,
): void {
  switch (key) {
    case 'children': {
      if (typeof value === 'string') {
        if (__DEV__) {
          validateTextNesting(value, tag, false);
        }
        // Avoid setting initial textContent when the text is empty. In IE11 setting
        // textContent on a <textarea> will cause the placeholder to not
        // show within the <textarea> until it has been focused and blurred again.
        // https://github.com/facebook/react/issues/6731#issuecomment-254874553
        const canSetTextContent =
          tag !== 'body' && (tag !== 'textarea' || value !== '');
        if (canSetTextContent) {
          setTextContent(domElement, value);
        }
      } else if (typeof value === 'number' || typeof value === 'bigint') {
        if (__DEV__) {
          // $FlowFixMe[unsafe-addition] Flow doesn't want us to use `+` operator with string and bigint
          validateTextNesting('' + value, tag, false);
        }
        const canSetTextContent = tag !== 'body';
        if (canSetTextContent) {
          // $FlowFixMe[unsafe-addition] Flow doesn't want us to use `+` operator with string and bigint
          setTextContent(domElement, '' + value);
        }
      } else {
        return;
      }
      break;
    }
    // These are very common props and therefore are in the beginning of the switch.
    // TODO: aria-label is a very common prop but allows booleans so is not like the others
    // but should ideally go in this list too.
    case 'className':
      setValueForKnownAttribute(domElement, 'class', value);
      break;
    case 'tabIndex':
      // This has to be case sensitive in SVG.
      setValueForKnownAttribute(domElement, 'tabindex', value);
      break;
    case 'dir':
    case 'role':
    case 'viewBox':
    case 'width':
    case 'height': {
      setValueForKnownAttribute(domElement, key, value);
      break;
    }
    case 'style': {
      setValueForStyles(domElement, value, prevValue);
      return;
    }
    // These attributes accept URLs. These must not allow javascript: URLS.
    case 'data':
      if (tag !== 'object') {
        setValueForKnownAttribute(domElement, 'data', value);
        break;
      }
    // fallthrough
    case 'src': {
      if (enableSrcObject && typeof value === 'object' && value !== null) {
        // Some tags support object sources like Blob, File, MediaSource and MediaStream.
        if (tag === 'img' || tag === 'video' || tag === 'audio') {
          try {
            setSrcObject(domElement, tag, value);
            break;
          } catch (x) {
            // If URL.createObjectURL() errors, it was probably some other object type
            // that should be toString:ed instead, so we just fall-through to the normal
            // path.
          }
        } else {
          if (__DEV__) {
            try {
              // This should always error.
              URL.revokeObjectURL(URL.createObjectURL(value as any));
              if (tag === 'source') {
                console.error(
                  'Passing Blob, MediaSource or MediaStream to <source src> is not supported. ' +
                    'Pass it directly to <img src>, <video src> or <audio src> instead.',
                );
              } else {
                console.error(
                  'Passing Blob, MediaSource or MediaStream to <%s src> is not supported.',
                  tag,
                );
              }
            } catch (x) {}
          }
        }
      }
      // Fallthrough
    }
    case 'href': {
      if (
        value === '' &&
        // <a href=""> is fine for "reload" links.
        !(tag === 'a' && key === 'href')
      ) {
        if (__DEV__) {
          if (key === 'src') {
            console.error(
              'An empty string ("") was passed to the %s attribute. ' +
                'This may cause the browser to download the whole page again over the network. ' +
                'To fix this, either do not render the element at all ' +
                'or pass null to %s instead of an empty string.',
              key,
              key,
            );
          } else {
            console.error(
              'An empty string ("") was passed to the %s attribute. ' +
                'To fix this, either do not render the element at all ' +
                'or pass null to %s instead of an empty string.',
              key,
              key,
            );
          }
        }
        domElement.removeAttribute(key);
        break;
      }
      if (
        value == null ||
        typeof value === 'function' ||
        typeof value === 'symbol' ||
        typeof value === 'boolean'
      ) {
        domElement.removeAttribute(key);
        break;
      }
      // `setAttribute` with objects becomes only `[object]` in IE8/9,
      // ('' + value) makes it output the correct toString()-value.
      if (__DEV__) {
        checkAttributeStringCoercion(value, key);
      }
      const sanitizedValue = sanitizeURL(
        enableTrustedTypesIntegration ? value : '' + (value as any),
      ) as any;
      domElement.setAttribute(key, sanitizedValue);
      break;
    }
    case 'action':
    case 'formAction': {
      // TODO: Consider moving these special cases to the form, input and button tags.
      if (__DEV__) {
        validateFormActionInDevelopment(tag, key, value, props);
      }
      if (typeof value === 'function') {
        // Set a javascript URL that doesn't do anything. We don't expect this to be invoked
        // because we'll preventDefault, but it can happen if a form is manually submitted or
        // if someone calls stopPropagation before React gets the event.
        // If CSP is used to block javascript: URLs that's fine too. It just won't show this
        // error message but the URL will be logged.
        domElement.setAttribute(
          key,
          // eslint-disable-next-line no-script-url
          "javascript:throw new Error('" +
            'A React form was unexpectedly submitted. If you called form.submit() manually, ' +
            "consider using form.requestSubmit() instead. If you\\'re trying to use " +
            'event.stopPropagation() in a submit event handler, consider also calling ' +
            'event.preventDefault().' +
            "')",
        );
        break;
      } else if (typeof prevValue === 'function') {
        // When we're switching off a Server Action that was originally hydrated.
        // The server control these fields during SSR that are now trailing.
        // The regular diffing doesn't apply since we compare against the previous props.
        // Instead, we need to force them to be set to whatever they should be now.
        // This would be a lot cleaner if we did this whole fork in the per-tag approach.
        if (key === 'formAction') {
          if (tag !== 'input') {
            // Setting the name here isn't completely safe for inputs if this is switching
            // to become a radio button. In that case we let the tag based override take
            // control.
            setProp(domElement, tag, 'name', props.name, props, null);
          }
          setProp(
            domElement,
            tag,
            'formEncType',
            props.formEncType,
            props,
            null,
          );
          setProp(domElement, tag, 'formMethod', props.formMethod, props, null);
          setProp(domElement, tag, 'formTarget', props.formTarget, props, null);
        } else {
          setProp(domElement, tag, 'encType', props.encType, props, null);
          setProp(domElement, tag, 'method', props.method, props, null);
          setProp(domElement, tag, 'target', props.target, props, null);
        }
      }
      if (
        value == null ||
        typeof value === 'symbol' ||
        typeof value === 'boolean'
      ) {
        domElement.removeAttribute(key);
        break;
      }
      // `setAttribute` with objects becomes only `[object]` in IE8/9,
      // ('' + value) makes it output the correct toString()-value.
      if (__DEV__) {
        checkAttributeStringCoercion(value, key);
      }
      const sanitizedValue = sanitizeURL(
        enableTrustedTypesIntegration ? value : '' + (value as any),
      ) as any;
      domElement.setAttribute(key, sanitizedValue);
      break;
    }
    case 'onClick': {
      // TODO: This cast may not be sound for SVG, MathML or custom elements.
      if (value != null) {
        if (__DEV__ && typeof value !== 'function') {
          warnForInvalidEventListener(key, value);
        }
        trapClickOnNonInteractiveElement(domElement as any as HTMLElement);
      }
      return;
    }
    case 'onScroll': {
      if (value != null) {
        if (__DEV__ && typeof value !== 'function') {
          warnForInvalidEventListener(key, value);
        }
        listenToNonDelegatedEvent('scroll', domElement);
      }
      return;
    }
    case 'onScrollEnd': {
      if (value != null) {
        if (__DEV__ && typeof value !== 'function') {
          warnForInvalidEventListener(key, value);
        }
        listenToNonDelegatedEvent('scrollend', domElement);
        if (enableScrollEndPolyfill) {
          // For use by the polyfill.
          listenToNonDelegatedEvent('scroll', domElement);
        }
      }
      return;
    }
    case 'onCommand': {
      if (value != null) {
        if (__DEV__ && typeof value !== 'function') {
          warnForInvalidEventListener(key, value);
        }
        listenToNonDelegatedEvent('command', domElement);
      }
      return;
    }
    case 'dangerouslySetInnerHTML': {
      if (value != null) {
        if (typeof value !== 'object' || !('__html' in value)) {
          throw new Error(
            '`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. ' +
              'Please visit https://react.dev/link/dangerously-set-inner-html ' +
              'for more information.',
          );
        }
        const nextHtml: any = value.__html;
        if (nextHtml != null) {
          if (props.children != null) {
            throw new Error(
              'Can only set one of `children` or `props.dangerouslySetInnerHTML`.',
            );
          }
          const lastHtml: any =
            prevValue != null ? (prevValue as any).__html : undefined;
          if (lastHtml !== nextHtml) {
            domElement.innerHTML = nextHtml;
          }
        }
      }
      break;
    }
    // Note: `option.selected` is not updated if `select.multiple` is
    // disabled with `removeAttribute`. We have special logic for handling this.
    case 'multiple': {
      (domElement as any).multiple =
        value && typeof value !== 'function' && typeof value !== 'symbol';
      break;
    }
    case 'muted': {
      (domElement as any).muted =
        value && typeof value !== 'function' && typeof value !== 'symbol';
      break;
    }
    case 'suppressContentEditableWarning':
    case 'suppressHydrationWarning':
    case 'defaultValue': // Reserved
    case 'defaultChecked':
    case 'innerHTML':
    case 'ref': {
      // TODO: `ref` is pretty common, should we move it up?
      // Noop
      break;
    }
    case 'autoFocus': {
      // We polyfill it separately on the client during commit.
      // We could have excluded it in the property list instead of
      // adding a special case here, but then it wouldn't be emitted
      // on server rendering (but we *do* want to emit it in SSR).
      break;
    }
    case 'xlinkHref': {
      if (
        value == null ||
        typeof value === 'function' ||
        typeof value === 'boolean' ||
        typeof value === 'symbol'
      ) {
        domElement.removeAttribute('xlink:href');
        break;
      }
      // `setAttribute` with objects becomes only `[object]` in IE8/9,
      // ('' + value) makes it output the correct toString()-value.
      if (__DEV__) {
        checkAttributeStringCoercion(value, key);
      }
      const sanitizedValue = sanitizeURL(
        enableTrustedTypesIntegration ? value : '' + (value as any),
      ) as any;
      domElement.setAttributeNS(xlinkNamespace, 'xlink:href', sanitizedValue);
      break;
    }
    case 'contentEditable':
    case 'spellCheck':
    case 'draggable':
    case 'value':
    case 'autoReverse':
    case 'externalResourcesRequired':
    case 'focusable':
    case 'preserveAlpha': {
      // Booleanish String
      // These are "enumerated" attributes that accept "true" and "false".
      // In React, we let users pass `true` and `false` even though technically
      // these aren't boolean attributes (they are coerced to strings).
      // The SVG attributes are case-sensitive. Since the HTML attributes are
      // insensitive they also work even though we canonically use lower case.
      if (
        value != null &&
        typeof value !== 'function' &&
        typeof value !== 'symbol'
      ) {
        if (__DEV__) {
          checkAttributeStringCoercion(value, key);
        }
        domElement.setAttribute(
          key,
          enableTrustedTypesIntegration ? (value as any) : '' + (value as any),
        );
      } else {
        domElement.removeAttribute(key);
      }
      break;
    }
    // Boolean
    case 'inert': {
      if (__DEV__) {
        if (value === '' && !didWarnForNewBooleanPropsWithEmptyValue[key]) {
          didWarnForNewBooleanPropsWithEmptyValue[key] = true;
          console.error(
            'Received an empty string for a boolean attribute `%s`. ' +
              'This will treat the attribute as if it were false. ' +
              'Either pass `false` to silence this warning, or ' +
              'pass `true` if you used an empty string in earlier versions of React to indicate this attribute is true.',
            key,
          );
        }
      }
    }
    // Fallthrough for boolean props that don't have a warning for empty strings.
    case 'allowFullScreen':
    case 'async':
    case 'autoPlay':
    case 'controls':
    case 'credentialless':
    case 'default':
    case 'defer':
    case 'disabled':
    case 'disablePictureInPicture':
    case 'disableRemotePlayback':
    case 'formNoValidate':
    case 'hidden':
    case 'loop':
    case 'noModule':
    case 'noValidate':
    case 'open':
    case 'playsInline':
    case 'readOnly':
    case 'required':
    case 'reversed':
    case 'scoped':
    case 'seamless':
    case 'itemScope': {
      if (value && typeof value !== 'function' && typeof value !== 'symbol') {
        domElement.setAttribute(key, '');
      } else {
        domElement.removeAttribute(key);
      }
      break;
    }
    // Overloaded Boolean
    case 'capture':
    case 'download': {
      // An attribute that can be used as a flag as well as with a value.
      // When true, it should be present (set either to an empty string or its name).
      // When false, it should be omitted.
      // For any other value, should be present with that value.
      if (value === true) {
        domElement.setAttribute(key, '');
      } else if (
        value !== false &&
        value != null &&
        typeof value !== 'function' &&
        typeof value !== 'symbol'
      ) {
        if (__DEV__) {
          checkAttributeStringCoercion(value, key);
        }
        domElement.setAttribute(key, value as any);
      } else {
        domElement.removeAttribute(key);
      }
      break;
    }
    case 'cols':
    case 'rows':
    case 'size':
    case 'span': {
      // These are HTML attributes that must be positive numbers.
      if (
        value != null &&
        typeof value !== 'function' &&
        typeof value !== 'symbol' &&
        !isNaN(value) &&
        (value as any) >= 1
      ) {
        if (__DEV__) {
          checkAttributeStringCoercion(value, key);
        }
        domElement.setAttribute(key, value as any);
      } else {
        domElement.removeAttribute(key);
      }
      break;
    }
    case 'rowSpan':
    case 'start': {
      // These are HTML attributes that must be numbers.
      if (
        value != null &&
        typeof value !== 'function' &&
        typeof value !== 'symbol' &&
        !isNaN(value)
      ) {
        if (__DEV__) {
          checkAttributeStringCoercion(value, key);
        }
        domElement.setAttribute(key, value as any);
      } else {
        domElement.removeAttribute(key);
      }
      break;
    }
    case 'popover':
      listenToNonDelegatedEvent('beforetoggle', domElement);
      listenToNonDelegatedEvent('toggle', domElement);
      setValueForAttribute(domElement, 'popover', value);
      break;
    case 'xlinkActuate':
      setValueForNamespacedAttribute(
        domElement,
        xlinkNamespace,
        'xlink:actuate',
        value,
      );
      break;
    case 'xlinkArcrole':
      setValueForNamespacedAttribute(
        domElement,
        xlinkNamespace,
        'xlink:arcrole',
        value,
      );
      break;
    case 'xlinkRole':
      setValueForNamespacedAttribute(
        domElement,
        xlinkNamespace,
        'xlink:role',
        value,
      );
      break;
    case 'xlinkShow':
      setValueForNamespacedAttribute(
        domElement,
        xlinkNamespace,
        'xlink:show',
        value,
      );
      break;
    case 'xlinkTitle':
      setValueForNamespacedAttribute(
        domElement,
        xlinkNamespace,
        'xlink:title',
        value,
      );
      break;
    case 'xlinkType':
      setValueForNamespacedAttribute(
        domElement,
        xlinkNamespace,
        'xlink:type',
        value,
      );
      break;
    case 'xmlBase':
      setValueForNamespacedAttribute(
        domElement,
        xmlNamespace,
        'xml:base',
        value,
      );
      break;
    case 'xmlLang':
      setValueForNamespacedAttribute(
        domElement,
        xmlNamespace,
        'xml:lang',
        value,
      );
      break;
    case 'xmlSpace':
      setValueForNamespacedAttribute(
        domElement,
        xmlNamespace,
        'xml:space',
        value,
      );
      break;
    // Properties that should not be allowed on custom elements.
    case 'is': {
      if (__DEV__) {
        if (prevValue != null) {
          console.error(
            'Cannot update the "is" prop after it has been initialized.',
          );
        }
      }
      // TODO: We shouldn't actually set this attribute, because we've already
      // passed it to createElement. We don't also need the attribute.
      // However, our tests currently query for it so it's plausible someone
      // else does too so it's break.
      setValueForAttribute(domElement, 'is', value);
      break;
    }
    case 'innerText':
    case 'textContent':
      return;
    case 'popoverTarget':
      if (__DEV__) {
        if (
          !didWarnPopoverTargetObject &&
          value != null &&
          typeof value === 'object'
        ) {
          didWarnPopoverTargetObject = true;
          console.error(
            'The `popoverTarget` prop expects the ID of an Element as a string. Received %s instead.',
            value,
          );
        }
      }
    // Fall through
    case 'commandFor':
      if (__DEV__) {
        if (
          key === 'commandFor' &&
          !didWarnCommandForObject &&
          value != null &&
          typeof value === 'object'
        ) {
          didWarnCommandForObject = true;
          console.error(
            'The `commandFor` prop expects the ID of an Element as a string. Received %s instead.',
            value,
          );
        }
      }
    // Fall through
    default: {
      if (
        key.length > 2 &&
        (key[0] === 'o' || key[0] === 'O') &&
        (key[1] === 'n' || key[1] === 'N')
      ) {
        if (
          __DEV__ &&
          registrationNameDependencies.hasOwnProperty(key) &&
          value != null &&
          typeof value !== 'function'
        ) {
          warnForInvalidEventListener(key, value);
        }
        // Updating events doesn't affect the visuals.
        return;
      } else {
        const attributeName = getAttributeAlias(key);
        setValueForAttribute(domElement, attributeName, value);
      }
    }
  }
  // To avoid marking things as host mutations we do early returns above.
  trackHostMutation();
}

function setPropOnCustomElement(
  domElement: Element,
  tag: string,
  key: string,
  value: mixed,
  props: any,
  prevValue: mixed,
): void {
  switch (key) {
    case 'style': {
      setValueForStyles(domElement, value, prevValue);
      return;
    }
    case 'dangerouslySetInnerHTML': {
      if (value != null) {
        if (typeof value !== 'object' || !('__html' in value)) {
          throw new Error(
            '`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. ' +
              'Please visit https://react.dev/link/dangerously-set-inner-html ' +
              'for more information.',
          );
        }
        const nextHtml: any = value.__html;
        if (nextHtml != null) {
          if (props.children != null) {
            throw new Error(
              'Can only set one of `children` or `props.dangerouslySetInnerHTML`.',
            );
          }
          const lastHtml: any =
            prevValue != null ? (prevValue as any).__html : undefined;
          if (lastHtml !== nextHtml) {
            domElement.innerHTML = nextHtml;
          }
        }
      }
      break;
    }
    case 'children': {
      if (typeof value === 'string') {
        setTextContent(domElement, value);
      } else if (typeof value === 'number' || typeof value === 'bigint') {
        // $FlowFixMe[unsafe-addition] Flow doesn't want us to use `+` operator with string and bigint
        setTextContent(domElement, '' + value);
      } else {
        return;
      }
      break;
    }
    case 'onScroll': {
      if (value != null) {
        if (__DEV__ && typeof value !== 'function') {
          warnForInvalidEventListener(key, value);
        }
        listenToNonDelegatedEvent('scroll', domElement);
      }
      return;
    }
    case 'onScrollEnd': {
      if (value != null) {
        if (__DEV__ && typeof value !== 'function') {
          warnForInvalidEventListener(key, value);
        }
        listenToNonDelegatedEvent('scrollend', domElement);
        if (enableScrollEndPolyfill) {
          // For use by the polyfill.
          listenToNonDelegatedEvent('scroll', domElement);
        }
      }
      return;
    }
    case 'onCommand': {
      if (value != null) {
        if (__DEV__ && typeof value !== 'function') {
          warnForInvalidEventListener(key, value);
        }
        listenToNonDelegatedEvent('command', domElement);
      }
      return;
    }
    case 'onClick': {
      // TODO: This cast may not be sound for SVG, MathML or custom elements.
      if (value != null) {
        if (__DEV__ && typeof value !== 'function') {
          warnForInvalidEventListener(key, value);
        }
        trapClickOnNonInteractiveElement(domElement as any as HTMLElement);
      }
      return;
    }
    case 'suppressContentEditableWarning':
    case 'suppressHydrationWarning':
    case 'innerHTML':
    case 'ref': {
      // Noop
      return;
    }
    case 'innerText': // Properties
    case 'textContent':
      return;
    // Fall through
    default: {
      if (registrationNameDependencies.hasOwnProperty(key)) {
        if (__DEV__ && value != null && typeof value !== 'function') {
          warnForInvalidEventListener(key, value);
        }
        return;
      } else {
        setValueForPropertyOnCustomComponent(domElement, key, value);
        // We track mutations inside this call.
        return;
      }
    }
  }
  // To avoid marking things as host mutations we do early returns above.
  trackHostMutation();
}

export function setInitialProperties(
  domElement: Element,
  tag: string,
  props: Object,
): void {
  if (__DEV__) {
    validatePropertiesInDevelopment(tag, props);
  }

  // TODO: Make sure that we check isMounted before firing any of these events.

  switch (tag) {
    case 'div':
    case 'span':
    case 'svg':
    case 'path':
    case 'a':
    case 'g':
    case 'p':
    case 'li': {
      // Fast track the most common tag types
      break;
    }
    // img tags previously were implemented as void elements with non delegated events however Safari (and possibly Firefox)
    // begin fetching the image as soon as the `src` or `srcSet` property is set and if we set these before other properties
    // that can modify the request (such as crossorigin) or the resource fetch (such as sizes) then the browser will load
    // the wrong thing or load more than one thing. This implementation ensures src and srcSet are set on the instance last
    case 'img': {
      listenToNonDelegatedEvent('error', domElement);
      listenToNonDelegatedEvent('load', domElement);
      // Mostly a port of Void Element logic with special casing to ensure srcset and src are set last
      let hasSrc = false;
      let hasSrcSet = false;
      for (const propKey in props) {
        if (!props.hasOwnProperty(propKey)) {
          continue;
        }
        const propValue = props[propKey];
        if (propValue == null) {
          continue;
        }
        switch (propKey) {
          case 'src':
            hasSrc = true;
            break;
          case 'srcSet':
            hasSrcSet = true;
            break;
          case 'children':
          case 'dangerouslySetInnerHTML': {
            // TODO: Can we make this a DEV warning to avoid this deny list?
            throw new Error(
              `${tag} is a void element tag and must neither have \`children\` nor ` +
                'use `dangerouslySetInnerHTML`.',
            );
          }
          // defaultChecked and defaultValue are ignored by setProp
          default: {
            setProp(domElement, tag, propKey, propValue, props, null);
          }
        }
      }
      if (hasSrcSet) {
        setProp(domElement, tag, 'srcSet', props.srcSet, props, null);
      }
      if (hasSrc) {
        setProp(domElement, tag, 'src', props.src, props, null);
      }
      return;
    }
    case 'input': {
      if (__DEV__) {
        checkControlledValueProps('input', props);
      }
      // We listen to this event in case to ensure emulated bubble
      // listeners still fire for the invalid event.
      listenToNonDelegatedEvent('invalid', domElement);

      let name = null;
      let type = null;
      let value = null;
      let defaultValue = null;
      let checked = null;
      let defaultChecked = null;
      for (const propKey in props) {
        if (!props.hasOwnProperty(propKey)) {
          continue;
        }
        const propValue = props[propKey];
        if (propValue == null) {
          continue;
        }
        switch (propKey) {
          case 'name': {
            name = propValue;
            break;
          }
          case 'type': {
            type = propValue;
            break;
          }
          case 'checked': {
            checked = propValue;
            break;
          }
          case 'defaultChecked': {
            defaultChecked = propValue;
            break;
          }
          case 'value': {
            value = propValue;
            break;
          }
          case 'defaultValue': {
            defaultValue = propValue;
            break;
          }
          case 'children':
          case 'dangerouslySetInnerHTML': {
            if (propValue != null) {
              throw new Error(
                `${tag} is a void element tag and must neither have \`children\` nor ` +
                  'use `dangerouslySetInnerHTML`.',
              );
            }
            break;
          }
          default: {
            setProp(domElement, tag, propKey, propValue, props, null);
          }
        }
      }
      // TODO: Make sure we check if this is still unmounted or do any clean
      // up necessary since we never stop tracking anymore.
      validateInputProps(domElement, props);
      initInput(
        domElement,
        value,
        defaultValue,
        checked,
        defaultChecked,
        type,
        name,
        false,
      );
      return;
    }
    case 'select': {
      if (__DEV__) {
        checkControlledValueProps('select', props);
      }
      // We listen to this event in case to ensure emulated bubble
      // listeners still fire for the invalid event.
      listenToNonDelegatedEvent('invalid', domElement);
      let value = null;
      let defaultValue = null;
      let multiple = null;
      for (const propKey in props) {
        if (!props.hasOwnProperty(propKey)) {
          continue;
        }
        const propValue = props[propKey];
        if (propValue == null) {
          continue;
        }
        switch (propKey) {
          case 'value': {
            value = propValue;
            // This is handled by initSelect below.
            break;
          }
          case 'defaultValue': {
            defaultValue = propValue;
            // This is handled by initSelect below.
            break;
          }
          case 'multiple': {
            multiple = propValue;
            // TODO: We don't actually have to fall through here because we set it
            // in initSelect anyway. We can remove the special case in setProp.
          }
          // Fallthrough
          default: {
            setProp(domElement, tag, propKey, propValue, props, null);
          }
        }
      }
      validateSelectProps(domElement, props);
      initSelect(domElement, value, defaultValue, multiple);
      return;
    }
    case 'textarea': {
      if (__DEV__) {
        checkControlledValueProps('textarea', props);
      }
      // We listen to this event in case to ensure emulated bubble
      // listeners still fire for the invalid event.
      listenToNonDelegatedEvent('invalid', domElement);
      let value = null;
      let defaultValue = null;
      let children = null;
      for (const propKey in props) {
        if (!props.hasOwnProperty(propKey)) {
          continue;
        }
        const propValue = props[propKey];
        if (propValue == null) {
          continue;
        }
        switch (propKey) {
          case 'value': {
            value = propValue;
            // This is handled by initTextarea below.
            break;
          }
          case 'defaultValue': {
            defaultValue = propValue;
            break;
          }
          case 'children': {
            children = propValue;
            // Handled by initTextarea above.
            break;
          }
          case 'dangerouslySetInnerHTML': {
            if (propValue != null) {
              // TODO: Do we really need a special error message for this. It's also pretty blunt.
              throw new Error(
                '`dangerouslySetInnerHTML` does not make sense on <textarea>.',
              );
            }
            break;
          }
          default: {
            setProp(domElement, tag, propKey, propValue, props, null);
          }
        }
      }
      // TODO: Make sure we check if this is still unmounted or do any clean
      // up necessary since we never stop tracking anymore.
      validateTextareaProps(domElement, props);
      initTextarea(domElement, value, defaultValue, children);
      return;
    }
    case 'option': {
      validateOptionProps(domElement, props);
      for (const propKey in props) {
        if (!props.hasOwnProperty(propKey)) {
          continue;
        }
        const propValue = props[propKey];
        if (propValue == null) {
          continue;
        }
        switch (propKey) {
          case 'selected': {
            // TODO: Remove support for selected on option.
            (domElement as any).selected =
              propValue &&
              typeof propValue !== 'function' &&
              typeof propValue !== 'symbol';
            break;
          }
          default: {
            setProp(domElement, tag, propKey, propValue, props, null);
          }
        }
      }
      return;
    }
    case 'dialog': {
      listenToNonDelegatedEvent('beforetoggle', domElement);
      listenToNonDelegatedEvent('toggle', domElement);
      listenToNonDelegatedEvent('cancel', domElement);
      listenToNonDelegatedEvent('close', domElement);
      break;
    }
    case 'iframe':
    case 'object': {
      // We listen to this event in case to ensure emulated bubble
      // listeners still fire for the load event.
      listenToNonDelegatedEvent('load', domElement);
      break;
    }
    case 'video':
    case 'audio': {
      // We listen to these events in case to ensure emulated bubble
      // listeners still fire for all the media events.
      for (let i = 0; i < mediaEventTypes.length; i++) {
        listenToNonDelegatedEvent(mediaEventTypes[i], domElement);
      }
      break;
    }
    case 'image': {
      // We listen to these events in case to ensure emulated bubble
      // listeners still fire for error and load events.
      listenToNonDelegatedEvent('error', domElement);
      listenToNonDelegatedEvent('load', domElement);
      break;
    }
    case 'details': {
      // We listen to this event in case to ensure emulated bubble
      // listeners still fire for the toggle event.
      listenToNonDelegatedEvent('toggle', domElement);
      break;
    }
    case 'embed':
    case 'source':
    case 'link': {
      // These are void elements that also need delegated events.
      listenToNonDelegatedEvent('error', domElement);
      listenToNonDelegatedEvent('load', domElement);
      // We fallthrough to the return of the void elements
    }
    case 'area':
    case 'base':
    case 'br':
    case 'col':
    case 'hr':
    case 'keygen':
    case 'meta':
    case 'param':
    case 'track':
    case 'wbr':
    case 'menuitem': {
      // Void elements
      for (const propKey in props) {
        if (!props.hasOwnProperty(propKey)) {
          continue;
        }
        const propValue = props[propKey];
        if (propValue == null) {
          continue;
        }
        switch (propKey) {
          case 'children':
          case 'dangerouslySetInnerHTML': {
            // TODO: Can we make this a DEV warning to avoid this deny list?
            throw new Error(
              `${tag} is a void element tag and must neither have \`children\` nor ` +
                'use `dangerouslySetInnerHTML`.',
            );
          }
          // defaultChecked and defaultValue are ignored by setProp
          default: {
            setProp(domElement, tag, propKey, propValue, props, null);
          }
        }
      }
      return;
    }
    default: {
      if (isCustomElement(tag, props)) {
        for (const propKey in props) {
          if (!props.hasOwnProperty(propKey)) {
            continue;
          }
          const propValue = props[propKey];
          if (propValue === undefined) {
            continue;
          }
          setPropOnCustomElement(
            domElement,
            tag,
            propKey,
            propValue,
            props,
            undefined,
          );
        }
        return;
      }
    }
  }

  for (const propKey in props) {
    if (!props.hasOwnProperty(propKey)) {
      continue;
    }
    const propValue = props[propKey];
    if (propValue == null) {
      continue;
    }
    setProp(domElement, tag, propKey, propValue, props, null);
  }
}

export function updateProperties(
  domElement: Element,
  tag: string,
  lastProps: Object,
  nextProps: Object,
): void {
  if (__DEV__) {
    validatePropertiesInDevelopment(tag, nextProps);
  }

  switch (tag) {
    case 'div':
    case 'span':
    case 'svg':
    case 'path':
    case 'a':
    case 'g':
    case 'p':
    case 'li': {
      // Fast track the most common tag types
      break;
    }
    case 'input': {
      let name = null;
      let type = null;
      let value = null;
      let defaultValue = null;
      let lastDefaultValue = null;
      let checked = null;
      let defaultChecked = null;
      for (const propKey in lastProps) {
        const lastProp = lastProps[propKey];
        if (lastProps.hasOwnProperty(propKey) && lastProp != null) {
          switch (propKey) {
            case 'checked': {
              break;
            }
            case 'value': {
              // This is handled by updateWrapper below.
              break;
            }
            case 'defaultValue': {
              lastDefaultValue = lastProp;
            }
            // defaultChecked and defaultValue are ignored by setProp
            // Fallthrough
            default: {
              if (!nextProps.hasOwnProperty(propKey))
                setProp(domElement, tag, propKey, null, nextProps, lastProp);
            }
          }
        }
      }
      for (const propKey in nextProps) {
        const nextProp = nextProps[propKey];
        const lastProp = lastProps[propKey];
        if (
          nextProps.hasOwnProperty(propKey) &&
          (nextProp != null || lastProp != null)
        ) {
          switch (propKey) {
            case 'type': {
              if (nextProp !== lastProp) {
                trackHostMutation();
              }
              type = nextProp;
              break;
            }
            case 'name': {
              if (nextProp !== lastProp) {
                trackHostMutation();
              }
              name = nextProp;
              break;
            }
            case 'checked': {
              if (nextProp !== lastProp) {
                trackHostMutation();
              }
              checked = nextProp;
              break;
            }
            case 'defaultChecked': {
              if (nextProp !== lastProp) {
                trackHostMutation();
              }
              defaultChecked = nextProp;
              break;
            }
            case 'value': {
              if (nextProp !== lastProp) {
                trackHostMutation();
              }
              value = nextProp;
              break;
            }
            case 'defaultValue': {
              if (nextProp !== lastProp) {
                trackHostMutation();
              }
              defaultValue = nextProp;
              break;
            }
            case 'children':
            case 'dangerouslySetInnerHTML': {
              if (nextProp != null) {
                throw new Error(
                  `${tag} is a void element tag and must neither have \`children\` nor ` +
                    'use `dangerouslySetInnerHTML`.',
                );
              }
              break;
            }
            default: {
              if (nextProp !== lastProp)
                setProp(
                  domElement,
                  tag,
                  propKey,
                  nextProp,
                  nextProps,
                  lastProp,
                );
            }
          }
        }
      }

      if (__DEV__) {
        const wasControlled =
          lastProps.type === 'checkbox' || lastProps.type === 'radio'
            ? lastProps.checked != null
            : lastProps.value != null;
        const isControlled =
          nextProps.type === 'checkbox' || nextProps.type === 'radio'
            ? nextProps.checked != null
            : nextProps.value != null;

        if (
          !wasControlled &&
          isControlled &&
          !didWarnUncontrolledToControlled
        ) {
          console.error(
            'A component is changing an uncontrolled input to be controlled. ' +
              'This is likely caused by the value changing from undefined to ' +
              'a defined value, which should not happen. ' +
              'Decide between using a controlled or uncontrolled input ' +
              'element for the lifetime of the component. More info: https://react.dev/link/controlled-components',
          );
          didWarnUncontrolledToControlled = true;
        }
        if (
          wasControlled &&
          !isControlled &&
          !didWarnControlledToUncontrolled
        ) {
          console.error(
            'A component is changing a controlled input to be uncontrolled. ' +
              'This is likely caused by the value changing from a defined to ' +
              'undefined, which should not happen. ' +
              'Decide between using a controlled or uncontrolled input ' +
              'element for the lifetime of the component. More info: https://react.dev/link/controlled-components',
          );
          didWarnControlledToUncontrolled = true;
        }
      }

      // Update the wrapper around inputs *after* updating props. This has to
      // happen after updating the rest of props. Otherwise HTML5 input validations
      // raise warnings and prevent the new value from being assigned.
      updateInput(
        domElement,
        value,
        defaultValue,
        lastDefaultValue,
        checked,
        defaultChecked,
        type,
        name,
      );
      return;
    }
    case 'select': {
      let value = null;
      let defaultValue = null;
      let multiple = null;
      let wasMultiple = null;
      for (const propKey in lastProps) {
        const lastProp = lastProps[propKey];
        if (lastProps.hasOwnProperty(propKey) && lastProp != null) {
          switch (propKey) {
            case 'value': {
              // This is handled by updateWrapper below.
              break;
            }
            // defaultValue are ignored by setProp
            case 'multiple': {
              wasMultiple = lastProp;
              // TODO: Move special case in here from setProp.
            }
            // Fallthrough
            default: {
              if (!nextProps.hasOwnProperty(propKey)) {
                setProp(domElement, tag, propKey, null, nextProps, lastProp);
              }
            }
          }
        }
      }
      for (const propKey in nextProps) {
        const nextProp = nextProps[propKey];
        const lastProp = lastProps[propKey];
        if (
          nextProps.hasOwnProperty(propKey) &&
          (nextProp != null || lastProp != null)
        ) {
          switch (propKey) {
            case 'value': {
              if (nextProp !== lastProp) {
                trackHostMutation();
              }
              value = nextProp;
              // This is handled by updateSelect below.
              break;
            }
            case 'defaultValue': {
              if (nextProp !== lastProp) {
                trackHostMutation();
              }
              defaultValue = nextProp;
              break;
            }
            case 'multiple': {
              if (nextProp !== lastProp) {
                trackHostMutation();
              }
              multiple = nextProp;
              // TODO: Just move the special case in here from setProp.
            }
            // Fallthrough
            default: {
              if (nextProp !== lastProp)
                setProp(
                  domElement,
                  tag,
                  propKey,
                  nextProp,
                  nextProps,
                  lastProp,
                );
            }
          }
        }
      }
      // <select> value update needs to occur after <option> children
      // reconciliation
      updateSelect(domElement, value, defaultValue, multiple, wasMultiple);
      return;
    }
    case 'textarea': {
      let value = null;
      let defaultValue = null;
      for (const propKey in lastProps) {
        const lastProp = lastProps[propKey];
        if (
          lastProps.hasOwnProperty(propKey) &&
          lastProp != null &&
          !nextProps.hasOwnProperty(propKey)
        ) {
          switch (propKey) {
            case 'value': {
              // This is handled by updateTextarea below.
              break;
            }
            case 'children': {
              // TODO: This doesn't actually do anything if it updates.
              break;
            }
            // defaultValue is ignored by setProp
            default: {
              setProp(domElement, tag, propKey, null, nextProps, lastProp);
            }
          }
        }
      }
      for (const propKey in nextProps) {
        const nextProp = nextProps[propKey];
        const lastProp = lastProps[propKey];
        if (
          nextProps.hasOwnProperty(propKey) &&
          (nextProp != null || lastProp != null)
        ) {
          switch (propKey) {
            case 'value': {
              if (nextProp !== lastProp) {
                trackHostMutation();
              }
              value = nextProp;
              // This is handled by updateTextarea below.
              break;
            }
            case 'defaultValue': {
              if (nextProp !== lastProp) {
                trackHostMutation();
              }
              defaultValue = nextProp;
              break;
            }
            case 'children': {
              // TODO: This doesn't actually do anything if it updates.
              break;
            }
            case 'dangerouslySetInnerHTML': {
              if (nextProp != null) {
                // TODO: Do we really need a special error message for this. It's also pretty blunt.
                throw new Error(
                  '`dangerouslySetInnerHTML` does not make sense on <textarea>.',
                );
              }
              break;
            }
            default: {
              if (nextProp !== lastProp)
                setProp(
                  domElement,
                  tag,
                  propKey,
                  nextProp,
                  nextProps,
                  lastProp,
                );
            }
          }
        }
      }
      updateTextarea(domElement, value, defaultValue);
      return;
    }
    case 'option': {
      for (const propKey in lastProps) {
        const lastProp = lastProps[propKey];
        if (
          lastProps.hasOwnProperty(propKey) &&
          lastProp != null &&
          !nextProps.hasOwnProperty(propKey)
        ) {
          switch (propKey) {
            case 'selected': {
              // TODO: Remove support for selected on option.
              (domElement as any).selected = false;
              break;
            }
            default: {
              setProp(domElement, tag, propKey, null, nextProps, lastProp);
            }
          }
        }
      }
      for (const propKey in nextProps) {
        const nextProp = nextProps[propKey];
        const lastProp = lastProps[propKey];
        if (
          nextProps.hasOwnProperty(propKey) &&
          nextProp !== lastProp &&
          (nextProp != null || lastProp != null)
        ) {
          switch (propKey) {
            case 'selected': {
              if (nextProp !== lastProp) {
                trackHostMutation();
              }
              // TODO: Remove support for selected on option.
              (domElement as any).selected =
                nextProp &&
                typeof nextProp !== 'function' &&
                typeof nextProp !== 'symbol';
              break;
            }
            default: {
              setProp(domElement, tag, propKey, nextProp, nextProps, lastProp);
            }
          }
        }
      }
      return;
    }
    case 'img':
    case 'link':
    case 'area':
    case 'base':
    case 'br':
    case 'col':
    case 'embed':
    case 'hr':
    case 'keygen':
    case 'meta':
    case 'param':
    case 'source':
    case 'track':
    case 'wbr':
    case 'menuitem': {
      // Void elements
      for (const propKey in lastProps) {
        const lastProp = lastProps[propKey];
        if (
          lastProps.hasOwnProperty(propKey) &&
          lastProp != null &&
          !nextProps.hasOwnProperty(propKey)
        ) {
          setProp(domElement, tag, propKey, null, nextProps, lastProp);
        }
      }
      for (const propKey in nextProps) {
        const nextProp = nextProps[propKey];
        const lastProp = lastProps[propKey];
        if (
          nextProps.hasOwnProperty(propKey) &&
          nextProp !== lastProp &&
          (nextProp != null || lastProp != null)
        ) {
          switch (propKey) {
            case 'children':
            case 'dangerouslySetInnerHTML': {
              if (nextProp != null) {
                // TODO: Can we make this a DEV warning to avoid this deny list?
                throw new Error(
                  `${tag} is a void element tag and must neither have \`children\` nor ` +
                    'use `dangerouslySetInnerHTML`.',
                );
              }
              break;
            }
            // defaultChecked and defaultValue are ignored by setProp
            default: {
              setProp(domElement, tag, propKey, nextProp, nextProps, lastProp);
            }
          }
        }
      }
      return;
    }
    default: {
      if (isCustomElement(tag, nextProps)) {
        for (const propKey in lastProps) {
          const lastProp = lastProps[propKey];
          if (
            lastProps.hasOwnProperty(propKey) &&
            lastProp !== undefined &&
            !nextProps.hasOwnProperty(propKey)
          ) {
            setPropOnCustomElement(
              domElement,
              tag,
              propKey,
              undefined,
              nextProps,
              lastProp,
            );
          }
        }
        for (const propKey in nextProps) {
          const nextProp = nextProps[propKey];
          const lastProp = lastProps[propKey];
          if (
            nextProps.hasOwnProperty(propKey) &&
            nextProp !== lastProp &&
            (nextProp !== undefined || lastProp !== undefined)
          ) {
            setPropOnCustomElement(
              domElement,
              tag,
              propKey,
              nextProp,
              nextProps,
              lastProp,
            );
          }
        }
        return;
      }
    }
  }

  for (const propKey in lastProps) {
    const lastProp = lastProps[propKey];
    if (
      lastProps.hasOwnProperty(propKey) &&
      lastProp != null &&
      !nextProps.hasOwnProperty(propKey)
    ) {
      setProp(domElement, tag, propKey, null, nextProps, lastProp);
    }
  }
  for (const propKey in nextProps) {
    const nextProp = nextProps[propKey];
    const lastProp = lastProps[propKey];
    if (
      nextProps.hasOwnProperty(propKey) &&
      nextProp !== lastProp &&
      (nextProp != null || lastProp != null)
    ) {
      setProp(domElement, tag, propKey, nextProp, nextProps, lastProp);
    }
  }
}

function getPossibleStandardName(propName: string): string | null {
  if (__DEV__) {
    const lowerCasedName = propName.toLowerCase();
    if (!possibleStandardNames.hasOwnProperty(lowerCasedName)) {
      return null;
    }
    return possibleStandardNames[lowerCasedName] || null;
  }
  return null;
}

function getPropNameFromAttributeName(attrName: string): string {
  switch (attrName) {
    case 'class':
      return 'className';
    case 'for':
      return 'htmlFor';
    // TODO: The rest of the aliases.
    default:
      return attrName;
  }
}

export function getPropsFromElement(domElement: Element): Object {
  const serverDifferences: {[propName: string]: mixed} = {};
  const attributes = domElement.attributes;
  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i];
    serverDifferences[getPropNameFromAttributeName(attr.name)] =
      attr.name.toLowerCase() === 'style'
        ? getStylesObjectFromElement(domElement)
        : attr.value;
  }
  return serverDifferences;
}

function getStylesObjectFromElement(domElement: Element): {
  [styleName: string]: string,
} {
  const serverValueInObjectForm: {[prop: string]: string} = {};
  const htmlElement: HTMLElement = domElement as any;
  const style = htmlElement.style;
  for (let i = 0; i < style.length; i++) {
    const styleName: string = style[i];
    // TODO: We should use the original prop value here if it is equivalent.
    // TODO: We could use the original client capitalization if the equivalent
    // other capitalization exists in the DOM.
    if (
      styleName === 'view-transition-name' &&
      isExpectedViewTransitionName(htmlElement)
    ) {
      // This is a view transition name added by the Fizz runtime, not the user's props.
    } else {
      serverValueInObjectForm[styleName] = style.getPropertyValue(styleName);
    }
  }
  return serverValueInObjectForm;
}

function diffHydratedStyles(
  domElement: Element,
  value: mixed,
  serverDifferences: {[propName: string]: mixed},
): void {
  if (value != null && typeof value !== 'object') {
    if (__DEV__) {
      console.error(
        'The `style` prop expects a mapping from style properties to values, ' +
          "not a string. For example, style={{marginRight: spacing + 'em'}} when " +
          'using JSX.',
      );
    }
    return;
  }
  // First we compare the string form and see if it's equivalent.
  // This lets us bail out on anything that used to pass in this form.
  // It also lets us compare anything that's not parsed by this browser.
  const clientValue = createDangerousStringForStyles(value);
  const serverValue = domElement.getAttribute('style');

  if (serverValue === clientValue) {
    return;
  }
  const normalizedClientValue = normalizeMarkupForTextOrAttribute(clientValue);
  const normalizedServerValue = normalizeMarkupForTextOrAttribute(serverValue);
  if (normalizedServerValue === normalizedClientValue) {
    return;
  }

  if (
    // Trailing semi-colon means this was regenerated.
    normalizedServerValue[normalizedServerValue.length - 1] === ';' &&
    // TODO: Should we just ignore any style if the style as been manipulated?
    hasViewTransition(domElement as any)
  ) {
    // If this had a view transition we might have applied a view transition
    // name/class and removed it. If that happens, the style attribute gets
    // regenerated from the style object. This means we've lost the format
    // that we sent from the server and is unable to diff it. We just treat
    // it as passing even if it should be a mismatch in this edge case.
    return;
  }

  // Otherwise, we create the object from the DOM for the diff view.
  serverDifferences.style = getStylesObjectFromElement(domElement);
}

function hydrateAttribute(
  domElement: Element,
  propKey: string,
  attributeName: string,
  value: any,
  extraAttributes: Set<string>,
  serverDifferences: {[propName: string]: mixed},
): void {
  extraAttributes.delete(attributeName);
  const serverValue = domElement.getAttribute(attributeName);
  if (serverValue === null) {
    switch (typeof value) {
      case 'undefined':
      case 'function':
      case 'symbol':
      case 'boolean':
        return;
    }
  } else {
    if (value == null) {
      // We had an attribute but shouldn't have had one, so read it
      // for the error message.
    } else {
      switch (typeof value) {
        case 'function':
        case 'symbol':
        case 'boolean':
          break;
        default: {
          if (__DEV__) {
            checkAttributeStringCoercion(value, propKey);
          }
          // $FlowFixMe[invalid-compare]
          if (serverValue === '' + value) {
            return;
          }
        }
      }
    }
  }
  warnForPropDifference(propKey, serverValue, value, serverDifferences);
}

function hydrateBooleanAttribute(
  domElement: Element,
  propKey: string,
  attributeName: string,
  value: any,
  extraAttributes: Set<string>,
  serverDifferences: {[propName: string]: mixed},
): void {
  extraAttributes.delete(attributeName);
  const serverValue = domElement.getAttribute(attributeName);
  if (serverValue === null) {
    switch (typeof value) {
      case 'function':
      case 'symbol':
        return;
    }
    if (!value) {
      return;
    }
  } else {
    switch (typeof value) {
      case 'function':
      case 'symbol':
        break;
      default: {
        if (value) {
          // If this was a boolean, it doesn't matter what the value is
          // the fact that we have it is the same as the expected.
          // As long as it's positive.
          return;
        }
      }
    }
  }
  warnForPropDifference(propKey, serverValue, value, serverDifferences);
}

function hydrateOverloadedBooleanAttribute(
  domElement: Element,
  propKey: string,
  attributeName: string,
  value: any,
  extraAttributes: Set<string>,
  serverDifferences: {[propName: string]: mixed},
): void {
  extraAttributes.delete(attributeName);
  const serverValue = domElement.getAttribute(attributeName);
  if (serverValue === null) {
    switch (typeof value) {
      case 'undefined':
      case 'function':
      case 'symbol':
        return;
      default:
        // $FlowFixMe[invalid-compare]
        if (value === false) {
          return;
        }
    }
  } else {
    if (value == null) {
      // We had an attribute but shouldn't have had one, so read it
      // for the error message.
    } else {
      switch (typeof value) {
        case 'function':
        case 'symbol':
          break;
        case 'boolean':
          // $FlowFixMe[invalid-compare]
          if (value === true && serverValue === '') {
            return;
          }
          break;
        default: {
          if (__DEV__) {
            checkAttributeStringCoercion(value, propKey);
          }
          // $FlowFixMe[invalid-compare]
          if (serverValue === '' + value) {
            return;
          }
        }
      }
    }
  }
  warnForPropDifference(propKey, serverValue, value, serverDifferences);
}

function hydrateBooleanishAttribute(
  domElement: Element,
  propKey: string,
  attributeName: string,
  value: any,
  extraAttributes: Set<string>,
  serverDifferences: {[propName: string]: mixed},
): void {
  extraAttributes.delete(attributeName);
  const serverValue = domElement.getAttribute(attributeName);
  if (serverValue === null) {
    switch (typeof value) {
      case 'undefined':
      case 'function':
      case 'symbol':
        return;
    }
  } else {
    if (value == null) {
      // We had an attribute but shouldn't have had one, so read it
      // for the error message.
    } else {
      switch (typeof value) {
        case 'function':
        case 'symbol':
          break;
        default: {
          if (__DEV__) {
            checkAttributeStringCoercion(value, attributeName);
          }
          if (serverValue === '' + (value as any)) {
            return;
          }
        }
      }
    }
  }
  warnForPropDifference(propKey, serverValue, value, serverDifferences);
}

function hydrateNumericAttribute(
  domElement: Element,
  propKey: string,
  attributeName: string,
  value: any,
  extraAttributes: Set<string>,
  serverDifferences: {[propName: string]: mixed},
): void {
  extraAttributes.delete(attributeName);
  const serverValue = domElement.getAttribute(attributeName);
  if (serverValue === null) {
    switch (typeof value) {
      case 'undefined':
      case 'function':
      case 'symbol':
      case 'boolean':
        return;
      default:
        if (isNaN(value)) {
          return;
        }
    }
  } else {
    if (value == null) {
      // We had an attribute but shouldn't have had one, so read it
      // for the error message.
    } else {
      switch (typeof value) {
        case 'function':
        case 'symbol':
        case 'boolean':
          break;
        default: {
          if (isNaN(value)) {
            // We had an attribute but shouldn't have had one, so read it
            // for the error message.
            break;
          }
          if (__DEV__) {
            checkAttributeStringCoercion(value, propKey);
          }
          // $FlowFixMe[invalid-compare]
          if (serverValue === '' + value) {
            return;
          }
        }
      }
    }
  }
  warnForPropDifference(propKey, serverValue, value, serverDifferences);
}

function hydratePositiveNumericAttribute(
  domElement: Element,
  propKey: string,
  attributeName: string,
  value: any,
  extraAttributes: Set<string>,
  serverDifferences: {[propName: string]: mixed},
): void {
  extraAttributes.delete(attributeName);
  const serverValue = domElement.getAttribute(attributeName);
  if (serverValue === null) {
    switch (typeof value) {
      case 'undefined':
      case 'function':
      case 'symbol':
      case 'boolean':
        return;
      default:
        if (isNaN(value) || value < 1) {
          return;
        }
    }
  } else {
    if (value == null) {
      // We had an attribute but shouldn't have had one, so read it
      // for the error message.
    } else {
      switch (typeof value) {
        case 'function':
        case 'symbol':
        case 'boolean':
          break;
        default: {
          if (isNaN(value) || value < 1) {
            // We had an attribute but shouldn't have had one, so read it
            // for the error message.
            break;
          }
          if (__DEV__) {
            checkAttributeStringCoercion(value, propKey);
          }
          // $FlowFixMe[invalid-compare]
          if (serverValue === '' + value) {
            return;
          }
        }
      }
    }
  }
  warnForPropDifference(propKey, serverValue, value, serverDifferences);
}

function hydrateSanitizedAttribute(
  domElement: Element,
  propKey: string,
  attributeName: string,
  value: any,
  extraAttributes: Set<string>,
  serverDifferences: {[propName: string]: mixed},
): void {
  extraAttributes.delete(attributeName);
  const serverValue = domElement.getAttribute(attributeName);
  if (serverValue === null) {
    switch (typeof value) {
      case 'undefined':
      case 'function':
      case 'symbol':
      case 'boolean':
        return;
    }
  } else {
    if (value == null) {
      // We had an attribute but shouldn't have had one, so read it
      // for the error message.
    } else {
      switch (typeof value) {
        case 'function':
        case 'symbol':
        case 'boolean':
          break;
        default: {
          if (__DEV__) {
            checkAttributeStringCoercion(value, propKey);
          }
          const sanitizedValue = sanitizeURL('' + value);
          if (serverValue === sanitizedValue) {
            return;
          }
        }
      }
    }
  }
  warnForPropDifference(propKey, serverValue, value, serverDifferences);
}

function hydrateSrcObjectAttribute(
  domElement: Element,
  value: Blob,
  extraAttributes: Set<string>,
  serverDifferences: {[propName: string]: mixed},
): void {
  const attributeName = 'src';
  extraAttributes.delete(attributeName);
  const serverValue = domElement.getAttribute(attributeName);
  if (serverValue != null && value != null) {
    const size = value.size;
    const type = value.type;
    if (typeof size === 'number' && typeof type === 'string') {
      if (serverValue.indexOf('data:' + type + ';base64,') === 0) {
        // For Blobs we don't bother reading the actual data but just diff by checking if
        // the byte length size of the Blob maches the length of the data url.
        const prefixLength = 5 + type.length + 8;
        let byteLength = ((serverValue.length - prefixLength) / 4) * 3;
        if (serverValue[serverValue.length - 1] === '=') {
          byteLength--;
        }
        if (serverValue[serverValue.length - 2] === '=') {
          byteLength--;
        }
        if (byteLength === size) {
          return;
        }
      }
    }
  }
  warnForPropDifference('src', serverValue, value, serverDifferences);
}

function diffHydratedCustomComponent(
  domElement: Element,
  tag: string,
  props: Object,
  hostContext: HostContext,
  extraAttributes: Set<string>,
  serverDifferences: {[propName: string]: mixed},
) {
  for (const propKey in props) {
    if (!props.hasOwnProperty(propKey)) {
      continue;
    }
    const value = props[propKey];
    if (value == null) {
      continue;
    }
    if (registrationNameDependencies.hasOwnProperty(propKey)) {
      if (typeof value !== 'function') {
        warnForInvalidEventListener(propKey, value);
      }
      continue;
    }
    if (props.suppressHydrationWarning === true) {
      // Don't bother comparing. We're ignoring all these warnings.
      continue;
    }
    // Validate that the properties correspond to their expected values.
    switch (propKey) {
      case 'children': {
        if (typeof value === 'string' || typeof value === 'number') {
          warnForPropDifference(
            'children',
            domElement.textContent,
            value,
            serverDifferences,
          );
        }
        continue;
      }
      // Checked above already
      case 'suppressContentEditableWarning':
      case 'suppressHydrationWarning':
      case 'defaultValue':
      case 'defaultChecked':
      case 'innerHTML':
      case 'ref':
        // Noop
        continue;
      case 'dangerouslySetInnerHTML':
        const serverHTML = domElement.innerHTML;
        const nextHtml = value ? value.__html : undefined;
        if (nextHtml != null) {
          const expectedHTML = normalizeHTML(domElement, nextHtml);
          warnForPropDifference(
            propKey,
            serverHTML,
            expectedHTML,
            serverDifferences,
          );
        }
        continue;
      case 'style':
        extraAttributes.delete(propKey);
        diffHydratedStyles(domElement, value, serverDifferences);
        continue;
      case 'offsetParent':
      case 'offsetTop':
      case 'offsetLeft':
      case 'offsetWidth':
      case 'offsetHeight':
      case 'isContentEditable':
      case 'outerText':
      case 'outerHTML':
        extraAttributes.delete(propKey.toLowerCase());
        if (__DEV__) {
          console.error(
            'Assignment to read-only property will result in a no-op: `%s`',
            propKey,
          );
        }
        continue;
      // Fall through
      case 'className':
        // className is a special cased property on the server to render as an attribute.
        extraAttributes.delete('class');
        const serverValue = getValueForAttributeOnCustomComponent(
          domElement,
          'class',
          value,
        );
        warnForPropDifference(
          'className',
          serverValue,
          value,
          serverDifferences,
        );
        continue;
      default: {
        // This is a DEV-only path
        const hostContextDev: HostContextDev = hostContext as any;
        const hostContextProd = hostContextDev.context;
        if (
          hostContextProd === HostContextNamespaceNone &&
          tag !== 'svg' &&
          tag !== 'math'
        ) {
          extraAttributes.delete(propKey.toLowerCase());
        } else {
          extraAttributes.delete(propKey);
        }
        const valueOnCustomComponent = getValueForAttributeOnCustomComponent(
          domElement,
          propKey,
          value,
        );
        warnForPropDifference(
          propKey,
          valueOnCustomComponent,
          value,
          serverDifferences,
        );
      }
    }
  }
}

// This is the exact URL string we expect that Fizz renders if we provide a function action.
// We use this for hydration warnings. It needs to be in sync with Fizz. Maybe makes sense
// as a shared module for that reason.
const EXPECTED_FORM_ACTION_URL =
  // eslint-disable-next-line no-script-url
  "javascript:throw new Error('React form unexpectedly submitted.')";

function diffHydratedGenericElement(
  domElement: Element,
  tag: string,
  props: Object,
  hostContext: HostContext,
  extraAttributes: Set<string>,
  serverDifferences: {[propName: string]: mixed},
) {
  for (const propKey in props) {
    if (!props.hasOwnProperty(propKey)) {
      continue;
    }
    const value = props[propKey];
    if (value == null) {
      continue;
    }
    if (registrationNameDependencies.hasOwnProperty(propKey)) {
      if (typeof value !== 'function') {
        warnForInvalidEventListener(propKey, value);
      }
      continue;
    }
    if (props.suppressHydrationWarning === true) {
      // Don't bother comparing. We're ignoring all these warnings.
      continue;
    }
    // Validate that the properties correspond to their expected values.
    switch (propKey) {
      case 'children': {
        if (typeof value === 'string' || typeof value === 'number') {
          warnForPropDifference(
            'children',
            domElement.textContent,
            value,
            serverDifferences,
          );
        }
        continue;
      }
      // Checked above already
      case 'suppressContentEditableWarning':
      case 'suppressHydrationWarning':
      case 'value': // Controlled attributes are not validated
      case 'checked': // TODO: Only ignore them on controlled tags.
      case 'selected':
      case 'defaultValue':
      case 'defaultChecked':
      case 'innerHTML':
      case 'ref':
        // Noop
        continue;
      case 'dangerouslySetInnerHTML':
        const serverHTML = domElement.innerHTML;
        const nextHtml = value ? value.__html : undefined;
        if (nextHtml != null) {
          const expectedHTML = normalizeHTML(domElement, nextHtml);
          if (serverHTML !== expectedHTML) {
            serverDifferences[propKey] = {
              __html: serverHTML,
            };
          }
        }
        continue;
      case 'className':
        hydrateAttribute(
          domElement,
          propKey,
          'class',
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      case 'tabIndex':
        hydrateAttribute(
          domElement,
          propKey,
          'tabindex',
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      case 'style':
        extraAttributes.delete(propKey);
        diffHydratedStyles(domElement, value, serverDifferences);
        continue;
      case 'multiple': {
        extraAttributes.delete(propKey);
        const serverValue = (domElement as any).multiple;
        warnForPropDifference(propKey, serverValue, value, serverDifferences);
        continue;
      }
      case 'muted': {
        extraAttributes.delete(propKey);
        const serverValue = (domElement as any).muted;
        warnForPropDifference(propKey, serverValue, value, serverDifferences);
        continue;
      }
      case 'autoFocus': {
        extraAttributes.delete('autofocus');
        const serverValue = (domElement as any).autofocus;
        warnForPropDifference(propKey, serverValue, value, serverDifferences);
        continue;
      }
      case 'data':
        if (tag !== 'object') {
          extraAttributes.delete(propKey);
          const serverValue = (domElement as any).getAttribute('data');
          warnForPropDifference(propKey, serverValue, value, serverDifferences);
          continue;
        }
      // fallthrough
      case 'src': {
        if (enableSrcObject && typeof value === 'object' && value !== null) {
          // Some tags support object sources like Blob, File, MediaSource and MediaStream.
          if (tag === 'img' || tag === 'video' || tag === 'audio') {
            try {
              // Test if this is a compatible object
              URL.revokeObjectURL(URL.createObjectURL(value as any));
              hydrateSrcObjectAttribute(
                domElement,
                value,
                extraAttributes,
                serverDifferences,
              );
              continue;
            } catch (x) {
              // If not, just fall through to the normal toString flow.
            }
          } else {
            if (__DEV__) {
              try {
                // This should always error.
                URL.revokeObjectURL(URL.createObjectURL(value as any));
                if (tag === 'source') {
                  console.error(
                    'Passing Blob, MediaSource or MediaStream to <source src> is not supported. ' +
                      'Pass it directly to <img src>, <video src> or <audio src> instead.',
                  );
                } else {
                  console.error(
                    'Passing Blob, MediaSource or MediaStream to <%s src> is not supported.',
                    tag,
                  );
                }
              } catch (x) {}
            }
          }
        }
        // Fallthrough
      }
      case 'href':
        if (
          value === '' &&
          // <a href=""> is fine for "reload" links.
          !(tag === 'a' && propKey === 'href') &&
          !(tag === 'object' && propKey === 'data')
        ) {
          if (__DEV__) {
            if (propKey === 'src') {
              console.error(
                'An empty string ("") was passed to the %s attribute. ' +
                  'This may cause the browser to download the whole page again over the network. ' +
                  'To fix this, either do not render the element at all ' +
                  'or pass null to %s instead of an empty string.',
                propKey,
                propKey,
              );
            } else {
              console.error(
                'An empty string ("") was passed to the %s attribute. ' +
                  'To fix this, either do not render the element at all ' +
                  'or pass null to %s instead of an empty string.',
                propKey,
                propKey,
              );
            }
          }
          continue;
        }
        hydrateSanitizedAttribute(
          domElement,
          propKey,
          propKey,
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      case 'action':
      case 'formAction': {
        const serverValue = domElement.getAttribute(propKey);
        if (typeof value === 'function') {
          extraAttributes.delete(propKey.toLowerCase());
          // The server can set these extra properties to implement actions.
          // So we remove them from the extra attributes warnings.
          if (propKey === 'formAction') {
            extraAttributes.delete('name');
            extraAttributes.delete('formenctype');
            extraAttributes.delete('formmethod');
            extraAttributes.delete('formtarget');
          } else {
            extraAttributes.delete('enctype');
            extraAttributes.delete('method');
            extraAttributes.delete('target');
          }
          // Ideally we should be able to warn if the server value was not a function
          // however since the function can return any of these attributes any way it
          // wants as a custom progressive enhancement, there's nothing to compare to.
          // We can check if the function has the $FORM_ACTION property on the client
          // and if it's not, warn, but that's an unnecessary constraint that they
          // have to have the extra extension that doesn't do anything on the client.
          continue;
        } else if (serverValue === EXPECTED_FORM_ACTION_URL) {
          extraAttributes.delete(propKey.toLowerCase());
          warnForPropDifference(propKey, 'function', value, serverDifferences);
          continue;
        }
        hydrateSanitizedAttribute(
          domElement,
          propKey,
          propKey.toLowerCase(),
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      }
      case 'xlinkHref':
        hydrateSanitizedAttribute(
          domElement,
          propKey,
          'xlink:href',
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      case 'contentEditable': {
        // Lower-case Booleanish String
        hydrateBooleanishAttribute(
          domElement,
          propKey,
          'contenteditable',
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      }
      case 'spellCheck': {
        // Lower-case Booleanish String
        hydrateBooleanishAttribute(
          domElement,
          propKey,
          'spellcheck',
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      }
      case 'draggable':
      case 'autoReverse':
      case 'externalResourcesRequired':
      case 'focusable':
      case 'preserveAlpha': {
        // Case-sensitive Booleanish String
        hydrateBooleanishAttribute(
          domElement,
          propKey,
          propKey,
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      }
      case 'allowFullScreen':
      case 'async':
      case 'autoPlay':
      case 'controls':
      case 'credentialless':
      case 'default':
      case 'defer':
      case 'disabled':
      case 'disablePictureInPicture':
      case 'disableRemotePlayback':
      case 'formNoValidate':
      case 'hidden':
      case 'loop':
      case 'noModule':
      case 'noValidate':
      case 'open':
      case 'playsInline':
      case 'readOnly':
      case 'required':
      case 'reversed':
      case 'scoped':
      case 'seamless':
      case 'itemScope': {
        // Some of these need to be lower case to remove them from the extraAttributes list.
        hydrateBooleanAttribute(
          domElement,
          propKey,
          propKey.toLowerCase(),
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      }
      case 'capture':
      case 'download': {
        hydrateOverloadedBooleanAttribute(
          domElement,
          propKey,
          propKey,
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      }
      case 'cols':
      case 'rows':
      case 'size':
      case 'span': {
        hydratePositiveNumericAttribute(
          domElement,
          propKey,
          propKey,
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      }
      case 'rowSpan': {
        hydrateNumericAttribute(
          domElement,
          propKey,
          'rowspan',
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      }
      case 'start': {
        hydrateNumericAttribute(
          domElement,
          propKey,
          propKey,
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      }
      case 'xHeight':
        hydrateAttribute(
          domElement,
          propKey,
          'x-height',
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      case 'xlinkActuate':
        hydrateAttribute(
          domElement,
          propKey,
          'xlink:actuate',
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      case 'xlinkArcrole':
        hydrateAttribute(
          domElement,
          propKey,
          'xlink:arcrole',
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      case 'xlinkRole':
        hydrateAttribute(
          domElement,
          propKey,
          'xlink:role',
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      case 'xlinkShow':
        hydrateAttribute(
          domElement,
          propKey,
          'xlink:show',
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      case 'xlinkTitle':
        hydrateAttribute(
          domElement,
          propKey,
          'xlink:title',
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      case 'xlinkType':
        hydrateAttribute(
          domElement,
          propKey,
          'xlink:type',
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      case 'xmlBase':
        hydrateAttribute(
          domElement,
          propKey,
          'xml:base',
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      case 'xmlLang':
        hydrateAttribute(
          domElement,
          propKey,
          'xml:lang',
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      case 'xmlSpace':
        hydrateAttribute(
          domElement,
          propKey,
          'xml:space',
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      case 'inert':
        if (__DEV__) {
          if (
            value === '' &&
            !didWarnForNewBooleanPropsWithEmptyValue[propKey]
          ) {
            didWarnForNewBooleanPropsWithEmptyValue[propKey] = true;
            console.error(
              'Received an empty string for a boolean attribute `%s`. ' +
                'This will treat the attribute as if it were false. ' +
                'Either pass `false` to silence this warning, or ' +
                'pass `true` if you used an empty string in earlier versions of React to indicate this attribute is true.',
              propKey,
            );
          }
        }
        hydrateBooleanAttribute(
          domElement,
          propKey,
          propKey,
          value,
          extraAttributes,
          serverDifferences,
        );
        continue;
      default: {
        if (
          // shouldIgnoreAttribute
          // We have already filtered out null/undefined and reserved words.
          propKey.length > 2 &&
          (propKey[0] === 'o' || propKey[0] === 'O') &&
          (propKey[1] === 'n' || propKey[1] === 'N')
        ) {
          continue;
        }
        const attributeName = getAttributeAlias(propKey);
        let isMismatchDueToBadCasing = false;

        // This is a DEV-only path
        const hostContextDev: HostContextDev = hostContext as any;
        const hostContextProd = hostContextDev.context;

        if (
          hostContextProd === HostContextNamespaceNone &&
          tag !== 'svg' &&
          tag !== 'math'
        ) {
          extraAttributes.delete(attributeName.toLowerCase());
        } else {
          const standardName = getPossibleStandardName(propKey);
          if (standardName !== null && standardName !== propKey) {
            // If an SVG prop is supplied with bad casing, it will
            // be successfully parsed from HTML, but will produce a mismatch
            // (and would be incorrectly rendered on the client).
            // However, we already warn about bad casing elsewhere.
            // So we'll skip the misleading extra mismatch warning in this case.
            isMismatchDueToBadCasing = true;
            extraAttributes.delete(standardName);
          }
          extraAttributes.delete(attributeName);
        }
        const serverValue = getValueForAttribute(
          domElement,
          attributeName,
          value,
        );
        if (!isMismatchDueToBadCasing) {
          warnForPropDifference(propKey, serverValue, value, serverDifferences);
        }
      }
    }
  }
}

export function hydrateProperties(
  domElement: Element,
  tag: string,
  props: Object,
  hostContext: HostContext,
): boolean {
  if (__DEV__) {
    validatePropertiesInDevelopment(tag, props);
  }

  // TODO: Make sure that we check isMounted before firing any of these events.
  switch (tag) {
    case 'dialog':
      listenToNonDelegatedEvent('cancel', domElement);
      listenToNonDelegatedEvent('close', domElement);
      break;
    case 'iframe':
    case 'object':
    case 'embed':
      // We listen to this event in case to ensure emulated bubble
      // listeners still fire for the load event.
      listenToNonDelegatedEvent('load', domElement);
      break;
    case 'video':
    case 'audio':
      // We listen to these events in case to ensure emulated bubble
      // listeners still fire for all the media events.
      for (let i = 0; i < mediaEventTypes.length; i++) {
        listenToNonDelegatedEvent(mediaEventTypes[i], domElement);
      }
      break;
    case 'source':
      // We listen to this event in case to ensure emulated bubble
      // listeners still fire for the error event.
      listenToNonDelegatedEvent('error', domElement);
      break;
    case 'img':
    case 'image':
    case 'link':
      // We listen to these events in case to ensure emulated bubble
      // listeners still fire for error and load events.
      listenToNonDelegatedEvent('error', domElement);
      listenToNonDelegatedEvent('load', domElement);
      break;
    case 'details':
      // We listen to this event in case to ensure emulated bubble
      // listeners still fire for the toggle event.
      listenToNonDelegatedEvent('toggle', domElement);
      break;
    case 'input':
      if (__DEV__) {
        checkControlledValueProps('input', props);
      }
      // We listen to this event in case to ensure emulated bubble
      // listeners still fire for the invalid event.
      listenToNonDelegatedEvent('invalid', domElement);
      // TODO: Make sure we check if this is still unmounted or do any clean
      // up necessary since we never stop tracking anymore.
      validateInputProps(domElement, props);
      // For input and textarea we current always set the value property at
      // post mount to force it to diverge from attributes. However, for
      // option and select we don't quite do the same thing and select
      // is not resilient to the DOM state changing so we don't do that here.
      // TODO: Consider not doing this for input and textarea.
      if (!enableHydrationChangeEvent) {
        initInput(
          domElement,
          props.value,
          props.defaultValue,
          props.checked,
          props.defaultChecked,
          props.type,
          props.name,
          true,
        );
      }
      break;
    case 'option':
      validateOptionProps(domElement, props);
      break;
    case 'select':
      if (__DEV__) {
        checkControlledValueProps('select', props);
      }
      // We listen to this event in case to ensure emulated bubble
      // listeners still fire for the invalid event.
      listenToNonDelegatedEvent('invalid', domElement);
      validateSelectProps(domElement, props);
      break;
    case 'textarea':
      if (__DEV__) {
        checkControlledValueProps('textarea', props);
      }
      // We listen to this event in case to ensure emulated bubble
      // listeners still fire for the invalid event.
      listenToNonDelegatedEvent('invalid', domElement);
      // TODO: Make sure we check if this is still unmounted or do any clean
      // up necessary since we never stop tracking anymore.
      validateTextareaProps(domElement, props);
      if (!enableHydrationChangeEvent) {
        initTextarea(
          domElement,
          props.value,
          props.defaultValue,
          props.children,
        );
      }
      break;
  }

  const children = props.children;
  // For text content children we compare against textContent. This
  // might match additional HTML that is hidden when we read it using
  // textContent. E.g. "foo" will match "f<span>oo</span>" but that still
  // satisfies our requirement. Our requirement is not to produce perfect
  // HTML and attributes. Ideally we should preserve structure but it's
  // ok not to if the visible content is still enough to indicate what
  // even listeners these nodes might be wired up to.
  // TODO: Warn if there is more than a single textNode as a child.
  // TODO: Should we use domElement.firstChild.nodeValue to compare?
  if (
    typeof children === 'string' ||
    typeof children === 'number' ||
    typeof children === 'bigint'
  ) {
    if (
      // $FlowFixMe[unsafe-addition] Flow doesn't want us to use `+` operator with string and bigint
      domElement.textContent !== '' + children &&
      props.suppressHydrationWarning !== true &&
      !checkForUnmatchedText(domElement.textContent, children)
    ) {
      return false;
    }
  }

  if (props.popover != null) {
    // We listen to this event in case to ensure emulated bubble
    // listeners still fire for the toggle event.
    listenToNonDelegatedEvent('beforetoggle', domElement);
    listenToNonDelegatedEvent('toggle', domElement);
  }

  if (props.onScroll != null) {
    listenToNonDelegatedEvent('scroll', domElement);
  }

  if (props.onScrollEnd != null) {
    listenToNonDelegatedEvent('scrollend', domElement);
    if (enableScrollEndPolyfill) {
      // For use by the polyfill.
      listenToNonDelegatedEvent('scroll', domElement);
    }
  }

  if (props.onCommand != null) {
    listenToNonDelegatedEvent('command', domElement);
  }

  if (props.onClick != null) {
    // TODO: This cast may not be sound for SVG, MathML or custom elements.
    trapClickOnNonInteractiveElement(domElement as any as HTMLElement);
  }

  return true;
}

export function diffHydratedProperties(
  domElement: Element,
  tag: string,
  props: Object,
  hostContext: HostContext,
): null | Object {
  const serverDifferences: {[propName: string]: mixed} = {};
  if (__DEV__) {
    const extraAttributes: Set<string> = new Set();
    const attributes = domElement.attributes;
    for (let i = 0; i < attributes.length; i++) {
      const name = attributes[i].name.toLowerCase();
      switch (name) {
        // Controlled attributes are not validated
        // TODO: Only ignore them on controlled tags.
        case 'value':
          break;
        case 'checked':
          break;
        case 'selected':
          break;
        case 'vt-name':
        case 'vt-update':
        case 'vt-enter':
        case 'vt-exit':
        case 'vt-share':
        case 'vt-parent-enter':
        case 'vt-parent-exit':
          if (enableViewTransition) {
            // View Transition annotations are expected from the Server Runtime.
            // However, if they're also specified on the client and don't match
            // that's an error.
            break;
          }
        // Fallthrough
        default:
          // Intentionally use the original name.
          // See discussion in https://github.com/facebook/react/pull/10676.
          extraAttributes.add(attributes[i].name);
      }
    }
    if (isCustomElement(tag, props)) {
      diffHydratedCustomComponent(
        domElement,
        tag,
        props,
        hostContext,
        extraAttributes,
        serverDifferences,
      );
    } else {
      diffHydratedGenericElement(
        domElement,
        tag,
        props,
        hostContext,
        extraAttributes,
        serverDifferences,
      );
    }
    if (extraAttributes.size > 0 && props.suppressHydrationWarning !== true) {
      warnForExtraAttributes(domElement, extraAttributes, serverDifferences);
    }
  }
  if (Object.keys(serverDifferences).length === 0) {
    return null;
  }
  return serverDifferences;
}

export function hydrateText(
  textNode: Text,
  text: string,
  parentProps: null | Object,
): boolean {
  const isDifferent = textNode.nodeValue !== text;
  if (
    isDifferent &&
    (parentProps === null || parentProps.suppressHydrationWarning !== true) &&
    !checkForUnmatchedText(textNode.nodeValue, text)
  ) {
    return false;
  }
  return true;
}

export function diffHydratedText(textNode: Text, text: string): null | string {
  if (textNode.nodeValue === text) {
    return null;
  }
  const normalizedClientText = normalizeMarkupForTextOrAttribute(text);
  const normalizedServerText = normalizeMarkupForTextOrAttribute(
    textNode.nodeValue,
  );
  if (normalizedServerText === normalizedClientText) {
    return null;
  }
  return textNode.nodeValue;
}

export function restoreControlledState(
  domElement: Element,
  tag: string,
  props: Object,
): void {
  switch (tag) {
    case 'input':
      restoreControlledInputState(domElement, props);
      return;
    case 'textarea':
      restoreControlledTextareaState(domElement, props);
      return;
    case 'select':
      restoreControlledSelectState(domElement, props);
      return;
  }
}
