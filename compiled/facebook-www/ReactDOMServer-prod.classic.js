/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noflow
 * @nolint
 * @preventMunge
 * @preserve-invariant-messages
 */

/*


 JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)

 Copyright (c) 2011 Gary Court
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
*/
"use strict";
var React = require("react"),
  ReactDOM = require("react-dom");
function formatProdErrorMessage(code) {
  var url = "https://react.dev/errors/" + code;
  if (1 < arguments.length) {
    url += "?args[]=" + encodeURIComponent(arguments[1]);
    for (var i = 2; i < arguments.length; i++)
      url += "&args[]=" + encodeURIComponent(arguments[i]);
  }
  return (
    "Minified React error #" +
    code +
    "; visit " +
    url +
    " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
  );
}
var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  REACT_PORTAL_TYPE = Symbol.for("react.portal"),
  REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"),
  REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"),
  REACT_PROFILER_TYPE = Symbol.for("react.profiler"),
  REACT_CONSUMER_TYPE = Symbol.for("react.consumer"),
  REACT_CONTEXT_TYPE = Symbol.for("react.context"),
  REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"),
  REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"),
  REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"),
  REACT_MEMO_TYPE = Symbol.for("react.memo"),
  REACT_LAZY_TYPE = Symbol.for("react.lazy"),
  REACT_SCOPE_TYPE = Symbol.for("react.scope"),
  REACT_ACTIVITY_TYPE = Symbol.for("react.activity"),
  REACT_LEGACY_HIDDEN_TYPE = Symbol.for("react.legacy_hidden"),
  REACT_TRACING_MARKER_TYPE = Symbol.for("react.tracing_marker"),
  REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel"),
  REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"),
  MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
function getIteratorFn(maybeIterable) {
  if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
  maybeIterable =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable["@@iterator"];
  return "function" === typeof maybeIterable ? maybeIterable : null;
}
var REACT_OPTIMISTIC_KEY = Symbol.for("react.optimistic_key"),
  isArrayImpl = Array.isArray,
  dynamicFeatureFlags = require("ReactFeatureFlags"),
  disableLegacyContextForFunctionComponents =
    dynamicFeatureFlags.disableLegacyContextForFunctionComponents,
  enableTransitionTracing = dynamicFeatureFlags.enableTransitionTracing,
  enableViewTransition = dynamicFeatureFlags.enableViewTransition;
function murmurhash3_32_gc(key, seed) {
  var remainder = key.length & 3;
  var bytes = key.length - remainder;
  var h1 = seed;
  for (seed = 0; seed < bytes; ) {
    var k1 =
      (key.charCodeAt(seed) & 255) |
      ((key.charCodeAt(++seed) & 255) << 8) |
      ((key.charCodeAt(++seed) & 255) << 16) |
      ((key.charCodeAt(++seed) & 255) << 24);
    ++seed;
    k1 =
      (3432918353 * (k1 & 65535) +
        (((3432918353 * (k1 >>> 16)) & 65535) << 16)) &
      4294967295;
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 =
      (461845907 * (k1 & 65535) + (((461845907 * (k1 >>> 16)) & 65535) << 16)) &
      4294967295;
    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = (5 * (h1 & 65535) + (((5 * (h1 >>> 16)) & 65535) << 16)) & 4294967295;
    h1 = (h1 & 65535) + 27492 + ((((h1 >>> 16) + 58964) & 65535) << 16);
  }
  k1 = 0;
  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(seed + 2) & 255) << 16;
    case 2:
      k1 ^= (key.charCodeAt(seed + 1) & 255) << 8;
    case 1:
      (k1 ^= key.charCodeAt(seed) & 255),
        (k1 =
          (3432918353 * (k1 & 65535) +
            (((3432918353 * (k1 >>> 16)) & 65535) << 16)) &
          4294967295),
        (k1 = (k1 << 15) | (k1 >>> 17)),
        (h1 ^=
          (461845907 * (k1 & 65535) +
            (((461845907 * (k1 >>> 16)) & 65535) << 16)) &
          4294967295);
  }
  h1 ^= key.length;
  h1 ^= h1 >>> 16;
  h1 =
    (2246822507 * (h1 & 65535) + (((2246822507 * (h1 >>> 16)) & 65535) << 16)) &
    4294967295;
  h1 ^= h1 >>> 13;
  h1 =
    (3266489909 * (h1 & 65535) + (((3266489909 * (h1 >>> 16)) & 65535) << 16)) &
    4294967295;
  return (h1 ^ (h1 >>> 16)) >>> 0;
}
var assign = Object.assign,
  hasOwnProperty = Object.prototype.hasOwnProperty,
  VALID_ATTRIBUTE_NAME_REGEX = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ),
  illegalAttributeNameCache = {},
  validatedAttributeNameCache = {};
function isAttributeNameSafe(attributeName) {
  if (hasOwnProperty.call(validatedAttributeNameCache, attributeName))
    return !0;
  if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) return !1;
  if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName))
    return (validatedAttributeNameCache[attributeName] = !0);
  illegalAttributeNameCache[attributeName] = !0;
  return !1;
}
var unitlessNumbers = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  ),
  aliases = new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["maskType", "mask-type"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]),
  matchHtmlRegExp = /["'&<>]/;
function escapeTextForBrowser(text) {
  if (
    "boolean" === typeof text ||
    "number" === typeof text ||
    "bigint" === typeof text
  )
    return "" + text;
  text = "" + text;
  var match = matchHtmlRegExp.exec(text);
  if (match) {
    var html = "",
      index,
      lastIndex = 0;
    for (index = match.index; index < text.length; index++) {
      switch (text.charCodeAt(index)) {
        case 34:
          match = "&quot;";
          break;
        case 38:
          match = "&amp;";
          break;
        case 39:
          match = "&#x27;";
          break;
        case 60:
          match = "&lt;";
          break;
        case 62:
          match = "&gt;";
          break;
        default:
          continue;
      }
      lastIndex !== index && (html += text.slice(lastIndex, index));
      lastIndex = index + 1;
      html += match;
    }
    text = lastIndex !== index ? html + text.slice(lastIndex, index) : html;
  }
  return text;
}
var uppercasePattern = /([A-Z])/g,
  msPattern = /^ms-/,
  isJavaScriptProtocol =
    /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
function sanitizeURL(url) {
  return isJavaScriptProtocol.test("" + url)
    ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')"
    : url;
}
var ReactSharedInternals =
    React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  ReactDOMSharedInternals =
    ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  sharedNotPendingObject = {
    pending: !1,
    data: null,
    method: null,
    action: null
  },
  previousDispatcher = ReactDOMSharedInternals.d;
ReactDOMSharedInternals.d = {
  f: previousDispatcher.f,
  r: previousDispatcher.r,
  D: prefetchDNS,
  C: preconnect,
  L: preload,
  m: preloadModule,
  X: preinitScript,
  S: preinitStyle,
  M: preinitModuleScript
};
var PRELOAD_NO_CREDS = [],
  currentlyFlushingRenderState = null,
  scriptRegex = /(<\/|<)(s)(cript)/gi;
function scriptReplacer(match, prefix, s, suffix) {
  return "" + prefix + ("s" === s ? "\\u0073" : "\\u0053") + suffix;
}
function createResumableState(
  identifierPrefix,
  externalRuntimeConfig,
  bootstrapScriptContent,
  bootstrapScripts,
  bootstrapModules
) {
  var streamingFormat = 0;
  void 0 !== externalRuntimeConfig && (streamingFormat = 1);
  return {
    idPrefix: void 0 === identifierPrefix ? "" : identifierPrefix,
    nextFormID: 0,
    streamingFormat: streamingFormat,
    bootstrapScriptContent: bootstrapScriptContent,
    bootstrapScripts: bootstrapScripts,
    bootstrapModules: bootstrapModules,
    instructions: 0,
    hasBody: !1,
    hasHtml: !1,
    unknownResources: {},
    dnsResources: {},
    connectResources: { default: {}, anonymous: {}, credentials: {} },
    imageResources: {},
    styleResources: {},
    scriptResources: {},
    moduleUnknownResources: {},
    moduleScriptResources: {}
  };
}
function createFormatContext(
  insertionMode,
  selectedValue,
  tagScope,
  viewTransition
) {
  return {
    insertionMode: insertionMode,
    selectedValue: selectedValue,
    tagScope: tagScope,
    viewTransition: viewTransition
  };
}
function getChildFormatContext(parentContext, type, props) {
  var subtreeScope = parentContext.tagScope & -25;
  switch (type) {
    case "noscript":
      return createFormatContext(2, null, subtreeScope | 1, null);
    case "select":
      return createFormatContext(
        2,
        null != props.value ? props.value : props.defaultValue,
        subtreeScope,
        null
      );
    case "svg":
      return createFormatContext(4, null, subtreeScope, null);
    case "picture":
      return createFormatContext(2, null, subtreeScope | 2, null);
    case "math":
      return createFormatContext(5, null, subtreeScope, null);
    case "foreignObject":
      return createFormatContext(2, null, subtreeScope, null);
    case "table":
      return createFormatContext(6, null, subtreeScope, null);
    case "thead":
    case "tbody":
    case "tfoot":
      return createFormatContext(7, null, subtreeScope, null);
    case "colgroup":
      return createFormatContext(9, null, subtreeScope, null);
    case "tr":
      return createFormatContext(8, null, subtreeScope, null);
    case "head":
      if (2 > parentContext.insertionMode)
        return createFormatContext(3, null, subtreeScope, null);
      break;
    case "html":
      if (0 === parentContext.insertionMode)
        return createFormatContext(1, null, subtreeScope, null);
  }
  return 6 <= parentContext.insertionMode || 2 > parentContext.insertionMode
    ? createFormatContext(2, null, subtreeScope, null)
    : (enableViewTransition && null !== parentContext.viewTransition) ||
        parentContext.tagScope !== subtreeScope
      ? createFormatContext(
          parentContext.insertionMode,
          parentContext.selectedValue,
          subtreeScope,
          null
        )
      : parentContext;
}
function getSuspenseViewTransition(parentViewTransition) {
  return null === parentViewTransition
    ? null
    : {
        update: parentViewTransition.update,
        enter: "none",
        exit: "none",
        share: parentViewTransition.update,
        name: parentViewTransition.autoName,
        autoName: parentViewTransition.autoName,
        nameIdx: 0
      };
}
function getSuspenseFallbackFormatContext(resumableState, parentContext) {
  parentContext.tagScope & 32 && (resumableState.instructions |= 128);
  return createFormatContext(
    parentContext.insertionMode,
    parentContext.selectedValue,
    parentContext.tagScope | 12,
    getSuspenseViewTransition(parentContext.viewTransition)
  );
}
function getSuspenseContentFormatContext(resumableState, parentContext) {
  resumableState = getSuspenseViewTransition(parentContext.viewTransition);
  var subtreeScope = parentContext.tagScope | 16;
  null !== resumableState &&
    "none" !== resumableState.share &&
    (subtreeScope |= 64);
  return createFormatContext(
    parentContext.insertionMode,
    parentContext.selectedValue,
    subtreeScope,
    resumableState
  );
}
function makeId(resumableState, treeId, localId) {
  resumableState = "_" + resumableState.idPrefix + "R_" + treeId;
  0 < localId && (resumableState += "H" + localId.toString(32));
  return resumableState + "_";
}
function pushViewTransitionAttributes(target, formatContext) {
  enableViewTransition &&
    ((formatContext = formatContext.viewTransition),
    null !== formatContext &&
      ("auto" !== formatContext.name &&
        (pushStringAttribute(
          target,
          "vt-name",
          0 === formatContext.nameIdx
            ? formatContext.name
            : formatContext.name + "_" + formatContext.nameIdx
        ),
        formatContext.nameIdx++),
      pushStringAttribute(target, "vt-update", formatContext.update),
      "none" !== formatContext.enter &&
        pushStringAttribute(target, "vt-enter", formatContext.enter),
      "none" !== formatContext.exit &&
        pushStringAttribute(target, "vt-exit", formatContext.exit),
      "none" !== formatContext.share &&
        pushStringAttribute(target, "vt-share", formatContext.share)));
}
var styleNameCache = new Map();
function pushStyleAttribute(target, style) {
  if ("object" !== typeof style) throw Error(formatProdErrorMessage(62));
  var isFirst = !0,
    styleName;
  for (styleName in style)
    if (hasOwnProperty.call(style, styleName)) {
      var styleValue = style[styleName];
      if (
        null != styleValue &&
        "boolean" !== typeof styleValue &&
        "" !== styleValue
      ) {
        if (0 === styleName.indexOf("--")) {
          var nameChunk = escapeTextForBrowser(styleName);
          styleValue = escapeTextForBrowser(("" + styleValue).trim());
        } else
          (nameChunk = styleNameCache.get(styleName)),
            void 0 === nameChunk &&
              ((nameChunk = escapeTextForBrowser(
                styleName
                  .replace(uppercasePattern, "-$1")
                  .toLowerCase()
                  .replace(msPattern, "-ms-")
              )),
              styleNameCache.set(styleName, nameChunk)),
            (styleValue =
              "number" === typeof styleValue
                ? 0 === styleValue || unitlessNumbers.has(styleName)
                  ? "" + styleValue
                  : styleValue + "px"
                : escapeTextForBrowser(("" + styleValue).trim()));
        isFirst
          ? ((isFirst = !1),
            target.push(' style="', nameChunk, ":", styleValue))
          : target.push(";", nameChunk, ":", styleValue);
      }
    }
  isFirst || target.push('"');
}
function pushBooleanAttribute(target, name, value) {
  value &&
    "function" !== typeof value &&
    "symbol" !== typeof value &&
    target.push(" ", name, '=""');
}
function pushStringAttribute(target, name, value) {
  "function" !== typeof value &&
    "symbol" !== typeof value &&
    "boolean" !== typeof value &&
    target.push(" ", name, '="', escapeTextForBrowser(value), '"');
}
var actionJavaScriptURL = escapeTextForBrowser(
  "javascript:throw new Error('React form unexpectedly submitted.')"
);
function pushAdditionalFormField(value, key) {
  this.push('<input type="hidden"');
  validateAdditionalFormField(value);
  pushStringAttribute(this, "name", key);
  pushStringAttribute(this, "value", value);
  this.push("/>");
}
function validateAdditionalFormField(value) {
  if ("string" !== typeof value) throw Error(formatProdErrorMessage(480));
}
function getCustomFormFields(resumableState, formAction) {
  if ("function" === typeof formAction.$$FORM_ACTION) {
    var id = resumableState.nextFormID++;
    resumableState = resumableState.idPrefix + id;
    try {
      var customFields = formAction.$$FORM_ACTION(resumableState);
      if (customFields) {
        var formData = customFields.data;
        null != formData && formData.forEach(validateAdditionalFormField);
      }
      return customFields;
    } catch (x) {
      if ("object" === typeof x && null !== x && "function" === typeof x.then)
        throw x;
    }
  }
  return null;
}
function pushFormActionAttribute(
  target,
  resumableState,
  renderState,
  formAction,
  formEncType,
  formMethod,
  formTarget,
  name
) {
  var formData = null;
  if ("function" === typeof formAction) {
    var customFields = getCustomFormFields(resumableState, formAction);
    null !== customFields
      ? ((name = customFields.name),
        (formAction = customFields.action || ""),
        (formEncType = customFields.encType),
        (formMethod = customFields.method),
        (formTarget = customFields.target),
        (formData = customFields.data))
      : (target.push(" ", "formAction", '="', actionJavaScriptURL, '"'),
        (formTarget = formMethod = formEncType = formAction = name = null),
        injectFormReplayingRuntime(resumableState, renderState));
  }
  null != name && pushAttribute(target, "name", name);
  null != formAction && pushAttribute(target, "formAction", formAction);
  null != formEncType && pushAttribute(target, "formEncType", formEncType);
  null != formMethod && pushAttribute(target, "formMethod", formMethod);
  null != formTarget && pushAttribute(target, "formTarget", formTarget);
  return formData;
}
function pushAttribute(target, name, value) {
  switch (name) {
    case "className":
      pushStringAttribute(target, "class", value);
      break;
    case "tabIndex":
      pushStringAttribute(target, "tabindex", value);
      break;
    case "dir":
    case "role":
    case "viewBox":
    case "width":
    case "height":
      pushStringAttribute(target, name, value);
      break;
    case "style":
      pushStyleAttribute(target, value);
      break;
    case "src":
    case "href":
      if ("" === value) break;
    case "action":
    case "formAction":
      if (
        null == value ||
        "function" === typeof value ||
        "symbol" === typeof value ||
        "boolean" === typeof value
      )
        break;
      value = sanitizeURL("" + value);
      target.push(" ", name, '="', escapeTextForBrowser(value), '"');
      break;
    case "defaultValue":
    case "defaultChecked":
    case "innerHTML":
    case "suppressContentEditableWarning":
    case "suppressHydrationWarning":
    case "ref":
      break;
    case "autoFocus":
    case "multiple":
    case "muted":
      pushBooleanAttribute(target, name.toLowerCase(), value);
      break;
    case "xlinkHref":
      if (
        "function" === typeof value ||
        "symbol" === typeof value ||
        "boolean" === typeof value
      )
        break;
      value = sanitizeURL("" + value);
      target.push(" ", "xlink:href", '="', escapeTextForBrowser(value), '"');
      break;
    case "contentEditable":
    case "spellCheck":
    case "draggable":
    case "value":
    case "autoReverse":
    case "externalResourcesRequired":
    case "focusable":
    case "preserveAlpha":
      "function" !== typeof value &&
        "symbol" !== typeof value &&
        target.push(" ", name, '="', escapeTextForBrowser(value), '"');
      break;
    case "inert":
    case "allowFullScreen":
    case "async":
    case "autoPlay":
    case "controls":
    case "credentialless":
    case "default":
    case "defer":
    case "disabled":
    case "disablePictureInPicture":
    case "disableRemotePlayback":
    case "formNoValidate":
    case "hidden":
    case "loop":
    case "noModule":
    case "noValidate":
    case "open":
    case "playsInline":
    case "readOnly":
    case "required":
    case "reversed":
    case "scoped":
    case "seamless":
    case "itemScope":
      value &&
        "function" !== typeof value &&
        "symbol" !== typeof value &&
        target.push(" ", name, '=""');
      break;
    case "capture":
    case "download":
      !0 === value
        ? target.push(" ", name, '=""')
        : !1 !== value &&
          "function" !== typeof value &&
          "symbol" !== typeof value &&
          target.push(" ", name, '="', escapeTextForBrowser(value), '"');
      break;
    case "cols":
    case "rows":
    case "size":
    case "span":
      "function" !== typeof value &&
        "symbol" !== typeof value &&
        !isNaN(value) &&
        1 <= value &&
        target.push(" ", name, '="', escapeTextForBrowser(value), '"');
      break;
    case "rowSpan":
    case "start":
      "function" === typeof value ||
        "symbol" === typeof value ||
        isNaN(value) ||
        target.push(" ", name, '="', escapeTextForBrowser(value), '"');
      break;
    case "xlinkActuate":
      pushStringAttribute(target, "xlink:actuate", value);
      break;
    case "xlinkArcrole":
      pushStringAttribute(target, "xlink:arcrole", value);
      break;
    case "xlinkRole":
      pushStringAttribute(target, "xlink:role", value);
      break;
    case "xlinkShow":
      pushStringAttribute(target, "xlink:show", value);
      break;
    case "xlinkTitle":
      pushStringAttribute(target, "xlink:title", value);
      break;
    case "xlinkType":
      pushStringAttribute(target, "xlink:type", value);
      break;
    case "xmlBase":
      pushStringAttribute(target, "xml:base", value);
      break;
    case "xmlLang":
      pushStringAttribute(target, "xml:lang", value);
      break;
    case "xmlSpace":
      pushStringAttribute(target, "xml:space", value);
      break;
    default:
      if (
        !(2 < name.length) ||
        ("o" !== name[0] && "O" !== name[0]) ||
        ("n" !== name[1] && "N" !== name[1])
      )
        if (((name = aliases.get(name) || name), isAttributeNameSafe(name))) {
          switch (typeof value) {
            case "function":
            case "symbol":
              return;
            case "boolean":
              var prefix$8 = name.toLowerCase().slice(0, 5);
              if ("data-" !== prefix$8 && "aria-" !== prefix$8) return;
          }
          target.push(" ", name, '="', escapeTextForBrowser(value), '"');
        }
  }
}
function pushInnerHTML(target, innerHTML, children) {
  if (null != innerHTML) {
    if (null != children) throw Error(formatProdErrorMessage(60));
    if ("object" !== typeof innerHTML || !("__html" in innerHTML))
      throw Error(formatProdErrorMessage(61));
    innerHTML = innerHTML.__html;
    null !== innerHTML && void 0 !== innerHTML && target.push("" + innerHTML);
  }
}
function flattenOptionChildren(children) {
  var content = "";
  React.Children.forEach(children, function (child) {
    null != child && (content += child);
  });
  return content;
}
function injectFormReplayingRuntime(resumableState, renderState) {
  if (
    0 === (resumableState.instructions & 16) &&
    !renderState.externalRuntimeScript
  ) {
    resumableState.instructions |= 16;
    var preamble = renderState.preamble,
      bootstrapChunks = renderState.bootstrapChunks;
    (preamble.htmlChunks || preamble.headChunks) && 0 === bootstrapChunks.length
      ? (bootstrapChunks.push(renderState.startInlineScript),
        pushCompletedShellIdAttribute(bootstrapChunks, resumableState),
        bootstrapChunks.push(
          ">",
          'addEventListener("submit",function(a){if(!a.defaultPrevented){var b=a.target,d=a.submitter,c=b.action,e=d;if(d){var f=d.getAttribute("formAction");null!=f&&(c=f,e=null)}"javascript:throw new Error(\'React form unexpectedly submitted.\')"===c&&(a.preventDefault(),a=new FormData(b,e),c=b.ownerDocument||b,(c.$$reactFormReplay=c.$$reactFormReplay||[]).push(b,d,a))}});',
          "\x3c/script>"
        ))
      : bootstrapChunks.unshift(
          renderState.startInlineScript,
          ">",
          'addEventListener("submit",function(a){if(!a.defaultPrevented){var b=a.target,d=a.submitter,c=b.action,e=d;if(d){var f=d.getAttribute("formAction");null!=f&&(c=f,e=null)}"javascript:throw new Error(\'React form unexpectedly submitted.\')"===c&&(a.preventDefault(),a=new FormData(b,e),c=b.ownerDocument||b,(c.$$reactFormReplay=c.$$reactFormReplay||[]).push(b,d,a))}});',
          "\x3c/script>"
        );
  }
}
function pushLinkImpl(target, props) {
  target.push(startChunkForTag("link"));
  for (var propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
          case "dangerouslySetInnerHTML":
            throw Error(formatProdErrorMessage(399, "link"));
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  target.push("/>");
  return null;
}
var styleRegex = /(<\/|<)(s)(tyle)/gi;
function styleReplacer(match, prefix, s, suffix) {
  return "" + prefix + ("s" === s ? "\\73 " : "\\53 ") + suffix;
}
function pushSelfClosing(target, props, tag, formatContext) {
  target.push(startChunkForTag(tag));
  for (var propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
          case "dangerouslySetInnerHTML":
            throw Error(formatProdErrorMessage(399, tag));
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  pushViewTransitionAttributes(target, formatContext);
  target.push("/>");
  return null;
}
function pushTitleImpl(target, props) {
  target.push(startChunkForTag("title"));
  var children = null,
    innerHTML = null,
    propKey;
  for (propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
            children = propValue;
            break;
          case "dangerouslySetInnerHTML":
            innerHTML = propValue;
            break;
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  target.push(">");
  props = Array.isArray(children)
    ? 2 > children.length
      ? children[0]
      : null
    : children;
  "function" !== typeof props &&
    "symbol" !== typeof props &&
    null !== props &&
    void 0 !== props &&
    target.push(escapeTextForBrowser("" + props));
  pushInnerHTML(target, innerHTML, children);
  target.push(endChunkForTag("title"));
  return null;
}
function pushScriptImpl(target, props) {
  target.push(startChunkForTag("script"));
  var children = null,
    innerHTML = null,
    propKey;
  for (propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
            children = propValue;
            break;
          case "dangerouslySetInnerHTML":
            innerHTML = propValue;
            break;
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  target.push(">");
  pushInnerHTML(target, innerHTML, children);
  "string" === typeof children &&
    target.push(("" + children).replace(scriptRegex, scriptReplacer));
  target.push(endChunkForTag("script"));
  return null;
}
function pushStartSingletonElement(target, props, tag, formatContext) {
  target.push(startChunkForTag(tag));
  var innerHTML = (tag = null),
    propKey;
  for (propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
            tag = propValue;
            break;
          case "dangerouslySetInnerHTML":
            innerHTML = propValue;
            break;
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  pushViewTransitionAttributes(target, formatContext);
  target.push(">");
  pushInnerHTML(target, innerHTML, tag);
  return tag;
}
function pushStartGenericElement(target, props, tag, formatContext) {
  target.push(startChunkForTag(tag));
  var innerHTML = (tag = null),
    propKey;
  for (propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
            tag = propValue;
            break;
          case "dangerouslySetInnerHTML":
            innerHTML = propValue;
            break;
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  pushViewTransitionAttributes(target, formatContext);
  target.push(">");
  pushInnerHTML(target, innerHTML, tag);
  return "string" === typeof tag
    ? (target.push(escapeTextForBrowser(tag)), null)
    : tag;
}
var VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/,
  validatedTagCache = new Map();
function startChunkForTag(tag) {
  var tagStartChunk = validatedTagCache.get(tag);
  if (void 0 === tagStartChunk) {
    if (!VALID_TAG_REGEX.test(tag))
      throw Error(formatProdErrorMessage(65, tag));
    tagStartChunk = "<" + tag;
    validatedTagCache.set(tag, tagStartChunk);
  }
  return tagStartChunk;
}
function pushStartInstance(
  target$jscomp$0,
  type,
  props,
  resumableState,
  renderState,
  preambleState,
  hoistableState,
  formatContext,
  textEmbedded
) {
  switch (type) {
    case "div":
    case "span":
    case "svg":
    case "path":
      break;
    case "a":
      target$jscomp$0.push(startChunkForTag("a"));
      var children = null,
        innerHTML = null,
        propKey;
      for (propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (null != propValue)
            switch (propKey) {
              case "children":
                children = propValue;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML = propValue;
                break;
              case "href":
                "" === propValue
                  ? pushStringAttribute(target$jscomp$0, "href", "")
                  : pushAttribute(target$jscomp$0, propKey, propValue);
                break;
              default:
                pushAttribute(target$jscomp$0, propKey, propValue);
            }
        }
      pushViewTransitionAttributes(target$jscomp$0, formatContext);
      target$jscomp$0.push(">");
      pushInnerHTML(target$jscomp$0, innerHTML, children);
      if ("string" === typeof children) {
        target$jscomp$0.push(escapeTextForBrowser(children));
        var JSCompiler_inline_result = null;
      } else JSCompiler_inline_result = children;
      return JSCompiler_inline_result;
    case "g":
    case "p":
    case "li":
      break;
    case "select":
      target$jscomp$0.push(startChunkForTag("select"));
      var children$jscomp$0 = null,
        innerHTML$jscomp$0 = null,
        propKey$jscomp$0;
      for (propKey$jscomp$0 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$0)) {
          var propValue$jscomp$0 = props[propKey$jscomp$0];
          if (null != propValue$jscomp$0)
            switch (propKey$jscomp$0) {
              case "children":
                children$jscomp$0 = propValue$jscomp$0;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$0 = propValue$jscomp$0;
                break;
              case "defaultValue":
              case "value":
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$0,
                  propValue$jscomp$0
                );
            }
        }
      pushViewTransitionAttributes(target$jscomp$0, formatContext);
      target$jscomp$0.push(">");
      pushInnerHTML(target$jscomp$0, innerHTML$jscomp$0, children$jscomp$0);
      return children$jscomp$0;
    case "option":
      var selectedValue = formatContext.selectedValue;
      target$jscomp$0.push(startChunkForTag("option"));
      var children$jscomp$1 = null,
        value = null,
        selected = null,
        innerHTML$jscomp$1 = null,
        propKey$jscomp$1;
      for (propKey$jscomp$1 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$1)) {
          var propValue$jscomp$1 = props[propKey$jscomp$1];
          if (null != propValue$jscomp$1)
            switch (propKey$jscomp$1) {
              case "children":
                children$jscomp$1 = propValue$jscomp$1;
                break;
              case "selected":
                selected = propValue$jscomp$1;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$1 = propValue$jscomp$1;
                break;
              case "value":
                value = propValue$jscomp$1;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$1,
                  propValue$jscomp$1
                );
            }
        }
      if (null != selectedValue) {
        var stringValue =
          null !== value
            ? "" + value
            : flattenOptionChildren(children$jscomp$1);
        if (isArrayImpl(selectedValue))
          for (var i = 0; i < selectedValue.length; i++) {
            if ("" + selectedValue[i] === stringValue) {
              target$jscomp$0.push(' selected=""');
              break;
            }
          }
        else
          "" + selectedValue === stringValue &&
            target$jscomp$0.push(' selected=""');
      } else selected && target$jscomp$0.push(' selected=""');
      target$jscomp$0.push(">");
      pushInnerHTML(target$jscomp$0, innerHTML$jscomp$1, children$jscomp$1);
      return children$jscomp$1;
    case "textarea":
      target$jscomp$0.push(startChunkForTag("textarea"));
      var value$jscomp$0 = null,
        defaultValue = null,
        children$jscomp$2 = null,
        propKey$jscomp$2;
      for (propKey$jscomp$2 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$2)) {
          var propValue$jscomp$2 = props[propKey$jscomp$2];
          if (null != propValue$jscomp$2)
            switch (propKey$jscomp$2) {
              case "children":
                children$jscomp$2 = propValue$jscomp$2;
                break;
              case "value":
                value$jscomp$0 = propValue$jscomp$2;
                break;
              case "defaultValue":
                defaultValue = propValue$jscomp$2;
                break;
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(91));
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$2,
                  propValue$jscomp$2
                );
            }
        }
      null === value$jscomp$0 &&
        null !== defaultValue &&
        (value$jscomp$0 = defaultValue);
      pushViewTransitionAttributes(target$jscomp$0, formatContext);
      target$jscomp$0.push(">");
      if (null != children$jscomp$2) {
        if (null != value$jscomp$0) throw Error(formatProdErrorMessage(92));
        if (isArrayImpl(children$jscomp$2)) {
          if (1 < children$jscomp$2.length)
            throw Error(formatProdErrorMessage(93));
          value$jscomp$0 = "" + children$jscomp$2[0];
        }
        value$jscomp$0 = "" + children$jscomp$2;
      }
      "string" === typeof value$jscomp$0 &&
        "\n" === value$jscomp$0[0] &&
        target$jscomp$0.push("\n");
      null !== value$jscomp$0 &&
        target$jscomp$0.push(escapeTextForBrowser("" + value$jscomp$0));
      return null;
    case "input":
      target$jscomp$0.push(startChunkForTag("input"));
      var name = null,
        formAction = null,
        formEncType = null,
        formMethod = null,
        formTarget = null,
        value$jscomp$1 = null,
        defaultValue$jscomp$0 = null,
        checked = null,
        defaultChecked = null,
        propKey$jscomp$3;
      for (propKey$jscomp$3 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$3)) {
          var propValue$jscomp$3 = props[propKey$jscomp$3];
          if (null != propValue$jscomp$3)
            switch (propKey$jscomp$3) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(399, "input"));
              case "name":
                name = propValue$jscomp$3;
                break;
              case "formAction":
                formAction = propValue$jscomp$3;
                break;
              case "formEncType":
                formEncType = propValue$jscomp$3;
                break;
              case "formMethod":
                formMethod = propValue$jscomp$3;
                break;
              case "formTarget":
                formTarget = propValue$jscomp$3;
                break;
              case "defaultChecked":
                defaultChecked = propValue$jscomp$3;
                break;
              case "defaultValue":
                defaultValue$jscomp$0 = propValue$jscomp$3;
                break;
              case "checked":
                checked = propValue$jscomp$3;
                break;
              case "value":
                value$jscomp$1 = propValue$jscomp$3;
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$3,
                  propValue$jscomp$3
                );
            }
        }
      var formData = pushFormActionAttribute(
        target$jscomp$0,
        resumableState,
        renderState,
        formAction,
        formEncType,
        formMethod,
        formTarget,
        name
      );
      null !== checked
        ? pushBooleanAttribute(target$jscomp$0, "checked", checked)
        : null !== defaultChecked &&
          pushBooleanAttribute(target$jscomp$0, "checked", defaultChecked);
      null !== value$jscomp$1
        ? pushAttribute(target$jscomp$0, "value", value$jscomp$1)
        : null !== defaultValue$jscomp$0 &&
          pushAttribute(target$jscomp$0, "value", defaultValue$jscomp$0);
      pushViewTransitionAttributes(target$jscomp$0, formatContext);
      target$jscomp$0.push("/>");
      null != formData &&
        formData.forEach(pushAdditionalFormField, target$jscomp$0);
      return null;
    case "button":
      target$jscomp$0.push(startChunkForTag("button"));
      var children$jscomp$3 = null,
        innerHTML$jscomp$2 = null,
        name$jscomp$0 = null,
        formAction$jscomp$0 = null,
        formEncType$jscomp$0 = null,
        formMethod$jscomp$0 = null,
        formTarget$jscomp$0 = null,
        propKey$jscomp$4;
      for (propKey$jscomp$4 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$4)) {
          var propValue$jscomp$4 = props[propKey$jscomp$4];
          if (null != propValue$jscomp$4)
            switch (propKey$jscomp$4) {
              case "children":
                children$jscomp$3 = propValue$jscomp$4;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$2 = propValue$jscomp$4;
                break;
              case "name":
                name$jscomp$0 = propValue$jscomp$4;
                break;
              case "formAction":
                formAction$jscomp$0 = propValue$jscomp$4;
                break;
              case "formEncType":
                formEncType$jscomp$0 = propValue$jscomp$4;
                break;
              case "formMethod":
                formMethod$jscomp$0 = propValue$jscomp$4;
                break;
              case "formTarget":
                formTarget$jscomp$0 = propValue$jscomp$4;
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$4,
                  propValue$jscomp$4
                );
            }
        }
      var formData$jscomp$0 = pushFormActionAttribute(
        target$jscomp$0,
        resumableState,
        renderState,
        formAction$jscomp$0,
        formEncType$jscomp$0,
        formMethod$jscomp$0,
        formTarget$jscomp$0,
        name$jscomp$0
      );
      pushViewTransitionAttributes(target$jscomp$0, formatContext);
      target$jscomp$0.push(">");
      null != formData$jscomp$0 &&
        formData$jscomp$0.forEach(pushAdditionalFormField, target$jscomp$0);
      pushInnerHTML(target$jscomp$0, innerHTML$jscomp$2, children$jscomp$3);
      if ("string" === typeof children$jscomp$3) {
        target$jscomp$0.push(escapeTextForBrowser(children$jscomp$3));
        var JSCompiler_inline_result$jscomp$0 = null;
      } else JSCompiler_inline_result$jscomp$0 = children$jscomp$3;
      return JSCompiler_inline_result$jscomp$0;
    case "form":
      target$jscomp$0.push(startChunkForTag("form"));
      var children$jscomp$4 = null,
        innerHTML$jscomp$3 = null,
        formAction$jscomp$1 = null,
        formEncType$jscomp$1 = null,
        formMethod$jscomp$1 = null,
        formTarget$jscomp$1 = null,
        propKey$jscomp$5;
      for (propKey$jscomp$5 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$5)) {
          var propValue$jscomp$5 = props[propKey$jscomp$5];
          if (null != propValue$jscomp$5)
            switch (propKey$jscomp$5) {
              case "children":
                children$jscomp$4 = propValue$jscomp$5;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$3 = propValue$jscomp$5;
                break;
              case "action":
                formAction$jscomp$1 = propValue$jscomp$5;
                break;
              case "encType":
                formEncType$jscomp$1 = propValue$jscomp$5;
                break;
              case "method":
                formMethod$jscomp$1 = propValue$jscomp$5;
                break;
              case "target":
                formTarget$jscomp$1 = propValue$jscomp$5;
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$5,
                  propValue$jscomp$5
                );
            }
        }
      var formData$jscomp$1 = null,
        formActionName = null;
      if ("function" === typeof formAction$jscomp$1) {
        var customFields = getCustomFormFields(
          resumableState,
          formAction$jscomp$1
        );
        null !== customFields
          ? ((formAction$jscomp$1 = customFields.action || ""),
            (formEncType$jscomp$1 = customFields.encType),
            (formMethod$jscomp$1 = customFields.method),
            (formTarget$jscomp$1 = customFields.target),
            (formData$jscomp$1 = customFields.data),
            (formActionName = customFields.name))
          : (target$jscomp$0.push(
              " ",
              "action",
              '="',
              actionJavaScriptURL,
              '"'
            ),
            (formTarget$jscomp$1 =
              formMethod$jscomp$1 =
              formEncType$jscomp$1 =
              formAction$jscomp$1 =
                null),
            injectFormReplayingRuntime(resumableState, renderState));
      }
      null != formAction$jscomp$1 &&
        pushAttribute(target$jscomp$0, "action", formAction$jscomp$1);
      null != formEncType$jscomp$1 &&
        pushAttribute(target$jscomp$0, "encType", formEncType$jscomp$1);
      null != formMethod$jscomp$1 &&
        pushAttribute(target$jscomp$0, "method", formMethod$jscomp$1);
      null != formTarget$jscomp$1 &&
        pushAttribute(target$jscomp$0, "target", formTarget$jscomp$1);
      pushViewTransitionAttributes(target$jscomp$0, formatContext);
      target$jscomp$0.push(">");
      null !== formActionName &&
        (target$jscomp$0.push('<input type="hidden"'),
        pushStringAttribute(target$jscomp$0, "name", formActionName),
        target$jscomp$0.push("/>"),
        null != formData$jscomp$1 &&
          formData$jscomp$1.forEach(pushAdditionalFormField, target$jscomp$0));
      pushInnerHTML(target$jscomp$0, innerHTML$jscomp$3, children$jscomp$4);
      if ("string" === typeof children$jscomp$4) {
        target$jscomp$0.push(escapeTextForBrowser(children$jscomp$4));
        var JSCompiler_inline_result$jscomp$1 = null;
      } else JSCompiler_inline_result$jscomp$1 = children$jscomp$4;
      return JSCompiler_inline_result$jscomp$1;
    case "menuitem":
      target$jscomp$0.push(startChunkForTag("menuitem"));
      for (var propKey$jscomp$6 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$6)) {
          var propValue$jscomp$6 = props[propKey$jscomp$6];
          if (null != propValue$jscomp$6)
            switch (propKey$jscomp$6) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(400));
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$6,
                  propValue$jscomp$6
                );
            }
        }
      pushViewTransitionAttributes(target$jscomp$0, formatContext);
      target$jscomp$0.push(">");
      return null;
    case "object":
      target$jscomp$0.push(startChunkForTag("object"));
      var children$jscomp$5 = null,
        innerHTML$jscomp$4 = null,
        propKey$jscomp$7;
      for (propKey$jscomp$7 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$7)) {
          var propValue$jscomp$7 = props[propKey$jscomp$7];
          if (null != propValue$jscomp$7)
            switch (propKey$jscomp$7) {
              case "children":
                children$jscomp$5 = propValue$jscomp$7;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$4 = propValue$jscomp$7;
                break;
              case "data":
                var sanitizedValue = sanitizeURL("" + propValue$jscomp$7);
                if ("" === sanitizedValue) break;
                target$jscomp$0.push(
                  " ",
                  "data",
                  '="',
                  escapeTextForBrowser(sanitizedValue),
                  '"'
                );
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$7,
                  propValue$jscomp$7
                );
            }
        }
      pushViewTransitionAttributes(target$jscomp$0, formatContext);
      target$jscomp$0.push(">");
      pushInnerHTML(target$jscomp$0, innerHTML$jscomp$4, children$jscomp$5);
      if ("string" === typeof children$jscomp$5) {
        target$jscomp$0.push(escapeTextForBrowser(children$jscomp$5));
        var JSCompiler_inline_result$jscomp$2 = null;
      } else JSCompiler_inline_result$jscomp$2 = children$jscomp$5;
      return JSCompiler_inline_result$jscomp$2;
    case "title":
      var noscriptTagInScope = formatContext.tagScope & 1,
        isFallback = formatContext.tagScope & 4;
      if (
        4 === formatContext.insertionMode ||
        noscriptTagInScope ||
        null != props.itemProp
      )
        var JSCompiler_inline_result$jscomp$3 = pushTitleImpl(
          target$jscomp$0,
          props
        );
      else
        isFallback
          ? (JSCompiler_inline_result$jscomp$3 = null)
          : (pushTitleImpl(renderState.hoistableChunks, props),
            (JSCompiler_inline_result$jscomp$3 = void 0));
      return JSCompiler_inline_result$jscomp$3;
    case "link":
      var noscriptTagInScope$jscomp$0 = formatContext.tagScope & 1,
        isFallback$jscomp$0 = formatContext.tagScope & 4,
        rel = props.rel,
        href = props.href,
        precedence = props.precedence;
      if (
        4 === formatContext.insertionMode ||
        noscriptTagInScope$jscomp$0 ||
        null != props.itemProp ||
        "string" !== typeof rel ||
        "string" !== typeof href ||
        "" === href
      ) {
        pushLinkImpl(target$jscomp$0, props);
        var JSCompiler_inline_result$jscomp$4 = null;
      } else if ("stylesheet" === props.rel)
        if (
          "string" !== typeof precedence ||
          null != props.disabled ||
          props.onLoad ||
          props.onError
        )
          JSCompiler_inline_result$jscomp$4 = pushLinkImpl(
            target$jscomp$0,
            props
          );
        else {
          var styleQueue = renderState.styles.get(precedence),
            resourceState = resumableState.styleResources.hasOwnProperty(href)
              ? resumableState.styleResources[href]
              : void 0;
          if (null !== resourceState) {
            resumableState.styleResources[href] = null;
            styleQueue ||
              ((styleQueue = {
                precedence: escapeTextForBrowser(precedence),
                rules: [],
                hrefs: [],
                sheets: new Map()
              }),
              renderState.styles.set(precedence, styleQueue));
            var resource = {
              state: 0,
              props: assign({}, props, {
                "data-precedence": props.precedence,
                precedence: null
              })
            };
            if (resourceState) {
              2 === resourceState.length &&
                adoptPreloadCredentials(resource.props, resourceState);
              var preloadResource = renderState.preloads.stylesheets.get(href);
              preloadResource && 0 < preloadResource.length
                ? (preloadResource.length = 0)
                : (resource.state = 1);
            }
            styleQueue.sheets.set(href, resource);
            hoistableState && hoistableState.stylesheets.add(resource);
          } else if (styleQueue) {
            var resource$9 = styleQueue.sheets.get(href);
            resource$9 &&
              hoistableState &&
              hoistableState.stylesheets.add(resource$9);
          }
          textEmbedded && target$jscomp$0.push("\x3c!-- --\x3e");
          JSCompiler_inline_result$jscomp$4 = null;
        }
      else
        props.onLoad || props.onError
          ? (JSCompiler_inline_result$jscomp$4 = pushLinkImpl(
              target$jscomp$0,
              props
            ))
          : (textEmbedded && target$jscomp$0.push("\x3c!-- --\x3e"),
            (JSCompiler_inline_result$jscomp$4 = isFallback$jscomp$0
              ? null
              : pushLinkImpl(renderState.hoistableChunks, props)));
      return JSCompiler_inline_result$jscomp$4;
    case "script":
      var noscriptTagInScope$jscomp$1 = formatContext.tagScope & 1,
        asyncProp = props.async;
      if (
        "string" !== typeof props.src ||
        !props.src ||
        !asyncProp ||
        "function" === typeof asyncProp ||
        "symbol" === typeof asyncProp ||
        props.onLoad ||
        props.onError ||
        4 === formatContext.insertionMode ||
        noscriptTagInScope$jscomp$1 ||
        null != props.itemProp
      )
        var JSCompiler_inline_result$jscomp$5 = pushScriptImpl(
          target$jscomp$0,
          props
        );
      else {
        var key = props.src;
        if ("module" === props.type) {
          var resources = resumableState.moduleScriptResources;
          var preloads = renderState.preloads.moduleScripts;
        } else
          (resources = resumableState.scriptResources),
            (preloads = renderState.preloads.scripts);
        var resourceState$jscomp$0 = resources.hasOwnProperty(key)
          ? resources[key]
          : void 0;
        if (null !== resourceState$jscomp$0) {
          resources[key] = null;
          var scriptProps = props;
          if (resourceState$jscomp$0) {
            2 === resourceState$jscomp$0.length &&
              ((scriptProps = assign({}, props)),
              adoptPreloadCredentials(scriptProps, resourceState$jscomp$0));
            var preloadResource$jscomp$0 = preloads.get(key);
            preloadResource$jscomp$0 && (preloadResource$jscomp$0.length = 0);
          }
          var resource$jscomp$0 = [];
          renderState.scripts.add(resource$jscomp$0);
          pushScriptImpl(resource$jscomp$0, scriptProps);
        }
        textEmbedded && target$jscomp$0.push("\x3c!-- --\x3e");
        JSCompiler_inline_result$jscomp$5 = null;
      }
      return JSCompiler_inline_result$jscomp$5;
    case "style":
      var noscriptTagInScope$jscomp$2 = formatContext.tagScope & 1,
        precedence$jscomp$0 = props.precedence,
        href$jscomp$0 = props.href,
        nonce = props.nonce;
      if (
        4 === formatContext.insertionMode ||
        noscriptTagInScope$jscomp$2 ||
        null != props.itemProp ||
        "string" !== typeof precedence$jscomp$0 ||
        "string" !== typeof href$jscomp$0 ||
        "" === href$jscomp$0
      ) {
        target$jscomp$0.push(startChunkForTag("style"));
        var children$jscomp$6 = null,
          innerHTML$jscomp$5 = null,
          propKey$jscomp$8;
        for (propKey$jscomp$8 in props)
          if (hasOwnProperty.call(props, propKey$jscomp$8)) {
            var propValue$jscomp$8 = props[propKey$jscomp$8];
            if (null != propValue$jscomp$8)
              switch (propKey$jscomp$8) {
                case "children":
                  children$jscomp$6 = propValue$jscomp$8;
                  break;
                case "dangerouslySetInnerHTML":
                  innerHTML$jscomp$5 = propValue$jscomp$8;
                  break;
                default:
                  pushAttribute(
                    target$jscomp$0,
                    propKey$jscomp$8,
                    propValue$jscomp$8
                  );
              }
          }
        target$jscomp$0.push(">");
        var child = Array.isArray(children$jscomp$6)
          ? 2 > children$jscomp$6.length
            ? children$jscomp$6[0]
            : null
          : children$jscomp$6;
        "function" !== typeof child &&
          "symbol" !== typeof child &&
          null !== child &&
          void 0 !== child &&
          target$jscomp$0.push(("" + child).replace(styleRegex, styleReplacer));
        pushInnerHTML(target$jscomp$0, innerHTML$jscomp$5, children$jscomp$6);
        target$jscomp$0.push(endChunkForTag("style"));
        var JSCompiler_inline_result$jscomp$6 = null;
      } else {
        var styleQueue$jscomp$0 = renderState.styles.get(precedence$jscomp$0);
        if (
          null !==
          (resumableState.styleResources.hasOwnProperty(href$jscomp$0)
            ? resumableState.styleResources[href$jscomp$0]
            : void 0)
        ) {
          resumableState.styleResources[href$jscomp$0] = null;
          styleQueue$jscomp$0 ||
            ((styleQueue$jscomp$0 = {
              precedence: escapeTextForBrowser(precedence$jscomp$0),
              rules: [],
              hrefs: [],
              sheets: new Map()
            }),
            renderState.styles.set(precedence$jscomp$0, styleQueue$jscomp$0));
          var nonceStyle = renderState.nonce.style;
          if (!nonceStyle || nonceStyle === nonce) {
            styleQueue$jscomp$0.hrefs.push(escapeTextForBrowser(href$jscomp$0));
            var target = styleQueue$jscomp$0.rules,
              children$jscomp$7 = null,
              innerHTML$jscomp$6 = null,
              propKey$jscomp$9;
            for (propKey$jscomp$9 in props)
              if (hasOwnProperty.call(props, propKey$jscomp$9)) {
                var propValue$jscomp$9 = props[propKey$jscomp$9];
                if (null != propValue$jscomp$9)
                  switch (propKey$jscomp$9) {
                    case "children":
                      children$jscomp$7 = propValue$jscomp$9;
                      break;
                    case "dangerouslySetInnerHTML":
                      innerHTML$jscomp$6 = propValue$jscomp$9;
                  }
              }
            var child$jscomp$0 = Array.isArray(children$jscomp$7)
              ? 2 > children$jscomp$7.length
                ? children$jscomp$7[0]
                : null
              : children$jscomp$7;
            "function" !== typeof child$jscomp$0 &&
              "symbol" !== typeof child$jscomp$0 &&
              null !== child$jscomp$0 &&
              void 0 !== child$jscomp$0 &&
              target.push(
                ("" + child$jscomp$0).replace(styleRegex, styleReplacer)
              );
            pushInnerHTML(target, innerHTML$jscomp$6, children$jscomp$7);
          }
        }
        styleQueue$jscomp$0 &&
          hoistableState &&
          hoistableState.styles.add(styleQueue$jscomp$0);
        textEmbedded && target$jscomp$0.push("\x3c!-- --\x3e");
        JSCompiler_inline_result$jscomp$6 = void 0;
      }
      return JSCompiler_inline_result$jscomp$6;
    case "meta":
      var noscriptTagInScope$jscomp$3 = formatContext.tagScope & 1,
        isFallback$jscomp$1 = formatContext.tagScope & 4;
      if (
        4 === formatContext.insertionMode ||
        noscriptTagInScope$jscomp$3 ||
        null != props.itemProp
      )
        var JSCompiler_inline_result$jscomp$7 = pushSelfClosing(
          target$jscomp$0,
          props,
          "meta",
          formatContext
        );
      else
        textEmbedded && target$jscomp$0.push("\x3c!-- --\x3e"),
          (JSCompiler_inline_result$jscomp$7 = isFallback$jscomp$1
            ? null
            : "string" === typeof props.charSet
              ? pushSelfClosing(
                  renderState.charsetChunks,
                  props,
                  "meta",
                  formatContext
                )
              : "viewport" === props.name
                ? pushSelfClosing(
                    renderState.viewportChunks,
                    props,
                    "meta",
                    formatContext
                  )
                : pushSelfClosing(
                    renderState.hoistableChunks,
                    props,
                    "meta",
                    formatContext
                  ));
      return JSCompiler_inline_result$jscomp$7;
    case "listing":
    case "pre":
      target$jscomp$0.push(startChunkForTag(type));
      var children$jscomp$8 = null,
        innerHTML$jscomp$7 = null,
        propKey$jscomp$10;
      for (propKey$jscomp$10 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$10)) {
          var propValue$jscomp$10 = props[propKey$jscomp$10];
          if (null != propValue$jscomp$10)
            switch (propKey$jscomp$10) {
              case "children":
                children$jscomp$8 = propValue$jscomp$10;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$7 = propValue$jscomp$10;
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$10,
                  propValue$jscomp$10
                );
            }
        }
      pushViewTransitionAttributes(target$jscomp$0, formatContext);
      target$jscomp$0.push(">");
      if (null != innerHTML$jscomp$7) {
        if (null != children$jscomp$8) throw Error(formatProdErrorMessage(60));
        if (
          "object" !== typeof innerHTML$jscomp$7 ||
          !("__html" in innerHTML$jscomp$7)
        )
          throw Error(formatProdErrorMessage(61));
        var html = innerHTML$jscomp$7.__html;
        null !== html &&
          void 0 !== html &&
          ("string" === typeof html && 0 < html.length && "\n" === html[0]
            ? target$jscomp$0.push("\n", html)
            : target$jscomp$0.push("" + html));
      }
      "string" === typeof children$jscomp$8 &&
        "\n" === children$jscomp$8[0] &&
        target$jscomp$0.push("\n");
      return children$jscomp$8;
    case "img":
      var pictureOrNoScriptTagInScope = formatContext.tagScope & 3,
        src = props.src,
        srcSet = props.srcSet;
      if (
        !(
          "lazy" === props.loading ||
          (!src && !srcSet) ||
          ("string" !== typeof src && null != src) ||
          ("string" !== typeof srcSet && null != srcSet) ||
          "low" === props.fetchPriority ||
          pictureOrNoScriptTagInScope
        ) &&
        ("string" !== typeof src ||
          ":" !== src[4] ||
          ("d" !== src[0] && "D" !== src[0]) ||
          ("a" !== src[1] && "A" !== src[1]) ||
          ("t" !== src[2] && "T" !== src[2]) ||
          ("a" !== src[3] && "A" !== src[3])) &&
        ("string" !== typeof srcSet ||
          ":" !== srcSet[4] ||
          ("d" !== srcSet[0] && "D" !== srcSet[0]) ||
          ("a" !== srcSet[1] && "A" !== srcSet[1]) ||
          ("t" !== srcSet[2] && "T" !== srcSet[2]) ||
          ("a" !== srcSet[3] && "A" !== srcSet[3]))
      ) {
        null !== hoistableState &&
          formatContext.tagScope & 64 &&
          (hoistableState.suspenseyImages = !0);
        var sizes = "string" === typeof props.sizes ? props.sizes : void 0,
          key$jscomp$0 = srcSet ? srcSet + "\n" + (sizes || "") : src,
          promotablePreloads = renderState.preloads.images,
          resource$jscomp$1 = promotablePreloads.get(key$jscomp$0);
        if (resource$jscomp$1) {
          if (
            "high" === props.fetchPriority ||
            10 > renderState.highImagePreloads.size
          )
            promotablePreloads.delete(key$jscomp$0),
              renderState.highImagePreloads.add(resource$jscomp$1);
        } else if (
          !resumableState.imageResources.hasOwnProperty(key$jscomp$0)
        ) {
          resumableState.imageResources[key$jscomp$0] = PRELOAD_NO_CREDS;
          var input = props.crossOrigin;
          var JSCompiler_inline_result$jscomp$8 =
            "string" === typeof input
              ? "use-credentials" === input
                ? input
                : ""
              : void 0;
          var headers = renderState.headers,
            header;
          headers &&
          0 < headers.remainingCapacity &&
          "string" !== typeof props.srcSet &&
          ("high" === props.fetchPriority ||
            500 > headers.highImagePreloads.length) &&
          ((header = getPreloadAsHeader(src, "image", {
            imageSrcSet: props.srcSet,
            imageSizes: props.sizes,
            crossOrigin: JSCompiler_inline_result$jscomp$8,
            integrity: props.integrity,
            nonce: props.nonce,
            type: props.type,
            fetchPriority: props.fetchPriority,
            referrerPolicy: props.referrerPolicy
          })),
          0 <= (headers.remainingCapacity -= header.length + 2))
            ? ((renderState.resets.image[key$jscomp$0] = PRELOAD_NO_CREDS),
              headers.highImagePreloads && (headers.highImagePreloads += ", "),
              (headers.highImagePreloads += header))
            : ((resource$jscomp$1 = []),
              pushLinkImpl(resource$jscomp$1, {
                rel: "preload",
                as: "image",
                href: srcSet ? void 0 : src,
                imageSrcSet: srcSet,
                imageSizes: sizes,
                crossOrigin: JSCompiler_inline_result$jscomp$8,
                integrity: props.integrity,
                type: props.type,
                fetchPriority: props.fetchPriority,
                referrerPolicy: props.referrerPolicy
              }),
              "high" === props.fetchPriority ||
              10 > renderState.highImagePreloads.size
                ? renderState.highImagePreloads.add(resource$jscomp$1)
                : (renderState.bulkPreloads.add(resource$jscomp$1),
                  promotablePreloads.set(key$jscomp$0, resource$jscomp$1)));
        }
      }
      return pushSelfClosing(target$jscomp$0, props, "img", formatContext);
    case "base":
    case "area":
    case "br":
    case "col":
    case "embed":
    case "hr":
    case "keygen":
    case "param":
    case "source":
    case "track":
    case "wbr":
      return pushSelfClosing(target$jscomp$0, props, type, formatContext);
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      break;
    case "head":
      if (2 > formatContext.insertionMode) {
        var preamble = preambleState || renderState.preamble;
        if (preamble.headChunks)
          throw Error(formatProdErrorMessage(545, "`<head>`"));
        null !== preambleState && target$jscomp$0.push("\x3c!--head--\x3e");
        preamble.headChunks = [];
        var JSCompiler_inline_result$jscomp$9 = pushStartSingletonElement(
          preamble.headChunks,
          props,
          "head",
          formatContext
        );
      } else
        JSCompiler_inline_result$jscomp$9 = pushStartGenericElement(
          target$jscomp$0,
          props,
          "head",
          formatContext
        );
      return JSCompiler_inline_result$jscomp$9;
    case "body":
      if (2 > formatContext.insertionMode) {
        var preamble$jscomp$0 = preambleState || renderState.preamble;
        if (preamble$jscomp$0.bodyChunks)
          throw Error(formatProdErrorMessage(545, "`<body>`"));
        null !== preambleState && target$jscomp$0.push("\x3c!--body--\x3e");
        preamble$jscomp$0.bodyChunks = [];
        var JSCompiler_inline_result$jscomp$10 = pushStartSingletonElement(
          preamble$jscomp$0.bodyChunks,
          props,
          "body",
          formatContext
        );
      } else
        JSCompiler_inline_result$jscomp$10 = pushStartGenericElement(
          target$jscomp$0,
          props,
          "body",
          formatContext
        );
      return JSCompiler_inline_result$jscomp$10;
    case "html":
      if (0 === formatContext.insertionMode) {
        var preamble$jscomp$1 = preambleState || renderState.preamble;
        if (preamble$jscomp$1.htmlChunks)
          throw Error(formatProdErrorMessage(545, "`<html>`"));
        null !== preambleState && target$jscomp$0.push("\x3c!--html--\x3e");
        preamble$jscomp$1.htmlChunks = [""];
        var JSCompiler_inline_result$jscomp$11 = pushStartSingletonElement(
          preamble$jscomp$1.htmlChunks,
          props,
          "html",
          formatContext
        );
      } else
        JSCompiler_inline_result$jscomp$11 = pushStartGenericElement(
          target$jscomp$0,
          props,
          "html",
          formatContext
        );
      return JSCompiler_inline_result$jscomp$11;
    default:
      if (-1 !== type.indexOf("-")) {
        target$jscomp$0.push(startChunkForTag(type));
        var children$jscomp$9 = null,
          innerHTML$jscomp$8 = null,
          propKey$jscomp$11;
        for (propKey$jscomp$11 in props)
          if (hasOwnProperty.call(props, propKey$jscomp$11)) {
            var propValue$jscomp$11 = props[propKey$jscomp$11];
            if (null != propValue$jscomp$11) {
              var attributeName = propKey$jscomp$11;
              switch (propKey$jscomp$11) {
                case "children":
                  children$jscomp$9 = propValue$jscomp$11;
                  break;
                case "dangerouslySetInnerHTML":
                  innerHTML$jscomp$8 = propValue$jscomp$11;
                  break;
                case "style":
                  pushStyleAttribute(target$jscomp$0, propValue$jscomp$11);
                  break;
                case "suppressContentEditableWarning":
                case "suppressHydrationWarning":
                case "ref":
                  break;
                case "className":
                  attributeName = "class";
                default:
                  if (
                    isAttributeNameSafe(propKey$jscomp$11) &&
                    "function" !== typeof propValue$jscomp$11 &&
                    "symbol" !== typeof propValue$jscomp$11 &&
                    !1 !== propValue$jscomp$11
                  ) {
                    if (!0 === propValue$jscomp$11) propValue$jscomp$11 = "";
                    else if ("object" === typeof propValue$jscomp$11) continue;
                    target$jscomp$0.push(
                      " ",
                      attributeName,
                      '="',
                      escapeTextForBrowser(propValue$jscomp$11),
                      '"'
                    );
                  }
              }
            }
          }
        pushViewTransitionAttributes(target$jscomp$0, formatContext);
        target$jscomp$0.push(">");
        pushInnerHTML(target$jscomp$0, innerHTML$jscomp$8, children$jscomp$9);
        return children$jscomp$9;
      }
  }
  return pushStartGenericElement(target$jscomp$0, props, type, formatContext);
}
var endTagCache = new Map();
function endChunkForTag(tag) {
  var chunk = endTagCache.get(tag);
  void 0 === chunk && ((chunk = "</" + tag + ">"), endTagCache.set(tag, chunk));
  return chunk;
}
function hoistPreambleState(renderState, preambleState) {
  renderState = renderState.preamble;
  null === renderState.htmlChunks &&
    preambleState.htmlChunks &&
    (renderState.htmlChunks = preambleState.htmlChunks);
  null === renderState.headChunks &&
    preambleState.headChunks &&
    (renderState.headChunks = preambleState.headChunks);
  null === renderState.bodyChunks &&
    preambleState.bodyChunks &&
    (renderState.bodyChunks = preambleState.bodyChunks);
}
function writeBootstrap(destination, renderState) {
  renderState = renderState.bootstrapChunks;
  for (var i = 0; i < renderState.length - 1; i++)
    destination.push(renderState[i]);
  return i < renderState.length
    ? ((i = renderState[i]), (renderState.length = 0), destination.push(i))
    : !0;
}
function writeStartPendingSuspenseBoundary(destination, renderState, id) {
  destination.push('\x3c!--$?--\x3e<template id="');
  if (null === id) throw Error(formatProdErrorMessage(395));
  destination.push(renderState.boundaryPrefix);
  renderState = id.toString(16);
  destination.push(renderState);
  return destination.push('"></template>');
}
function writeStartSegment(destination, renderState, formatContext, id) {
  switch (formatContext.insertionMode) {
    case 0:
    case 1:
    case 3:
    case 2:
      return (
        destination.push('<div hidden id="'),
        destination.push(renderState.segmentPrefix),
        (renderState = id.toString(16)),
        destination.push(renderState),
        destination.push('">')
      );
    case 4:
      return (
        destination.push('<svg aria-hidden="true" style="display:none" id="'),
        destination.push(renderState.segmentPrefix),
        (renderState = id.toString(16)),
        destination.push(renderState),
        destination.push('">')
      );
    case 5:
      return (
        destination.push('<math aria-hidden="true" style="display:none" id="'),
        destination.push(renderState.segmentPrefix),
        (renderState = id.toString(16)),
        destination.push(renderState),
        destination.push('">')
      );
    case 6:
      return (
        destination.push('<table hidden id="'),
        destination.push(renderState.segmentPrefix),
        (renderState = id.toString(16)),
        destination.push(renderState),
        destination.push('">')
      );
    case 7:
      return (
        destination.push('<table hidden><tbody id="'),
        destination.push(renderState.segmentPrefix),
        (renderState = id.toString(16)),
        destination.push(renderState),
        destination.push('">')
      );
    case 8:
      return (
        destination.push('<table hidden><tr id="'),
        destination.push(renderState.segmentPrefix),
        (renderState = id.toString(16)),
        destination.push(renderState),
        destination.push('">')
      );
    case 9:
      return (
        destination.push('<table hidden><colgroup id="'),
        destination.push(renderState.segmentPrefix),
        (renderState = id.toString(16)),
        destination.push(renderState),
        destination.push('">')
      );
    default:
      throw Error(formatProdErrorMessage(397));
  }
}
function writeEndSegment(destination, formatContext) {
  switch (formatContext.insertionMode) {
    case 0:
    case 1:
    case 3:
    case 2:
      return destination.push("</div>");
    case 4:
      return destination.push("</svg>");
    case 5:
      return destination.push("</math>");
    case 6:
      return destination.push("</table>");
    case 7:
      return destination.push("</tbody></table>");
    case 8:
      return destination.push("</tr></table>");
    case 9:
      return destination.push("</colgroup></table>");
    default:
      throw Error(formatProdErrorMessage(397));
  }
}
var regexForJSStringsInInstructionScripts = /[<\u2028\u2029]/g;
function escapeJSStringsForInstructionScripts(input) {
  return JSON.stringify(input).replace(
    regexForJSStringsInInstructionScripts,
    function (match) {
      switch (match) {
        case "<":
          return "\\u003c";
        case "\u2028":
          return "\\u2028";
        case "\u2029":
          return "\\u2029";
        default:
          throw Error(
            "escapeJSStringsForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
          );
      }
    }
  );
}
var regexForJSStringsInScripts = /[&><\u2028\u2029]/g;
function escapeJSObjectForInstructionScripts(input) {
  return JSON.stringify(input).replace(
    regexForJSStringsInScripts,
    function (match) {
      switch (match) {
        case "&":
          return "\\u0026";
        case ">":
          return "\\u003e";
        case "<":
          return "\\u003c";
        case "\u2028":
          return "\\u2028";
        case "\u2029":
          return "\\u2029";
        default:
          throw Error(
            "escapeJSObjectForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
          );
      }
    }
  );
}
var currentlyRenderingBoundaryHasStylesToHoist = !1,
  destinationHasCapacity = !0;
function flushStyleTagsLateForBoundary(styleQueue) {
  var rules = styleQueue.rules,
    hrefs = styleQueue.hrefs,
    i = 0;
  if (hrefs.length) {
    this.push(currentlyFlushingRenderState.startInlineStyle);
    this.push(' media="not all" data-precedence="');
    this.push(styleQueue.precedence);
    for (this.push('" data-href="'); i < hrefs.length - 1; i++)
      this.push(hrefs[i]), this.push(" ");
    this.push(hrefs[i]);
    this.push('">');
    for (i = 0; i < rules.length; i++) this.push(rules[i]);
    destinationHasCapacity = this.push("</style>");
    currentlyRenderingBoundaryHasStylesToHoist = !0;
    rules.length = 0;
    hrefs.length = 0;
  }
}
function hasStylesToHoist(stylesheet) {
  return 2 !== stylesheet.state
    ? (currentlyRenderingBoundaryHasStylesToHoist = !0)
    : !1;
}
function writeHoistablesForBoundary(destination, hoistableState, renderState) {
  currentlyRenderingBoundaryHasStylesToHoist = !1;
  destinationHasCapacity = !0;
  currentlyFlushingRenderState = renderState;
  hoistableState.styles.forEach(flushStyleTagsLateForBoundary, destination);
  currentlyFlushingRenderState = null;
  hoistableState.stylesheets.forEach(hasStylesToHoist);
  currentlyRenderingBoundaryHasStylesToHoist &&
    (renderState.stylesToHoist = !0);
  return destinationHasCapacity;
}
function flushResource(resource) {
  for (var i = 0; i < resource.length; i++) this.push(resource[i]);
  resource.length = 0;
}
var stylesheetFlushingQueue = [];
function flushStyleInPreamble(stylesheet) {
  pushLinkImpl(stylesheetFlushingQueue, stylesheet.props);
  for (var i = 0; i < stylesheetFlushingQueue.length; i++)
    this.push(stylesheetFlushingQueue[i]);
  stylesheetFlushingQueue.length = 0;
  stylesheet.state = 2;
}
function flushStylesInPreamble(styleQueue) {
  var hasStylesheets = 0 < styleQueue.sheets.size;
  styleQueue.sheets.forEach(flushStyleInPreamble, this);
  styleQueue.sheets.clear();
  var rules = styleQueue.rules,
    hrefs = styleQueue.hrefs;
  if (!hasStylesheets || hrefs.length) {
    this.push(currentlyFlushingRenderState.startInlineStyle);
    this.push(' data-precedence="');
    this.push(styleQueue.precedence);
    styleQueue = 0;
    if (hrefs.length) {
      for (
        this.push('" data-href="');
        styleQueue < hrefs.length - 1;
        styleQueue++
      )
        this.push(hrefs[styleQueue]), this.push(" ");
      this.push(hrefs[styleQueue]);
    }
    this.push('">');
    for (styleQueue = 0; styleQueue < rules.length; styleQueue++)
      this.push(rules[styleQueue]);
    this.push("</style>");
    rules.length = 0;
    hrefs.length = 0;
  }
}
function preloadLateStyle(stylesheet) {
  if (0 === stylesheet.state) {
    stylesheet.state = 1;
    var props = stylesheet.props;
    pushLinkImpl(stylesheetFlushingQueue, {
      rel: "preload",
      as: "style",
      href: stylesheet.props.href,
      crossOrigin: props.crossOrigin,
      fetchPriority: props.fetchPriority,
      integrity: props.integrity,
      media: props.media,
      hrefLang: props.hrefLang,
      referrerPolicy: props.referrerPolicy
    });
    for (
      stylesheet = 0;
      stylesheet < stylesheetFlushingQueue.length;
      stylesheet++
    )
      this.push(stylesheetFlushingQueue[stylesheet]);
    stylesheetFlushingQueue.length = 0;
  }
}
function preloadLateStyles(styleQueue) {
  styleQueue.sheets.forEach(preloadLateStyle, this);
  styleQueue.sheets.clear();
}
function writeCompletedShellIdAttribute(destination, resumableState) {
  0 === (resumableState.instructions & 32) &&
    ((resumableState.instructions |= 32),
    (resumableState = "_" + resumableState.idPrefix + "R_"),
    destination.push(' id="'),
    (resumableState = escapeTextForBrowser(resumableState)),
    destination.push(resumableState),
    destination.push('"'));
}
function pushCompletedShellIdAttribute(target, resumableState) {
  0 === (resumableState.instructions & 32) &&
    ((resumableState.instructions |= 32),
    target.push(
      ' id="',
      escapeTextForBrowser("_" + resumableState.idPrefix + "R_"),
      '"'
    ));
}
function writeStyleResourceDependenciesInJS(destination, hoistableState) {
  destination.push("[");
  var nextArrayOpenBrackChunk = "[";
  hoistableState.stylesheets.forEach(function (resource) {
    if (2 !== resource.state)
      if (3 === resource.state)
        destination.push(nextArrayOpenBrackChunk),
          (resource = escapeJSObjectForInstructionScripts(
            "" + resource.props.href
          )),
          destination.push(resource),
          destination.push("]"),
          (nextArrayOpenBrackChunk = ",[");
      else {
        destination.push(nextArrayOpenBrackChunk);
        var precedence = resource.props["data-precedence"],
          props = resource.props,
          coercedHref = sanitizeURL("" + resource.props.href);
        coercedHref = escapeJSObjectForInstructionScripts(coercedHref);
        destination.push(coercedHref);
        precedence = "" + precedence;
        destination.push(",");
        precedence = escapeJSObjectForInstructionScripts(precedence);
        destination.push(precedence);
        for (var propKey in props)
          if (
            hasOwnProperty.call(props, propKey) &&
            ((precedence = props[propKey]), null != precedence)
          )
            switch (propKey) {
              case "href":
              case "rel":
              case "precedence":
              case "data-precedence":
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(399, "link"));
              default:
                writeStyleResourceAttributeInJS(
                  destination,
                  propKey,
                  precedence
                );
            }
        destination.push("]");
        nextArrayOpenBrackChunk = ",[";
        resource.state = 3;
      }
  });
  destination.push("]");
}
function writeStyleResourceAttributeInJS(destination, name, value) {
  var attributeName = name.toLowerCase();
  switch (typeof value) {
    case "function":
    case "symbol":
      return;
  }
  switch (name) {
    case "innerHTML":
    case "dangerouslySetInnerHTML":
    case "suppressContentEditableWarning":
    case "suppressHydrationWarning":
    case "style":
    case "ref":
      return;
    case "className":
      attributeName = "class";
      name = "" + value;
      break;
    case "hidden":
      if (!1 === value) return;
      name = "";
      break;
    case "src":
    case "href":
      value = sanitizeURL(value);
      name = "" + value;
      break;
    default:
      if (
        (2 < name.length &&
          ("o" === name[0] || "O" === name[0]) &&
          ("n" === name[1] || "N" === name[1])) ||
        !isAttributeNameSafe(name)
      )
        return;
      name = "" + value;
  }
  destination.push(",");
  attributeName = escapeJSObjectForInstructionScripts(attributeName);
  destination.push(attributeName);
  destination.push(",");
  attributeName = escapeJSObjectForInstructionScripts(name);
  destination.push(attributeName);
}
function writeStyleResourceDependenciesInAttr(destination, hoistableState) {
  destination.push("[");
  var nextArrayOpenBrackChunk = "[";
  hoistableState.stylesheets.forEach(function (resource) {
    if (2 !== resource.state)
      if (3 === resource.state)
        destination.push(nextArrayOpenBrackChunk),
          (resource = escapeTextForBrowser(
            JSON.stringify("" + resource.props.href)
          )),
          destination.push(resource),
          destination.push("]"),
          (nextArrayOpenBrackChunk = ",[");
      else {
        destination.push(nextArrayOpenBrackChunk);
        var precedence = resource.props["data-precedence"],
          props = resource.props,
          coercedHref = sanitizeURL("" + resource.props.href);
        coercedHref = escapeTextForBrowser(JSON.stringify(coercedHref));
        destination.push(coercedHref);
        precedence = "" + precedence;
        destination.push(",");
        precedence = escapeTextForBrowser(JSON.stringify(precedence));
        destination.push(precedence);
        for (var propKey in props)
          if (
            hasOwnProperty.call(props, propKey) &&
            ((precedence = props[propKey]), null != precedence)
          )
            switch (propKey) {
              case "href":
              case "rel":
              case "precedence":
              case "data-precedence":
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(399, "link"));
              default:
                writeStyleResourceAttributeInAttr(
                  destination,
                  propKey,
                  precedence
                );
            }
        destination.push("]");
        nextArrayOpenBrackChunk = ",[";
        resource.state = 3;
      }
  });
  destination.push("]");
}
function writeStyleResourceAttributeInAttr(destination, name, value) {
  var attributeName = name.toLowerCase();
  switch (typeof value) {
    case "function":
    case "symbol":
      return;
  }
  switch (name) {
    case "innerHTML":
    case "dangerouslySetInnerHTML":
    case "suppressContentEditableWarning":
    case "suppressHydrationWarning":
    case "style":
    case "ref":
      return;
    case "className":
      attributeName = "class";
      name = "" + value;
      break;
    case "hidden":
      if (!1 === value) return;
      name = "";
      break;
    case "src":
    case "href":
      value = sanitizeURL(value);
      name = "" + value;
      break;
    default:
      if (
        (2 < name.length &&
          ("o" === name[0] || "O" === name[0]) &&
          ("n" === name[1] || "N" === name[1])) ||
        !isAttributeNameSafe(name)
      )
        return;
      name = "" + value;
  }
  destination.push(",");
  attributeName = escapeTextForBrowser(JSON.stringify(attributeName));
  destination.push(attributeName);
  destination.push(",");
  attributeName = escapeTextForBrowser(JSON.stringify(name));
  destination.push(attributeName);
}
function createHoistableState() {
  return { styles: new Set(), stylesheets: new Set(), suspenseyImages: !1 };
}
function prefetchDNS(href) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if ("string" === typeof href && href) {
      if (!resumableState.dnsResources.hasOwnProperty(href)) {
        resumableState.dnsResources[href] = null;
        resumableState = renderState.headers;
        var header, JSCompiler_temp;
        if (
          (JSCompiler_temp =
            resumableState && 0 < resumableState.remainingCapacity)
        )
          JSCompiler_temp =
            ((header =
              "<" +
              ("" + href).replace(
                regexForHrefInLinkHeaderURLContext,
                escapeHrefForLinkHeaderURLContextReplacer
              ) +
              ">; rel=dns-prefetch"),
            0 <= (resumableState.remainingCapacity -= header.length + 2));
        JSCompiler_temp
          ? ((renderState.resets.dns[href] = null),
            resumableState.preconnects && (resumableState.preconnects += ", "),
            (resumableState.preconnects += header))
          : ((header = []),
            pushLinkImpl(header, { href: href, rel: "dns-prefetch" }),
            renderState.preconnects.add(header));
      }
      enqueueFlush(request);
    }
  } else previousDispatcher.D(href);
}
function preconnect(href, crossOrigin) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if ("string" === typeof href && href) {
      var bucket =
        "use-credentials" === crossOrigin
          ? "credentials"
          : "string" === typeof crossOrigin
            ? "anonymous"
            : "default";
      if (!resumableState.connectResources[bucket].hasOwnProperty(href)) {
        resumableState.connectResources[bucket][href] = null;
        resumableState = renderState.headers;
        var header, JSCompiler_temp;
        if (
          (JSCompiler_temp =
            resumableState && 0 < resumableState.remainingCapacity)
        ) {
          JSCompiler_temp =
            "<" +
            ("" + href).replace(
              regexForHrefInLinkHeaderURLContext,
              escapeHrefForLinkHeaderURLContextReplacer
            ) +
            ">; rel=preconnect";
          if ("string" === typeof crossOrigin) {
            var escapedCrossOrigin = ("" + crossOrigin).replace(
              regexForLinkHeaderQuotedParamValueContext,
              escapeStringForLinkHeaderQuotedParamValueContextReplacer
            );
            JSCompiler_temp += '; crossorigin="' + escapedCrossOrigin + '"';
          }
          JSCompiler_temp =
            ((header = JSCompiler_temp),
            0 <= (resumableState.remainingCapacity -= header.length + 2));
        }
        JSCompiler_temp
          ? ((renderState.resets.connect[bucket][href] = null),
            resumableState.preconnects && (resumableState.preconnects += ", "),
            (resumableState.preconnects += header))
          : ((bucket = []),
            pushLinkImpl(bucket, {
              rel: "preconnect",
              href: href,
              crossOrigin: crossOrigin
            }),
            renderState.preconnects.add(bucket));
      }
      enqueueFlush(request);
    }
  } else previousDispatcher.C(href, crossOrigin);
}
function preload(href, as, options) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if (as && href) {
      switch (as) {
        case "image":
          if (options) {
            var imageSrcSet = options.imageSrcSet;
            var imageSizes = options.imageSizes;
            var fetchPriority = options.fetchPriority;
          }
          var key = imageSrcSet
            ? imageSrcSet + "\n" + (imageSizes || "")
            : href;
          if (resumableState.imageResources.hasOwnProperty(key)) return;
          resumableState.imageResources[key] = PRELOAD_NO_CREDS;
          resumableState = renderState.headers;
          var header;
          resumableState &&
          0 < resumableState.remainingCapacity &&
          "string" !== typeof imageSrcSet &&
          "high" === fetchPriority &&
          ((header = getPreloadAsHeader(href, as, options)),
          0 <= (resumableState.remainingCapacity -= header.length + 2))
            ? ((renderState.resets.image[key] = PRELOAD_NO_CREDS),
              resumableState.highImagePreloads &&
                (resumableState.highImagePreloads += ", "),
              (resumableState.highImagePreloads += header))
            : ((resumableState = []),
              pushLinkImpl(
                resumableState,
                assign(
                  { rel: "preload", href: imageSrcSet ? void 0 : href, as: as },
                  options
                )
              ),
              "high" === fetchPriority
                ? renderState.highImagePreloads.add(resumableState)
                : (renderState.bulkPreloads.add(resumableState),
                  renderState.preloads.images.set(key, resumableState)));
          break;
        case "style":
          if (resumableState.styleResources.hasOwnProperty(href)) return;
          imageSrcSet = [];
          pushLinkImpl(
            imageSrcSet,
            assign({ rel: "preload", href: href, as: as }, options)
          );
          resumableState.styleResources[href] =
            !options ||
            ("string" !== typeof options.crossOrigin &&
              "string" !== typeof options.integrity)
              ? PRELOAD_NO_CREDS
              : [options.crossOrigin, options.integrity];
          renderState.preloads.stylesheets.set(href, imageSrcSet);
          renderState.bulkPreloads.add(imageSrcSet);
          break;
        case "script":
          if (resumableState.scriptResources.hasOwnProperty(href)) return;
          imageSrcSet = [];
          renderState.preloads.scripts.set(href, imageSrcSet);
          renderState.bulkPreloads.add(imageSrcSet);
          pushLinkImpl(
            imageSrcSet,
            assign({ rel: "preload", href: href, as: as }, options)
          );
          resumableState.scriptResources[href] =
            !options ||
            ("string" !== typeof options.crossOrigin &&
              "string" !== typeof options.integrity)
              ? PRELOAD_NO_CREDS
              : [options.crossOrigin, options.integrity];
          break;
        default:
          if (resumableState.unknownResources.hasOwnProperty(as)) {
            if (
              ((imageSrcSet = resumableState.unknownResources[as]),
              imageSrcSet.hasOwnProperty(href))
            )
              return;
          } else
            (imageSrcSet = {}),
              (resumableState.unknownResources[as] = imageSrcSet);
          imageSrcSet[href] = PRELOAD_NO_CREDS;
          if (
            (resumableState = renderState.headers) &&
            0 < resumableState.remainingCapacity &&
            "font" === as &&
            ((key = getPreloadAsHeader(href, as, options)),
            0 <= (resumableState.remainingCapacity -= key.length + 2))
          )
            (renderState.resets.font[href] = PRELOAD_NO_CREDS),
              resumableState.fontPreloads &&
                (resumableState.fontPreloads += ", "),
              (resumableState.fontPreloads += key);
          else
            switch (
              ((resumableState = []),
              (href = assign({ rel: "preload", href: href, as: as }, options)),
              pushLinkImpl(resumableState, href),
              as)
            ) {
              case "font":
                renderState.fontPreloads.add(resumableState);
                break;
              default:
                renderState.bulkPreloads.add(resumableState);
            }
      }
      enqueueFlush(request);
    }
  } else previousDispatcher.L(href, as, options);
}
function preloadModule(href, options) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if (href) {
      var as =
        options && "string" === typeof options.as ? options.as : "script";
      switch (as) {
        case "script":
          if (resumableState.moduleScriptResources.hasOwnProperty(href)) return;
          as = [];
          resumableState.moduleScriptResources[href] =
            !options ||
            ("string" !== typeof options.crossOrigin &&
              "string" !== typeof options.integrity)
              ? PRELOAD_NO_CREDS
              : [options.crossOrigin, options.integrity];
          renderState.preloads.moduleScripts.set(href, as);
          break;
        default:
          if (resumableState.moduleUnknownResources.hasOwnProperty(as)) {
            var resources = resumableState.moduleUnknownResources[as];
            if (resources.hasOwnProperty(href)) return;
          } else
            (resources = {}),
              (resumableState.moduleUnknownResources[as] = resources);
          as = [];
          resources[href] = PRELOAD_NO_CREDS;
      }
      pushLinkImpl(as, assign({ rel: "modulepreload", href: href }, options));
      renderState.bulkPreloads.add(as);
      enqueueFlush(request);
    }
  } else previousDispatcher.m(href, options);
}
function preinitStyle(href, precedence, options) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if (href) {
      precedence = precedence || "default";
      var styleQueue = renderState.styles.get(precedence),
        resourceState = resumableState.styleResources.hasOwnProperty(href)
          ? resumableState.styleResources[href]
          : void 0;
      null !== resourceState &&
        ((resumableState.styleResources[href] = null),
        styleQueue ||
          ((styleQueue = {
            precedence: escapeTextForBrowser(precedence),
            rules: [],
            hrefs: [],
            sheets: new Map()
          }),
          renderState.styles.set(precedence, styleQueue)),
        (precedence = {
          state: 0,
          props: assign(
            { rel: "stylesheet", href: href, "data-precedence": precedence },
            options
          )
        }),
        resourceState &&
          (2 === resourceState.length &&
            adoptPreloadCredentials(precedence.props, resourceState),
          (renderState = renderState.preloads.stylesheets.get(href)) &&
          0 < renderState.length
            ? (renderState.length = 0)
            : (precedence.state = 1)),
        styleQueue.sheets.set(href, precedence),
        enqueueFlush(request));
    }
  } else previousDispatcher.S(href, precedence, options);
}
function preinitScript(src, options) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if (src) {
      var resourceState = resumableState.scriptResources.hasOwnProperty(src)
        ? resumableState.scriptResources[src]
        : void 0;
      null !== resourceState &&
        ((resumableState.scriptResources[src] = null),
        (options = assign({ src: src, async: !0 }, options)),
        resourceState &&
          (2 === resourceState.length &&
            adoptPreloadCredentials(options, resourceState),
          (src = renderState.preloads.scripts.get(src))) &&
          (src.length = 0),
        (src = []),
        renderState.scripts.add(src),
        pushScriptImpl(src, options),
        enqueueFlush(request));
    }
  } else previousDispatcher.X(src, options);
}
function preinitModuleScript(src, options) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if (src) {
      var resourceState = resumableState.moduleScriptResources.hasOwnProperty(
        src
      )
        ? resumableState.moduleScriptResources[src]
        : void 0;
      null !== resourceState &&
        ((resumableState.moduleScriptResources[src] = null),
        (options = assign({ src: src, type: "module", async: !0 }, options)),
        resourceState &&
          (2 === resourceState.length &&
            adoptPreloadCredentials(options, resourceState),
          (src = renderState.preloads.moduleScripts.get(src))) &&
          (src.length = 0),
        (src = []),
        renderState.scripts.add(src),
        pushScriptImpl(src, options),
        enqueueFlush(request));
    }
  } else previousDispatcher.M(src, options);
}
function adoptPreloadCredentials(target, preloadState) {
  null == target.crossOrigin && (target.crossOrigin = preloadState[0]);
  null == target.integrity && (target.integrity = preloadState[1]);
}
function getPreloadAsHeader(href, as, params) {
  href = ("" + href).replace(
    regexForHrefInLinkHeaderURLContext,
    escapeHrefForLinkHeaderURLContextReplacer
  );
  as = ("" + as).replace(
    regexForLinkHeaderQuotedParamValueContext,
    escapeStringForLinkHeaderQuotedParamValueContextReplacer
  );
  as = "<" + href + '>; rel=preload; as="' + as + '"';
  for (var paramName in params)
    hasOwnProperty.call(params, paramName) &&
      ((href = params[paramName]),
      "string" === typeof href &&
        (as +=
          "; " +
          paramName.toLowerCase() +
          '="' +
          ("" + href).replace(
            regexForLinkHeaderQuotedParamValueContext,
            escapeStringForLinkHeaderQuotedParamValueContextReplacer
          ) +
          '"'));
  return as;
}
var regexForHrefInLinkHeaderURLContext = /[<>\r\n]/g;
function escapeHrefForLinkHeaderURLContextReplacer(match) {
  switch (match) {
    case "<":
      return "%3C";
    case ">":
      return "%3E";
    case "\n":
      return "%0A";
    case "\r":
      return "%0D";
    default:
      throw Error(
        "escapeLinkHrefForHeaderContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
      );
  }
}
var regexForLinkHeaderQuotedParamValueContext = /["';,\r\n]/g;
function escapeStringForLinkHeaderQuotedParamValueContextReplacer(match) {
  switch (match) {
    case '"':
      return "%22";
    case "'":
      return "%27";
    case ";":
      return "%3B";
    case ",":
      return "%2C";
    case "\n":
      return "%0A";
    case "\r":
      return "%0D";
    default:
      throw Error(
        "escapeStringForLinkHeaderQuotedParamValueContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
      );
  }
}
function hoistStyleQueueDependency(styleQueue) {
  this.styles.add(styleQueue);
}
function hoistStylesheetDependency(stylesheet) {
  this.stylesheets.add(stylesheet);
}
function hoistHoistables(parentState, childState) {
  childState.styles.forEach(hoistStyleQueueDependency, parentState);
  childState.stylesheets.forEach(hoistStylesheetDependency, parentState);
  childState.suspenseyImages && (parentState.suspenseyImages = !0);
}
function createRenderState(resumableState, generateStaticMarkup) {
  var idPrefix = resumableState.idPrefix,
    bootstrapChunks = [],
    bootstrapScriptContent = resumableState.bootstrapScriptContent,
    bootstrapScripts = resumableState.bootstrapScripts,
    bootstrapModules = resumableState.bootstrapModules;
  void 0 !== bootstrapScriptContent &&
    (bootstrapChunks.push("<script"),
    pushCompletedShellIdAttribute(bootstrapChunks, resumableState),
    bootstrapChunks.push(
      ">",
      ("" + bootstrapScriptContent).replace(scriptRegex, scriptReplacer),
      "\x3c/script>"
    ));
  bootstrapScriptContent = idPrefix + "P:";
  var JSCompiler_object_inline_segmentPrefix_1897 = idPrefix + "S:";
  idPrefix += "B:";
  var JSCompiler_object_inline_preconnects_1911 = new Set(),
    JSCompiler_object_inline_fontPreloads_1912 = new Set(),
    JSCompiler_object_inline_highImagePreloads_1913 = new Set(),
    JSCompiler_object_inline_styles_1914 = new Map(),
    JSCompiler_object_inline_bootstrapScripts_1915 = new Set(),
    JSCompiler_object_inline_scripts_1916 = new Set(),
    JSCompiler_object_inline_bulkPreloads_1917 = new Set(),
    JSCompiler_object_inline_preloads_1918 = {
      images: new Map(),
      stylesheets: new Map(),
      scripts: new Map(),
      moduleScripts: new Map()
    };
  if (void 0 !== bootstrapScripts)
    for (var i = 0; i < bootstrapScripts.length; i++) {
      var scriptConfig = bootstrapScripts[i],
        src,
        crossOrigin = void 0,
        integrity = void 0,
        props = {
          rel: "preload",
          as: "script",
          fetchPriority: "low",
          nonce: void 0
        };
      "string" === typeof scriptConfig
        ? (props.href = src = scriptConfig)
        : ((props.href = src = scriptConfig.src),
          (props.integrity = integrity =
            "string" === typeof scriptConfig.integrity
              ? scriptConfig.integrity
              : void 0),
          (props.crossOrigin = crossOrigin =
            "string" === typeof scriptConfig || null == scriptConfig.crossOrigin
              ? void 0
              : "use-credentials" === scriptConfig.crossOrigin
                ? "use-credentials"
                : ""));
      scriptConfig = resumableState;
      var href = src;
      scriptConfig.scriptResources[href] = null;
      scriptConfig.moduleScriptResources[href] = null;
      scriptConfig = [];
      pushLinkImpl(scriptConfig, props);
      JSCompiler_object_inline_bootstrapScripts_1915.add(scriptConfig);
      bootstrapChunks.push('<script src="', escapeTextForBrowser(src), '"');
      "string" === typeof integrity &&
        bootstrapChunks.push(
          ' integrity="',
          escapeTextForBrowser(integrity),
          '"'
        );
      "string" === typeof crossOrigin &&
        bootstrapChunks.push(
          ' crossorigin="',
          escapeTextForBrowser(crossOrigin),
          '"'
        );
      pushCompletedShellIdAttribute(bootstrapChunks, resumableState);
      bootstrapChunks.push(' async="">\x3c/script>');
    }
  if (void 0 !== bootstrapModules)
    for (
      bootstrapScripts = 0;
      bootstrapScripts < bootstrapModules.length;
      bootstrapScripts++
    )
      (props = bootstrapModules[bootstrapScripts]),
        (crossOrigin = src = void 0),
        (integrity = {
          rel: "modulepreload",
          fetchPriority: "low",
          nonce: void 0
        }),
        "string" === typeof props
          ? (integrity.href = i = props)
          : ((integrity.href = i = props.src),
            (integrity.integrity = crossOrigin =
              "string" === typeof props.integrity ? props.integrity : void 0),
            (integrity.crossOrigin = src =
              "string" === typeof props || null == props.crossOrigin
                ? void 0
                : "use-credentials" === props.crossOrigin
                  ? "use-credentials"
                  : "")),
        (props = resumableState),
        (scriptConfig = i),
        (props.scriptResources[scriptConfig] = null),
        (props.moduleScriptResources[scriptConfig] = null),
        (props = []),
        pushLinkImpl(props, integrity),
        JSCompiler_object_inline_bootstrapScripts_1915.add(props),
        bootstrapChunks.push(
          '<script type="module" src="',
          escapeTextForBrowser(i),
          '"'
        ),
        "string" === typeof crossOrigin &&
          bootstrapChunks.push(
            ' integrity="',
            escapeTextForBrowser(crossOrigin),
            '"'
          ),
        "string" === typeof src &&
          bootstrapChunks.push(
            ' crossorigin="',
            escapeTextForBrowser(src),
            '"'
          ),
        pushCompletedShellIdAttribute(bootstrapChunks, resumableState),
        bootstrapChunks.push(' async="">\x3c/script>');
  return {
    placeholderPrefix: bootstrapScriptContent,
    segmentPrefix: JSCompiler_object_inline_segmentPrefix_1897,
    boundaryPrefix: idPrefix,
    startInlineScript: "<script",
    startInlineStyle: "<style",
    preamble: { htmlChunks: null, headChunks: null, bodyChunks: null },
    externalRuntimeScript: null,
    bootstrapChunks: bootstrapChunks,
    importMapChunks: [],
    onHeaders: void 0,
    headers: null,
    resets: {
      font: {},
      dns: {},
      connect: { default: {}, anonymous: {}, credentials: {} },
      image: {},
      style: {}
    },
    charsetChunks: [],
    viewportChunks: [],
    hoistableChunks: [],
    preconnects: JSCompiler_object_inline_preconnects_1911,
    fontPreloads: JSCompiler_object_inline_fontPreloads_1912,
    highImagePreloads: JSCompiler_object_inline_highImagePreloads_1913,
    styles: JSCompiler_object_inline_styles_1914,
    bootstrapScripts: JSCompiler_object_inline_bootstrapScripts_1915,
    scripts: JSCompiler_object_inline_scripts_1916,
    bulkPreloads: JSCompiler_object_inline_bulkPreloads_1917,
    preloads: JSCompiler_object_inline_preloads_1918,
    nonce: { script: void 0, style: void 0 },
    stylesToHoist: !1,
    generateStaticMarkup: generateStaticMarkup
  };
}
function pushTextInstance(target, text, renderState, textEmbedded) {
  if (renderState.generateStaticMarkup)
    return target.push(escapeTextForBrowser(text)), !1;
  "" === text
    ? (target = textEmbedded)
    : (textEmbedded && target.push("\x3c!-- --\x3e"),
      target.push(escapeTextForBrowser(text)),
      (target = !0));
  return target;
}
function pushSegmentFinale(target, renderState, lastPushedText, textEmbedded) {
  renderState.generateStaticMarkup ||
    (lastPushedText && textEmbedded && target.push("\x3c!-- --\x3e"));
}
var bind = Function.prototype.bind,
  REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
function getComponentNameFromType(type) {
  if (null == type) return null;
  if ("function" === typeof type)
    return type.$$typeof === REACT_CLIENT_REFERENCE
      ? null
      : type.displayName || type.name || null;
  if ("string" === typeof type) return type;
  switch (type) {
    case REACT_FRAGMENT_TYPE:
      return "Fragment";
    case REACT_PROFILER_TYPE:
      return "Profiler";
    case REACT_STRICT_MODE_TYPE:
      return "StrictMode";
    case REACT_SUSPENSE_TYPE:
      return "Suspense";
    case REACT_SUSPENSE_LIST_TYPE:
      return "SuspenseList";
    case REACT_ACTIVITY_TYPE:
      return "Activity";
    case REACT_VIEW_TRANSITION_TYPE:
      if (enableViewTransition) return "ViewTransition";
    case REACT_TRACING_MARKER_TYPE:
      if (enableTransitionTracing) return "TracingMarker";
  }
  if ("object" === typeof type)
    switch (type.$$typeof) {
      case REACT_PORTAL_TYPE:
        return "Portal";
      case REACT_CONTEXT_TYPE:
        return type.displayName || "Context";
      case REACT_CONSUMER_TYPE:
        return (type._context.displayName || "Context") + ".Consumer";
      case REACT_FORWARD_REF_TYPE:
        var innerType = type.render;
        type = type.displayName;
        type ||
          ((type = innerType.displayName || innerType.name || ""),
          (type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef"));
        return type;
      case REACT_MEMO_TYPE:
        return (
          (innerType = type.displayName || null),
          null !== innerType
            ? innerType
            : getComponentNameFromType(type.type) || "Memo"
        );
      case REACT_LAZY_TYPE:
        innerType = type._payload;
        type = type._init;
        try {
          return getComponentNameFromType(type(innerType));
        } catch (x) {}
    }
  return null;
}
var emptyContextObject = {};
function getMaskedContext(type, unmaskedContext) {
  type = type.contextTypes;
  if (!type) return emptyContextObject;
  var context = {},
    key;
  for (key in type) context[key] = unmaskedContext[key];
  return context;
}
var currentActiveSnapshot = null;
function popToNearestCommonAncestor(prev, next) {
  if (prev !== next) {
    prev.context._currentValue2 = prev.parentValue;
    prev = prev.parent;
    var parentNext = next.parent;
    if (null === prev) {
      if (null !== parentNext) throw Error(formatProdErrorMessage(401));
    } else {
      if (null === parentNext) throw Error(formatProdErrorMessage(401));
      popToNearestCommonAncestor(prev, parentNext);
    }
    next.context._currentValue2 = next.value;
  }
}
function popAllPrevious(prev) {
  prev.context._currentValue2 = prev.parentValue;
  prev = prev.parent;
  null !== prev && popAllPrevious(prev);
}
function pushAllNext(next) {
  var parentNext = next.parent;
  null !== parentNext && pushAllNext(parentNext);
  next.context._currentValue2 = next.value;
}
function popPreviousToCommonLevel(prev, next) {
  prev.context._currentValue2 = prev.parentValue;
  prev = prev.parent;
  if (null === prev) throw Error(formatProdErrorMessage(402));
  prev.depth === next.depth
    ? popToNearestCommonAncestor(prev, next)
    : popPreviousToCommonLevel(prev, next);
}
function popNextToCommonLevel(prev, next) {
  var parentNext = next.parent;
  if (null === parentNext) throw Error(formatProdErrorMessage(402));
  prev.depth === parentNext.depth
    ? popToNearestCommonAncestor(prev, parentNext)
    : popNextToCommonLevel(prev, parentNext);
  next.context._currentValue2 = next.value;
}
function switchContext(newSnapshot) {
  var prev = currentActiveSnapshot;
  prev !== newSnapshot &&
    (null === prev
      ? pushAllNext(newSnapshot)
      : null === newSnapshot
        ? popAllPrevious(prev)
        : prev.depth === newSnapshot.depth
          ? popToNearestCommonAncestor(prev, newSnapshot)
          : prev.depth > newSnapshot.depth
            ? popPreviousToCommonLevel(prev, newSnapshot)
            : popNextToCommonLevel(prev, newSnapshot),
    (currentActiveSnapshot = newSnapshot));
}
var classComponentUpdater = {
    enqueueSetState: function (inst, payload) {
      inst = inst._reactInternals;
      null !== inst.queue && inst.queue.push(payload);
    },
    enqueueReplaceState: function (inst, payload) {
      inst = inst._reactInternals;
      inst.replace = !0;
      inst.queue = [payload];
    },
    enqueueForceUpdate: function () {}
  },
  emptyTreeContext = { id: 1, overflow: "" };
function getTreeId(context) {
  var overflow = context.overflow;
  context = context.id;
  return (context & ~(1 << (32 - clz32(context) - 1))).toString(32) + overflow;
}
function pushTreeContext(baseContext, totalChildren, index) {
  var baseIdWithLeadingBit = baseContext.id;
  baseContext = baseContext.overflow;
  var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
  baseIdWithLeadingBit &= ~(1 << baseLength);
  index += 1;
  var length = 32 - clz32(totalChildren) + baseLength;
  if (30 < length) {
    var numberOfOverflowBits = baseLength - (baseLength % 5);
    length = (
      baseIdWithLeadingBit &
      ((1 << numberOfOverflowBits) - 1)
    ).toString(32);
    baseIdWithLeadingBit >>= numberOfOverflowBits;
    baseLength -= numberOfOverflowBits;
    return {
      id:
        (1 << (32 - clz32(totalChildren) + baseLength)) |
        (index << baseLength) |
        baseIdWithLeadingBit,
      overflow: length + baseContext
    };
  }
  return {
    id: (1 << length) | (index << baseLength) | baseIdWithLeadingBit,
    overflow: baseContext
  };
}
var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback,
  log = Math.log,
  LN2 = Math.LN2;
function clz32Fallback(x) {
  x >>>= 0;
  return 0 === x ? 32 : (31 - ((log(x) / LN2) | 0)) | 0;
}
function noop() {}
var SuspenseException = Error(formatProdErrorMessage(460));
function trackUsedThenable(thenableState, thenable, index) {
  index = thenableState[index];
  void 0 === index
    ? thenableState.push(thenable)
    : index !== thenable && (thenable.then(noop, noop), (thenable = index));
  switch (thenable.status) {
    case "fulfilled":
      return thenable.value;
    case "rejected":
      thenableState = thenable.reason;
      if (void 0 === thenableState && !("reason" in thenable))
        throw Error(formatProdErrorMessage(600));
      throw thenableState;
    default:
      "string" === typeof thenable.status
        ? thenable.then(noop, noop)
        : ((thenableState = thenable),
          (thenableState.status = "pending"),
          thenableState.then(
            function (fulfilledValue) {
              if ("pending" === thenable.status) {
                var fulfilledThenable = thenable;
                fulfilledThenable.status = "fulfilled";
                fulfilledThenable.value = fulfilledValue;
              }
            },
            function (error) {
              if ("pending" === thenable.status) {
                var rejectedThenable = thenable;
                rejectedThenable.status = "rejected";
                rejectedThenable.reason = error;
              }
            }
          ));
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
      }
      suspendedThenable = thenable;
      throw SuspenseException;
  }
}
var suspendedThenable = null;
function getSuspendedThenable() {
  if (null === suspendedThenable) throw Error(formatProdErrorMessage(459));
  var thenable = suspendedThenable;
  suspendedThenable = null;
  return thenable;
}
function is(x, y) {
  return (x === y && (0 !== x || 1 / x === 1 / y)) || (x !== x && y !== y);
}
var objectIs = "function" === typeof Object.is ? Object.is : is,
  currentlyRenderingComponent = null,
  currentlyRenderingTask = null,
  currentlyRenderingRequest = null,
  currentlyRenderingKeyPath = null,
  firstWorkInProgressHook = null,
  workInProgressHook = null,
  isReRender = !1,
  didScheduleRenderPhaseUpdate = !1,
  localIdCounter = 0,
  actionStateCounter = 0,
  actionStateMatchingIndex = -1,
  thenableIndexCounter = 0,
  thenableState = null,
  renderPhaseUpdates = null,
  numberOfReRenders = 0;
function resolveCurrentlyRenderingComponent() {
  if (null === currentlyRenderingComponent)
    throw Error(formatProdErrorMessage(321));
  return currentlyRenderingComponent;
}
function createHook() {
  if (0 < numberOfReRenders) throw Error(formatProdErrorMessage(312));
  return { memoizedState: null, queue: null, next: null };
}
function createWorkInProgressHook() {
  null === workInProgressHook
    ? null === firstWorkInProgressHook
      ? ((isReRender = !1),
        (firstWorkInProgressHook = workInProgressHook = createHook()))
      : ((isReRender = !0), (workInProgressHook = firstWorkInProgressHook))
    : null === workInProgressHook.next
      ? ((isReRender = !1),
        (workInProgressHook = workInProgressHook.next = createHook()))
      : ((isReRender = !0), (workInProgressHook = workInProgressHook.next));
  return workInProgressHook;
}
function getThenableStateAfterSuspending() {
  var state = thenableState;
  thenableState = null;
  return state;
}
function resetHooksState() {
  currentlyRenderingKeyPath =
    currentlyRenderingRequest =
    currentlyRenderingTask =
    currentlyRenderingComponent =
      null;
  didScheduleRenderPhaseUpdate = !1;
  firstWorkInProgressHook = null;
  numberOfReRenders = 0;
  workInProgressHook = renderPhaseUpdates = null;
}
function basicStateReducer(state, action) {
  return "function" === typeof action ? action(state) : action;
}
function useReducer(reducer, initialArg, init) {
  currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
  workInProgressHook = createWorkInProgressHook();
  if (isReRender) {
    var queue = workInProgressHook.queue;
    initialArg = queue.dispatch;
    if (
      null !== renderPhaseUpdates &&
      ((init = renderPhaseUpdates.get(queue)), void 0 !== init)
    ) {
      renderPhaseUpdates.delete(queue);
      queue = workInProgressHook.memoizedState;
      do (queue = reducer(queue, init.action)), (init = init.next);
      while (null !== init);
      workInProgressHook.memoizedState = queue;
      return [queue, initialArg];
    }
    return [workInProgressHook.memoizedState, initialArg];
  }
  reducer =
    reducer === basicStateReducer
      ? "function" === typeof initialArg
        ? initialArg()
        : initialArg
      : void 0 !== init
        ? init(initialArg)
        : initialArg;
  workInProgressHook.memoizedState = reducer;
  reducer = workInProgressHook.queue = { last: null, dispatch: null };
  reducer = reducer.dispatch = dispatchAction.bind(
    null,
    currentlyRenderingComponent,
    reducer
  );
  return [workInProgressHook.memoizedState, reducer];
}
function useMemo(nextCreate, deps) {
  currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
  workInProgressHook = createWorkInProgressHook();
  deps = void 0 === deps ? null : deps;
  if (null !== workInProgressHook) {
    var prevState = workInProgressHook.memoizedState;
    if (null !== prevState && null !== deps) {
      var prevDeps = prevState[1];
      a: if (null === prevDeps) prevDeps = !1;
      else {
        for (var i = 0; i < prevDeps.length && i < deps.length; i++)
          if (!objectIs(deps[i], prevDeps[i])) {
            prevDeps = !1;
            break a;
          }
        prevDeps = !0;
      }
      if (prevDeps) return prevState[0];
    }
  }
  nextCreate = nextCreate();
  workInProgressHook.memoizedState = [nextCreate, deps];
  return nextCreate;
}
function dispatchAction(componentIdentity, queue, action) {
  if (25 <= numberOfReRenders) throw Error(formatProdErrorMessage(301));
  if (componentIdentity === currentlyRenderingComponent)
    if (
      ((didScheduleRenderPhaseUpdate = !0),
      (componentIdentity = { action: action, next: null }),
      null === renderPhaseUpdates && (renderPhaseUpdates = new Map()),
      (action = renderPhaseUpdates.get(queue)),
      void 0 === action)
    )
      renderPhaseUpdates.set(queue, componentIdentity);
    else {
      for (queue = action; null !== queue.next; ) queue = queue.next;
      queue.next = componentIdentity;
    }
}
function throwOnUseEffectEventCall() {
  throw Error(formatProdErrorMessage(440));
}
function unsupportedStartTransition() {
  throw Error(formatProdErrorMessage(394));
}
function unsupportedSetOptimisticState() {
  throw Error(formatProdErrorMessage(479));
}
function useActionState(action, initialState, permalink) {
  resolveCurrentlyRenderingComponent();
  var actionStateHookIndex = actionStateCounter++,
    request = currentlyRenderingRequest;
  if ("function" === typeof action.$$FORM_ACTION) {
    var nextPostbackStateKey = null,
      componentKeyPath = currentlyRenderingKeyPath;
    request = request.formState;
    var isSignatureEqual = action.$$IS_SIGNATURE_EQUAL;
    if (null !== request && "function" === typeof isSignatureEqual) {
      var postbackKey = request[1];
      isSignatureEqual.call(action, request[2], request[3]) &&
        ((nextPostbackStateKey =
          void 0 !== permalink
            ? "p" + permalink
            : "k" +
              murmurhash3_32_gc(
                JSON.stringify([componentKeyPath, null, actionStateHookIndex]),
                0
              )),
        postbackKey === nextPostbackStateKey &&
          ((actionStateMatchingIndex = actionStateHookIndex),
          (initialState = request[0])));
    }
    var boundAction = action.bind(null, initialState);
    action = function (payload) {
      boundAction(payload);
    };
    "function" === typeof boundAction.$$FORM_ACTION &&
      (action.$$FORM_ACTION = function (prefix) {
        prefix = boundAction.$$FORM_ACTION(prefix);
        void 0 !== permalink &&
          ((permalink += ""), (prefix.action = permalink));
        var formData = prefix.data;
        formData &&
          (null === nextPostbackStateKey &&
            (nextPostbackStateKey =
              void 0 !== permalink
                ? "p" + permalink
                : "k" +
                  murmurhash3_32_gc(
                    JSON.stringify([
                      componentKeyPath,
                      null,
                      actionStateHookIndex
                    ]),
                    0
                  )),
          formData.append("$ACTION_KEY", nextPostbackStateKey));
        return prefix;
      });
    return [initialState, action, !1];
  }
  var boundAction$22 = action.bind(null, initialState);
  return [
    initialState,
    function (payload) {
      boundAction$22(payload);
    },
    !1
  ];
}
function unwrapThenable(thenable) {
  var index = thenableIndexCounter;
  thenableIndexCounter += 1;
  null === thenableState && (thenableState = []);
  return trackUsedThenable(thenableState, thenable, index);
}
function unsupportedRefresh() {
  throw Error(formatProdErrorMessage(393));
}
var HooksDispatcher = {
    readContext: function (context) {
      return context._currentValue2;
    },
    use: function (usable) {
      if (null !== usable && "object" === typeof usable) {
        if ("function" === typeof usable.then) return unwrapThenable(usable);
        if (usable.$$typeof === REACT_CONTEXT_TYPE)
          return usable._currentValue2;
      }
      throw Error(formatProdErrorMessage(438, String(usable)));
    },
    useContext: function (context) {
      resolveCurrentlyRenderingComponent();
      return context._currentValue2;
    },
    useMemo: useMemo,
    useReducer: useReducer,
    useRef: function (initialValue) {
      currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
      workInProgressHook = createWorkInProgressHook();
      var previousRef = workInProgressHook.memoizedState;
      return null === previousRef
        ? ((initialValue = { current: initialValue }),
          (workInProgressHook.memoizedState = initialValue))
        : previousRef;
    },
    useState: function (initialState) {
      return useReducer(basicStateReducer, initialState);
    },
    useInsertionEffect: noop,
    useLayoutEffect: noop,
    useCallback: function (callback, deps) {
      return useMemo(function () {
        return callback;
      }, deps);
    },
    useImperativeHandle: noop,
    useEffect: noop,
    useDebugValue: noop,
    useDeferredValue: function (value, initialValue) {
      resolveCurrentlyRenderingComponent();
      return void 0 !== initialValue ? initialValue : value;
    },
    useTransition: function () {
      resolveCurrentlyRenderingComponent();
      return [!1, unsupportedStartTransition];
    },
    useId: function () {
      var treeId = getTreeId(currentlyRenderingTask.treeContext),
        resumableState = currentResumableState;
      if (null === resumableState) throw Error(formatProdErrorMessage(404));
      var localId = localIdCounter++;
      return makeId(resumableState, treeId, localId);
    },
    useSyncExternalStore: function (subscribe, getSnapshot, getServerSnapshot) {
      if (void 0 === getServerSnapshot)
        throw Error(formatProdErrorMessage(407));
      return getServerSnapshot();
    },
    useOptimistic: function (passthrough) {
      resolveCurrentlyRenderingComponent();
      return [passthrough, unsupportedSetOptimisticState];
    },
    useActionState: useActionState,
    useFormState: useActionState,
    useHostTransitionStatus: function () {
      resolveCurrentlyRenderingComponent();
      return sharedNotPendingObject;
    },
    useMemoCache: function (size) {
      for (var data = Array(size), i = 0; i < size; i++)
        data[i] = REACT_MEMO_CACHE_SENTINEL;
      return data;
    },
    useCacheRefresh: function () {
      return unsupportedRefresh;
    },
    useEffectEvent: function () {
      return throwOnUseEffectEventCall;
    }
  },
  currentResumableState = null,
  DefaultAsyncDispatcher = {
    getCacheForType: function () {
      throw Error(formatProdErrorMessage(248));
    },
    cacheSignal: function () {
      throw Error(formatProdErrorMessage(248));
    }
  },
  prefix,
  suffix;
function describeBuiltInComponentFrame(name) {
  if (void 0 === prefix)
    try {
      throw Error();
    } catch (x) {
      var match = x.stack.trim().match(/\n( *(at )?)/);
      prefix = (match && match[1]) || "";
      suffix =
        -1 < x.stack.indexOf("\n    at")
          ? " (<anonymous>)"
          : -1 < x.stack.indexOf("@")
            ? "@unknown:0:0"
            : "";
    }
  return "\n" + prefix + name + suffix;
}
var reentry = !1;
function describeNativeComponentFrame(fn, construct) {
  if (!fn || reentry) return "";
  reentry = !0;
  var previousPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    var RunInRootFrame = {
      DetermineComponentFrameRoot: function () {
        try {
          if (construct) {
            var Fake = function () {
              throw Error();
            };
            Object.defineProperty(Fake.prototype, "props", {
              set: function () {
                throw Error();
              }
            });
            if ("object" === typeof Reflect && Reflect.construct) {
              try {
                Reflect.construct(Fake, []);
              } catch (x) {
                var control = x;
              }
              Reflect.construct(fn, [], Fake);
            } else {
              try {
                Fake.call();
              } catch (x$24) {
                control = x$24;
              }
              Fake = !1;
              try {
                var prevProps = Object.getOwnPropertyDescriptor(
                  fn.prototype,
                  "props"
                );
                Object.defineProperty(fn.prototype, "props", {
                  configurable: !0,
                  set: function () {
                    throw Error();
                  }
                });
                Fake = !0;
                new fn();
              } finally {
                Fake &&
                  (void 0 !== prevProps
                    ? Object.defineProperty(fn.prototype, "props", prevProps)
                    : delete fn.prototype.props);
              }
            }
          } else {
            try {
              throw Error();
            } catch (x$25) {
              control = x$25;
            }
            (Fake = fn()) &&
              "function" === typeof Fake.catch &&
              Fake.catch(function () {});
          }
        } catch (sample) {
          if (sample && control && "string" === typeof sample.stack)
            return [sample.stack, control.stack];
        }
        return [null, null];
      }
    };
    RunInRootFrame.DetermineComponentFrameRoot.displayName =
      "DetermineComponentFrameRoot";
    var namePropDescriptor = Object.getOwnPropertyDescriptor(
      RunInRootFrame.DetermineComponentFrameRoot,
      "name"
    );
    namePropDescriptor &&
      namePropDescriptor.configurable &&
      Object.defineProperty(
        RunInRootFrame.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
    var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(),
      sampleStack = _RunInRootFrame$Deter[0],
      controlStack = _RunInRootFrame$Deter[1];
    if (sampleStack && controlStack) {
      var sampleLines = sampleStack.split("\n"),
        controlLines = controlStack.split("\n");
      for (
        namePropDescriptor = RunInRootFrame = 0;
        RunInRootFrame < sampleLines.length &&
        !sampleLines[RunInRootFrame].includes("DetermineComponentFrameRoot");

      )
        RunInRootFrame++;
      for (
        ;
        namePropDescriptor < controlLines.length &&
        !controlLines[namePropDescriptor].includes(
          "DetermineComponentFrameRoot"
        );

      )
        namePropDescriptor++;
      if (
        RunInRootFrame === sampleLines.length ||
        namePropDescriptor === controlLines.length
      )
        for (
          RunInRootFrame = sampleLines.length - 1,
            namePropDescriptor = controlLines.length - 1;
          1 <= RunInRootFrame &&
          0 <= namePropDescriptor &&
          sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor];

        )
          namePropDescriptor--;
      for (
        ;
        1 <= RunInRootFrame && 0 <= namePropDescriptor;
        RunInRootFrame--, namePropDescriptor--
      )
        if (sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
          if (1 !== RunInRootFrame || 1 !== namePropDescriptor) {
            do
              if (
                (RunInRootFrame--,
                namePropDescriptor--,
                0 > namePropDescriptor ||
                  sampleLines[RunInRootFrame] !==
                    controlLines[namePropDescriptor])
              ) {
                var frame =
                  "\n" +
                  sampleLines[RunInRootFrame].replace(" at new ", " at ");
                fn.displayName &&
                  frame.includes("<anonymous>") &&
                  (frame = frame.replace("<anonymous>", fn.displayName));
                return frame;
              }
            while (1 <= RunInRootFrame && 0 <= namePropDescriptor);
          }
          break;
        }
    }
  } finally {
    (reentry = !1), (Error.prepareStackTrace = previousPrepareStackTrace);
  }
  return (previousPrepareStackTrace = fn ? fn.displayName || fn.name : "")
    ? describeBuiltInComponentFrame(previousPrepareStackTrace)
    : "";
}
function describeComponentStackByType(type) {
  if ("string" === typeof type) return describeBuiltInComponentFrame(type);
  if ("function" === typeof type)
    return type.prototype && type.prototype.isReactComponent
      ? describeNativeComponentFrame(type, !0)
      : describeNativeComponentFrame(type, !1);
  if ("object" === typeof type && null !== type) {
    switch (type.$$typeof) {
      case REACT_FORWARD_REF_TYPE:
        return describeNativeComponentFrame(type.render, !1);
      case REACT_MEMO_TYPE:
        return describeNativeComponentFrame(type.type, !1);
      case REACT_LAZY_TYPE:
        var lazyComponent = type,
          payload = lazyComponent._payload;
        lazyComponent = lazyComponent._init;
        try {
          type = lazyComponent(payload);
        } catch (x) {
          return describeBuiltInComponentFrame("Lazy");
        }
        return describeComponentStackByType(type);
    }
    if ("string" === typeof type.name) {
      a: {
        payload = type.name;
        lazyComponent = type.env;
        var location = type.debugLocation;
        if (
          null != location &&
          ((type = Error.prepareStackTrace),
          (Error.prepareStackTrace = void 0),
          (location = location.stack),
          (Error.prepareStackTrace = type),
          location.startsWith("Error: react-stack-top-frame\n") &&
            (location = location.slice(29)),
          (type = location.indexOf("\n")),
          -1 !== type && (location = location.slice(type + 1)),
          (type = location.indexOf("react_stack_bottom_frame")),
          -1 !== type && (type = location.lastIndexOf("\n", type)),
          (type = -1 !== type ? (location = location.slice(0, type)) : ""),
          (location = type.lastIndexOf("\n")),
          (type = -1 === location ? type : type.slice(location + 1)),
          -1 !== type.indexOf(payload))
        ) {
          payload = "\n" + type;
          break a;
        }
        payload = describeBuiltInComponentFrame(
          payload + (lazyComponent ? " [" + lazyComponent + "]" : "")
        );
      }
      return payload;
    }
  }
  switch (type) {
    case REACT_SUSPENSE_LIST_TYPE:
      return describeBuiltInComponentFrame("SuspenseList");
    case REACT_SUSPENSE_TYPE:
      return describeBuiltInComponentFrame("Suspense");
    case REACT_VIEW_TRANSITION_TYPE:
      if (enableViewTransition)
        return describeBuiltInComponentFrame("ViewTransition");
  }
  return "";
}
function isEligibleForOutlining(request, boundary) {
  return (
    (500 < boundary.byteSize || boundary.defer) && null === boundary.preamble
  );
}
function defaultErrorHandler(error) {
  if (
    "object" === typeof error &&
    null !== error &&
    "string" === typeof error.environmentName
  ) {
    var JSCompiler_inline_result = error.environmentName;
    error = [error].slice(0);
    "string" === typeof error[0]
      ? error.splice(
          0,
          1,
          "[%s] " + error[0],
          " " + JSCompiler_inline_result + " "
        )
      : error.splice(0, 0, "[%s]", " " + JSCompiler_inline_result + " ");
    error.unshift(console);
    JSCompiler_inline_result = bind.apply(console.error, error);
    JSCompiler_inline_result();
  } else console.error(error);
  return null;
}
function RequestInstance(
  resumableState,
  renderState,
  rootFormatContext,
  progressiveChunkSize,
  onError,
  onAllReady,
  onShellReady,
  onShellError,
  onFatalError,
  formState
) {
  var abortSet = new Set();
  this.destination = null;
  this.flushScheduled = !1;
  this.resumableState = resumableState;
  this.renderState = renderState;
  this.rootFormatContext = rootFormatContext;
  this.progressiveChunkSize =
    void 0 === progressiveChunkSize ? 12800 : progressiveChunkSize;
  this.status = 10;
  this.fatalError = null;
  this.aborted = !1;
  this.pendingRootTasks = this.allPendingTasks = this.nextSegmentId = 0;
  this.completedPreambleSegments = this.completedRootSegment = null;
  this.byteSize = 0;
  this.abortableTasks = abortSet;
  this.pingedTasks = [];
  this.currentTask = null;
  this.clientRenderedBoundaries = [];
  this.completedBoundaries = [];
  this.partialBoundaries = [];
  this.postponedState = this.trackedPostpones = null;
  this.onError = void 0 === onError ? defaultErrorHandler : onError;
  this.onAllReady = void 0 === onAllReady ? noop : onAllReady;
  this.onShellReady = void 0 === onShellReady ? noop : onShellReady;
  this.onShellError = void 0 === onShellError ? noop : onShellError;
  this.onFatalError = void 0 === onFatalError ? noop : onFatalError;
  this.formState = void 0 === formState ? null : formState;
}
function createRequest(
  children,
  resumableState,
  renderState,
  rootFormatContext,
  progressiveChunkSize,
  onError,
  onAllReady,
  onShellReady,
  onShellError,
  onFatalError,
  formState
) {
  resumableState = new RequestInstance(
    resumableState,
    renderState,
    rootFormatContext,
    progressiveChunkSize,
    onError,
    onAllReady,
    onShellReady,
    onShellError,
    onFatalError,
    formState
  );
  renderState = createPendingSegment(
    resumableState,
    0,
    null,
    rootFormatContext,
    !1,
    !1
  );
  renderState.parentFlushed = !0;
  children = createRenderTask(
    resumableState,
    null,
    children,
    -1,
    null,
    renderState,
    null,
    null,
    resumableState.abortableTasks,
    null,
    rootFormatContext,
    null,
    emptyTreeContext,
    null,
    null,
    emptyContextObject
  );
  pushComponentStack(children);
  resumableState.pingedTasks.push(children);
  return resumableState;
}
var currentRequest = null;
function pingTask(request, task) {
  request.pingedTasks.push(task);
  1 === request.pingedTasks.length &&
    ((request.flushScheduled = null !== request.destination),
    performWork(request));
}
function createSuspenseBoundary(
  request,
  row,
  fallbackAbortableTasks,
  preamble,
  defer
) {
  fallbackAbortableTasks = {
    status: 0,
    rootSegmentID: -1,
    parentFlushed: !1,
    pendingTasks: 0,
    row: row,
    completedSegments: [],
    byteSize: 0,
    defer: defer,
    fallbackAbortableTasks: fallbackAbortableTasks,
    errorDigest: null,
    contentState: createHoistableState(),
    fallbackState: createHoistableState(),
    preamble: preamble,
    tracked: null
  };
  null !== row &&
    (row.pendingTasks++,
    (preamble = row.boundaries),
    null !== preamble &&
      (request.allPendingTasks++,
      fallbackAbortableTasks.pendingTasks++,
      preamble.push(fallbackAbortableTasks)),
    (request = row.inheritedHoistables),
    null !== request &&
      hoistHoistables(fallbackAbortableTasks.contentState, request));
  return fallbackAbortableTasks;
}
function createRenderTask(
  request,
  thenableState,
  node,
  childIndex,
  blockedBoundary,
  blockedSegment,
  blockedPreamble,
  hoistableState,
  abortSet,
  keyPath,
  formatContext,
  context,
  treeContext,
  row,
  componentStack,
  legacyContext
) {
  request.allPendingTasks++;
  null === blockedBoundary
    ? request.pendingRootTasks++
    : blockedBoundary.pendingTasks++;
  null !== row && row.pendingTasks++;
  var task = {
    replay: null,
    node: node,
    childIndex: childIndex,
    ping: {
      resolve: function () {
        return pingTask(request, task);
      },
      reject: function (error) {
        request.aborted
          ? task.abortSet.delete(task) &&
            finishAbortedTask(task, request, error)
          : pingTask(request, task);
      }
    },
    blockedBoundary: blockedBoundary,
    blockedSegment: blockedSegment,
    blockedPreamble: blockedPreamble,
    hoistableState: hoistableState,
    abortSet: abortSet,
    keyPath: keyPath,
    formatContext: formatContext,
    context: context,
    treeContext: treeContext,
    row: row,
    componentStack: componentStack,
    thenableState: thenableState
  };
  task.legacyContext = legacyContext;
  abortSet.add(task);
  return task;
}
function createReplayTask(
  request,
  thenableState,
  replay,
  node,
  childIndex,
  blockedBoundary,
  hoistableState,
  abortSet,
  keyPath,
  formatContext,
  context,
  treeContext,
  row,
  componentStack,
  legacyContext
) {
  request.allPendingTasks++;
  null === blockedBoundary
    ? request.pendingRootTasks++
    : blockedBoundary.pendingTasks++;
  null !== row && row.pendingTasks++;
  replay.pendingTasks++;
  var task = {
    replay: replay,
    node: node,
    childIndex: childIndex,
    ping: {
      resolve: function () {
        return pingTask(request, task);
      },
      reject: function (error) {
        request.aborted
          ? task.abortSet.delete(task) &&
            finishAbortedTask(task, request, error)
          : pingTask(request, task);
      }
    },
    blockedBoundary: blockedBoundary,
    blockedSegment: null,
    blockedPreamble: null,
    hoistableState: hoistableState,
    abortSet: abortSet,
    keyPath: keyPath,
    formatContext: formatContext,
    context: context,
    treeContext: treeContext,
    row: row,
    componentStack: componentStack,
    thenableState: thenableState
  };
  task.legacyContext = legacyContext;
  abortSet.add(task);
  return task;
}
function createPendingSegment(
  request,
  index,
  boundary,
  parentFormatContext,
  lastPushedText,
  textEmbedded
) {
  return {
    status: 0,
    parentFlushed: !1,
    id: -1,
    index: index,
    chunks: [],
    children: [],
    preambleChildren: [],
    parentFormatContext: parentFormatContext,
    boundary: boundary,
    lastPushedText: lastPushedText,
    textEmbedded: textEmbedded
  };
}
function pushComponentStack(task) {
  var node = task.node;
  if ("object" === typeof node && null !== node)
    switch (node.$$typeof) {
      case REACT_ELEMENT_TYPE:
        task.componentStack = { parent: task.componentStack, type: node.type };
    }
}
function replaceSuspenseComponentStackWithSuspenseFallbackStack(
  componentStack
) {
  return null === componentStack
    ? null
    : { parent: componentStack.parent, type: "Suspense Fallback" };
}
function getThrownInfo(node$jscomp$0) {
  var errorInfo = {};
  node$jscomp$0 &&
    Object.defineProperty(errorInfo, "componentStack", {
      configurable: !0,
      enumerable: !0,
      get: function () {
        try {
          var info = "",
            node = node$jscomp$0;
          do
            (info += describeComponentStackByType(node.type)),
              (node = node.parent);
          while (node);
          var JSCompiler_inline_result = info;
        } catch (x) {
          JSCompiler_inline_result =
            "\nError generating stack: " + x.message + "\n" + x.stack;
        }
        Object.defineProperty(errorInfo, "componentStack", {
          value: JSCompiler_inline_result
        });
        return JSCompiler_inline_result;
      }
    });
  return errorInfo;
}
function logRecoverableError(request, error, errorInfo) {
  request = request.onError;
  error = request(error, errorInfo);
  if (null == error || "string" === typeof error) return error;
}
function fatalError(request, error) {
  var onShellError = request.onShellError,
    onFatalError = request.onFatalError;
  0 !== request.pendingRootTasks && onShellError(error);
  onFatalError(error);
  null !== request.destination
    ? ((request.status = 13), request.destination.destroy(error))
    : ((request.status = 12), (request.fatalError = error));
}
function finishSuspenseListRow(request, row) {
  unblockSuspenseListRow(request, row.next, row.hoistables);
}
function unblockSuspenseListRow(request, unblockedRow, inheritedHoistables) {
  for (; null !== unblockedRow; ) {
    null !== inheritedHoistables &&
      (hoistHoistables(unblockedRow.hoistables, inheritedHoistables),
      (unblockedRow.inheritedHoistables = inheritedHoistables));
    var unblockedBoundaries = unblockedRow.boundaries;
    if (null !== unblockedBoundaries) {
      unblockedRow.boundaries = null;
      for (var i = 0; i < unblockedBoundaries.length; i++) {
        var unblockedBoundary = unblockedBoundaries[i];
        null !== inheritedHoistables &&
          hoistHoistables(unblockedBoundary.contentState, inheritedHoistables);
        finishedTask(request, unblockedBoundary, null, null);
      }
    }
    unblockedRow.pendingTasks--;
    if (0 < unblockedRow.pendingTasks) break;
    inheritedHoistables = unblockedRow.hoistables;
    unblockedRow = unblockedRow.next;
  }
}
function tryToResolveTogetherRow(request, togetherRow) {
  var boundaries = togetherRow.boundaries;
  if (null !== boundaries && togetherRow.pendingTasks === boundaries.length) {
    for (var allCompleteAndInlinable = !0, i = 0; i < boundaries.length; i++) {
      var rowBoundary = boundaries[i];
      if (
        1 !== rowBoundary.pendingTasks ||
        rowBoundary.parentFlushed ||
        isEligibleForOutlining(request, rowBoundary)
      ) {
        allCompleteAndInlinable = !1;
        break;
      }
    }
    allCompleteAndInlinable &&
      unblockSuspenseListRow(request, togetherRow, togetherRow.hoistables);
  }
}
function createSuspenseListRow(previousRow) {
  var newRow = {
    pendingTasks: 1,
    boundaries: null,
    hoistables: createHoistableState(),
    inheritedHoistables: null,
    together: !1,
    next: null
  };
  null !== previousRow &&
    0 < previousRow.pendingTasks &&
    (newRow.pendingTasks++,
    (newRow.boundaries = []),
    (previousRow.next = newRow));
  return newRow;
}
function renderSuspenseListRows(request, task, keyPath, rows, revealOrder) {
  var prevKeyPath = task.keyPath,
    prevTreeContext = task.treeContext,
    prevRow = task.row;
  task.keyPath = keyPath;
  keyPath = rows.length;
  var previousSuspenseListRow = null;
  if (null !== task.replay) {
    var resumeSlots = task.replay.slots;
    if (null !== resumeSlots && "object" === typeof resumeSlots)
      for (var n = 0; n < keyPath; n++) {
        var i =
            "backwards" !== revealOrder &&
            "unstable_legacy-backwards" !== revealOrder
              ? n
              : keyPath - 1 - n,
          node = rows[i];
        task.row = previousSuspenseListRow = createSuspenseListRow(
          previousSuspenseListRow
        );
        task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
        var resumeSegmentID = resumeSlots[i];
        "number" === typeof resumeSegmentID
          ? (resumeNode(request, task, resumeSegmentID, node, i),
            delete resumeSlots[i])
          : renderNode(request, task, node, i);
        0 === --previousSuspenseListRow.pendingTasks &&
          finishSuspenseListRow(request, previousSuspenseListRow);
      }
    else
      for (resumeSlots = 0; resumeSlots < keyPath; resumeSlots++)
        (n =
          "backwards" !== revealOrder &&
          "unstable_legacy-backwards" !== revealOrder
            ? resumeSlots
            : keyPath - 1 - resumeSlots),
          (i = rows[n]),
          (task.row = previousSuspenseListRow =
            createSuspenseListRow(previousSuspenseListRow)),
          (task.treeContext = pushTreeContext(prevTreeContext, keyPath, n)),
          renderNode(request, task, i, n),
          0 === --previousSuspenseListRow.pendingTasks &&
            finishSuspenseListRow(request, previousSuspenseListRow);
  } else if (
    "backwards" !== revealOrder &&
    "unstable_legacy-backwards" !== revealOrder
  )
    for (revealOrder = 0; revealOrder < keyPath; revealOrder++)
      (resumeSlots = rows[revealOrder]),
        (task.row = previousSuspenseListRow =
          createSuspenseListRow(previousSuspenseListRow)),
        (task.treeContext = pushTreeContext(
          prevTreeContext,
          keyPath,
          revealOrder
        )),
        renderNode(request, task, resumeSlots, revealOrder),
        0 === --previousSuspenseListRow.pendingTasks &&
          finishSuspenseListRow(request, previousSuspenseListRow);
  else {
    resumeSlots = task.blockedSegment;
    n = resumeSlots.children.length;
    i = resumeSlots.chunks.length;
    for (node = 0; node < keyPath; node++) {
      resumeSegmentID =
        "unstable_legacy-backwards" === revealOrder ? keyPath - 1 - node : node;
      var node$39 = rows[resumeSegmentID];
      task.row = previousSuspenseListRow = createSuspenseListRow(
        previousSuspenseListRow
      );
      task.treeContext = pushTreeContext(
        prevTreeContext,
        keyPath,
        resumeSegmentID
      );
      var newSegment = createPendingSegment(
        request,
        i,
        null,
        task.formatContext,
        0 === resumeSegmentID ? resumeSlots.lastPushedText : !0,
        !0
      );
      resumeSlots.children.splice(n, 0, newSegment);
      task.blockedSegment = newSegment;
      try {
        renderNode(request, task, node$39, resumeSegmentID),
          pushSegmentFinale(
            newSegment.chunks,
            request.renderState,
            newSegment.lastPushedText,
            newSegment.textEmbedded
          ),
          (newSegment.status = 1),
          0 === --previousSuspenseListRow.pendingTasks &&
            finishSuspenseListRow(request, previousSuspenseListRow);
      } catch (thrownValue) {
        throw ((newSegment.status = request.aborted ? 3 : 4), thrownValue);
      }
    }
    task.blockedSegment = resumeSlots;
    resumeSlots.lastPushedText = !1;
  }
  null !== prevRow &&
    null !== previousSuspenseListRow &&
    0 < previousSuspenseListRow.pendingTasks &&
    (prevRow.pendingTasks++, (previousSuspenseListRow.next = prevRow));
  task.treeContext = prevTreeContext;
  task.row = prevRow;
  task.keyPath = prevKeyPath;
}
function renderWithHooks(request, task, keyPath, Component, props, secondArg) {
  var prevThenableState = task.thenableState;
  task.thenableState = null;
  currentlyRenderingComponent = {};
  currentlyRenderingTask = task;
  currentlyRenderingRequest = request;
  currentlyRenderingKeyPath = keyPath;
  actionStateCounter = localIdCounter = 0;
  actionStateMatchingIndex = -1;
  thenableIndexCounter = 0;
  thenableState = prevThenableState;
  for (request = Component(props, secondArg); didScheduleRenderPhaseUpdate; )
    (didScheduleRenderPhaseUpdate = !1),
      (actionStateCounter = localIdCounter = 0),
      (actionStateMatchingIndex = -1),
      (thenableIndexCounter = 0),
      (numberOfReRenders += 1),
      (workInProgressHook = null),
      (request = Component(props, secondArg));
  resetHooksState();
  return request;
}
function finishFunctionComponent(
  request,
  task,
  keyPath,
  children,
  hasId,
  actionStateCount,
  actionStateMatchingIndex
) {
  var didEmitActionStateMarkers = !1;
  if (0 !== actionStateCount && null !== request.formState) {
    var segment = task.blockedSegment;
    if (null !== segment) {
      didEmitActionStateMarkers = !0;
      segment = segment.chunks;
      for (var i = 0; i < actionStateCount; i++)
        i === actionStateMatchingIndex
          ? segment.push("\x3c!--F!--\x3e")
          : segment.push("\x3c!--F--\x3e");
    }
  }
  actionStateCount = task.keyPath;
  task.keyPath = keyPath;
  hasId
    ? ((keyPath = task.treeContext),
      (task.treeContext = pushTreeContext(keyPath, 1, 0)),
      renderNode(request, task, children, -1),
      (task.treeContext = keyPath))
    : didEmitActionStateMarkers
      ? renderNode(request, task, children, -1)
      : renderNodeDestructive(request, task, children, -1);
  task.keyPath = actionStateCount;
}
function renderElement(request, task, keyPath, type, props, ref) {
  if ("function" === typeof type)
    if (type.prototype && type.prototype.isReactComponent) {
      var newProps = props;
      if ("ref" in props) {
        newProps = {};
        for (var propName in props)
          "ref" !== propName && (newProps[propName] = props[propName]);
      }
      var defaultProps = type.defaultProps;
      if (defaultProps) {
        newProps === props && (newProps = assign({}, newProps, props));
        for (var propName$44 in defaultProps)
          void 0 === newProps[propName$44] &&
            (newProps[propName$44] = defaultProps[propName$44]);
      }
      var JSCompiler_inline_result = newProps;
      var maskedContext = getMaskedContext(type, task.legacyContext),
        contextType = type.contextType;
      var JSCompiler_inline_result$jscomp$0 = new type(
        JSCompiler_inline_result,
        "object" === typeof contextType && null !== contextType
          ? contextType._currentValue2
          : maskedContext
      );
      var initialState =
        void 0 !== JSCompiler_inline_result$jscomp$0.state
          ? JSCompiler_inline_result$jscomp$0.state
          : null;
      JSCompiler_inline_result$jscomp$0.updater = classComponentUpdater;
      JSCompiler_inline_result$jscomp$0.props = JSCompiler_inline_result;
      JSCompiler_inline_result$jscomp$0.state = initialState;
      var internalInstance = { queue: [], replace: !1 };
      JSCompiler_inline_result$jscomp$0._reactInternals = internalInstance;
      var contextType$jscomp$0 = type.contextType;
      JSCompiler_inline_result$jscomp$0.context =
        "object" === typeof contextType$jscomp$0 &&
        null !== contextType$jscomp$0
          ? contextType$jscomp$0._currentValue2
          : maskedContext;
      var getDerivedStateFromProps = type.getDerivedStateFromProps;
      if ("function" === typeof getDerivedStateFromProps) {
        var partialState = getDerivedStateFromProps(
          JSCompiler_inline_result,
          initialState
        );
        var JSCompiler_inline_result$jscomp$1 =
          null === partialState || void 0 === partialState
            ? initialState
            : assign({}, initialState, partialState);
        JSCompiler_inline_result$jscomp$0.state =
          JSCompiler_inline_result$jscomp$1;
      }
      if (
        "function" !== typeof type.getDerivedStateFromProps &&
        "function" !==
          typeof JSCompiler_inline_result$jscomp$0.getSnapshotBeforeUpdate &&
        ("function" ===
          typeof JSCompiler_inline_result$jscomp$0.UNSAFE_componentWillMount ||
          "function" ===
            typeof JSCompiler_inline_result$jscomp$0.componentWillMount)
      ) {
        var oldState = JSCompiler_inline_result$jscomp$0.state;
        "function" ===
          typeof JSCompiler_inline_result$jscomp$0.componentWillMount &&
          JSCompiler_inline_result$jscomp$0.componentWillMount();
        "function" ===
          typeof JSCompiler_inline_result$jscomp$0.UNSAFE_componentWillMount &&
          JSCompiler_inline_result$jscomp$0.UNSAFE_componentWillMount();
        oldState !== JSCompiler_inline_result$jscomp$0.state &&
          classComponentUpdater.enqueueReplaceState(
            JSCompiler_inline_result$jscomp$0,
            JSCompiler_inline_result$jscomp$0.state,
            null
          );
        if (
          null !== internalInstance.queue &&
          0 < internalInstance.queue.length
        ) {
          var oldQueue = internalInstance.queue,
            oldReplace = internalInstance.replace;
          internalInstance.queue = null;
          internalInstance.replace = !1;
          if (oldReplace && 1 === oldQueue.length)
            JSCompiler_inline_result$jscomp$0.state = oldQueue[0];
          else {
            for (
              var nextState = oldReplace
                  ? oldQueue[0]
                  : JSCompiler_inline_result$jscomp$0.state,
                dontMutate = !0,
                i = oldReplace ? 1 : 0;
              i < oldQueue.length;
              i++
            ) {
              var partial = oldQueue[i],
                partialState$jscomp$0 =
                  "function" === typeof partial
                    ? partial.call(
                        JSCompiler_inline_result$jscomp$0,
                        nextState,
                        JSCompiler_inline_result,
                        maskedContext
                      )
                    : partial;
              null != partialState$jscomp$0 &&
                (dontMutate
                  ? ((dontMutate = !1),
                    (nextState = assign({}, nextState, partialState$jscomp$0)))
                  : assign(nextState, partialState$jscomp$0));
            }
            JSCompiler_inline_result$jscomp$0.state = nextState;
          }
        } else internalInstance.queue = null;
      }
      var nextChildren = JSCompiler_inline_result$jscomp$0.render();
      if (request.aborted) throw null;
      var childContextTypes = type.childContextTypes;
      if (null !== childContextTypes && void 0 !== childContextTypes) {
        var previousContext = task.legacyContext;
        if (
          "function" !==
          typeof JSCompiler_inline_result$jscomp$0.getChildContext
        )
          var JSCompiler_inline_result$jscomp$2 = previousContext;
        else {
          var childContext =
              JSCompiler_inline_result$jscomp$0.getChildContext(),
            contextKey;
          for (contextKey in childContext)
            if (!(contextKey in childContextTypes))
              throw Error(
                formatProdErrorMessage(
                  108,
                  getComponentNameFromType(type) || "Unknown",
                  contextKey
                )
              );
          JSCompiler_inline_result$jscomp$2 = assign(
            {},
            previousContext,
            childContext
          );
        }
        task.legacyContext = JSCompiler_inline_result$jscomp$2;
        renderNodeDestructive(request, task, nextChildren, -1);
        task.legacyContext = previousContext;
      } else {
        var prevKeyPath = task.keyPath;
        task.keyPath = keyPath;
        renderNodeDestructive(request, task, nextChildren, -1);
        task.keyPath = prevKeyPath;
      }
    } else {
      var legacyContext;
      disableLegacyContextForFunctionComponents ||
        (legacyContext = getMaskedContext(type, task.legacyContext));
      var value = renderWithHooks(
        request,
        task,
        keyPath,
        type,
        props,
        legacyContext
      );
      if (request.aborted) throw null;
      finishFunctionComponent(
        request,
        task,
        keyPath,
        value,
        0 !== localIdCounter,
        actionStateCounter,
        actionStateMatchingIndex
      );
    }
  else if ("string" === typeof type) {
    var segment = task.blockedSegment;
    if (null === segment) {
      var children = props.children,
        prevContext = task.formatContext,
        prevKeyPath$jscomp$0 = task.keyPath;
      task.formatContext = getChildFormatContext(prevContext, type, props);
      task.keyPath = keyPath;
      renderNode(request, task, children, -1);
      task.formatContext = prevContext;
      task.keyPath = prevKeyPath$jscomp$0;
    } else {
      var children$41 = pushStartInstance(
        segment.chunks,
        type,
        props,
        request.resumableState,
        request.renderState,
        task.blockedPreamble,
        task.hoistableState,
        task.formatContext,
        segment.lastPushedText
      );
      segment.lastPushedText = !1;
      var prevContext$42 = task.formatContext,
        prevKeyPath$43 = task.keyPath;
      task.keyPath = keyPath;
      if (
        3 ===
        (task.formatContext = getChildFormatContext(
          prevContext$42,
          type,
          props
        )).insertionMode
      ) {
        var preambleSegment = createPendingSegment(
          request,
          0,
          null,
          task.formatContext,
          !1,
          !1
        );
        segment.preambleChildren.push(preambleSegment);
        task.blockedSegment = preambleSegment;
        try {
          renderNode(request, task, children$41, -1),
            pushSegmentFinale(
              preambleSegment.chunks,
              request.renderState,
              preambleSegment.lastPushedText,
              preambleSegment.textEmbedded
            ),
            (preambleSegment.status = 1);
        } finally {
          task.blockedSegment = segment;
        }
      } else renderNode(request, task, children$41, -1);
      task.formatContext = prevContext$42;
      task.keyPath = prevKeyPath$43;
      a: {
        var target = segment.chunks,
          resumableState = request.resumableState;
        switch (type) {
          case "title":
          case "style":
          case "script":
          case "area":
          case "base":
          case "br":
          case "col":
          case "embed":
          case "hr":
          case "img":
          case "input":
          case "keygen":
          case "link":
          case "meta":
          case "param":
          case "source":
          case "track":
          case "wbr":
            break a;
          case "body":
            if (1 >= prevContext$42.insertionMode) {
              resumableState.hasBody = !0;
              break a;
            }
            break;
          case "html":
            if (0 === prevContext$42.insertionMode) {
              resumableState.hasHtml = !0;
              break a;
            }
            break;
          case "head":
            if (1 >= prevContext$42.insertionMode) break a;
        }
        target.push(endChunkForTag(type));
      }
      segment.lastPushedText = !1;
    }
  } else {
    switch (type) {
      case REACT_LEGACY_HIDDEN_TYPE:
      case REACT_STRICT_MODE_TYPE:
      case REACT_PROFILER_TYPE:
      case REACT_FRAGMENT_TYPE:
        var prevKeyPath$jscomp$1 = task.keyPath;
        task.keyPath = keyPath;
        renderNodeDestructive(request, task, props.children, -1);
        task.keyPath = prevKeyPath$jscomp$1;
        return;
      case REACT_ACTIVITY_TYPE:
        var segment$jscomp$0 = task.blockedSegment;
        if (null === segment$jscomp$0) {
          if ("hidden" !== props.mode) {
            var prevKeyPath$jscomp$2 = task.keyPath;
            task.keyPath = keyPath;
            renderNode(request, task, props.children, -1);
            task.keyPath = prevKeyPath$jscomp$2;
          }
        } else if ("hidden" !== props.mode) {
          request.renderState.generateStaticMarkup ||
            segment$jscomp$0.chunks.push("\x3c!--&--\x3e");
          segment$jscomp$0.lastPushedText = !1;
          var prevKeyPath$46 = task.keyPath;
          task.keyPath = keyPath;
          renderNode(request, task, props.children, -1);
          task.keyPath = prevKeyPath$46;
          request.renderState.generateStaticMarkup ||
            segment$jscomp$0.chunks.push("\x3c!--/&--\x3e");
          segment$jscomp$0.lastPushedText = !1;
        }
        return;
      case REACT_SUSPENSE_LIST_TYPE:
        a: {
          var children$jscomp$0 = props.children,
            revealOrder = props.revealOrder;
          if ("independent" !== revealOrder && "together" !== revealOrder) {
            if (isArrayImpl(children$jscomp$0)) {
              renderSuspenseListRows(
                request,
                task,
                keyPath,
                children$jscomp$0,
                revealOrder
              );
              break a;
            }
            var iteratorFn = getIteratorFn(children$jscomp$0);
            if (iteratorFn) {
              var iterator = iteratorFn.call(children$jscomp$0);
              if (iterator) {
                var step = iterator.next();
                if (!step.done) {
                  do step = iterator.next();
                  while (!step.done);
                  renderSuspenseListRows(
                    request,
                    task,
                    keyPath,
                    children$jscomp$0,
                    revealOrder
                  );
                }
                break a;
              }
            }
          }
          if ("together" === revealOrder) {
            var prevKeyPath$40 = task.keyPath,
              prevRow = task.row,
              newRow = (task.row = createSuspenseListRow(null));
            newRow.boundaries = [];
            newRow.together = !0;
            task.keyPath = keyPath;
            renderNodeDestructive(request, task, children$jscomp$0, -1);
            0 === --newRow.pendingTasks &&
              finishSuspenseListRow(request, newRow);
            task.keyPath = prevKeyPath$40;
            task.row = prevRow;
            null !== prevRow &&
              0 < newRow.pendingTasks &&
              (prevRow.pendingTasks++, (newRow.next = prevRow));
          } else {
            var prevKeyPath$jscomp$3 = task.keyPath;
            task.keyPath = keyPath;
            renderNodeDestructive(request, task, children$jscomp$0, -1);
            task.keyPath = prevKeyPath$jscomp$3;
          }
        }
        return;
      case REACT_VIEW_TRANSITION_TYPE:
        if (enableViewTransition) {
          var prevContext$jscomp$0 = task.formatContext,
            prevKeyPath$jscomp$4 = task.keyPath;
          var resumableState$jscomp$0 = request.resumableState;
          if (null == props.name || "auto" === props.name) {
            var treeId = getTreeId(task.treeContext);
            makeId(resumableState$jscomp$0, treeId, 0);
          }
          task.formatContext = prevContext$jscomp$0;
          task.keyPath = keyPath;
          if (null != props.name && "auto" !== props.name)
            renderNodeDestructive(request, task, props.children, -1);
          else {
            var prevTreeContext = task.treeContext;
            task.treeContext = pushTreeContext(prevTreeContext, 1, 0);
            renderNode(request, task, props.children, -1);
            task.treeContext = prevTreeContext;
          }
          task.formatContext = prevContext$jscomp$0;
          task.keyPath = prevKeyPath$jscomp$4;
          return;
        }
      case REACT_SCOPE_TYPE:
        var prevKeyPath$47 = task.keyPath;
        task.keyPath = keyPath;
        renderNodeDestructive(request, task, props.children, -1);
        task.keyPath = prevKeyPath$47;
        return;
      case REACT_SUSPENSE_TYPE:
        a: if (null !== task.replay) {
          var prevKeyPath$26 = task.keyPath,
            prevContext$27 = task.formatContext,
            prevRow$28 = task.row;
          task.keyPath = keyPath;
          task.formatContext = getSuspenseContentFormatContext(
            request.resumableState,
            prevContext$27
          );
          task.row = null;
          var content$29 = props.children;
          try {
            renderNode(request, task, content$29, -1);
          } finally {
            (task.keyPath = prevKeyPath$26),
              (task.formatContext = prevContext$27),
              (task.row = prevRow$28);
          }
        } else {
          var prevKeyPath$jscomp$5 = task.keyPath,
            prevContext$jscomp$1 = task.formatContext,
            prevRow$jscomp$0 = task.row,
            parentBoundary = task.blockedBoundary,
            parentPreamble = task.blockedPreamble,
            parentHoistableState = task.hoistableState,
            parentSegment = task.blockedSegment,
            fallback = props.fallback,
            content = props.children,
            defer = !0 === props.defer,
            fallbackAbortSet = new Set(),
            newBoundary = createSuspenseBoundary(
              request,
              task.row,
              fallbackAbortSet,
              null,
              defer
            ),
            boundarySegment = createPendingSegment(
              request,
              parentSegment.chunks.length,
              newBoundary,
              task.formatContext,
              !1,
              !1
            );
          parentSegment.children.push(boundarySegment);
          parentSegment.lastPushedText = !1;
          var contentRootSegment = createPendingSegment(
            request,
            0,
            null,
            task.formatContext,
            !1,
            !1
          );
          contentRootSegment.parentFlushed = !0;
          var trackedPostpones = request.trackedPostpones;
          if (null !== trackedPostpones || defer) {
            var suspenseComponentStack = task.componentStack,
              fallbackKeyPath = [keyPath[0], "Suspense Fallback", keyPath[2]];
            if (null !== trackedPostpones) {
              var fallbackReplayNode = [
                fallbackKeyPath[1],
                fallbackKeyPath[2],
                [],
                null
              ];
              trackedPostpones.workingMap.set(
                fallbackKeyPath,
                fallbackReplayNode
              );
              newBoundary.tracked = {
                contentKeyPath: keyPath,
                fallbackNode: fallbackReplayNode
              };
            }
            task.blockedSegment = boundarySegment;
            task.blockedPreamble =
              null === newBoundary.preamble
                ? null
                : newBoundary.preamble.fallback;
            task.keyPath = fallbackKeyPath;
            task.formatContext = getSuspenseFallbackFormatContext(
              request.resumableState,
              prevContext$jscomp$1
            );
            task.componentStack =
              replaceSuspenseComponentStackWithSuspenseFallbackStack(
                suspenseComponentStack
              );
            try {
              renderNode(request, task, fallback, -1),
                pushSegmentFinale(
                  boundarySegment.chunks,
                  request.renderState,
                  boundarySegment.lastPushedText,
                  boundarySegment.textEmbedded
                ),
                (boundarySegment.status = 1);
            } catch (thrownValue) {
              throw (
                ((boundarySegment.status = request.aborted ? 3 : 4),
                thrownValue)
              );
            } finally {
              (task.blockedSegment = parentSegment),
                (task.blockedPreamble = parentPreamble),
                (task.keyPath = prevKeyPath$jscomp$5),
                (task.formatContext = prevContext$jscomp$1);
            }
            var suspendedPrimaryTask = createRenderTask(
              request,
              null,
              content,
              -1,
              newBoundary,
              contentRootSegment,
              null === newBoundary.preamble
                ? null
                : newBoundary.preamble.content,
              newBoundary.contentState,
              task.abortSet,
              keyPath,
              getSuspenseContentFormatContext(
                request.resumableState,
                task.formatContext
              ),
              task.context,
              task.treeContext,
              null,
              suspenseComponentStack,
              task.legacyContext
            );
            pushComponentStack(suspendedPrimaryTask);
            request.pingedTasks.push(suspendedPrimaryTask);
          } else {
            task.blockedBoundary = newBoundary;
            task.blockedPreamble =
              null === newBoundary.preamble
                ? null
                : newBoundary.preamble.content;
            task.hoistableState = newBoundary.contentState;
            task.blockedSegment = contentRootSegment;
            task.keyPath = keyPath;
            task.formatContext = getSuspenseContentFormatContext(
              request.resumableState,
              prevContext$jscomp$1
            );
            task.row = null;
            try {
              if (
                (renderNode(request, task, content, -1),
                pushSegmentFinale(
                  contentRootSegment.chunks,
                  request.renderState,
                  contentRootSegment.lastPushedText,
                  contentRootSegment.textEmbedded
                ),
                (contentRootSegment.status = 1),
                queueCompletedSegment(newBoundary, contentRootSegment),
                0 === newBoundary.pendingTasks && 0 === newBoundary.status)
              ) {
                if (
                  ((newBoundary.status = 1),
                  !isEligibleForOutlining(request, newBoundary))
                ) {
                  null !== prevRow$jscomp$0 &&
                    0 === --prevRow$jscomp$0.pendingTasks &&
                    finishSuspenseListRow(request, prevRow$jscomp$0);
                  0 === request.pendingRootTasks &&
                    task.blockedPreamble &&
                    preparePreamble(request);
                  break a;
                }
              } else
                null !== prevRow$jscomp$0 &&
                  prevRow$jscomp$0.together &&
                  tryToResolveTogetherRow(request, prevRow$jscomp$0);
            } catch (thrownValue$30) {
              newBoundary.status = 4;
              if (request.aborted) {
                contentRootSegment.status = 3;
                var error = request.fatalError;
              } else (contentRootSegment.status = 4), (error = thrownValue$30);
              var thrownInfo = getThrownInfo(task.componentStack),
                errorDigest = logRecoverableError(request, error, thrownInfo);
              newBoundary.errorDigest = errorDigest;
              untrackBoundary(request, newBoundary);
            } finally {
              (task.blockedBoundary = parentBoundary),
                (task.blockedPreamble = parentPreamble),
                (task.hoistableState = parentHoistableState),
                (task.blockedSegment = parentSegment),
                (task.keyPath = prevKeyPath$jscomp$5),
                (task.formatContext = prevContext$jscomp$1),
                (task.row = prevRow$jscomp$0);
            }
            var suspendedFallbackTask = createRenderTask(
              request,
              null,
              fallback,
              -1,
              parentBoundary,
              boundarySegment,
              null === newBoundary.preamble
                ? null
                : newBoundary.preamble.fallback,
              newBoundary.fallbackState,
              fallbackAbortSet,
              [keyPath[0], "Suspense Fallback", keyPath[2]],
              getSuspenseFallbackFormatContext(
                request.resumableState,
                task.formatContext
              ),
              task.context,
              task.treeContext,
              task.row,
              replaceSuspenseComponentStackWithSuspenseFallbackStack(
                task.componentStack
              ),
              task.legacyContext
            );
            pushComponentStack(suspendedFallbackTask);
            request.pingedTasks.push(suspendedFallbackTask);
          }
        }
        return;
    }
    if ("object" === typeof type && null !== type)
      switch (type.$$typeof) {
        case REACT_FORWARD_REF_TYPE:
          if ("ref" in props) {
            var propsWithoutRef = {};
            for (var key in props)
              "ref" !== key && (propsWithoutRef[key] = props[key]);
          } else propsWithoutRef = props;
          var children$jscomp$1 = renderWithHooks(
            request,
            task,
            keyPath,
            type.render,
            propsWithoutRef,
            ref
          );
          finishFunctionComponent(
            request,
            task,
            keyPath,
            children$jscomp$1,
            0 !== localIdCounter,
            actionStateCounter,
            actionStateMatchingIndex
          );
          return;
        case REACT_MEMO_TYPE:
          renderElement(request, task, keyPath, type.type, props, ref);
          return;
        case REACT_CONTEXT_TYPE:
          var children$jscomp$2 = props.children,
            prevKeyPath$jscomp$6 = task.keyPath,
            nextValue = props.value;
          var prevValue = type._currentValue2;
          type._currentValue2 = nextValue;
          var prevNode = currentActiveSnapshot,
            newNode = {
              parent: prevNode,
              depth: null === prevNode ? 0 : prevNode.depth + 1,
              context: type,
              parentValue: prevValue,
              value: nextValue
            };
          currentActiveSnapshot = newNode;
          task.context = newNode;
          task.keyPath = keyPath;
          renderNodeDestructive(request, task, children$jscomp$2, -1);
          var prevSnapshot = currentActiveSnapshot;
          if (null === prevSnapshot) throw Error(formatProdErrorMessage(403));
          prevSnapshot.context._currentValue2 = prevSnapshot.parentValue;
          var JSCompiler_inline_result$jscomp$3 = (currentActiveSnapshot =
            prevSnapshot.parent);
          task.context = JSCompiler_inline_result$jscomp$3;
          task.keyPath = prevKeyPath$jscomp$6;
          return;
        case REACT_CONSUMER_TYPE:
          var render = props.children,
            newChildren = render(type._context._currentValue2),
            prevKeyPath$jscomp$7 = task.keyPath;
          task.keyPath = keyPath;
          renderNodeDestructive(request, task, newChildren, -1);
          task.keyPath = prevKeyPath$jscomp$7;
          return;
        case REACT_LAZY_TYPE:
          var init = type._init;
          var Component = init(type._payload);
          if (request.aborted) throw null;
          renderElement(request, task, keyPath, Component, props, ref);
          return;
      }
    throw Error(
      formatProdErrorMessage(130, null == type ? type : typeof type, "")
    );
  }
}
function resumeNode(request, task, segmentId, node, childIndex) {
  var prevReplay = task.replay,
    blockedBoundary = task.blockedBoundary,
    resumedSegment = createPendingSegment(
      request,
      0,
      null,
      task.formatContext,
      !1,
      !1
    );
  resumedSegment.id = segmentId;
  resumedSegment.parentFlushed = !0;
  try {
    (task.replay = null),
      (task.blockedSegment = resumedSegment),
      renderNode(request, task, node, childIndex),
      (resumedSegment.status = 1),
      null === blockedBoundary
        ? (request.completedRootSegment = resumedSegment)
        : (queueCompletedSegment(blockedBoundary, resumedSegment),
          blockedBoundary.parentFlushed &&
            request.partialBoundaries.push(blockedBoundary));
  } finally {
    (task.replay = prevReplay), (task.blockedSegment = null);
  }
}
function renderNodeDestructive(request, task, node, childIndex) {
  null !== task.replay && "number" === typeof task.replay.slots
    ? resumeNode(request, task, task.replay.slots, node, childIndex)
    : ((task.node = node),
      (task.childIndex = childIndex),
      (node = task.componentStack),
      pushComponentStack(task),
      retryNode(request, task),
      (task.componentStack = node));
}
function retryNode(request, task) {
  var node = task.node,
    childIndex = task.childIndex;
  if (null !== node) {
    if ("object" === typeof node) {
      switch (node.$$typeof) {
        case REACT_ELEMENT_TYPE:
          var type = node.type,
            key = node.key,
            props = node.props;
          node = props.ref;
          var ref = void 0 !== node ? node : null,
            name = getComponentNameFromType(type),
            keyOrIndex =
              null == key || key === REACT_OPTIMISTIC_KEY
                ? -1 === childIndex
                  ? 0
                  : childIndex
                : key;
          key = [task.keyPath, name, keyOrIndex];
          if (null !== task.replay)
            a: {
              var replay = task.replay;
              childIndex = replay.nodes;
              for (node = 0; node < childIndex.length; node++) {
                var node$jscomp$0 = childIndex[node];
                if (keyOrIndex === node$jscomp$0[1]) {
                  if (4 === node$jscomp$0.length) {
                    if (null !== name && name !== node$jscomp$0[0])
                      throw Error(
                        formatProdErrorMessage(490, node$jscomp$0[0], name)
                      );
                    var childNodes = node$jscomp$0[2],
                      childSlots = node$jscomp$0[3],
                      currentNode = task.node;
                    task.replay = {
                      nodes: childNodes,
                      slots: childSlots,
                      pendingTasks: 1
                    };
                    try {
                      renderElement(request, task, key, type, props, ref);
                      if (
                        1 === task.replay.pendingTasks &&
                        0 < task.replay.nodes.length
                      )
                        throw Error(formatProdErrorMessage(488));
                      task.replay.pendingTasks--;
                    } catch (x) {
                      if (
                        "object" === typeof x &&
                        null !== x &&
                        (x === SuspenseException ||
                          "function" === typeof x.then ||
                          "Maximum call stack size exceeded" === x.message)
                      )
                        throw (
                          (task.node === currentNode
                            ? (task.replay = replay)
                            : childIndex.splice(node, 1),
                          x)
                        );
                      task.replay.pendingTasks--;
                      key = getThrownInfo(task.componentStack);
                      currentNode = request;
                      props = task.blockedBoundary;
                      request = request.aborted ? request.fatalError : x;
                      key = logRecoverableError(currentNode, request, key);
                      abortRemainingReplayNodes(
                        currentNode,
                        props,
                        childNodes,
                        childSlots,
                        request,
                        key
                      );
                    }
                    task.replay = replay;
                  } else {
                    if (type !== REACT_SUSPENSE_TYPE)
                      throw Error(
                        formatProdErrorMessage(
                          490,
                          "Suspense",
                          getComponentNameFromType(type) || "Unknown"
                        )
                      );
                    b: {
                      replay = node$jscomp$0[5];
                      type = node$jscomp$0[2];
                      ref = node$jscomp$0[3];
                      name =
                        null === node$jscomp$0[4] ? [] : node$jscomp$0[4][2];
                      node$jscomp$0 =
                        null === node$jscomp$0[4] ? null : node$jscomp$0[4][3];
                      keyOrIndex = task.keyPath;
                      var prevContext = task.formatContext,
                        prevRow = task.row,
                        previousReplaySet = task.replay,
                        parentBoundary = task.blockedBoundary,
                        parentHoistableState = task.hoistableState,
                        content = props.children,
                        fallback = props.fallback,
                        defer = !0 === props.defer;
                      props = new Set();
                      defer = createSuspenseBoundary(
                        request,
                        task.row,
                        props,
                        null,
                        defer
                      );
                      defer.parentFlushed = !0;
                      defer.rootSegmentID = replay;
                      task.blockedBoundary = defer;
                      task.hoistableState = defer.contentState;
                      task.keyPath = key;
                      task.formatContext = getSuspenseContentFormatContext(
                        request.resumableState,
                        prevContext
                      );
                      task.row = null;
                      task.replay = {
                        nodes: type,
                        slots: ref,
                        pendingTasks: 1
                      };
                      try {
                        renderNode(request, task, content, -1);
                        if (
                          1 === task.replay.pendingTasks &&
                          0 < task.replay.nodes.length
                        )
                          throw Error(formatProdErrorMessage(488));
                        task.replay.pendingTasks--;
                        if (0 === defer.pendingTasks && 0 === defer.status) {
                          defer.status = 1;
                          request.completedBoundaries.push(defer);
                          break b;
                        }
                      } catch (thrownValue) {
                        (defer.status = 4),
                          (childNodes = request.aborted
                            ? request.fatalError
                            : thrownValue),
                          (childSlots = getThrownInfo(task.componentStack)),
                          (currentNode = logRecoverableError(
                            request,
                            childNodes,
                            childSlots
                          )),
                          (defer.errorDigest = currentNode),
                          task.replay.pendingTasks--,
                          request.clientRenderedBoundaries.push(defer);
                      } finally {
                        (task.blockedBoundary = parentBoundary),
                          (task.hoistableState = parentHoistableState),
                          (task.replay = previousReplaySet),
                          (task.keyPath = keyOrIndex),
                          (task.formatContext = prevContext),
                          (task.row = prevRow);
                      }
                      childNodes = createReplayTask(
                        request,
                        null,
                        { nodes: name, slots: node$jscomp$0, pendingTasks: 0 },
                        fallback,
                        -1,
                        parentBoundary,
                        defer.fallbackState,
                        props,
                        [key[0], "Suspense Fallback", key[2]],
                        getSuspenseFallbackFormatContext(
                          request.resumableState,
                          task.formatContext
                        ),
                        task.context,
                        task.treeContext,
                        task.row,
                        replaceSuspenseComponentStackWithSuspenseFallbackStack(
                          task.componentStack
                        ),
                        task.legacyContext
                      );
                      pushComponentStack(childNodes);
                      request.pingedTasks.push(childNodes);
                    }
                  }
                  childIndex.splice(node, 1);
                  break a;
                }
              }
            }
          else renderElement(request, task, key, type, props, ref);
          return;
        case REACT_PORTAL_TYPE:
          throw Error(formatProdErrorMessage(257));
        case REACT_LAZY_TYPE:
          childNodes = node._init;
          node = childNodes(node._payload);
          if (request.aborted) throw null;
          renderNodeDestructive(request, task, node, childIndex);
          return;
      }
      if (isArrayImpl(node)) {
        renderChildrenArray(request, task, node, childIndex);
        return;
      }
      if ((childNodes = getIteratorFn(node)))
        if ((childNodes = childNodes.call(node))) {
          node = childNodes.next();
          if (!node.done) {
            childSlots = [];
            do childSlots.push(node.value), (node = childNodes.next());
            while (!node.done);
            renderChildrenArray(request, task, childSlots, childIndex);
          }
          return;
        }
      if ("function" === typeof node.then)
        return (
          (task.thenableState = null),
          renderNodeDestructive(request, task, unwrapThenable(node), childIndex)
        );
      if (node.$$typeof === REACT_CONTEXT_TYPE)
        return renderNodeDestructive(
          request,
          task,
          node._currentValue2,
          childIndex
        );
      childIndex = Object.prototype.toString.call(node);
      throw Error(
        formatProdErrorMessage(
          31,
          "[object Object]" === childIndex
            ? "object with keys {" + Object.keys(node).join(", ") + "}"
            : childIndex
        )
      );
    }
    if ("string" === typeof node)
      (childIndex = task.blockedSegment),
        null !== childIndex &&
          (childIndex.lastPushedText = pushTextInstance(
            childIndex.chunks,
            node,
            request.renderState,
            childIndex.lastPushedText
          ));
    else if ("number" === typeof node || "bigint" === typeof node)
      (childIndex = task.blockedSegment),
        null !== childIndex &&
          (childIndex.lastPushedText = pushTextInstance(
            childIndex.chunks,
            "" + node,
            request.renderState,
            childIndex.lastPushedText
          ));
  }
}
function renderChildrenArray(request, task, children, childIndex) {
  var prevKeyPath = task.keyPath;
  if (
    -1 !== childIndex &&
    ((task.keyPath = [task.keyPath, "Fragment", childIndex]),
    null !== task.replay)
  ) {
    for (
      var replay = task.replay, replayNodes = replay.nodes, j = 0;
      j < replayNodes.length;
      j++
    ) {
      var node = replayNodes[j];
      if (node[1] === childIndex) {
        childIndex = node[2];
        node = node[3];
        task.replay = { nodes: childIndex, slots: node, pendingTasks: 1 };
        try {
          renderChildrenArray(request, task, children, -1);
          if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length)
            throw Error(formatProdErrorMessage(488));
          task.replay.pendingTasks--;
        } catch (x) {
          if (
            "object" === typeof x &&
            null !== x &&
            (x === SuspenseException || "function" === typeof x.then)
          )
            throw x;
          task.replay.pendingTasks--;
          var thrownInfo = getThrownInfo(task.componentStack);
          children = request;
          var boundary = task.blockedBoundary;
          request = request.aborted ? request.fatalError : x;
          thrownInfo = logRecoverableError(children, request, thrownInfo);
          abortRemainingReplayNodes(
            children,
            boundary,
            childIndex,
            node,
            request,
            thrownInfo
          );
        }
        task.replay = replay;
        replayNodes.splice(j, 1);
        break;
      }
    }
    task.keyPath = prevKeyPath;
    return;
  }
  replay = task.treeContext;
  replayNodes = children.length;
  if (
    null !== task.replay &&
    ((j = task.replay.slots), null !== j && "object" === typeof j)
  ) {
    for (childIndex = 0; childIndex < replayNodes; childIndex++)
      (node = children[childIndex]),
        (task.treeContext = pushTreeContext(replay, replayNodes, childIndex)),
        (boundary = j[childIndex]),
        "number" === typeof boundary
          ? (resumeNode(request, task, boundary, node, childIndex),
            delete j[childIndex])
          : renderNode(request, task, node, childIndex);
    task.treeContext = replay;
    task.keyPath = prevKeyPath;
    return;
  }
  for (j = 0; j < replayNodes; j++)
    (childIndex = children[j]),
      (task.treeContext = pushTreeContext(replay, replayNodes, j)),
      renderNode(request, task, childIndex, j);
  task.treeContext = replay;
  task.keyPath = prevKeyPath;
}
function trackPostponedBoundary(request, trackedPostpones, boundary) {
  boundary.status = 5;
  boundary.rootSegmentID = request.nextSegmentId++;
  var tracked = boundary.tracked;
  if (null === tracked) throw Error(formatProdErrorMessage(486));
  request = tracked.contentKeyPath;
  if (null === request) throw Error(formatProdErrorMessage(486));
  tracked = tracked.fallbackNode;
  var children = [],
    boundaryNode = trackedPostpones.workingMap.get(request);
  if (void 0 === boundaryNode)
    return (
      (boundary = [
        request[1],
        request[2],
        children,
        null,
        tracked,
        boundary.rootSegmentID
      ]),
      trackedPostpones.workingMap.set(request, boundary),
      addToReplayParent(boundary, request[0], trackedPostpones),
      boundary
    );
  boundaryNode[4] = tracked;
  boundaryNode[5] = boundary.rootSegmentID;
  return boundaryNode;
}
function trackPostpone(request, trackedPostpones, task, segment) {
  segment.status = 5;
  var keyPath = task.keyPath,
    boundary = task.blockedBoundary;
  if (null === boundary)
    (segment.id = request.nextSegmentId++),
      (trackedPostpones.rootSlots = segment.id),
      null !== request.completedRootSegment &&
        (request.completedRootSegment.status = 5);
  else {
    if (null !== boundary && 0 === boundary.status) {
      var boundaryNode = trackPostponedBoundary(
        request,
        trackedPostpones,
        boundary
      );
      if (
        null !== boundary.tracked &&
        boundary.tracked.contentKeyPath === keyPath &&
        -1 === task.childIndex
      ) {
        -1 === segment.id &&
          (segment.id = segment.parentFlushed
            ? boundary.rootSegmentID
            : request.nextSegmentId++);
        boundaryNode[3] = segment.id;
        return;
      }
    }
    -1 === segment.id &&
      (segment.id =
        segment.parentFlushed && null !== boundary
          ? boundary.rootSegmentID
          : request.nextSegmentId++);
    if (-1 === task.childIndex)
      null === keyPath
        ? (trackedPostpones.rootSlots = segment.id)
        : ((task = trackedPostpones.workingMap.get(keyPath)),
          void 0 === task
            ? ((task = [keyPath[1], keyPath[2], [], segment.id]),
              addToReplayParent(task, keyPath[0], trackedPostpones))
            : (task[3] = segment.id));
    else {
      if (null === keyPath)
        if (((request = trackedPostpones.rootSlots), null === request))
          request = trackedPostpones.rootSlots = {};
        else {
          if ("number" === typeof request)
            throw Error(formatProdErrorMessage(491));
        }
      else if (
        ((boundary = trackedPostpones.workingMap),
        (boundaryNode = boundary.get(keyPath)),
        void 0 === boundaryNode)
      )
        (request = {}),
          (boundaryNode = [keyPath[1], keyPath[2], [], request]),
          boundary.set(keyPath, boundaryNode),
          addToReplayParent(boundaryNode, keyPath[0], trackedPostpones);
      else if (((request = boundaryNode[3]), null === request))
        request = boundaryNode[3] = {};
      else if ("number" === typeof request)
        throw Error(formatProdErrorMessage(491));
      request[task.childIndex] = segment.id;
    }
  }
}
function untrackBoundary(request, boundary) {
  request = request.trackedPostpones;
  null !== request &&
    ((boundary = boundary.tracked),
    null !== boundary &&
      ((boundary = boundary.contentKeyPath),
      null !== boundary &&
        ((request = request.workingMap.get(boundary)),
        void 0 !== request &&
          ((request.length = 4), (request[2] = []), (request[3] = null)))));
}
function spawnNewSuspendedReplayTask(request, task, thenableState) {
  return createReplayTask(
    request,
    thenableState,
    task.replay,
    task.node,
    task.childIndex,
    task.blockedBoundary,
    task.hoistableState,
    task.abortSet,
    task.keyPath,
    task.formatContext,
    task.context,
    task.treeContext,
    task.row,
    task.componentStack,
    task.legacyContext
  );
}
function spawnNewSuspendedRenderTask(request, task, thenableState) {
  var segment = task.blockedSegment,
    newSegment = createPendingSegment(
      request,
      segment.chunks.length,
      null,
      task.formatContext,
      segment.lastPushedText,
      !0
    );
  segment.children.push(newSegment);
  segment.lastPushedText = !1;
  return createRenderTask(
    request,
    thenableState,
    task.node,
    task.childIndex,
    task.blockedBoundary,
    newSegment,
    task.blockedPreamble,
    task.hoistableState,
    task.abortSet,
    task.keyPath,
    task.formatContext,
    task.context,
    task.treeContext,
    task.row,
    task.componentStack,
    task.legacyContext
  );
}
function renderNode(request, task, node, childIndex) {
  var previousFormatContext = task.formatContext,
    previousLegacyContext = task.legacyContext,
    previousContext = task.context,
    previousKeyPath = task.keyPath,
    previousTreeContext = task.treeContext,
    previousComponentStack = task.componentStack,
    segment = task.blockedSegment;
  if (null === segment) {
    segment = task.replay;
    try {
      return renderNodeDestructive(request, task, node, childIndex);
    } catch (thrownValue) {
      if (
        (resetHooksState(),
        (node =
          thrownValue === SuspenseException
            ? getSuspendedThenable()
            : thrownValue),
        !request.aborted && "object" === typeof node && null !== node)
      ) {
        if ("function" === typeof node.then) {
          childIndex =
            thrownValue === SuspenseException
              ? getThenableStateAfterSuspending()
              : null;
          request = spawnNewSuspendedReplayTask(request, task, childIndex).ping;
          node.then(request.resolve, request.reject);
          task.formatContext = previousFormatContext;
          task.legacyContext = previousLegacyContext;
          task.context = previousContext;
          task.keyPath = previousKeyPath;
          task.treeContext = previousTreeContext;
          task.componentStack = previousComponentStack;
          task.replay = segment;
          switchContext(previousContext);
          return;
        }
        if ("Maximum call stack size exceeded" === node.message) {
          node =
            thrownValue === SuspenseException
              ? getThenableStateAfterSuspending()
              : null;
          node = spawnNewSuspendedReplayTask(request, task, node);
          request.pingedTasks.push(node);
          task.formatContext = previousFormatContext;
          task.legacyContext = previousLegacyContext;
          task.context = previousContext;
          task.keyPath = previousKeyPath;
          task.treeContext = previousTreeContext;
          task.componentStack = previousComponentStack;
          task.replay = segment;
          switchContext(previousContext);
          return;
        }
      }
    }
  } else {
    var childrenLength = segment.children.length,
      chunkLength = segment.chunks.length;
    try {
      return renderNodeDestructive(request, task, node, childIndex);
    } catch (thrownValue$64) {
      if (
        (resetHooksState(),
        (segment.children.length = childrenLength),
        (segment.chunks.length = chunkLength),
        (node =
          thrownValue$64 === SuspenseException
            ? getSuspendedThenable()
            : thrownValue$64),
        !request.aborted && "object" === typeof node && null !== node)
      ) {
        if ("function" === typeof node.then) {
          segment = node;
          node =
            thrownValue$64 === SuspenseException
              ? getThenableStateAfterSuspending()
              : null;
          request = spawnNewSuspendedRenderTask(request, task, node).ping;
          segment.then(request.resolve, request.reject);
          task.formatContext = previousFormatContext;
          task.legacyContext = previousLegacyContext;
          task.context = previousContext;
          task.keyPath = previousKeyPath;
          task.treeContext = previousTreeContext;
          task.componentStack = previousComponentStack;
          switchContext(previousContext);
          return;
        }
        if ("Maximum call stack size exceeded" === node.message) {
          segment =
            thrownValue$64 === SuspenseException
              ? getThenableStateAfterSuspending()
              : null;
          segment = spawnNewSuspendedRenderTask(request, task, segment);
          request.pingedTasks.push(segment);
          task.formatContext = previousFormatContext;
          task.legacyContext = previousLegacyContext;
          task.context = previousContext;
          task.keyPath = previousKeyPath;
          task.treeContext = previousTreeContext;
          task.componentStack = previousComponentStack;
          switchContext(previousContext);
          return;
        }
      }
    }
  }
  task.formatContext = previousFormatContext;
  task.legacyContext = previousLegacyContext;
  task.context = previousContext;
  task.keyPath = previousKeyPath;
  task.treeContext = previousTreeContext;
  switchContext(previousContext);
  throw node;
}
function abortTaskSoft(task) {
  var boundary = task.blockedBoundary,
    segment = task.blockedSegment;
  null !== segment &&
    ((segment.status = 3), finishedTask(this, boundary, task.row, segment));
}
function abortRemainingReplayNodes(
  request$jscomp$0,
  boundary,
  nodes,
  slots,
  error,
  errorDigest$jscomp$0
) {
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    if (4 === node.length)
      abortRemainingReplayNodes(
        request$jscomp$0,
        boundary,
        node[2],
        node[3],
        error,
        errorDigest$jscomp$0
      );
    else {
      node = node[5];
      var request = request$jscomp$0,
        errorDigest = errorDigest$jscomp$0,
        resumedBoundary = createSuspenseBoundary(
          request,
          null,
          new Set(),
          null,
          !1
        );
      resumedBoundary.parentFlushed = !0;
      resumedBoundary.rootSegmentID = node;
      resumedBoundary.status = 4;
      resumedBoundary.errorDigest = errorDigest;
      resumedBoundary.parentFlushed &&
        request.clientRenderedBoundaries.push(resumedBoundary);
    }
  }
  nodes.length = 0;
  if (null !== slots) {
    if (null === boundary) throw Error(formatProdErrorMessage(487));
    4 !== boundary.status &&
      ((boundary.status = 4),
      (boundary.errorDigest = errorDigest$jscomp$0),
      boundary.parentFlushed &&
        request$jscomp$0.clientRenderedBoundaries.push(boundary));
    if ("object" === typeof slots) for (var index in slots) delete slots[index];
  }
}
function abortTask(task, request) {
  if (task !== request.currentTask) {
    var boundary = task.blockedBoundary;
    task = task.blockedSegment;
    null !== task && (task.status = 3);
    null !== boundary &&
      boundary.fallbackAbortableTasks.forEach(function (fallbackTask) {
        return abortTask(fallbackTask, request);
      });
  }
}
function finishAbortedTask(task, request, error) {
  if (task !== request.currentTask) {
    var boundary = task.blockedBoundary,
      segment = task.blockedSegment;
    if (null === segment || 3 === segment.status) {
      var errorInfo = getThrownInfo(task.componentStack);
      if (null === boundary) {
        boundary = task.replay;
        if (null === boundary) {
          null !== request.trackedPostpones && null !== segment
            ? ((boundary = request.trackedPostpones),
              logRecoverableError(request, error, errorInfo),
              trackPostpone(request, boundary, task, segment),
              finishedTask(request, null, task.row, segment))
            : (logRecoverableError(request, error, errorInfo),
              12 !== request.status &&
                13 !== request.status &&
                fatalError(request, error));
          return;
        }
        12 !== request.status &&
          13 !== request.status &&
          (boundary.pendingTasks--,
          0 === boundary.pendingTasks &&
            0 < boundary.nodes.length &&
            ((segment = logRecoverableError(request, error, errorInfo)),
            abortRemainingReplayNodes(
              request,
              null,
              boundary.nodes,
              boundary.slots,
              error,
              segment
            )),
          request.pendingRootTasks--,
          0 === request.pendingRootTasks && completeShell(request));
      } else {
        var trackedPostpones$65 = request.trackedPostpones;
        if (4 !== boundary.status) {
          if (null !== trackedPostpones$65 && null !== segment)
            return (
              logRecoverableError(request, error, errorInfo),
              trackPostpone(request, trackedPostpones$65, task, segment),
              boundary.fallbackAbortableTasks.forEach(function (fallbackTask) {
                return finishAbortedTask(fallbackTask, request, error);
              }),
              boundary.fallbackAbortableTasks.clear(),
              finishedTask(request, boundary, task.row, segment)
            );
          boundary.status = 4;
          segment = logRecoverableError(request, error, errorInfo);
          boundary.status = 4;
          boundary.errorDigest = segment;
          untrackBoundary(request, boundary);
          boundary.parentFlushed &&
            request.clientRenderedBoundaries.push(boundary);
        }
        boundary.pendingTasks--;
        segment = boundary.row;
        null !== segment &&
          0 === --segment.pendingTasks &&
          finishSuspenseListRow(request, segment);
        boundary.fallbackAbortableTasks.forEach(function (fallbackTask) {
          return finishAbortedTask(fallbackTask, request, error);
        });
        boundary.fallbackAbortableTasks.clear();
      }
      task = task.row;
      null !== task &&
        0 === --task.pendingTasks &&
        finishSuspenseListRow(request, task);
      request.allPendingTasks--;
      0 === request.allPendingTasks && completeAll(request);
    }
  }
}
function safelyEmitEarlyPreloads(request, shellComplete) {
  try {
    var renderState = request.renderState,
      onHeaders = renderState.onHeaders;
    if (onHeaders) {
      var headers = renderState.headers;
      if (headers) {
        renderState.headers = null;
        var linkHeader = headers.preconnects;
        headers.fontPreloads &&
          (linkHeader && (linkHeader += ", "),
          (linkHeader += headers.fontPreloads));
        headers.highImagePreloads &&
          (linkHeader && (linkHeader += ", "),
          (linkHeader += headers.highImagePreloads));
        if (!shellComplete) {
          var queueIter = renderState.styles.values(),
            queueStep = queueIter.next();
          b: for (
            ;
            0 < headers.remainingCapacity && !queueStep.done;
            queueStep = queueIter.next()
          )
            for (
              var sheetIter = queueStep.value.sheets.values(),
                sheetStep = sheetIter.next();
              0 < headers.remainingCapacity && !sheetStep.done;
              sheetStep = sheetIter.next()
            ) {
              var sheet = sheetStep.value,
                props = sheet.props,
                key = props.href,
                props$jscomp$0 = sheet.props,
                header = getPreloadAsHeader(props$jscomp$0.href, "style", {
                  crossOrigin: props$jscomp$0.crossOrigin,
                  integrity: props$jscomp$0.integrity,
                  nonce: props$jscomp$0.nonce,
                  type: props$jscomp$0.type,
                  fetchPriority: props$jscomp$0.fetchPriority,
                  referrerPolicy: props$jscomp$0.referrerPolicy,
                  media: props$jscomp$0.media
                });
              if (0 <= (headers.remainingCapacity -= header.length + 2))
                (renderState.resets.style[key] = PRELOAD_NO_CREDS),
                  linkHeader && (linkHeader += ", "),
                  (linkHeader += header),
                  (renderState.resets.style[key] =
                    "string" === typeof props.crossOrigin ||
                    "string" === typeof props.integrity
                      ? [props.crossOrigin, props.integrity]
                      : PRELOAD_NO_CREDS);
              else break b;
            }
        }
        linkHeader ? onHeaders({ Link: linkHeader }) : onHeaders({});
      }
    }
  } catch (error) {
    logRecoverableError(request, error, {});
  }
}
function completeShell(request) {
  null === request.trackedPostpones && safelyEmitEarlyPreloads(request, !0);
  null === request.trackedPostpones && preparePreamble(request);
  request = request.onShellReady;
  request();
}
function completeAll(request) {
  safelyEmitEarlyPreloads(
    request,
    null === request.trackedPostpones
      ? !0
      : null === request.completedRootSegment ||
          5 !== request.completedRootSegment.status
  );
  preparePreamble(request);
  request = request.onAllReady;
  request();
}
function queueCompletedSegment(boundary, segment) {
  if (
    0 === segment.chunks.length &&
    1 === segment.children.length &&
    null === segment.children[0].boundary &&
    -1 === segment.children[0].id
  ) {
    var childSegment = segment.children[0];
    childSegment.id = segment.id;
    childSegment.parentFlushed = !0;
    (1 !== childSegment.status &&
      3 !== childSegment.status &&
      4 !== childSegment.status) ||
      queueCompletedSegment(boundary, childSegment);
  } else boundary.completedSegments.push(segment);
}
function finishedTask(request, boundary, row, segment) {
  null !== row &&
    (0 === --row.pendingTasks
      ? finishSuspenseListRow(request, row)
      : row.together && tryToResolveTogetherRow(request, row));
  request.allPendingTasks--;
  if (null === boundary) {
    if (null !== segment && segment.parentFlushed) {
      if (null !== request.completedRootSegment)
        throw Error(formatProdErrorMessage(389));
      request.completedRootSegment = segment;
    }
    request.pendingRootTasks--;
    0 === request.pendingRootTasks && completeShell(request);
  } else if ((boundary.pendingTasks--, 4 !== boundary.status))
    if (0 === boundary.pendingTasks)
      if (
        (0 === boundary.status && (boundary.status = 1),
        null !== segment &&
          segment.parentFlushed &&
          (1 === segment.status || 3 === segment.status) &&
          queueCompletedSegment(boundary, segment),
        boundary.parentFlushed && request.completedBoundaries.push(boundary),
        1 === boundary.status)
      )
        (row = boundary.row),
          null !== row &&
            hoistHoistables(row.hoistables, boundary.contentState),
          isEligibleForOutlining(request, boundary) ||
            (request.allPendingTasks++,
            boundary.fallbackAbortableTasks.forEach(abortTaskSoft, request),
            boundary.fallbackAbortableTasks.clear(),
            null !== row &&
              0 === --row.pendingTasks &&
              finishSuspenseListRow(request, row),
            request.allPendingTasks--),
          0 === request.pendingRootTasks &&
            null === request.trackedPostpones &&
            null !== boundary.preamble &&
            preparePreamble(request);
      else {
        if (
          5 === boundary.status &&
          ((boundary = boundary.row), null !== boundary)
        ) {
          if (null !== request.trackedPostpones) {
            row = request.trackedPostpones;
            var postponedRow = boundary.next;
            if (
              null !== postponedRow &&
              ((segment = postponedRow.boundaries), null !== segment)
            )
              for (
                postponedRow.boundaries = null, postponedRow = 0;
                postponedRow < segment.length;
                postponedRow++
              ) {
                var postponedBoundary = segment[postponedRow];
                trackPostponedBoundary(request, row, postponedBoundary);
                finishedTask(request, postponedBoundary, null, null);
              }
          }
          request.allPendingTasks++;
          0 === --boundary.pendingTasks &&
            finishSuspenseListRow(request, boundary);
          request.allPendingTasks--;
        }
      }
    else
      null === segment ||
        !segment.parentFlushed ||
        (1 !== segment.status && 3 !== segment.status) ||
        (queueCompletedSegment(boundary, segment),
        1 === boundary.completedSegments.length &&
          boundary.parentFlushed &&
          request.partialBoundaries.push(boundary)),
        (boundary = boundary.row),
        null !== boundary &&
          boundary.together &&
          tryToResolveTogetherRow(request, boundary);
  0 === request.allPendingTasks && completeAll(request);
}
function performWork(request$jscomp$1) {
  if (!(request$jscomp$1.aborted || 11 < request$jscomp$1.status)) {
    var prevContext = currentActiveSnapshot,
      prevDispatcher = ReactSharedInternals.H;
    ReactSharedInternals.H = HooksDispatcher;
    var prevAsyncDispatcher = ReactSharedInternals.A;
    ReactSharedInternals.A = DefaultAsyncDispatcher;
    var prevRequest = currentRequest;
    currentRequest = request$jscomp$1;
    var prevResumableState = currentResumableState;
    currentResumableState = request$jscomp$1.resumableState;
    try {
      var pingedTasks = request$jscomp$1.pingedTasks,
        i;
      for (i = 0; i < pingedTasks.length; i++) {
        var task = pingedTasks[i],
          request = request$jscomp$1,
          segment = task.blockedSegment;
        if (null === segment)
          a: {
            if (0 !== task.replay.pendingTasks) {
              var prevTask = request.currentTask;
              request.currentTask = task;
              switchContext(task.context);
              var startNode = task.node;
              try {
                "number" === typeof task.replay.slots
                  ? resumeNode(
                      request,
                      task,
                      task.replay.slots,
                      task.node,
                      task.childIndex
                    )
                  : retryNode(request, task);
                if (
                  1 === task.replay.pendingTasks &&
                  0 < task.replay.nodes.length
                )
                  throw Error(formatProdErrorMessage(488));
                task.replay.pendingTasks--;
                task.abortSet.delete(task);
                finishedTask(request, task.blockedBoundary, task.row, null);
              } catch (thrownValue) {
                resetHooksState();
                var x =
                  thrownValue === SuspenseException
                    ? getSuspendedThenable()
                    : thrownValue;
                if (request.aborted) {
                  thrownValue === SuspenseException &&
                    (task.thenableState = getThenableStateAfterSuspending());
                  request.currentTask = prevTask;
                  var request$jscomp$0 = request;
                  abortTask(task, request$jscomp$0);
                  task.abortSet.delete(task);
                  finishAbortedTask(
                    task,
                    request$jscomp$0,
                    request$jscomp$0.fatalError
                  );
                } else {
                  if ("object" === typeof x && null !== x) {
                    if ("function" === typeof x.then) {
                      var ping = task.ping;
                      x.then(ping.resolve, ping.reject);
                      task.thenableState =
                        thrownValue === SuspenseException
                          ? getThenableStateAfterSuspending()
                          : null;
                      break a;
                    }
                    if (
                      "Maximum call stack size exceeded" === x.message &&
                      task.node !== startNode
                    ) {
                      task.thenableState = null;
                      request.pingedTasks.push(task);
                      break a;
                    }
                  }
                  task.replay.pendingTasks--;
                  task.abortSet.delete(task);
                  var errorInfo = getThrownInfo(task.componentStack);
                  request$jscomp$0 = request;
                  var boundary = task.blockedBoundary,
                    error$jscomp$0 = request.aborted ? request.fatalError : x,
                    replayNodes = task.replay.nodes,
                    resumeSlots = task.replay.slots,
                    errorDigest = logRecoverableError(
                      request$jscomp$0,
                      error$jscomp$0,
                      errorInfo
                    );
                  abortRemainingReplayNodes(
                    request$jscomp$0,
                    boundary,
                    replayNodes,
                    resumeSlots,
                    error$jscomp$0,
                    errorDigest
                  );
                  request.pendingRootTasks--;
                  0 === request.pendingRootTasks && completeShell(request);
                  request.allPendingTasks--;
                  0 === request.allPendingTasks && completeAll(request);
                }
              } finally {
                request.currentTask = prevTask;
              }
            }
          }
        else
          a: if (
            ((request$jscomp$0 = segment), 0 === request$jscomp$0.status)
          ) {
            var prevTask$jscomp$0 = request.currentTask;
            request.currentTask = task;
            switchContext(task.context);
            var childrenLength = request$jscomp$0.children.length,
              chunkLength = request$jscomp$0.chunks.length,
              startNode$jscomp$0 = task.node;
            try {
              retryNode(request, task),
                pushSegmentFinale(
                  request$jscomp$0.chunks,
                  request.renderState,
                  request$jscomp$0.lastPushedText,
                  request$jscomp$0.textEmbedded
                ),
                task.abortSet.delete(task),
                (request$jscomp$0.status = 1),
                finishedTask(
                  request,
                  task.blockedBoundary,
                  task.row,
                  request$jscomp$0
                );
            } catch (thrownValue) {
              resetHooksState();
              request$jscomp$0.children.length = childrenLength;
              request$jscomp$0.chunks.length = chunkLength;
              var x$jscomp$0 =
                thrownValue === SuspenseException
                  ? getSuspendedThenable()
                  : thrownValue;
              if (request.aborted)
                thrownValue === SuspenseException &&
                  (task.thenableState = getThenableStateAfterSuspending()),
                  (request.currentTask = prevTask$jscomp$0),
                  (request$jscomp$0 = request),
                  abortTask(task, request$jscomp$0),
                  task.abortSet.delete(task),
                  finishAbortedTask(
                    task,
                    request$jscomp$0,
                    request$jscomp$0.fatalError
                  );
              else {
                if ("object" === typeof x$jscomp$0 && null !== x$jscomp$0) {
                  if ("function" === typeof x$jscomp$0.then) {
                    request$jscomp$0.status = 0;
                    task.thenableState =
                      thrownValue === SuspenseException
                        ? getThenableStateAfterSuspending()
                        : null;
                    var ping$jscomp$0 = task.ping;
                    x$jscomp$0.then(
                      ping$jscomp$0.resolve,
                      ping$jscomp$0.reject
                    );
                    break a;
                  }
                  if (
                    "Maximum call stack size exceeded" === x$jscomp$0.message &&
                    task.node !== startNode$jscomp$0
                  ) {
                    request$jscomp$0.status = 0;
                    task.thenableState = null;
                    request.pingedTasks.push(task);
                    break a;
                  }
                }
                var errorInfo$jscomp$0 = getThrownInfo(task.componentStack);
                task.abortSet.delete(task);
                request$jscomp$0.status = 4;
                var boundary$jscomp$0 = task.blockedBoundary,
                  row = task.row;
                null !== row &&
                  0 === --row.pendingTasks &&
                  finishSuspenseListRow(request, row);
                request.allPendingTasks--;
                var errorDigest$jscomp$0 = logRecoverableError(
                  request,
                  x$jscomp$0,
                  errorInfo$jscomp$0
                );
                if (null === boundary$jscomp$0) fatalError(request, x$jscomp$0);
                else {
                  boundary$jscomp$0.pendingTasks--;
                  if (4 !== boundary$jscomp$0.status) {
                    boundary$jscomp$0.status = 4;
                    boundary$jscomp$0.errorDigest = errorDigest$jscomp$0;
                    untrackBoundary(request, boundary$jscomp$0);
                    var boundaryRow = boundary$jscomp$0.row;
                    null !== boundaryRow &&
                      (request.allPendingTasks++,
                      0 === --boundaryRow.pendingTasks &&
                        finishSuspenseListRow(request, boundaryRow),
                      request.allPendingTasks--);
                    boundary$jscomp$0.parentFlushed &&
                      request.clientRenderedBoundaries.push(boundary$jscomp$0);
                    0 === request.pendingRootTasks &&
                      null === request.trackedPostpones &&
                      null !== boundary$jscomp$0.preamble &&
                      preparePreamble(request);
                  }
                  0 === request.allPendingTasks && completeAll(request);
                }
              }
            } finally {
              request.currentTask = prevTask$jscomp$0;
            }
          }
      }
      pingedTasks.splice(0, i);
      null !== request$jscomp$1.destination &&
        flushCompletedQueues(request$jscomp$1, request$jscomp$1.destination);
    } catch (error) {
      logRecoverableError(request$jscomp$1, error, {}),
        fatalError(request$jscomp$1, error);
    } finally {
      (currentResumableState = prevResumableState),
        (ReactSharedInternals.H = prevDispatcher),
        (ReactSharedInternals.A = prevAsyncDispatcher),
        prevDispatcher === HooksDispatcher && switchContext(prevContext),
        (currentRequest = prevRequest);
    }
  }
}
function preparePreambleFromSubtree(
  request,
  segment,
  collectedPreambleSegments
) {
  segment.preambleChildren.length &&
    collectedPreambleSegments.push(segment.preambleChildren);
  for (var pendingPreambles = !1, i = 0; i < segment.children.length; i++)
    pendingPreambles =
      preparePreambleFromSegment(
        request,
        segment.children[i],
        collectedPreambleSegments
      ) || pendingPreambles;
  return pendingPreambles;
}
function preparePreambleFromSegment(
  request,
  segment,
  collectedPreambleSegments
) {
  var boundary = segment.boundary;
  if (null === boundary)
    return preparePreambleFromSubtree(
      request,
      segment,
      collectedPreambleSegments
    );
  var preamble = boundary.preamble;
  if (null === preamble) return !1;
  switch (boundary.status) {
    case 1:
      hoistPreambleState(request.renderState, preamble.content);
      request.byteSize += boundary.byteSize;
      segment = boundary.completedSegments[0];
      if (!segment) throw Error(formatProdErrorMessage(391));
      return preparePreambleFromSubtree(
        request,
        segment,
        collectedPreambleSegments
      );
    case 5:
      if (null !== request.trackedPostpones) return !0;
    case 4:
      if (1 === segment.status)
        return (
          hoistPreambleState(request.renderState, preamble.fallback),
          preparePreambleFromSubtree(
            request,
            segment,
            collectedPreambleSegments
          )
        );
    default:
      return !0;
  }
}
function preparePreamble(request) {
  if (
    request.completedRootSegment &&
    null === request.completedPreambleSegments
  ) {
    var collectedPreambleSegments = [],
      originalRequestByteSize = request.byteSize,
      hasPendingPreambles = preparePreambleFromSegment(
        request,
        request.completedRootSegment,
        collectedPreambleSegments
      ),
      preamble = request.renderState.preamble;
    !1 === hasPendingPreambles || (preamble.headChunks && preamble.bodyChunks)
      ? (request.completedPreambleSegments = collectedPreambleSegments)
      : (request.byteSize = originalRequestByteSize);
  }
}
function flushSubtree(request, destination, segment, hoistableState) {
  segment.parentFlushed = !0;
  switch (segment.status) {
    case 0:
      segment.id = request.nextSegmentId++;
    case 5:
      return (
        (hoistableState = segment.id),
        (segment.lastPushedText = !1),
        (segment.textEmbedded = !1),
        (request = request.renderState),
        destination.push('<template id="'),
        destination.push(request.placeholderPrefix),
        (request = hoistableState.toString(16)),
        destination.push(request),
        destination.push('"></template>')
      );
    case 1:
      segment.status = 2;
      var r = !0,
        chunks = segment.chunks,
        chunkIdx = 0;
      segment = segment.children;
      for (var childIdx = 0; childIdx < segment.length; childIdx++) {
        for (r = segment[childIdx]; chunkIdx < r.index; chunkIdx++)
          destination.push(chunks[chunkIdx]);
        r = flushSegment(request, destination, r, hoistableState);
      }
      for (; chunkIdx < chunks.length - 1; chunkIdx++)
        destination.push(chunks[chunkIdx]);
      chunkIdx < chunks.length && (r = destination.push(chunks[chunkIdx]));
      return r;
    case 3:
      return !0;
    default:
      throw Error(formatProdErrorMessage(390));
  }
}
var flushedByteSize = 0;
function flushSegment(request, destination, segment, hoistableState) {
  var boundary = segment.boundary;
  if (null === boundary)
    return flushSubtree(request, destination, segment, hoistableState);
  segment.boundary = null;
  boundary.parentFlushed = !0;
  if (4 === boundary.status) {
    var row = boundary.row;
    null !== row &&
      0 === --row.pendingTasks &&
      finishSuspenseListRow(request, row);
    request.renderState.generateStaticMarkup ||
      ((boundary = boundary.errorDigest),
      destination.push("\x3c!--$!--\x3e"),
      destination.push("<template"),
      boundary &&
        (destination.push(' data-dgst="'),
        (boundary = escapeTextForBrowser(boundary)),
        destination.push(boundary),
        destination.push('"')),
      destination.push("></template>"));
    flushSubtree(request, destination, segment, hoistableState);
    request = request.renderState.generateStaticMarkup
      ? !0
      : destination.push("\x3c!--/$--\x3e");
    return request;
  }
  if (1 !== boundary.status)
    return (
      0 === boundary.status &&
        (boundary.rootSegmentID = request.nextSegmentId++),
      0 < boundary.completedSegments.length &&
        request.partialBoundaries.push(boundary),
      writeStartPendingSuspenseBoundary(
        destination,
        request.renderState,
        boundary.rootSegmentID
      ),
      hoistableState && hoistHoistables(hoistableState, boundary.fallbackState),
      flushSubtree(request, destination, segment, hoistableState),
      destination.push("\x3c!--/$--\x3e")
    );
  if (
    !flushingPartialBoundaries &&
    isEligibleForOutlining(request, boundary) &&
    (flushedByteSize + boundary.byteSize > request.progressiveChunkSize ||
      boundary.defer)
  )
    return (
      (boundary.rootSegmentID = request.nextSegmentId++),
      request.completedBoundaries.push(boundary),
      writeStartPendingSuspenseBoundary(
        destination,
        request.renderState,
        boundary.rootSegmentID
      ),
      flushSubtree(request, destination, segment, hoistableState),
      destination.push("\x3c!--/$--\x3e")
    );
  flushedByteSize += boundary.byteSize;
  hoistableState && hoistHoistables(hoistableState, boundary.contentState);
  segment = boundary.row;
  null !== segment &&
    isEligibleForOutlining(request, boundary) &&
    0 === --segment.pendingTasks &&
    finishSuspenseListRow(request, segment);
  request.renderState.generateStaticMarkup ||
    destination.push("\x3c!--$--\x3e");
  segment = boundary.completedSegments;
  if (1 !== segment.length) throw Error(formatProdErrorMessage(391));
  flushSegment(request, destination, segment[0], hoistableState);
  request = request.renderState.generateStaticMarkup
    ? !0
    : destination.push("\x3c!--/$--\x3e");
  return request;
}
function flushSegmentContainer(request, destination, segment, hoistableState) {
  writeStartSegment(
    destination,
    request.renderState,
    segment.parentFormatContext,
    segment.id
  );
  flushSegment(request, destination, segment, hoistableState);
  return writeEndSegment(destination, segment.parentFormatContext);
}
function flushCompletedBoundary(request, destination, boundary) {
  flushedByteSize = boundary.byteSize;
  for (
    var completedSegments = boundary.completedSegments, i = 0;
    i < completedSegments.length;
    i++
  )
    flushPartiallyCompletedSegment(
      request,
      destination,
      boundary,
      completedSegments[i]
    );
  completedSegments.length = 0;
  completedSegments = boundary.row;
  null !== completedSegments &&
    isEligibleForOutlining(request, boundary) &&
    0 === --completedSegments.pendingTasks &&
    finishSuspenseListRow(request, completedSegments);
  writeHoistablesForBoundary(
    destination,
    boundary.contentState,
    request.renderState
  );
  completedSegments = request.resumableState;
  request = request.renderState;
  i = boundary.rootSegmentID;
  boundary = boundary.contentState;
  var requiresStyleInsertion = request.stylesToHoist,
    requiresViewTransitions =
      enableViewTransition && 0 !== (completedSegments.instructions & 128);
  request.stylesToHoist = !1;
  var scriptFormat = 0 === completedSegments.streamingFormat;
  scriptFormat
    ? (destination.push(request.startInlineScript),
      destination.push(">"),
      requiresStyleInsertion
        ? (0 === (completedSegments.instructions & 4) &&
            ((completedSegments.instructions |= 4),
            destination.push(
              '$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};'
            )),
          0 === (completedSegments.instructions & 2) &&
            ((completedSegments.instructions |= 2),
            destination.push(
              '$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};\n$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};'
            )),
          requiresViewTransitions &&
            0 === (completedSegments.instructions & 256) &&
            ((completedSegments.instructions |= 256),
            destination.push(
              '$RV=function(A,g){function k(a,b){var e=a.getAttribute(b);e&&(b=a.style,l.push(a,b.viewTransitionName,b.viewTransitionClass),"auto"!==e&&(b.viewTransitionClass=e),(a=a.getAttribute("vt-name"))||(a="_T_"+K++ +"_"),a=CSS.escape(a)!==a?"r-"+btoa(a).replace(/=/g,""):a,b.viewTransitionName=a,B=!0)}var B=!1,K=0,l=[];try{var f=document.__reactViewTransition;if(f){f.finished.finally($RV.bind(null,g));return}var m=new Map;for(f=1;f<g.length;f+=2)for(var h=g[f].querySelectorAll("[vt-share]"),d=0;d<h.length;d++){var c=h[d];m.set(c.getAttribute("vt-name"),c)}var u=[];for(h=0;h<g.length;h+=2){var C=g[h],x=C.parentNode;if(x){var v=x.getBoundingClientRect();if(v.left||v.top||v.width||v.height){c=C;for(f=0;c;){if(8===c.nodeType){var r=c.data;if("/$"===r)if(0===f)break;else f--;else"$"!==r&&"$?"!==r&&"$~"!==r&&"$!"!==r||f++}else if(1===c.nodeType){d=c;var D=d.getAttribute("vt-name"),y=m.get(D);k(d,y?"vt-share":"vt-exit");y&&(k(y,"vt-share"),m.set(D,null));var E=d.querySelectorAll("[vt-share]");\nfor(d=0;d<E.length;d++){var F=E[d],G=F.getAttribute("vt-name"),H=m.get(G);H&&(k(F,"vt-share"),k(H,"vt-share"),m.set(G,null))}}c=c.nextSibling}for(var I=g[h+1],t=I.firstElementChild;t;)null!==m.get(t.getAttribute("vt-name"))&&k(t,"vt-enter"),t=t.nextElementSibling;c=x;do for(var n=c.firstElementChild;n;){var J=n.getAttribute("vt-update");J&&"none"!==J&&!l.includes(n)&&k(n,"vt-update");n=n.nextElementSibling}while((c=c.parentNode)&&1===c.nodeType&&"none"!==c.getAttribute("vt-update"));u.push.apply(u,\nI.querySelectorAll(\'img[src]:not([loading="lazy"])\'))}}}if(B){var z=document.__reactViewTransition=document.startViewTransition({update:function(){A(g);for(var a=[document.documentElement.clientHeight,document.fonts.ready],b={},e=0;e<u.length;b={g:b.g},e++)if(b.g=u[e],!b.g.complete){var p=b.g.getBoundingClientRect();0<p.bottom&&0<p.right&&p.top<window.innerHeight&&p.left<window.innerWidth&&(p=new Promise(function(w){return function(q){w.g.addEventListener("load",q);w.g.addEventListener("error",q)}}(b)),\na.push(p))}return Promise.race([Promise.all(a),new Promise(function(w){var q=performance.now();setTimeout(w,2300>q&&2E3<q?2300-q:500)})])},types:[]});z.ready.finally(function(){for(var a=l.length-3;0<=a;a-=3){var b=l[a],e=b.style;e.viewTransitionName=l[a+1];e.viewTransitionClass=l[a+1];""===b.getAttribute("style")&&b.removeAttribute("style")}});z.finished.finally(function(){document.__reactViewTransition===z&&(document.__reactViewTransition=null)});$RB=[];return}}catch(a){}A(g)}.bind(null,\n$RV);'
            )),
          0 === (completedSegments.instructions & 8)
            ? ((completedSegments.instructions |= 8),
              destination.push(
                '$RM=new Map;$RR=function(n,w,p){function u(q){this._p=null;q()}for(var r=new Map,t=document,h,b,e=t.querySelectorAll("link[data-precedence],style[data-precedence]"),v=[],k=0;b=e[k++];)"not all"===b.getAttribute("media")?v.push(b):("LINK"===b.tagName&&$RM.set(b.getAttribute("href"),b),r.set(b.dataset.precedence,h=b));e=0;b=[];var l,a;for(k=!0;;){if(k){var f=p[e++];if(!f){k=!1;e=0;continue}var c=!1,m=0;var d=f[m++];if(a=$RM.get(d)){var g=a._p;c=!0}else{a=t.createElement("link");a.href=d;a.rel=\n"stylesheet";for(a.dataset.precedence=l=f[m++];g=f[m++];)a.setAttribute(g,f[m++]);g=a._p=new Promise(function(q,x){a.onload=u.bind(a,q);a.onerror=u.bind(a,x)});$RM.set(d,a)}d=a.getAttribute("media");!g||d&&!matchMedia(d).matches||b.push(g);if(c)continue}else{a=v[e++];if(!a)break;l=a.getAttribute("data-precedence");a.removeAttribute("media")}c=r.get(l)||h;c===h&&(h=a);r.set(l,a);c?c.parentNode.insertBefore(a,c.nextSibling):(c=t.head,c.insertBefore(a,c.firstChild))}if(p=document.getElementById(n))p.previousSibling.data=\n"$~";Promise.all(b).then($RC.bind(null,n,w),$RX.bind(null,n,"CSS failed to load"))};$RR("'
              ))
            : destination.push('$RR("'))
        : (0 === (completedSegments.instructions & 2) &&
            ((completedSegments.instructions |= 2),
            destination.push(
              '$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};\n$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};'
            )),
          requiresViewTransitions &&
            0 === (completedSegments.instructions & 256) &&
            ((completedSegments.instructions |= 256),
            destination.push(
              '$RV=function(A,g){function k(a,b){var e=a.getAttribute(b);e&&(b=a.style,l.push(a,b.viewTransitionName,b.viewTransitionClass),"auto"!==e&&(b.viewTransitionClass=e),(a=a.getAttribute("vt-name"))||(a="_T_"+K++ +"_"),a=CSS.escape(a)!==a?"r-"+btoa(a).replace(/=/g,""):a,b.viewTransitionName=a,B=!0)}var B=!1,K=0,l=[];try{var f=document.__reactViewTransition;if(f){f.finished.finally($RV.bind(null,g));return}var m=new Map;for(f=1;f<g.length;f+=2)for(var h=g[f].querySelectorAll("[vt-share]"),d=0;d<h.length;d++){var c=h[d];m.set(c.getAttribute("vt-name"),c)}var u=[];for(h=0;h<g.length;h+=2){var C=g[h],x=C.parentNode;if(x){var v=x.getBoundingClientRect();if(v.left||v.top||v.width||v.height){c=C;for(f=0;c;){if(8===c.nodeType){var r=c.data;if("/$"===r)if(0===f)break;else f--;else"$"!==r&&"$?"!==r&&"$~"!==r&&"$!"!==r||f++}else if(1===c.nodeType){d=c;var D=d.getAttribute("vt-name"),y=m.get(D);k(d,y?"vt-share":"vt-exit");y&&(k(y,"vt-share"),m.set(D,null));var E=d.querySelectorAll("[vt-share]");\nfor(d=0;d<E.length;d++){var F=E[d],G=F.getAttribute("vt-name"),H=m.get(G);H&&(k(F,"vt-share"),k(H,"vt-share"),m.set(G,null))}}c=c.nextSibling}for(var I=g[h+1],t=I.firstElementChild;t;)null!==m.get(t.getAttribute("vt-name"))&&k(t,"vt-enter"),t=t.nextElementSibling;c=x;do for(var n=c.firstElementChild;n;){var J=n.getAttribute("vt-update");J&&"none"!==J&&!l.includes(n)&&k(n,"vt-update");n=n.nextElementSibling}while((c=c.parentNode)&&1===c.nodeType&&"none"!==c.getAttribute("vt-update"));u.push.apply(u,\nI.querySelectorAll(\'img[src]:not([loading="lazy"])\'))}}}if(B){var z=document.__reactViewTransition=document.startViewTransition({update:function(){A(g);for(var a=[document.documentElement.clientHeight,document.fonts.ready],b={},e=0;e<u.length;b={g:b.g},e++)if(b.g=u[e],!b.g.complete){var p=b.g.getBoundingClientRect();0<p.bottom&&0<p.right&&p.top<window.innerHeight&&p.left<window.innerWidth&&(p=new Promise(function(w){return function(q){w.g.addEventListener("load",q);w.g.addEventListener("error",q)}}(b)),\na.push(p))}return Promise.race([Promise.all(a),new Promise(function(w){var q=performance.now();setTimeout(w,2300>q&&2E3<q?2300-q:500)})])},types:[]});z.ready.finally(function(){for(var a=l.length-3;0<=a;a-=3){var b=l[a],e=b.style;e.viewTransitionName=l[a+1];e.viewTransitionClass=l[a+1];""===b.getAttribute("style")&&b.removeAttribute("style")}});z.finished.finally(function(){document.__reactViewTransition===z&&(document.__reactViewTransition=null)});$RB=[];return}}catch(a){}A(g)}.bind(null,\n$RV);'
            )),
          destination.push('$RC("')))
    : requiresStyleInsertion
      ? destination.push('<template data-rri="" data-bid="')
      : destination.push('<template data-rci="" data-bid="');
  completedSegments = i.toString(16);
  destination.push(request.boundaryPrefix);
  destination.push(completedSegments);
  scriptFormat ? destination.push('","') : destination.push('" data-sid="');
  destination.push(request.segmentPrefix);
  destination.push(completedSegments);
  requiresStyleInsertion
    ? scriptFormat
      ? (destination.push('",'),
        writeStyleResourceDependenciesInJS(destination, boundary))
      : (destination.push('" data-sty="'),
        writeStyleResourceDependenciesInAttr(destination, boundary))
    : scriptFormat && destination.push('"');
  completedSegments = scriptFormat
    ? destination.push(")\x3c/script>")
    : destination.push('"></template>');
  return writeBootstrap(destination, request) && completedSegments;
}
function flushPartiallyCompletedSegment(
  request,
  destination,
  boundary,
  segment
) {
  if (2 === segment.status) return !0;
  var hoistableState = boundary.contentState,
    segmentID = segment.id;
  if (-1 === segmentID) {
    if (-1 === (segment.id = boundary.rootSegmentID))
      throw Error(formatProdErrorMessage(392));
    return flushSegmentContainer(request, destination, segment, hoistableState);
  }
  if (segmentID === boundary.rootSegmentID)
    return flushSegmentContainer(request, destination, segment, hoistableState);
  flushSegmentContainer(request, destination, segment, hoistableState);
  boundary = request.resumableState;
  request = request.renderState;
  (segment = 0 === boundary.streamingFormat)
    ? (destination.push(request.startInlineScript),
      destination.push(">"),
      0 === (boundary.instructions & 1)
        ? ((boundary.instructions |= 1),
          destination.push(
            '$RS=function(a,b){a=document.getElementById(a);b=document.getElementById(b);for(a.parentNode.removeChild(a);a.firstChild;)b.parentNode.insertBefore(a.firstChild,b);b.parentNode.removeChild(b)};$RS("'
          ))
        : destination.push('$RS("'))
    : destination.push('<template data-rsi="" data-sid="');
  destination.push(request.segmentPrefix);
  segmentID = segmentID.toString(16);
  destination.push(segmentID);
  segment ? destination.push('","') : destination.push('" data-pid="');
  destination.push(request.placeholderPrefix);
  destination.push(segmentID);
  destination = segment
    ? destination.push('")\x3c/script>')
    : destination.push('"></template>');
  return destination;
}
var flushingPartialBoundaries = !1;
function flushCompletedQueues(request, destination) {
  try {
    if (!(0 < request.pendingRootTasks)) {
      var i,
        completedRootSegment = request.completedRootSegment;
      if (null !== completedRootSegment) {
        if (5 === completedRootSegment.status) return;
        var completedPreambleSegments = request.completedPreambleSegments;
        if (null === completedPreambleSegments) return;
        flushedByteSize = request.byteSize;
        var blockingRenderMaxSize = 40 * request.progressiveChunkSize;
        if (flushedByteSize > blockingRenderMaxSize) {
          var error = Error(
            formatProdErrorMessage(561, Math.round(blockingRenderMaxSize / 1e3))
          );
          logRecoverableError(request, error, {}, null);
        }
        var resumableState = request.resumableState,
          renderState = request.renderState;
        if (renderState.externalRuntimeScript) {
          var _renderState$external = renderState.externalRuntimeScript,
            src = _renderState$external.src,
            chunks = _renderState$external.chunks;
          resumableState.scriptResources.hasOwnProperty(src) ||
            ((resumableState.scriptResources[src] = null),
            renderState.scripts.add(chunks));
        }
        var preamble = renderState.preamble,
          htmlChunks = preamble.htmlChunks,
          headChunks = preamble.headChunks,
          i$jscomp$0;
        if (htmlChunks) {
          for (i$jscomp$0 = 0; i$jscomp$0 < htmlChunks.length; i$jscomp$0++)
            destination.push(htmlChunks[i$jscomp$0]);
          if (headChunks)
            for (i$jscomp$0 = 0; i$jscomp$0 < headChunks.length; i$jscomp$0++)
              destination.push(headChunks[i$jscomp$0]);
          else {
            var chunk = startChunkForTag("head");
            destination.push(chunk);
            destination.push(">");
          }
        } else if (headChunks)
          for (i$jscomp$0 = 0; i$jscomp$0 < headChunks.length; i$jscomp$0++)
            destination.push(headChunks[i$jscomp$0]);
        var charsetChunks = renderState.charsetChunks;
        for (i$jscomp$0 = 0; i$jscomp$0 < charsetChunks.length; i$jscomp$0++)
          destination.push(charsetChunks[i$jscomp$0]);
        charsetChunks.length = 0;
        renderState.preconnects.forEach(flushResource, destination);
        renderState.preconnects.clear();
        var viewportChunks = renderState.viewportChunks;
        for (i$jscomp$0 = 0; i$jscomp$0 < viewportChunks.length; i$jscomp$0++)
          destination.push(viewportChunks[i$jscomp$0]);
        viewportChunks.length = 0;
        renderState.fontPreloads.forEach(flushResource, destination);
        renderState.fontPreloads.clear();
        renderState.highImagePreloads.forEach(flushResource, destination);
        renderState.highImagePreloads.clear();
        currentlyFlushingRenderState = renderState;
        renderState.styles.forEach(flushStylesInPreamble, destination);
        currentlyFlushingRenderState = null;
        var importMapChunks = renderState.importMapChunks;
        for (i$jscomp$0 = 0; i$jscomp$0 < importMapChunks.length; i$jscomp$0++)
          destination.push(importMapChunks[i$jscomp$0]);
        importMapChunks.length = 0;
        renderState.bootstrapScripts.forEach(flushResource, destination);
        renderState.scripts.forEach(flushResource, destination);
        renderState.scripts.clear();
        renderState.bulkPreloads.forEach(flushResource, destination);
        renderState.bulkPreloads.clear();
        resumableState.instructions |= 32;
        var hoistableChunks = renderState.hoistableChunks;
        for (i$jscomp$0 = 0; i$jscomp$0 < hoistableChunks.length; i$jscomp$0++)
          destination.push(hoistableChunks[i$jscomp$0]);
        for (
          blockingRenderMaxSize = hoistableChunks.length = 0;
          blockingRenderMaxSize < completedPreambleSegments.length;
          blockingRenderMaxSize++
        ) {
          var segments = completedPreambleSegments[blockingRenderMaxSize];
          for (error = 0; error < segments.length; error++)
            flushSegment(request, destination, segments[error], null);
        }
        var preamble$jscomp$0 = request.renderState.preamble,
          headChunks$jscomp$0 = preamble$jscomp$0.headChunks;
        if (preamble$jscomp$0.htmlChunks || headChunks$jscomp$0) {
          var chunk$jscomp$0 = endChunkForTag("head");
          destination.push(chunk$jscomp$0);
        }
        var bodyChunks = preamble$jscomp$0.bodyChunks;
        if (bodyChunks)
          for (
            completedPreambleSegments = 0;
            completedPreambleSegments < bodyChunks.length;
            completedPreambleSegments++
          )
            destination.push(bodyChunks[completedPreambleSegments]);
        flushSegment(request, destination, completedRootSegment, null);
        request.completedRootSegment = null;
        var resumableState$jscomp$0 = request.resumableState,
          renderState$jscomp$0 = request.renderState;
        (0 === request.allPendingTasks &&
          0 === request.clientRenderedBoundaries.length &&
          0 === request.completedBoundaries.length &&
          (null === request.trackedPostpones ||
            (0 === request.trackedPostpones.rootNodes.length &&
              null === request.trackedPostpones.rootSlots))) ||
          0 !== resumableState$jscomp$0.streamingFormat ||
          0 !== (resumableState$jscomp$0.instructions & 64) ||
          ((resumableState$jscomp$0.instructions |= 64),
          destination.push(renderState$jscomp$0.startInlineScript),
          writeCompletedShellIdAttribute(destination, resumableState$jscomp$0),
          destination.push(">"),
          destination.push(
            "requestAnimationFrame(function(){$RT=performance.now()});"
          ),
          destination.push("\x3c/script>"));
        var preamble$jscomp$1 = renderState$jscomp$0.preamble;
        if (
          (preamble$jscomp$1.htmlChunks || preamble$jscomp$1.headChunks) &&
          0 === (resumableState$jscomp$0.instructions & 32)
        ) {
          var chunk$jscomp$1 = startChunkForTag("template");
          destination.push(chunk$jscomp$1);
          writeCompletedShellIdAttribute(destination, resumableState$jscomp$0);
          destination.push(">");
          var chunk$jscomp$2 = endChunkForTag("template");
          destination.push(chunk$jscomp$2);
        }
        writeBootstrap(destination, renderState$jscomp$0);
      }
      var renderState$jscomp$1 = request.renderState;
      completedRootSegment = 0;
      var viewportChunks$jscomp$0 = renderState$jscomp$1.viewportChunks;
      for (
        completedRootSegment = 0;
        completedRootSegment < viewportChunks$jscomp$0.length;
        completedRootSegment++
      )
        destination.push(viewportChunks$jscomp$0[completedRootSegment]);
      viewportChunks$jscomp$0.length = 0;
      renderState$jscomp$1.preconnects.forEach(flushResource, destination);
      renderState$jscomp$1.preconnects.clear();
      renderState$jscomp$1.fontPreloads.forEach(flushResource, destination);
      renderState$jscomp$1.fontPreloads.clear();
      renderState$jscomp$1.highImagePreloads.forEach(
        flushResource,
        destination
      );
      renderState$jscomp$1.highImagePreloads.clear();
      renderState$jscomp$1.styles.forEach(preloadLateStyles, destination);
      renderState$jscomp$1.scripts.forEach(flushResource, destination);
      renderState$jscomp$1.scripts.clear();
      renderState$jscomp$1.bulkPreloads.forEach(flushResource, destination);
      renderState$jscomp$1.bulkPreloads.clear();
      var hoistableChunks$jscomp$0 = renderState$jscomp$1.hoistableChunks;
      for (
        completedRootSegment = 0;
        completedRootSegment < hoistableChunks$jscomp$0.length;
        completedRootSegment++
      )
        destination.push(hoistableChunks$jscomp$0[completedRootSegment]);
      hoistableChunks$jscomp$0.length = 0;
      var clientRenderedBoundaries = request.clientRenderedBoundaries;
      for (i = 0; i < clientRenderedBoundaries.length; i++) {
        var boundary = clientRenderedBoundaries[i];
        renderState$jscomp$1 = destination;
        var resumableState$jscomp$1 = request.resumableState,
          renderState$jscomp$2 = request.renderState,
          id = boundary.rootSegmentID,
          errorDigest = boundary.errorDigest,
          scriptFormat = 0 === resumableState$jscomp$1.streamingFormat;
        scriptFormat
          ? (renderState$jscomp$1.push(renderState$jscomp$2.startInlineScript),
            renderState$jscomp$1.push(">"),
            0 === (resumableState$jscomp$1.instructions & 4)
              ? ((resumableState$jscomp$1.instructions |= 4),
                renderState$jscomp$1.push(
                  '$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};;$RX("'
                ))
              : renderState$jscomp$1.push('$RX("'))
          : renderState$jscomp$1.push('<template data-rxi="" data-bid="');
        renderState$jscomp$1.push(renderState$jscomp$2.boundaryPrefix);
        var chunk$jscomp$3 = id.toString(16);
        renderState$jscomp$1.push(chunk$jscomp$3);
        scriptFormat && renderState$jscomp$1.push('"');
        if (errorDigest)
          if (scriptFormat) {
            renderState$jscomp$1.push(",");
            var chunk$jscomp$4 = escapeJSStringsForInstructionScripts(
              errorDigest || ""
            );
            renderState$jscomp$1.push(chunk$jscomp$4);
          } else {
            renderState$jscomp$1.push('" data-dgst="');
            var chunk$jscomp$5 = escapeTextForBrowser(errorDigest || "");
            renderState$jscomp$1.push(chunk$jscomp$5);
          }
        var JSCompiler_inline_result = scriptFormat
          ? renderState$jscomp$1.push(")\x3c/script>")
          : renderState$jscomp$1.push('"></template>');
        if (!JSCompiler_inline_result) {
          request.destination = null;
          i++;
          clientRenderedBoundaries.splice(0, i);
          return;
        }
      }
      clientRenderedBoundaries.splice(0, i);
      var completedBoundaries = request.completedBoundaries;
      for (i = 0; i < completedBoundaries.length; i++)
        if (
          !flushCompletedBoundary(request, destination, completedBoundaries[i])
        ) {
          request.destination = null;
          i++;
          completedBoundaries.splice(0, i);
          return;
        }
      completedBoundaries.splice(0, i);
      flushingPartialBoundaries = !0;
      var partialBoundaries = request.partialBoundaries;
      for (i = 0; i < partialBoundaries.length; i++) {
        var boundary$71 = partialBoundaries[i];
        a: {
          clientRenderedBoundaries = request;
          boundary = destination;
          flushedByteSize = boundary$71.byteSize;
          var completedSegments = boundary$71.completedSegments;
          for (
            JSCompiler_inline_result = 0;
            JSCompiler_inline_result < completedSegments.length;
            JSCompiler_inline_result++
          )
            if (
              !flushPartiallyCompletedSegment(
                clientRenderedBoundaries,
                boundary,
                boundary$71,
                completedSegments[JSCompiler_inline_result]
              )
            ) {
              JSCompiler_inline_result++;
              completedSegments.splice(0, JSCompiler_inline_result);
              var JSCompiler_inline_result$jscomp$0 = !1;
              break a;
            }
          completedSegments.splice(0, JSCompiler_inline_result);
          var row = boundary$71.row;
          null !== row &&
            row.together &&
            1 === boundary$71.pendingTasks &&
            (1 === row.pendingTasks
              ? unblockSuspenseListRow(
                  clientRenderedBoundaries,
                  row,
                  row.hoistables
                )
              : row.pendingTasks--);
          JSCompiler_inline_result$jscomp$0 = writeHoistablesForBoundary(
            boundary,
            boundary$71.contentState,
            clientRenderedBoundaries.renderState
          );
        }
        if (!JSCompiler_inline_result$jscomp$0) {
          request.destination = null;
          i++;
          partialBoundaries.splice(0, i);
          return;
        }
      }
      partialBoundaries.splice(0, i);
      flushingPartialBoundaries = !1;
      var largeBoundaries = request.completedBoundaries;
      for (i = 0; i < largeBoundaries.length; i++)
        if (!flushCompletedBoundary(request, destination, largeBoundaries[i])) {
          request.destination = null;
          i++;
          largeBoundaries.splice(0, i);
          return;
        }
      largeBoundaries.splice(0, i);
    }
  } finally {
    (flushingPartialBoundaries = !1),
      (i = request.postponedState),
      null !== i && (i.nextSegmentId = request.nextSegmentId),
      0 === request.allPendingTasks &&
        0 === request.clientRenderedBoundaries.length &&
        0 === request.completedBoundaries.length &&
        ((request.flushScheduled = !1),
        (i = request.resumableState),
        i.hasBody &&
          ((partialBoundaries = endChunkForTag("body")),
          destination.push(partialBoundaries)),
        i.hasHtml && ((i = endChunkForTag("html")), destination.push(i)),
        (request.status = 13),
        destination.push(null),
        (request.destination = null));
  }
}
function enqueueFlush(request) {
  if (
    !1 === request.flushScheduled &&
    0 === request.pingedTasks.length &&
    null !== request.destination
  ) {
    request.flushScheduled = !0;
    var destination = request.destination;
    destination
      ? flushCompletedQueues(request, destination)
      : (request.flushScheduled = !1);
  }
}
function startFlowing(request, destination) {
  if (12 === request.status)
    (request.status = 13), destination.destroy(request.fatalError);
  else if (13 !== request.status && null === request.destination) {
    request.destination = destination;
    try {
      flushCompletedQueues(request, destination);
    } catch (error) {
      logRecoverableError(request, error, {}), fatalError(request, error);
    }
  }
}
function finishAbort(request, abortableTasks) {
  try {
    if (0 < abortableTasks.size) {
      var error = request.fatalError;
      abortableTasks.forEach(function (task) {
        return finishAbortedTask(task, request, error);
      });
      abortableTasks.clear();
    }
    null !== request.destination &&
      flushCompletedQueues(request, request.destination);
  } catch (error$73) {
    logRecoverableError(request, error$73, {}), fatalError(request, error$73);
  }
}
function abort(request, reason) {
  request.aborted ||
    (11 !== request.status && 10 !== request.status) ||
    ((request.aborted = !0),
    (reason =
      void 0 === reason
        ? Error(formatProdErrorMessage(432))
        : "object" === typeof reason &&
            null !== reason &&
            "function" === typeof reason.then
          ? Error(formatProdErrorMessage(530))
          : reason),
    (request.fatalError = reason),
    (reason = request.abortableTasks),
    reason.forEach(function (task) {
      return abortTask(task, request);
    }),
    finishAbort(request, reason));
}
function addToReplayParent(node, parentKeyPath, trackedPostpones) {
  if (null === parentKeyPath) trackedPostpones.rootNodes.push(node);
  else {
    var workingMap = trackedPostpones.workingMap,
      parentNode = workingMap.get(parentKeyPath);
    void 0 === parentNode &&
      ((parentNode = [parentKeyPath[1], parentKeyPath[2], [], null]),
      workingMap.set(parentKeyPath, parentNode),
      addToReplayParent(parentNode, parentKeyPath[0], trackedPostpones));
    parentNode[2].push(node);
  }
}
function onError() {}
function renderToStringImpl(
  children,
  options,
  generateStaticMarkup,
  abortReason
) {
  var didFatal = !1,
    fatalError = null,
    result = "",
    readyToStream = !1;
  options = createResumableState(
    options ? options.identifierPrefix : void 0,
    void 0
  );
  children = createRequest(
    children,
    options,
    createRenderState(options, generateStaticMarkup),
    createFormatContext(0, null, 0, null),
    Infinity,
    onError,
    void 0,
    function () {
      readyToStream = !0;
    },
    void 0,
    void 0,
    void 0
  );
  children.flushScheduled = null !== children.destination;
  performWork(children);
  10 === children.status && (children.status = 11);
  null === children.trackedPostpones &&
    safelyEmitEarlyPreloads(children, 0 === children.pendingRootTasks);
  abort(children, abortReason);
  startFlowing(children, {
    push: function (chunk) {
      null !== chunk && (result += chunk);
      return !0;
    },
    destroy: function (error) {
      didFatal = !0;
      fatalError = error;
    }
  });
  if (didFatal && fatalError !== abortReason) throw fatalError;
  if (!readyToStream) throw Error(formatProdErrorMessage(426));
  return result;
}
exports.renderToStaticMarkup = function (children, options) {
  return renderToStringImpl(
    children,
    options,
    !0,
    'The server used "renderToStaticMarkup" which does not support Suspense. If you intended to have the server wait for the suspended component please switch to "renderToReadableStream" which supports Suspense on the server'
  );
};
exports.renderToString = function (children, options) {
  return renderToStringImpl(
    children,
    options,
    !1,
    'The server used "renderToString" which does not support Suspense. If you intended for this Suspense boundary to render the fallback content on the server consider throwing an Error somewhere within the Suspense boundary. If you intended to have the server wait for the suspended component please switch to "renderToReadableStream" which supports Suspense on the server'
  );
};
exports.version = "19.3.0-www-classic-2ba07c6d-20260719";
