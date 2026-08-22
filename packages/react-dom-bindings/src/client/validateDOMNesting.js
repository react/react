/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
import type {HydrationDiffNode} from 'react-reconciler/src/ReactFiberHydrationDiffs';

import {
  current,
  runWithFiberInDEV,
} from 'react-reconciler/src/ReactCurrentFiber';
import {
  HostComponent,
  HostHoistable,
  HostSingleton,
  HostText,
} from 'react-reconciler/src/ReactWorkTags';

import {describeDiff} from 'react-reconciler/src/ReactFiberHydrationDiffs';

function describeAncestors(
  ancestor: Fiber,
  child: Fiber,
  props: null | {children: null},
): string {
  let fiber: null | Fiber = child;
  let node: null | HydrationDiffNode = null;
  let distanceFromLeaf = 0;
  while (fiber) {
    if (fiber === ancestor) {
      distanceFromLeaf = 0;
    }
    node = {
      fiber: fiber,
      children: node !== null ? [node] : [],
      serverProps:
        fiber === child ? props : fiber === ancestor ? null : undefined,
      serverTail: [],
      distanceFromLeaf: distanceFromLeaf,
    };
    distanceFromLeaf++;
    fiber = fiber.return;
  }
  if (node !== null) {
    // Describe the node using the hydration diff logic.
    // Replace + with - to mark ancestor and child. It's kind of arbitrary.
    return describeDiff(node).replaceAll(/^[+-]/gm, '>');
  }
  return '';
}

type Info = {tag: string};
export type AncestorInfoDev = {
  current: ?Info,

  formTag: ?Info,
  aTagInScope: ?Info,
  buttonTagInScope: ?Info,
  nobrTagInScope: ?Info,
  pTagInButtonScope: ?Info,

  listItemTagAutoclosing: ?Info,
  dlItemTagAutoclosing: ?Info,

  // <head> or <body>
  containerTagInScope: ?Info,
  implicitRootScope: boolean,
};

// This validation code was written based on the HTML5 parsing spec:
// https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-scope
//
// Note: this does not catch all invalid nesting, nor does it try to (as it's
// not clear what practical benefit doing so provides); instead, we warn only
// for cases where the parser will give a parse tree differing from what React
// intended. For example, <b><div></div></b> is invalid but we don't warn
// because it still parses correctly; we do warn for other cases like nested
// <p> tags where the beginning of the second element implicitly closes the
// first, causing a confusing mess.

// https://html.spec.whatwg.org/multipage/syntax.html#special
const specialTags = [
  'address',
  'applet',
  'area',
  'article',
  'aside',
  'base',
  'basefont',
  'bgsound',
  'blockquote',
  'body',
  'br',
  'button',
  'caption',
  'center',
  'col',
  'colgroup',
  'dd',
  'details',
  'dir',
  'div',
  'dl',
  'dt',
  'embed',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'frame',
  'frameset',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hgroup',
  'hr',
  'html',
  'iframe',
  'img',
  'input',
  'isindex',
  'li',
  'link',
  'listing',
  'main',
  'marquee',
  'menu',
  'menuitem',
  'meta',
  'nav',
  'noembed',
  'noframes',
  'noscript',
  'object',
  'ol',
  'p',
  'param',
  'plaintext',
  'pre',
  'script',
  'section',
  'select',
  'source',
  'style',
  'summary',
  'table',
  'tbody',
  'td',
  'template',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'title',
  'tr',
  'track',
  'ul',
  'wbr',
  'xmp',
];

// https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-scope
const inScopeTags = [
  'applet',
  'caption',
  'html',
  'table',
  'td',
  'th',
  'marquee',
  'object',
  'template',

  // https://html.spec.whatwg.org/multipage/syntax.html#html-integration-point
  // TODO: Distinguish by namespace here -- for <title>, including it here
  // errs on the side of fewer warnings
  'foreignObject',
  'desc',
  'title',
];

// https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-button-scope
const buttonScopeTags = __DEV__ ? inScopeTags.concat(['button']) : [];

// https://html.spec.whatwg.org/multipage/syntax.html#generate-implied-end-tags
const impliedEndTags = [
  'dd',
  'dt',
  'li',
  'option',
  'optgroup',
  'p',
  'rp',
  'rt',
];

const emptyAncestorInfoDev: AncestorInfoDev = {
  current: null,

  formTag: null,
  aTagInScope: null,
  buttonTagInScope: null,
  nobrTagInScope: null,
  pTagInButtonScope: null,

  listItemTagAutoclosing: null,
  dlItemTagAutoclosing: null,

  containerTagInScope: null,
  implicitRootScope: false,
};

function updatedAncestorInfoDev(
  oldInfo: null | AncestorInfoDev,
  tag: string,
): AncestorInfoDev {
  if (__DEV__) {
    const ancestorInfo = {...(oldInfo || emptyAncestorInfoDev)};
    const info = {tag};

    if (inScopeTags.indexOf(tag) !== -1) {
      ancestorInfo.aTagInScope = null;
      ancestorInfo.buttonTagInScope = null;
      ancestorInfo.nobrTagInScope = null;
    }
    if (buttonScopeTags.indexOf(tag) !== -1) {
      ancestorInfo.pTagInButtonScope = null;
    }

    if (
      specialTags.indexOf(tag) !== -1 &&
      tag !== 'address' &&
      tag !== 'div' &&
      tag !== 'p'
    ) {
      // See rules for 'li', 'dd', 'dt' start tags in
      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody
      ancestorInfo.listItemTagAutoclosing = null;
      ancestorInfo.dlItemTagAutoclosing = null;
    }

    ancestorInfo.current = info;

    if (tag === 'form') {
      ancestorInfo.formTag = info;
    }
    if (tag === 'a') {
      ancestorInfo.aTagInScope = info;
    }
    if (tag === 'button') {
      ancestorInfo.buttonTagInScope = info;
    }
    if (tag === 'nobr') {
      ancestorInfo.nobrTagInScope = info;
    }
    if (tag === 'p') {
      ancestorInfo.pTagInButtonScope = info;
    }
    if (tag === 'li') {
      ancestorInfo.listItemTagAutoclosing = info;
    }
    if (tag === 'dd' || tag === 'dt') {
      ancestorInfo.dlItemTagAutoclosing = info;
    }
    if (tag === '#document' || tag === 'html') {
      ancestorInfo.containerTagInScope = null;
    } else if (!ancestorInfo.containerTagInScope) {
      ancestorInfo.containerTagInScope = info;
    }

    if (
      oldInfo === null &&
      (tag === '#document' || tag === 'html' || tag === 'body')
    ) {
      // While <head> is also a singleton we don't want to support semantics where
      // you can escape the head by rendering a body singleton so we treat it like a normal scope
      ancestorInfo.implicitRootScope = true;
    } else if (ancestorInfo.implicitRootScope === true) {
      ancestorInfo.implicitRootScope = false;
    }

    return ancestorInfo;
  } else {
    return null as any;
  }
}

/**
 * Returns whether
 */
function isTagValidWithParent(
  tag: string,
  parentTag: ?string,
  implicitRootScope: boolean,
): boolean {
  // First, let's check if we're in an unusual parsing mode...
  switch (parentTag) {
    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inselect
    // https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select#what_features_comprise_a_customizable_select
    // allowing button for customizable selects
    case 'select':
      return (
        tag === 'button' ||
        tag === 'hr' ||
        tag === 'option' ||
        tag === 'optgroup' ||
        tag === 'script' ||
        tag === 'template' ||
        tag === '#text'
      );
    case 'optgroup':
      return tag === 'option' || tag === '#text';
    // Strictly speaking, seeing an <option> doesn't mean we're in a <select>
    // but
    case 'option':
      return tag === '#text';
    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intd
    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incaption
    // No special behavior since these rules fall back to "in body" mode for
    // all except special table nodes which cause bad parsing behavior anyway.

    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intr
    case 'tr':
      return (
        tag === 'th' ||
        tag === 'td' ||
        tag === 'style' ||
        tag === 'script' ||
        tag === 'template'
      );
    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intbody
    case 'tbody':
    case 'thead':
    case 'tfoot':
      return (
        tag === 'tr' ||
        tag === 'style' ||
        tag === 'script' ||
        tag === 'template'
      );
    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incolgroup
    case 'colgroup':
      return tag === 'col' || tag === 'template';
    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intable
    case 'table':
      return (
        tag === 'caption' ||
        tag === 'colgroup' ||
        tag === 'tbody' ||
        tag === 'tfoot' ||
        tag === 'thead' ||
        tag === 'style' ||
        tag === 'script' ||
        tag === 'template'
      );
    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inhead
    case 'head':
      return (
        tag === 'base' ||
        tag === 'basefont' ||
        tag === 'bgsound' ||
        tag === 'link' ||
        tag === 'meta' ||
        tag === 'title' ||
        tag === 'noscript' ||
        tag === 'noframes' ||
        tag === 'style' ||
        tag === 'script' ||
        tag === 'template'
      );
    // https://html.spec.whatwg.org/multipage/semantics.html#the-html-element
    case 'html':
      if (implicitRootScope) {
        // When our parent tag is html and we're in the root scope we will actually
        // insert most tags into the body so we need to fall through to validating
        // the specific tag with "in body" parsing mode below
        break;
      }
      return tag === 'head' || tag === 'body' || tag === 'frameset';
    case 'frameset':
      return tag === 'frame';
    case '#document':
      if (implicitRootScope) {
        // When our parent is the Document and we're in the root scope we will actually
        // insert most tags into the body so we need to fall through to validating
        // the specific tag with "in body" parsing mode below
        break;
      }
      return tag === 'html';
  }

  // Probably in the "in body" parsing mode, so we outlaw only tag combos
  // where the parsing rules cause implicit opens or closes to be added.
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody
  switch (tag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return (
        parentTag !== 'h1' &&
        parentTag !== 'h2' &&
        parentTag !== 'h3' &&
        parentTag !== 'h4' &&
        parentTag !== 'h5' &&
        parentTag !== 'h6'
      );

    case 'rp':
    case 'rt':
      // $FlowFixMe[incompatible-type]
      return impliedEndTags.indexOf(parentTag) === -1;

    case 'caption':
    case 'col':
    case 'colgroup':
    case 'frameset':
    case 'frame':
    case 'tbody':
    case 'td':
    case 'tfoot':
    case 'th':
    case 'thead':
    case 'tr':
      // These tags are only valid with a few parents that have special child
      // parsing rules -- if we're down here, then none of those matched and
      // so we allow it only if we don't know what the parent is, as all other
      // cases are invalid.
      return parentTag == null;
    case 'head':
      // We support rendering <head> in the root when the container is
      // #document, <html>, or <body>.
      return implicitRootScope || parentTag === null;
    case 'html':
      // We support rendering <html> in the root when the container is
      // #document
      return (
        (implicitRootScope && parentTag === '#document') || parentTag === null
      );
    case 'body':
      // We support rendering <body> in the root when the container is
      // #document or <html>
      return (
        (implicitRootScope &&
          (parentTag === '#document' || parentTag === 'html')) ||
        parentTag === null
      );
  }

  return true;
}

/**
 * Returns whether
 */
function findInvalidAncestorForTag(
  tag: string,
  ancestorInfo: AncestorInfoDev,
): ?Info {
  switch (tag) {
    case 'address':
    case 'article':
    case 'aside':
    case 'blockquote':
    case 'center':
    case 'details':
    case 'dialog':
    case 'dir':
    case 'div':
    case 'dl':
    case 'fieldset':
    case 'figcaption':
    case 'figure':
    case 'footer':
    case 'header':
    case 'hgroup':
    case 'main':
    case 'menu':
    case 'nav':
    case 'ol':
    case 'p':
    case 'section':
    case 'summary':
    case 'ul':
    case 'pre':
    case 'listing':
    case 'table':
    case 'hr':
    case 'xmp':
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return ancestorInfo.pTagInButtonScope;

    case 'form':
      return ancestorInfo.formTag || ancestorInfo.pTagInButtonScope;

    case 'li':
      return ancestorInfo.listItemTagAutoclosing;

    case 'dd':
    case 'dt':
      return ancestorInfo.dlItemTagAutoclosing;

    case 'button':
      return ancestorInfo.buttonTagInScope;

    case 'a':
      // Spec says something about storing a list of markers, but it sounds
      // equivalent to this check.
      return ancestorInfo.aTagInScope;

    case 'nobr':
      return ancestorInfo.nobrTagInScope;
  }

  return null;
}

const didWarn: {[string]: boolean} = {};

function findAncestor(parent: null | Fiber, tagName: string): null | Fiber {
  while (parent) {
    switch (parent.tag) {
      case HostComponent:
      case HostHoistable:
      case HostSingleton:
        if (parent.type === tagName) {
          return parent;
        }
    }
    parent = parent.return;
  }
  return null;
}

function validateDOMNesting(
  childTag: string,
  ancestorInfo: AncestorInfoDev,
): boolean {
  if (__DEV__) {
    ancestorInfo = ancestorInfo || emptyAncestorInfoDev;
    const parentInfo = ancestorInfo.current;
    const parentTag = parentInfo && parentInfo.tag;

    const invalidParent = isTagValidWithParent(
      childTag,
      parentTag,
      ancestorInfo.implicitRootScope,
    )
      ? null
      : parentInfo;
    const invalidAncestor = invalidParent
      ? null
      : findInvalidAncestorForTag(childTag, ancestorInfo);
    const invalidParentOrAncestor = invalidParent || invalidAncestor;
    if (!invalidParentOrAncestor) {
      return true;
    }

    const ancestorTag = invalidParentOrAncestor.tag;

    const warnKey =
      // eslint-disable-next-line react-internal/safe-string-coercion
      String(!!invalidParent) + '|' + childTag + '|' + ancestorTag;
    if (didWarn[warnKey]) {
      return false;
    }
    didWarn[warnKey] = true;

    const child = current;
    const ancestor = child ? findAncestor(child.return, ancestorTag) : null;

    const ancestorDescription =
      child !== null && ancestor !== null
        ? describeAncestors(ancestor, child, null)
        : '';

    const tagDisplayName = '<' + childTag + '>';
    if (invalidParent) {
      let info = '';
      if (ancestorTag === 'table' && childTag === 'tr') {
        info +=
          ' Add a <tbody>, <thead> or <tfoot> to your code to match the DOM tree generated by ' +
          'the browser.';
      }
      console.error(
        'In HTML, %s cannot be a child of <%s>.%s\n' +
          'This will cause a hydration error.%s',
        tagDisplayName,
        ancestorTag,
        info,
        ancestorDescription,
      );
    } else {
      console.error(
        'In HTML, %s cannot be a descendant of <%s>.\n' +
          'This will cause a hydration error.%s',
        tagDisplayName,
        ancestorTag,
        ancestorDescription,
      );
    }
    if (child) {
      // For debugging purposes find the nearest ancestor that caused the issue.
      // The stack trace of this ancestor can be useful to find the cause.
      // If the parent is a direct parent in the same owner, we don't bother.
      const parent = child.return;
      if (
        ancestor !== null &&
        parent !== null &&
        (ancestor !== parent || parent._debugOwner !== child._debugOwner)
      ) {
        runWithFiberInDEV(ancestor, () => {
          console.error(
            // We repeat some context because this log might be taken out of context
            // such as in React DevTools or grouped server logs.
            '<%s> cannot contain a nested %s.\n' +
              'See this log for the ancestor stack trace.',
            ancestorTag,
            tagDisplayName,
          );
        });
      }
    }
    return false;
  }
  return true;
}

function validateTextNesting(
  childText: string,
  parentTag: string,
  implicitRootScope: boolean,
): boolean {
  if (__DEV__) {
    if (implicitRootScope || isTagValidWithParent('#text', parentTag, false)) {
      return true;
    }

    const warnKey = '#text|' + parentTag;
    if (didWarn[warnKey]) {
      return false;
    }
    didWarn[warnKey] = true;

    const child = current;
    const ancestor = child ? findAncestor(child, parentTag) : null;

    const ancestorDescription =
      child !== null && ancestor !== null
        ? describeAncestors(
            ancestor,
            child,
            child.tag !== HostText ? {children: null} : null,
          )
        : '';

    if (/\S/.test(childText)) {
      console.error(
        'In HTML, text nodes cannot be a child of <%s>.\n' +
          'This will cause a hydration error.%s',
        parentTag,
        ancestorDescription,
      );
    } else {
      console.error(
        'In HTML, whitespace text nodes cannot be a child of <%s>. ' +
          "Make sure you don't have any extra whitespace between tags on " +
          'each line of your source code.\n' +
          'This will cause a hydration error.%s',
        parentTag,
        ancestorDescription,
      );
    }
    return false;
  }
  return true;
}

export {updatedAncestorInfoDev, validateDOMNesting, validateTextNesting};
