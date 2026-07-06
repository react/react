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
__DEV__ &&
  (function () {
    function styleReplacer(match, prefix, s, suffix) {
      return "" + prefix + ("s" === s ? "\\73 " : "\\53 ") + suffix;
    }
    function scriptReplacer(match, prefix, s, suffix) {
      return "" + prefix + ("s" === s ? "\\u0073" : "\\u0053") + suffix;
    }
    function getIteratorFn(maybeIterable) {
      if (null === maybeIterable || "object" !== typeof maybeIterable)
        return null;
      maybeIterable =
        (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
        maybeIterable["@@iterator"];
      return "function" === typeof maybeIterable ? maybeIterable : null;
    }
    function objectName(object) {
      object = Object.prototype.toString.call(object);
      return object.slice(8, object.length - 1);
    }
    function describeKeyForErrorMessage(key) {
      var encodedKey = JSON.stringify(key);
      return '"' + key + '"' === encodedKey ? key : encodedKey;
    }
    function describeValueForErrorMessage(value) {
      switch (typeof value) {
        case "string":
          return JSON.stringify(
            10 >= value.length ? value : value.slice(0, 10) + "..."
          );
        case "object":
          if (isArrayImpl(value)) return "[...]";
          if (null !== value && value.$$typeof === CLIENT_REFERENCE_TAG)
            return "client";
          value = objectName(value);
          return "Object" === value ? "{...}" : value;
        case "function":
          return value.$$typeof === CLIENT_REFERENCE_TAG
            ? "client"
            : (value = value.displayName || value.name)
              ? "function " + value
              : "function";
        default:
          return String(value);
      }
    }
    function describeElementType(type) {
      if ("string" === typeof type) return type;
      switch (type) {
        case REACT_SUSPENSE_TYPE:
          return "Suspense";
        case REACT_SUSPENSE_LIST_TYPE:
          return "SuspenseList";
        case REACT_VIEW_TRANSITION_TYPE:
          if (enableViewTransition) return "ViewTransition";
      }
      if ("object" === typeof type)
        switch (type.$$typeof) {
          case REACT_FORWARD_REF_TYPE:
            return describeElementType(type.render);
          case REACT_MEMO_TYPE:
            return describeElementType(type.type);
          case REACT_LAZY_TYPE:
            var payload = type._payload;
            type = type._init;
            try {
              return describeElementType(type(payload));
            } catch (x) {}
        }
      return "";
    }
    function describeObjectForErrorMessage(objectOrArray, expandedName) {
      var objKind = objectName(objectOrArray);
      if ("Object" !== objKind && "Array" !== objKind) return objKind;
      var start = -1,
        length = 0;
      if (isArrayImpl(objectOrArray))
        if (jsxChildrenParents.has(objectOrArray)) {
          var type = jsxChildrenParents.get(objectOrArray);
          objKind = "<" + describeElementType(type) + ">";
          for (var i = 0; i < objectOrArray.length; i++) {
            var value = objectOrArray[i];
            value =
              "string" === typeof value
                ? value
                : "object" === typeof value && null !== value
                  ? "{" + describeObjectForErrorMessage(value) + "}"
                  : "{" + describeValueForErrorMessage(value) + "}";
            "" + i === expandedName
              ? ((start = objKind.length),
                (length = value.length),
                (objKind += value))
              : (objKind =
                  15 > value.length && 40 > objKind.length + value.length
                    ? objKind + value
                    : objKind + "{...}");
          }
          objKind += "</" + describeElementType(type) + ">";
        } else {
          objKind = "[";
          for (type = 0; type < objectOrArray.length; type++)
            0 < type && (objKind += ", "),
              (i = objectOrArray[type]),
              (i =
                "object" === typeof i && null !== i
                  ? describeObjectForErrorMessage(i)
                  : describeValueForErrorMessage(i)),
              "" + type === expandedName
                ? ((start = objKind.length),
                  (length = i.length),
                  (objKind += i))
                : (objKind =
                    10 > i.length && 40 > objKind.length + i.length
                      ? objKind + i
                      : objKind + "...");
          objKind += "]";
        }
      else if (objectOrArray.$$typeof === REACT_ELEMENT_TYPE)
        objKind = "<" + describeElementType(objectOrArray.type) + "/>";
      else {
        if (objectOrArray.$$typeof === CLIENT_REFERENCE_TAG) return "client";
        if (jsxPropsParents.has(objectOrArray)) {
          objKind = jsxPropsParents.get(objectOrArray);
          objKind = "<" + (describeElementType(objKind) || "...");
          type = Object.keys(objectOrArray);
          for (i = 0; i < type.length; i++) {
            objKind += " ";
            value = type[i];
            objKind += describeKeyForErrorMessage(value) + "=";
            var _value2 = objectOrArray[value];
            var _substr2 =
              value === expandedName &&
              "object" === typeof _value2 &&
              null !== _value2
                ? describeObjectForErrorMessage(_value2)
                : describeValueForErrorMessage(_value2);
            "string" !== typeof _value2 && (_substr2 = "{" + _substr2 + "}");
            value === expandedName
              ? ((start = objKind.length),
                (length = _substr2.length),
                (objKind += _substr2))
              : (objKind =
                  10 > _substr2.length && 40 > objKind.length + _substr2.length
                    ? objKind + _substr2
                    : objKind + "...");
          }
          objKind += ">";
        } else {
          objKind = "{";
          type = Object.keys(objectOrArray);
          for (i = 0; i < type.length; i++)
            0 < i && (objKind += ", "),
              (value = type[i]),
              (objKind += describeKeyForErrorMessage(value) + ": "),
              (_value2 = objectOrArray[value]),
              (_value2 =
                "object" === typeof _value2 && null !== _value2
                  ? describeObjectForErrorMessage(_value2)
                  : describeValueForErrorMessage(_value2)),
              value === expandedName
                ? ((start = objKind.length),
                  (length = _value2.length),
                  (objKind += _value2))
                : (objKind =
                    10 > _value2.length && 40 > objKind.length + _value2.length
                      ? objKind + _value2
                      : objKind + "...");
          objKind += "}";
        }
      }
      return void 0 === expandedName
        ? objKind
        : -1 < start && 0 < length
          ? ((objectOrArray = " ".repeat(start) + "^".repeat(length)),
            "\n  " + objKind + "\n  " + objectOrArray)
          : "\n  " + objKind;
    }
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
          (461845907 * (k1 & 65535) +
            (((461845907 * (k1 >>> 16)) & 65535) << 16)) &
          4294967295;
        h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
        h1 =
          (5 * (h1 & 65535) + (((5 * (h1 >>> 16)) & 65535) << 16)) & 4294967295;
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
        (2246822507 * (h1 & 65535) +
          (((2246822507 * (h1 >>> 16)) & 65535) << 16)) &
        4294967295;
      h1 ^= h1 >>> 13;
      h1 =
        (3266489909 * (h1 & 65535) +
          (((3266489909 * (h1 >>> 16)) & 65535) << 16)) &
        4294967295;
      return (h1 ^ (h1 >>> 16)) >>> 0;
    }
    function typeName(value) {
      return (
        ("function" === typeof Symbol &&
          Symbol.toStringTag &&
          value[Symbol.toStringTag]) ||
        value.constructor.name ||
        "Object"
      );
    }
    function willCoercionThrow(value) {
      try {
        return testStringCoercion(value), !1;
      } catch (e) {
        return !0;
      }
    }
    function testStringCoercion(value) {
      return "" + value;
    }
    function checkAttributeStringCoercion(value, attributeName) {
      if (willCoercionThrow(value))
        return (
          console.error(
            "The provided `%s` attribute is an unsupported type %s. This value must be coerced to a string before using it here.",
            attributeName,
            typeName(value)
          ),
          testStringCoercion(value)
        );
    }
    function checkCSSPropertyStringCoercion(value, propName) {
      if (willCoercionThrow(value))
        return (
          console.error(
            "The provided `%s` CSS property is an unsupported type %s. This value must be coerced to a string before using it here.",
            propName,
            typeName(value)
          ),
          testStringCoercion(value)
        );
    }
    function checkHtmlStringCoercion(value) {
      if (willCoercionThrow(value))
        return (
          console.error(
            "The provided HTML markup uses a value of unsupported type %s. This value must be coerced to a string before using it here.",
            typeName(value)
          ),
          testStringCoercion(value)
        );
    }
    function isAttributeNameSafe(attributeName) {
      if (hasOwnProperty.call(validatedAttributeNameCache, attributeName))
        return !0;
      if (hasOwnProperty.call(illegalAttributeNameCache, attributeName))
        return !1;
      if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName))
        return (validatedAttributeNameCache[attributeName] = !0);
      illegalAttributeNameCache[attributeName] = !0;
      console.error("Invalid attribute name: `%s`", attributeName);
      return !1;
    }
    function checkControlledValueProps(tagName, props) {
      hasReadOnlyValue[props.type] ||
        props.onChange ||
        props.onInput ||
        props.readOnly ||
        props.disabled ||
        null == props.value ||
        ("select" === tagName
          ? console.error(
              "You provided a `value` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultValue`. Otherwise, set `onChange`."
            )
          : console.error(
              "You provided a `value` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultValue`. Otherwise, set either `onChange` or `readOnly`."
            ));
      props.onChange ||
        props.readOnly ||
        props.disabled ||
        null == props.checked ||
        console.error(
          "You provided a `checked` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultChecked`. Otherwise, set either `onChange` or `readOnly`."
        );
    }
    function validateProperty$1(tagName, name) {
      if (
        hasOwnProperty.call(warnedProperties$1, name) &&
        warnedProperties$1[name]
      )
        return !0;
      if (rARIACamel$1.test(name)) {
        tagName = "aria-" + name.slice(4).toLowerCase();
        tagName = ariaProperties.hasOwnProperty(tagName) ? tagName : null;
        if (null == tagName)
          return (
            console.error(
              "Invalid ARIA attribute `%s`. ARIA attributes follow the pattern aria-* and must be lowercase.",
              name
            ),
            (warnedProperties$1[name] = !0)
          );
        if (name !== tagName)
          return (
            console.error(
              "Invalid ARIA attribute `%s`. Did you mean `%s`?",
              name,
              tagName
            ),
            (warnedProperties$1[name] = !0)
          );
      }
      if (rARIA$1.test(name)) {
        tagName = name.toLowerCase();
        tagName = ariaProperties.hasOwnProperty(tagName) ? tagName : null;
        if (null == tagName) return (warnedProperties$1[name] = !0), !1;
        name !== tagName &&
          (console.error(
            "Unknown ARIA attribute `%s`. Did you mean `%s`?",
            name,
            tagName
          ),
          (warnedProperties$1[name] = !0));
      }
      return !0;
    }
    function validateProperties$2(type, props) {
      var invalidProps = [],
        key;
      for (key in props)
        validateProperty$1(type, key) || invalidProps.push(key);
      props = invalidProps
        .map(function (prop) {
          return "`" + prop + "`";
        })
        .join(", ");
      1 === invalidProps.length
        ? console.error(
            "Invalid aria prop %s on <%s> tag. For details, see https://react.dev/link/invalid-aria-props",
            props,
            type
          )
        : 1 < invalidProps.length &&
          console.error(
            "Invalid aria props %s on <%s> tag. For details, see https://react.dev/link/invalid-aria-props",
            props,
            type
          );
    }
    function validateProperty(tagName, name, value, eventRegistry) {
      if (hasOwnProperty.call(warnedProperties, name) && warnedProperties[name])
        return !0;
      var lowerCasedName = name.toLowerCase();
      if ("onfocusin" === lowerCasedName || "onfocusout" === lowerCasedName)
        return (
          console.error(
            "React uses onFocus and onBlur instead of onFocusIn and onFocusOut. All React events are normalized to bubble, so onFocusIn and onFocusOut are not needed/supported by React."
          ),
          (warnedProperties[name] = !0)
        );
      if (
        "function" === typeof value &&
        (("form" === tagName && "action" === name) ||
          ("input" === tagName && "formAction" === name) ||
          ("button" === tagName && "formAction" === name))
      )
        return !0;
      if (null != eventRegistry) {
        tagName = eventRegistry.possibleRegistrationNames;
        if (eventRegistry.registrationNameDependencies.hasOwnProperty(name))
          return !0;
        eventRegistry = tagName.hasOwnProperty(lowerCasedName)
          ? tagName[lowerCasedName]
          : null;
        if (null != eventRegistry)
          return (
            console.error(
              "Invalid event handler property `%s`. Did you mean `%s`?",
              name,
              eventRegistry
            ),
            (warnedProperties[name] = !0)
          );
        if (EVENT_NAME_REGEX.test(name))
          return (
            console.error(
              "Unknown event handler property `%s`. It will be ignored.",
              name
            ),
            (warnedProperties[name] = !0)
          );
      } else if (EVENT_NAME_REGEX.test(name))
        return (
          INVALID_EVENT_NAME_REGEX.test(name) &&
            console.error(
              "Invalid event handler property `%s`. React events use the camelCase naming convention, for example `onClick`.",
              name
            ),
          (warnedProperties[name] = !0)
        );
      if (rARIA.test(name) || rARIACamel.test(name)) return !0;
      if ("innerhtml" === lowerCasedName)
        return (
          console.error(
            "Directly setting property `innerHTML` is not permitted. For more information, lookup documentation on `dangerouslySetInnerHTML`."
          ),
          (warnedProperties[name] = !0)
        );
      if ("aria" === lowerCasedName)
        return (
          console.error(
            "The `aria` attribute is reserved for future use in React. Pass individual `aria-` attributes instead."
          ),
          (warnedProperties[name] = !0)
        );
      if (
        "is" === lowerCasedName &&
        null !== value &&
        void 0 !== value &&
        "string" !== typeof value
      )
        return (
          console.error(
            "Received a `%s` for a string attribute `is`. If this is expected, cast the value to a string.",
            typeof value
          ),
          (warnedProperties[name] = !0)
        );
      if ("number" === typeof value && isNaN(value))
        return (
          console.error(
            "Received NaN for the `%s` attribute. If this is expected, cast the value to a string.",
            name
          ),
          (warnedProperties[name] = !0)
        );
      if (possibleStandardNames.hasOwnProperty(lowerCasedName)) {
        if (
          ((lowerCasedName = possibleStandardNames[lowerCasedName]),
          lowerCasedName !== name)
        )
          return (
            console.error(
              "Invalid DOM property `%s`. Did you mean `%s`?",
              name,
              lowerCasedName
            ),
            (warnedProperties[name] = !0)
          );
      } else if (name !== lowerCasedName)
        return (
          console.error(
            "React does not recognize the `%s` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `%s` instead. If you accidentally passed it from a parent component, remove it from the DOM element.",
            name,
            lowerCasedName
          ),
          (warnedProperties[name] = !0)
        );
      switch (name) {
        case "dangerouslySetInnerHTML":
        case "children":
        case "style":
        case "suppressContentEditableWarning":
        case "suppressHydrationWarning":
        case "defaultValue":
        case "defaultChecked":
        case "innerHTML":
        case "ref":
          return !0;
        case "innerText":
        case "textContent":
          return !0;
      }
      switch (typeof value) {
        case "boolean":
          switch (name) {
            case "autoFocus":
            case "checked":
            case "multiple":
            case "muted":
            case "selected":
            case "contentEditable":
            case "spellCheck":
            case "draggable":
            case "value":
            case "autoReverse":
            case "externalResourcesRequired":
            case "focusable":
            case "preserveAlpha":
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
            case "capture":
            case "download":
            case "inert":
              return !0;
            default:
              lowerCasedName = name.toLowerCase().slice(0, 5);
              if ("data-" === lowerCasedName || "aria-" === lowerCasedName)
                return !0;
              value
                ? console.error(
                    'Received `%s` for a non-boolean attribute `%s`.\n\nIf you want to write it to the DOM, pass a string instead: %s="%s" or %s={value.toString()}.',
                    value,
                    name,
                    name,
                    value,
                    name
                  )
                : console.error(
                    'Received `%s` for a non-boolean attribute `%s`.\n\nIf you want to write it to the DOM, pass a string instead: %s="%s" or %s={value.toString()}.\n\nIf you used to conditionally omit it with %s={condition && value}, pass %s={condition ? value : undefined} instead.',
                    value,
                    name,
                    name,
                    value,
                    name,
                    name,
                    name
                  );
              return (warnedProperties[name] = !0);
          }
        case "function":
        case "symbol":
          return (warnedProperties[name] = !0), !1;
        case "string":
          if ("false" === value || "true" === value) {
            switch (name) {
              case "checked":
              case "selected":
              case "multiple":
              case "muted":
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
              case "inert":
                break;
              default:
                return !0;
            }
            console.error(
              "Received the string `%s` for the boolean attribute `%s`. %s Did you mean %s={%s}?",
              value,
              name,
              "false" === value
                ? "The browser will interpret it as a truthy value."
                : 'Although this works, it will not work as expected if you pass the string "false".',
              name,
              value
            );
            warnedProperties[name] = !0;
          }
      }
      return !0;
    }
    function warnUnknownProperties(type, props, eventRegistry) {
      var unknownProps = [],
        key;
      for (key in props)
        validateProperty(type, key, props[key], eventRegistry) ||
          unknownProps.push(key);
      props = unknownProps
        .map(function (prop) {
          return "`" + prop + "`";
        })
        .join(", ");
      1 === unknownProps.length
        ? console.error(
            "Invalid value for prop %s on <%s> tag. Either remove it from the element, or pass a string or number value to keep it in the DOM. For details, see https://react.dev/link/attribute-behavior ",
            props,
            type
          )
        : 1 < unknownProps.length &&
          console.error(
            "Invalid values for props %s on <%s> tag. Either remove them from the element, or pass a string or number value to keep them in the DOM. For details, see https://react.dev/link/attribute-behavior ",
            props,
            type
          );
    }
    function camelize(string) {
      return string.replace(hyphenPattern, function (_, character) {
        return character.toUpperCase();
      });
    }
    function escapeTextForBrowser(text) {
      if (
        "boolean" === typeof text ||
        "number" === typeof text ||
        "bigint" === typeof text
      )
        return "" + text;
      checkHtmlStringCoercion(text);
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
    function sanitizeURL(url) {
      return isJavaScriptProtocol.test("" + url)
        ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')"
        : url;
    }
    function escapeEntireInlineScriptContent(scriptText) {
      checkHtmlStringCoercion(scriptText);
      return ("" + scriptText).replace(scriptRegex, scriptReplacer);
    }
    function createResumableState(
      identifierPrefix,
      externalRuntimeConfig,
      bootstrapScriptContent,
      bootstrapScripts,
      bootstrapModules
    ) {
      var streamingFormat = ScriptStreamingFormat;
      void 0 !== externalRuntimeConfig && (streamingFormat = 1);
      return {
        idPrefix: void 0 === identifierPrefix ? "" : identifierPrefix,
        nextFormID: 0,
        streamingFormat: streamingFormat,
        bootstrapScriptContent: bootstrapScriptContent,
        bootstrapScripts: bootstrapScripts,
        bootstrapModules: bootstrapModules,
        instructions: NothingSent,
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
          return createFormatContext(HTML_MODE, null, subtreeScope | 1, null);
        case "select":
          return createFormatContext(
            HTML_MODE,
            null != props.value ? props.value : props.defaultValue,
            subtreeScope,
            null
          );
        case "svg":
          return createFormatContext(SVG_MODE, null, subtreeScope, null);
        case "picture":
          return createFormatContext(HTML_MODE, null, subtreeScope | 2, null);
        case "math":
          return createFormatContext(MATHML_MODE, null, subtreeScope, null);
        case "foreignObject":
          return createFormatContext(HTML_MODE, null, subtreeScope, null);
        case "table":
          return createFormatContext(HTML_TABLE_MODE, null, subtreeScope, null);
        case "thead":
        case "tbody":
        case "tfoot":
          return createFormatContext(
            HTML_TABLE_BODY_MODE,
            null,
            subtreeScope,
            null
          );
        case "colgroup":
          return createFormatContext(
            HTML_COLGROUP_MODE,
            null,
            subtreeScope,
            null
          );
        case "tr":
          return createFormatContext(
            HTML_TABLE_ROW_MODE,
            null,
            subtreeScope,
            null
          );
        case "head":
          if (parentContext.insertionMode < HTML_MODE)
            return createFormatContext(
              HTML_HEAD_MODE,
              null,
              subtreeScope,
              null
            );
          break;
        case "html":
          if (parentContext.insertionMode === ROOT_HTML_MODE)
            return createFormatContext(
              HTML_HTML_MODE,
              null,
              subtreeScope,
              null
            );
      }
      return parentContext.insertionMode >= HTML_TABLE_MODE ||
        parentContext.insertionMode < HTML_MODE
        ? createFormatContext(HTML_MODE, null, subtreeScope, null)
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
      parentContext.tagScope & 32 &&
        (resumableState.instructions |= NeedUpgradeToViewTransitions);
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
    function pushStyleAttribute(target, style) {
      if ("object" !== typeof style)
        throw Error(
          "The `style` prop expects a mapping from style properties to values, not a string. For example, style={{marginRight: spacing + 'em'}} when using JSX."
        );
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
              checkCSSPropertyStringCoercion(styleValue, styleName);
              styleValue = escapeTextForBrowser(("" + styleValue).trim());
            } else {
              nameChunk = styleName;
              var value = styleValue;
              if (-1 < nameChunk.indexOf("-")) {
                var name = nameChunk;
                (warnedStyleNames.hasOwnProperty(name) &&
                  warnedStyleNames[name]) ||
                  ((warnedStyleNames[name] = !0),
                  console.error(
                    "Unsupported style property %s. Did you mean %s?",
                    name,
                    camelize(name.replace(msPattern$1, "ms-"))
                  ));
              } else if (badVendoredStyleNamePattern.test(nameChunk))
                (name = nameChunk),
                  (warnedStyleNames.hasOwnProperty(name) &&
                    warnedStyleNames[name]) ||
                    ((warnedStyleNames[name] = !0),
                    console.error(
                      "Unsupported vendor-prefixed style property %s. Did you mean %s?",
                      name,
                      name.charAt(0).toUpperCase() + name.slice(1)
                    ));
              else if (badStyleValueWithSemicolonPattern.test(value)) {
                name = nameChunk;
                var value$jscomp$0 = value;
                (warnedStyleValues.hasOwnProperty(value$jscomp$0) &&
                  warnedStyleValues[value$jscomp$0]) ||
                  ((warnedStyleValues[value$jscomp$0] = !0),
                  console.error(
                    'Style property values shouldn\'t contain a semicolon. Try "%s: %s" instead.',
                    name,
                    value$jscomp$0.replace(
                      badStyleValueWithSemicolonPattern,
                      ""
                    )
                  ));
              }
              "number" === typeof value &&
                (isNaN(value)
                  ? warnedForNaNValue ||
                    ((warnedForNaNValue = !0),
                    console.error(
                      "`NaN` is an invalid value for the `%s` css style property.",
                      nameChunk
                    ))
                  : isFinite(value) ||
                    warnedForInfinityValue ||
                    ((warnedForInfinityValue = !0),
                    console.error(
                      "`Infinity` is an invalid value for the `%s` css style property.",
                      nameChunk
                    )));
              nameChunk = styleName;
              value = styleNameCache.get(nameChunk);
              void 0 !== value
                ? (nameChunk = value)
                : ((value = escapeTextForBrowser(
                    nameChunk
                      .replace(uppercasePattern, "-$1")
                      .toLowerCase()
                      .replace(msPattern, "-ms-")
                  )),
                  styleNameCache.set(nameChunk, value),
                  (nameChunk = value));
              "number" === typeof styleValue
                ? (styleValue =
                    0 === styleValue || unitlessNumbers.has(styleName)
                      ? "" + styleValue
                      : styleValue + "px")
                : (checkCSSPropertyStringCoercion(styleValue, styleName),
                  (styleValue = escapeTextForBrowser(
                    ("" + styleValue).trim()
                  )));
            }
            isFirst
              ? ((isFirst = !1),
                target.push(
                  styleAttributeStart,
                  nameChunk,
                  styleAssign,
                  styleValue
                ))
              : target.push(styleSeparator, nameChunk, styleAssign, styleValue);
          }
        }
      isFirst || target.push(attributeEnd);
    }
    function pushBooleanAttribute(target, name, value) {
      value &&
        "function" !== typeof value &&
        "symbol" !== typeof value &&
        target.push(attributeSeparator, name, attributeEmptyString);
    }
    function pushStringAttribute(target, name, value) {
      "function" !== typeof value &&
        "symbol" !== typeof value &&
        "boolean" !== typeof value &&
        target.push(
          attributeSeparator,
          name,
          attributeAssign,
          escapeTextForBrowser(value),
          attributeEnd
        );
    }
    function pushAdditionalFormField(value, key) {
      this.push('<input type="hidden"');
      validateAdditionalFormField(value);
      pushStringAttribute(this, "name", key);
      pushStringAttribute(this, "value", value);
      this.push(endOfStartTagSelfClosing);
    }
    function validateAdditionalFormField(value) {
      if ("string" !== typeof value)
        throw Error(
          "File/Blob fields are not yet supported in progressive forms. Will fallback to client hydration."
        );
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
          if (
            "object" === typeof x &&
            null !== x &&
            "function" === typeof x.then
          )
            throw x;
          console.error(
            "Failed to serialize an action for progressive enhancement:\n%s",
            x
          );
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
        null === name ||
          didWarnFormActionName ||
          ((didWarnFormActionName = !0),
          console.error(
            'Cannot specify a "name" prop for a button that specifies a function as a formAction. React needs it to encode which action should be invoked. It will get overridden.'
          ));
        (null === formEncType && null === formMethod) ||
          didWarnFormActionMethod ||
          ((didWarnFormActionMethod = !0),
          console.error(
            "Cannot specify a formEncType or formMethod for a button that specifies a function as a formAction. React provides those automatically. They will get overridden."
          ));
        null === formTarget ||
          didWarnFormActionTarget ||
          ((didWarnFormActionTarget = !0),
          console.error(
            "Cannot specify a formTarget for a button that specifies a function as a formAction. The function will always be executed in the same window."
          ));
        var customFields = getCustomFormFields(resumableState, formAction);
        null !== customFields
          ? ((name = customFields.name),
            (formAction = customFields.action || ""),
            (formEncType = customFields.encType),
            (formMethod = customFields.method),
            (formTarget = customFields.target),
            (formData = customFields.data))
          : (target.push(
              attributeSeparator,
              "formAction",
              attributeAssign,
              actionJavaScriptURL,
              attributeEnd
            ),
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
          if ("" === value) {
            "src" === name
              ? console.error(
                  'An empty string ("") was passed to the %s attribute. This may cause the browser to download the whole page again over the network. To fix this, either do not render the element at all or pass null to %s instead of an empty string.',
                  name,
                  name
                )
              : console.error(
                  'An empty string ("") was passed to the %s attribute. To fix this, either do not render the element at all or pass null to %s instead of an empty string.',
                  name,
                  name
                );
            break;
          }
        case "action":
        case "formAction":
          if (
            null == value ||
            "function" === typeof value ||
            "symbol" === typeof value ||
            "boolean" === typeof value
          )
            break;
          checkAttributeStringCoercion(value, name);
          value = sanitizeURL("" + value);
          target.push(
            attributeSeparator,
            name,
            attributeAssign,
            escapeTextForBrowser(value),
            attributeEnd
          );
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
          checkAttributeStringCoercion(value, name);
          value = sanitizeURL("" + value);
          target.push(
            attributeSeparator,
            "xlink:href",
            attributeAssign,
            escapeTextForBrowser(value),
            attributeEnd
          );
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
            target.push(
              attributeSeparator,
              name,
              attributeAssign,
              escapeTextForBrowser(value),
              attributeEnd
            );
          break;
        case "inert":
          "" !== value ||
            didWarnForNewBooleanPropsWithEmptyValue[name] ||
            ((didWarnForNewBooleanPropsWithEmptyValue[name] = !0),
            console.error(
              "Received an empty string for a boolean attribute `%s`. This will treat the attribute as if it were false. Either pass `false` to silence this warning, or pass `true` if you used an empty string in earlier versions of React to indicate this attribute is true.",
              name
            ));
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
            target.push(attributeSeparator, name, attributeEmptyString);
          break;
        case "capture":
        case "download":
          !0 === value
            ? target.push(attributeSeparator, name, attributeEmptyString)
            : !1 !== value &&
              "function" !== typeof value &&
              "symbol" !== typeof value &&
              target.push(
                attributeSeparator,
                name,
                attributeAssign,
                escapeTextForBrowser(value),
                attributeEnd
              );
          break;
        case "cols":
        case "rows":
        case "size":
        case "span":
          "function" !== typeof value &&
            "symbol" !== typeof value &&
            !isNaN(value) &&
            1 <= value &&
            target.push(
              attributeSeparator,
              name,
              attributeAssign,
              escapeTextForBrowser(value),
              attributeEnd
            );
          break;
        case "rowSpan":
        case "start":
          "function" === typeof value ||
            "symbol" === typeof value ||
            isNaN(value) ||
            target.push(
              attributeSeparator,
              name,
              attributeAssign,
              escapeTextForBrowser(value),
              attributeEnd
            );
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
            if (
              ((name = aliases.get(name) || name), isAttributeNameSafe(name))
            ) {
              switch (typeof value) {
                case "function":
                case "symbol":
                  return;
                case "boolean":
                  var prefix = name.toLowerCase().slice(0, 5);
                  if ("data-" !== prefix && "aria-" !== prefix) return;
              }
              target.push(
                attributeSeparator,
                name,
                attributeAssign,
                escapeTextForBrowser(value),
                attributeEnd
              );
            }
      }
    }
    function pushInnerHTML(target, innerHTML, children) {
      if (null != innerHTML) {
        if (null != children)
          throw Error(
            "Can only set one of `children` or `props.dangerouslySetInnerHTML`."
          );
        if ("object" !== typeof innerHTML || !("__html" in innerHTML))
          throw Error(
            "`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://react.dev/link/dangerously-set-inner-html for more information."
          );
        innerHTML = innerHTML.__html;
        null !== innerHTML &&
          void 0 !== innerHTML &&
          (checkHtmlStringCoercion(innerHTML), target.push("" + innerHTML));
      }
    }
    function checkSelectProp(props, propName) {
      var value = props[propName];
      null != value &&
        ((value = isArrayImpl(value)),
        props.multiple && !value
          ? console.error(
              "The `%s` prop supplied to <select> must be an array if `multiple` is true.",
              propName
            )
          : !props.multiple &&
            value &&
            console.error(
              "The `%s` prop supplied to <select> must be a scalar value if `multiple` is false.",
              propName
            ));
    }
    function flattenOptionChildren(children) {
      var content = "";
      React.Children.forEach(children, function (child) {
        null != child &&
          ((content += child),
          didWarnInvalidOptionChildren ||
            "string" === typeof child ||
            "number" === typeof child ||
            "bigint" === typeof child ||
            ((didWarnInvalidOptionChildren = !0),
            console.error(
              "Cannot infer the option value of complex children. Pass a `value` prop or use a plain string as children to <option>."
            )));
      });
      return content;
    }
    function injectFormReplayingRuntime(resumableState, renderState) {
      if (
        (resumableState.instructions & 16) === NothingSent &&
        !renderState.externalRuntimeScript
      ) {
        resumableState.instructions |= 16;
        var preamble = renderState.preamble,
          bootstrapChunks = renderState.bootstrapChunks;
        (preamble.htmlChunks || preamble.headChunks) &&
        0 === bootstrapChunks.length
          ? (bootstrapChunks.push(renderState.startInlineScript),
            pushCompletedShellIdAttribute(bootstrapChunks, resumableState),
            bootstrapChunks.push(
              endOfStartTag,
              formReplayingRuntimeScript,
              endInlineScript
            ))
          : bootstrapChunks.unshift(
              renderState.startInlineScript,
              endOfStartTag,
              formReplayingRuntimeScript,
              endInlineScript
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
                throw Error(
                  "link is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`."
                );
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(endOfStartTagSelfClosing);
      return null;
    }
    function escapeStyleTextContent(styleText) {
      checkHtmlStringCoercion(styleText);
      return ("" + styleText).replace(styleRegex, styleReplacer);
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
                throw Error(
                  tag +
                    " is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`."
                );
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      pushViewTransitionAttributes(target, formatContext);
      target.push(endOfStartTagSelfClosing);
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
      target.push(endOfStartTag);
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
      target.push(endOfStartTag);
      null != children &&
        "string" !== typeof children &&
        ((props =
          "number" === typeof children
            ? "a number for children"
            : Array.isArray(children)
              ? "an array for children"
              : "something unexpected for children"),
        console.error(
          "A script element was rendered with %s. If script element has children it must be a single string. Consider using dangerouslySetInnerHTML or passing a plain string as children.",
          props
        ));
      pushInnerHTML(target, innerHTML, children);
      "string" === typeof children &&
        target.push(escapeEntireInlineScriptContent(children));
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
      target.push(endOfStartTag);
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
      target.push(endOfStartTag);
      pushInnerHTML(target, innerHTML, tag);
      return "string" === typeof tag
        ? (target.push(escapeTextForBrowser(tag)), null)
        : tag;
    }
    function startChunkForTag(tag) {
      var tagStartChunk = validatedTagCache.get(tag);
      if (void 0 === tagStartChunk) {
        if (!VALID_TAG_REGEX.test(tag)) throw Error("Invalid tag: " + tag);
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
      validateProperties$2(type, props);
      ("input" !== type && "textarea" !== type && "select" !== type) ||
        null == props ||
        null !== props.value ||
        didWarnValueNull ||
        ((didWarnValueNull = !0),
        "select" === type && props.multiple
          ? console.error(
              "`value` prop on `%s` should not be null. Consider using an empty array when `multiple` is set to `true` to clear the component or `undefined` for uncontrolled components.",
              type
            )
          : console.error(
              "`value` prop on `%s` should not be null. Consider using an empty string to clear the component or `undefined` for uncontrolled components.",
              type
            ));
      b: if (-1 === type.indexOf("-")) var JSCompiler_inline_result = !1;
      else
        switch (type) {
          case "annotation-xml":
          case "color-profile":
          case "font-face":
          case "font-face-src":
          case "font-face-uri":
          case "font-face-format":
          case "font-face-name":
          case "missing-glyph":
            JSCompiler_inline_result = !1;
            break b;
          default:
            JSCompiler_inline_result = !0;
        }
      JSCompiler_inline_result ||
        "string" === typeof props.is ||
        warnUnknownProperties(type, props, null);
      !props.suppressContentEditableWarning &&
        props.contentEditable &&
        null != props.children &&
        console.error(
          "A component is `contentEditable` and contains `children` managed by React. It is now your responsibility to guarantee that none of those nodes are unexpectedly modified or duplicated. This is probably not intentional."
        );
      formatContext.insertionMode !== SVG_MODE &&
        formatContext.insertionMode !== MATHML_MODE &&
        -1 === type.indexOf("-") &&
        type.toLowerCase() !== type &&
        console.error(
          "<%s /> is using incorrect casing. Use PascalCase for React components, or lowercase for HTML elements.",
          type
        );
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
          target$jscomp$0.push(endOfStartTag);
          pushInnerHTML(target$jscomp$0, innerHTML, children);
          if ("string" === typeof children) {
            target$jscomp$0.push(escapeTextForBrowser(children));
            var JSCompiler_inline_result$jscomp$0 = null;
          } else JSCompiler_inline_result$jscomp$0 = children;
          return JSCompiler_inline_result$jscomp$0;
        case "g":
        case "p":
        case "li":
          break;
        case "select":
          checkControlledValueProps("select", props);
          checkSelectProp(props, "value");
          checkSelectProp(props, "defaultValue");
          void 0 === props.value ||
            void 0 === props.defaultValue ||
            didWarnDefaultSelectValue ||
            (console.error(
              "Select elements must be either controlled or uncontrolled (specify either the value prop, or the defaultValue prop, but not both). Decide between using a controlled or uncontrolled select element and remove one of these props. More info: https://react.dev/link/controlled-components"
            ),
            (didWarnDefaultSelectValue = !0));
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
          target$jscomp$0.push(endOfStartTag);
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
                    didWarnSelectedSetOnOption ||
                      (console.error(
                        "Use the `defaultValue` or `value` props on <select> instead of setting `selected` on <option>."
                      ),
                      (didWarnSelectedSetOnOption = !0));
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
            if (null !== value) {
              checkAttributeStringCoercion(value, "value");
              var stringValue = "" + value;
            } else
              null === innerHTML$jscomp$1 ||
                didWarnInvalidOptionInnerHTML ||
                ((didWarnInvalidOptionInnerHTML = !0),
                console.error(
                  "Pass a `value` prop if you set dangerouslyInnerHTML so React knows which value should be selected."
                )),
                (stringValue = flattenOptionChildren(children$jscomp$1));
            if (isArrayImpl(selectedValue))
              for (var i = 0; i < selectedValue.length; i++) {
                if (
                  (checkAttributeStringCoercion(selectedValue[i], "value"),
                  "" + selectedValue[i] === stringValue)
                ) {
                  target$jscomp$0.push(' selected=""');
                  break;
                }
              }
            else
              checkAttributeStringCoercion(selectedValue, "select.value"),
                "" + selectedValue === stringValue &&
                  target$jscomp$0.push(' selected=""');
          } else selected && target$jscomp$0.push(' selected=""');
          target$jscomp$0.push(endOfStartTag);
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$1, children$jscomp$1);
          return children$jscomp$1;
        case "textarea":
          checkControlledValueProps("textarea", props);
          void 0 === props.value ||
            void 0 === props.defaultValue ||
            didWarnDefaultTextareaValue ||
            (console.error(
              "Textarea elements must be either controlled or uncontrolled (specify either the value prop, or the defaultValue prop, but not both). Decide between using a controlled or uncontrolled textarea and remove one of these props. More info: https://react.dev/link/controlled-components"
            ),
            (didWarnDefaultTextareaValue = !0));
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
                    throw Error(
                      "`dangerouslySetInnerHTML` does not make sense on <textarea>."
                    );
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
          target$jscomp$0.push(endOfStartTag);
          if (null != children$jscomp$2) {
            console.error(
              "Use the `defaultValue` or `value` props instead of setting children on <textarea>."
            );
            if (null != value$jscomp$0)
              throw Error(
                "If you supply `defaultValue` on a <textarea>, do not pass children."
              );
            if (isArrayImpl(children$jscomp$2)) {
              if (1 < children$jscomp$2.length)
                throw Error("<textarea> can only have at most one child.");
              checkHtmlStringCoercion(children$jscomp$2[0]);
              value$jscomp$0 = "" + children$jscomp$2[0];
            }
            checkHtmlStringCoercion(children$jscomp$2);
            value$jscomp$0 = "" + children$jscomp$2;
          }
          "string" === typeof value$jscomp$0 &&
            "\n" === value$jscomp$0[0] &&
            target$jscomp$0.push(leadingNewline);
          null !== value$jscomp$0 &&
            (checkAttributeStringCoercion(value$jscomp$0, "value"),
            target$jscomp$0.push(escapeTextForBrowser("" + value$jscomp$0)));
          return null;
        case "input":
          checkControlledValueProps("input", props);
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
                    throw Error(
                      "input is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`."
                    );
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
          null === formAction ||
            "image" === props.type ||
            "submit" === props.type ||
            didWarnFormActionType ||
            ((didWarnFormActionType = !0),
            console.error(
              'An input can only specify a formAction along with type="submit" or type="image".'
            ));
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
          null === checked ||
            null === defaultChecked ||
            didWarnDefaultChecked ||
            (console.error(
              "%s contains an input of type %s with both checked and defaultChecked props. Input elements must be either controlled or uncontrolled (specify either the checked prop, or the defaultChecked prop, but not both). Decide between using a controlled or uncontrolled input element and remove one of these props. More info: https://react.dev/link/controlled-components",
              "A component",
              props.type
            ),
            (didWarnDefaultChecked = !0));
          null === value$jscomp$1 ||
            null === defaultValue$jscomp$0 ||
            didWarnDefaultInputValue ||
            (console.error(
              "%s contains an input of type %s with both value and defaultValue props. Input elements must be either controlled or uncontrolled (specify either the value prop, or the defaultValue prop, but not both). Decide between using a controlled or uncontrolled input element and remove one of these props. More info: https://react.dev/link/controlled-components",
              "A component",
              props.type
            ),
            (didWarnDefaultInputValue = !0));
          null !== checked
            ? pushBooleanAttribute(target$jscomp$0, "checked", checked)
            : null !== defaultChecked &&
              pushBooleanAttribute(target$jscomp$0, "checked", defaultChecked);
          null !== value$jscomp$1
            ? pushAttribute(target$jscomp$0, "value", value$jscomp$1)
            : null !== defaultValue$jscomp$0 &&
              pushAttribute(target$jscomp$0, "value", defaultValue$jscomp$0);
          pushViewTransitionAttributes(target$jscomp$0, formatContext);
          target$jscomp$0.push(endOfStartTagSelfClosing);
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
          null === formAction$jscomp$0 ||
            null == props.type ||
            "submit" === props.type ||
            didWarnFormActionType ||
            ((didWarnFormActionType = !0),
            console.error(
              'A button can only specify a formAction along with type="submit" or no type.'
            ));
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
          target$jscomp$0.push(endOfStartTag);
          null != formData$jscomp$0 &&
            formData$jscomp$0.forEach(pushAdditionalFormField, target$jscomp$0);
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$2, children$jscomp$3);
          if ("string" === typeof children$jscomp$3) {
            target$jscomp$0.push(escapeTextForBrowser(children$jscomp$3));
            var JSCompiler_inline_result$jscomp$1 = null;
          } else JSCompiler_inline_result$jscomp$1 = children$jscomp$3;
          return JSCompiler_inline_result$jscomp$1;
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
            (null === formEncType$jscomp$1 && null === formMethod$jscomp$1) ||
              didWarnFormActionMethod ||
              ((didWarnFormActionMethod = !0),
              console.error(
                "Cannot specify a encType or method for a form that specifies a function as the action. React provides those automatically. They will get overridden."
              ));
            null === formTarget$jscomp$1 ||
              didWarnFormActionTarget ||
              ((didWarnFormActionTarget = !0),
              console.error(
                "Cannot specify a target for a form that specifies a function as the action. The function will always be executed in the same window."
              ));
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
                  attributeSeparator,
                  "action",
                  attributeAssign,
                  actionJavaScriptURL,
                  attributeEnd
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
          target$jscomp$0.push(endOfStartTag);
          null !== formActionName &&
            (target$jscomp$0.push('<input type="hidden"'),
            pushStringAttribute(target$jscomp$0, "name", formActionName),
            target$jscomp$0.push(endOfStartTagSelfClosing),
            null != formData$jscomp$1 &&
              formData$jscomp$1.forEach(
                pushAdditionalFormField,
                target$jscomp$0
              ));
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$3, children$jscomp$4);
          if ("string" === typeof children$jscomp$4) {
            target$jscomp$0.push(escapeTextForBrowser(children$jscomp$4));
            var JSCompiler_inline_result$jscomp$2 = null;
          } else JSCompiler_inline_result$jscomp$2 = children$jscomp$4;
          return JSCompiler_inline_result$jscomp$2;
        case "menuitem":
          target$jscomp$0.push(startChunkForTag("menuitem"));
          for (var propKey$jscomp$6 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$6)) {
              var propValue$jscomp$6 = props[propKey$jscomp$6];
              if (null != propValue$jscomp$6)
                switch (propKey$jscomp$6) {
                  case "children":
                  case "dangerouslySetInnerHTML":
                    throw Error(
                      "menuitems cannot have `children` nor `dangerouslySetInnerHTML`."
                    );
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$6,
                      propValue$jscomp$6
                    );
                }
            }
          pushViewTransitionAttributes(target$jscomp$0, formatContext);
          target$jscomp$0.push(endOfStartTag);
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
                    checkAttributeStringCoercion(propValue$jscomp$7, "data");
                    var sanitizedValue = sanitizeURL("" + propValue$jscomp$7);
                    if ("" === sanitizedValue) {
                      console.error(
                        'An empty string ("") was passed to the %s attribute. To fix this, either do not render the element at all or pass null to %s instead of an empty string.',
                        propKey$jscomp$7,
                        propKey$jscomp$7
                      );
                      break;
                    }
                    target$jscomp$0.push(
                      attributeSeparator,
                      "data",
                      attributeAssign,
                      escapeTextForBrowser(sanitizedValue),
                      attributeEnd
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
          target$jscomp$0.push(endOfStartTag);
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$4, children$jscomp$5);
          if ("string" === typeof children$jscomp$5) {
            target$jscomp$0.push(escapeTextForBrowser(children$jscomp$5));
            var JSCompiler_inline_result$jscomp$3 = null;
          } else JSCompiler_inline_result$jscomp$3 = children$jscomp$5;
          return JSCompiler_inline_result$jscomp$3;
        case "title":
          var noscriptTagInScope = formatContext.tagScope & 1,
            isFallback = formatContext.tagScope & 4;
          if (hasOwnProperty.call(props, "children")) {
            var children$jscomp$6 = props.children,
              child = Array.isArray(children$jscomp$6)
                ? 2 > children$jscomp$6.length
                  ? children$jscomp$6[0]
                  : null
                : children$jscomp$6;
            Array.isArray(children$jscomp$6) && 1 < children$jscomp$6.length
              ? console.error(
                  "React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an Array with length %s instead. Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert `children` of <title> tags to a single string value which is why Arrays of length greater than 1 are not supported. When using JSX it can be common to combine text nodes and value nodes. For example: <title>hello {nameOfUser}</title>. While not immediately apparent, `children` in this case is an Array with length 2. If your `children` prop is using this form try rewriting it using a template string: <title>{`hello ${nameOfUser}`}</title>.",
                  children$jscomp$6.length
                )
              : "function" === typeof child || "symbol" === typeof child
                ? console.error(
                    "React expect children of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found %s instead. Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert children of <title> tags to a single string value.",
                    "function" === typeof child ? "a Function" : "a Sybmol"
                  )
                : child &&
                  child.toString === {}.toString &&
                  (null != child.$$typeof
                    ? console.error(
                        "React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an object that appears to be a React element which never implements a suitable `toString` method. Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert children of <title> tags to a single string value which is why rendering React elements is not supported. If the `children` of <title> is a React Component try moving the <title> tag into that component. If the `children` of <title> is some HTML markup change it to be Text only to be valid HTML."
                      )
                    : console.error(
                        "React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an object that does not implement a suitable `toString` method. Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert children of <title> tags to a single string value. Using the default `toString` method available on every object is almost certainly an error. Consider whether the `children` of this <title> is an object in error and change it to a string or number value if so. Otherwise implement a `toString` method that React can use to produce a valid <title>."
                      ));
          }
          if (
            formatContext.insertionMode === SVG_MODE ||
            noscriptTagInScope ||
            null != props.itemProp
          )
            var JSCompiler_inline_result$jscomp$4 = pushTitleImpl(
              target$jscomp$0,
              props
            );
          else
            isFallback
              ? (JSCompiler_inline_result$jscomp$4 = null)
              : (pushTitleImpl(renderState.hoistableChunks, props),
                (JSCompiler_inline_result$jscomp$4 = void 0));
          return JSCompiler_inline_result$jscomp$4;
        case "link":
          var noscriptTagInScope$jscomp$0 = formatContext.tagScope & 1,
            isFallback$jscomp$0 = formatContext.tagScope & 4,
            rel = props.rel,
            href = props.href,
            precedence = props.precedence;
          if (
            formatContext.insertionMode === SVG_MODE ||
            noscriptTagInScope$jscomp$0 ||
            null != props.itemProp ||
            "string" !== typeof rel ||
            "string" !== typeof href ||
            "" === href
          ) {
            "stylesheet" === rel &&
              "string" === typeof props.precedence &&
              (("string" === typeof href && href) ||
                console.error(
                  'React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and expected the `href` prop to be a non-empty string but ecountered %s instead. If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` prop ensure there is a non-empty string `href` prop as well, otherwise remove the `precedence` prop.',
                  null === href
                    ? "`null`"
                    : void 0 === href
                      ? "`undefined`"
                      : "" === href
                        ? "an empty string"
                        : 'something with type "' + typeof href + '"'
                ));
            pushLinkImpl(target$jscomp$0, props);
            var JSCompiler_inline_result$jscomp$5 = null;
          } else if ("stylesheet" === props.rel)
            if (
              "string" !== typeof precedence ||
              null != props.disabled ||
              props.onLoad ||
              props.onError
            ) {
              if ("string" === typeof precedence)
                if (null != props.disabled)
                  console.error(
                    'React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and a `disabled` prop. The presence of the `disabled` prop indicates an intent to manage the stylesheet active state from your from your Component code and React will not hoist or deduplicate this stylesheet. If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` prop remove the `disabled` prop, otherwise remove the `precedence` prop.'
                  );
                else if (props.onLoad || props.onError) {
                  var propDescription =
                    props.onLoad && props.onError
                      ? "`onLoad` and `onError` props"
                      : props.onLoad
                        ? "`onLoad` prop"
                        : "`onError` prop";
                  console.error(
                    'React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and %s. The presence of loading and error handlers indicates an intent to manage the stylesheet loading state from your from your Component code and React will not hoist or deduplicate this stylesheet. If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` prop remove the %s, otherwise remove the `precedence` prop.',
                    propDescription,
                    propDescription
                  );
                }
              JSCompiler_inline_result$jscomp$5 = pushLinkImpl(
                target$jscomp$0,
                props
              );
            } else {
              var styleQueue = renderState.styles.get(precedence),
                resourceState = resumableState.styleResources.hasOwnProperty(
                  href
                )
                  ? resumableState.styleResources[href]
                  : void 0;
              if (resourceState !== EXISTS) {
                resumableState.styleResources[href] = EXISTS;
                styleQueue ||
                  ((styleQueue = {
                    precedence: escapeTextForBrowser(precedence),
                    rules: [],
                    hrefs: [],
                    sheets: new Map()
                  }),
                  renderState.styles.set(precedence, styleQueue));
                var resource = {
                  state: PENDING$1,
                  props: assign({}, props, {
                    "data-precedence": props.precedence,
                    precedence: null
                  })
                };
                if (resourceState) {
                  2 === resourceState.length &&
                    adoptPreloadCredentials(resource.props, resourceState);
                  var preloadResource =
                    renderState.preloads.stylesheets.get(href);
                  preloadResource && 0 < preloadResource.length
                    ? (preloadResource.length = 0)
                    : (resource.state = PRELOADED);
                }
                styleQueue.sheets.set(href, resource);
                hoistableState && hoistableState.stylesheets.add(resource);
              } else if (styleQueue) {
                var _resource = styleQueue.sheets.get(href);
                _resource &&
                  hoistableState &&
                  hoistableState.stylesheets.add(_resource);
              }
              textEmbedded && target$jscomp$0.push("\x3c!-- --\x3e");
              JSCompiler_inline_result$jscomp$5 = null;
            }
          else
            props.onLoad || props.onError
              ? (JSCompiler_inline_result$jscomp$5 = pushLinkImpl(
                  target$jscomp$0,
                  props
                ))
              : (textEmbedded && target$jscomp$0.push("\x3c!-- --\x3e"),
                (JSCompiler_inline_result$jscomp$5 = isFallback$jscomp$0
                  ? null
                  : pushLinkImpl(renderState.hoistableChunks, props)));
          return JSCompiler_inline_result$jscomp$5;
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
            formatContext.insertionMode === SVG_MODE ||
            noscriptTagInScope$jscomp$1 ||
            null != props.itemProp
          )
            var JSCompiler_inline_result$jscomp$6 = pushScriptImpl(
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
            if (resourceState$jscomp$0 !== EXISTS) {
              resources[key] = EXISTS;
              var scriptProps = props;
              if (resourceState$jscomp$0) {
                2 === resourceState$jscomp$0.length &&
                  ((scriptProps = assign({}, props)),
                  adoptPreloadCredentials(scriptProps, resourceState$jscomp$0));
                var preloadResource$jscomp$0 = preloads.get(key);
                preloadResource$jscomp$0 &&
                  (preloadResource$jscomp$0.length = 0);
              }
              var resource$jscomp$0 = [];
              renderState.scripts.add(resource$jscomp$0);
              pushScriptImpl(resource$jscomp$0, scriptProps);
            }
            textEmbedded && target$jscomp$0.push("\x3c!-- --\x3e");
            JSCompiler_inline_result$jscomp$6 = null;
          }
          return JSCompiler_inline_result$jscomp$6;
        case "style":
          var noscriptTagInScope$jscomp$2 = formatContext.tagScope & 1;
          if (hasOwnProperty.call(props, "children")) {
            var children$jscomp$7 = props.children,
              child$jscomp$0 = Array.isArray(children$jscomp$7)
                ? 2 > children$jscomp$7.length
                  ? children$jscomp$7[0]
                  : null
                : children$jscomp$7;
            ("function" === typeof child$jscomp$0 ||
              "symbol" === typeof child$jscomp$0 ||
              Array.isArray(child$jscomp$0)) &&
              console.error(
                "React expect children of <style> tags to be a string, number, or object with a `toString` method but found %s instead. In browsers style Elements can only have `Text` Nodes as children.",
                "function" === typeof child$jscomp$0
                  ? "a Function"
                  : "symbol" === typeof child$jscomp$0
                    ? "a Sybmol"
                    : "an Array"
              );
          }
          var precedence$jscomp$0 = props.precedence,
            href$jscomp$0 = props.href,
            nonce = props.nonce;
          if (
            formatContext.insertionMode === SVG_MODE ||
            noscriptTagInScope$jscomp$2 ||
            null != props.itemProp ||
            "string" !== typeof precedence$jscomp$0 ||
            "string" !== typeof href$jscomp$0 ||
            "" === href$jscomp$0
          ) {
            target$jscomp$0.push(startChunkForTag("style"));
            var children$jscomp$8 = null,
              innerHTML$jscomp$5 = null,
              propKey$jscomp$8;
            for (propKey$jscomp$8 in props)
              if (hasOwnProperty.call(props, propKey$jscomp$8)) {
                var propValue$jscomp$8 = props[propKey$jscomp$8];
                if (null != propValue$jscomp$8)
                  switch (propKey$jscomp$8) {
                    case "children":
                      children$jscomp$8 = propValue$jscomp$8;
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
            target$jscomp$0.push(endOfStartTag);
            var child$jscomp$1 = Array.isArray(children$jscomp$8)
              ? 2 > children$jscomp$8.length
                ? children$jscomp$8[0]
                : null
              : children$jscomp$8;
            "function" !== typeof child$jscomp$1 &&
              "symbol" !== typeof child$jscomp$1 &&
              null !== child$jscomp$1 &&
              void 0 !== child$jscomp$1 &&
              target$jscomp$0.push(escapeStyleTextContent(child$jscomp$1));
            pushInnerHTML(
              target$jscomp$0,
              innerHTML$jscomp$5,
              children$jscomp$8
            );
            target$jscomp$0.push(endChunkForTag("style"));
            var JSCompiler_inline_result$jscomp$7 = null;
          } else {
            href$jscomp$0.includes(" ") &&
              console.error(
                'React expected the `href` prop for a <style> tag opting into hoisting semantics using the `precedence` prop to not have any spaces but ecountered spaces instead. using spaces in this prop will cause hydration of this style to fail on the client. The href for the <style> where this ocurred is "%s".',
                href$jscomp$0
              );
            var styleQueue$jscomp$0 =
                renderState.styles.get(precedence$jscomp$0),
              resourceState$jscomp$1 =
                resumableState.styleResources.hasOwnProperty(href$jscomp$0)
                  ? resumableState.styleResources[href$jscomp$0]
                  : void 0;
            if (resourceState$jscomp$1 !== EXISTS) {
              resumableState.styleResources[href$jscomp$0] = EXISTS;
              resourceState$jscomp$1 &&
                console.error(
                  'React encountered a hoistable style tag for the same href as a preload: "%s". When using a style tag to inline styles you should not also preload it as a stylsheet.',
                  href$jscomp$0
                );
              styleQueue$jscomp$0 ||
                ((styleQueue$jscomp$0 = {
                  precedence: escapeTextForBrowser(precedence$jscomp$0),
                  rules: [],
                  hrefs: [],
                  sheets: new Map()
                }),
                renderState.styles.set(
                  precedence$jscomp$0,
                  styleQueue$jscomp$0
                ));
              var nonceStyle = renderState.nonce.style;
              if (nonceStyle && nonceStyle !== nonce)
                console.error(
                  'React encountered a style tag with `precedence` "%s" and `nonce` "%s". When React manages style rules using `precedence` it will only include rules if the nonce matches the style nonce "%s" that was included with this render.',
                  precedence$jscomp$0,
                  nonce,
                  nonceStyle
                );
              else {
                !nonceStyle &&
                  nonce &&
                  console.error(
                    'React encountered a style tag with `precedence` "%s" and `nonce` "%s". When React manages style rules using `precedence` it will only include a nonce attributes if you also provide the same style nonce value as a render option.',
                    precedence$jscomp$0,
                    nonce
                  );
                styleQueue$jscomp$0.hrefs.push(
                  escapeTextForBrowser(href$jscomp$0)
                );
                var target = styleQueue$jscomp$0.rules,
                  children$jscomp$9 = null,
                  innerHTML$jscomp$6 = null,
                  propKey$jscomp$9;
                for (propKey$jscomp$9 in props)
                  if (hasOwnProperty.call(props, propKey$jscomp$9)) {
                    var propValue$jscomp$9 = props[propKey$jscomp$9];
                    if (null != propValue$jscomp$9)
                      switch (propKey$jscomp$9) {
                        case "children":
                          children$jscomp$9 = propValue$jscomp$9;
                          break;
                        case "dangerouslySetInnerHTML":
                          innerHTML$jscomp$6 = propValue$jscomp$9;
                      }
                  }
                var child$jscomp$2 = Array.isArray(children$jscomp$9)
                  ? 2 > children$jscomp$9.length
                    ? children$jscomp$9[0]
                    : null
                  : children$jscomp$9;
                "function" !== typeof child$jscomp$2 &&
                  "symbol" !== typeof child$jscomp$2 &&
                  null !== child$jscomp$2 &&
                  void 0 !== child$jscomp$2 &&
                  target.push(escapeStyleTextContent(child$jscomp$2));
                pushInnerHTML(target, innerHTML$jscomp$6, children$jscomp$9);
              }
            }
            styleQueue$jscomp$0 &&
              hoistableState &&
              hoistableState.styles.add(styleQueue$jscomp$0);
            textEmbedded && target$jscomp$0.push("\x3c!-- --\x3e");
            JSCompiler_inline_result$jscomp$7 = void 0;
          }
          return JSCompiler_inline_result$jscomp$7;
        case "meta":
          var noscriptTagInScope$jscomp$3 = formatContext.tagScope & 1,
            isFallback$jscomp$1 = formatContext.tagScope & 4;
          if (
            formatContext.insertionMode === SVG_MODE ||
            noscriptTagInScope$jscomp$3 ||
            null != props.itemProp
          )
            var JSCompiler_inline_result$jscomp$8 = pushSelfClosing(
              target$jscomp$0,
              props,
              "meta",
              formatContext
            );
          else
            textEmbedded && target$jscomp$0.push("\x3c!-- --\x3e"),
              (JSCompiler_inline_result$jscomp$8 = isFallback$jscomp$1
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
          return JSCompiler_inline_result$jscomp$8;
        case "listing":
        case "pre":
          target$jscomp$0.push(startChunkForTag(type));
          var children$jscomp$10 = null,
            innerHTML$jscomp$7 = null,
            propKey$jscomp$10;
          for (propKey$jscomp$10 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$10)) {
              var propValue$jscomp$10 = props[propKey$jscomp$10];
              if (null != propValue$jscomp$10)
                switch (propKey$jscomp$10) {
                  case "children":
                    children$jscomp$10 = propValue$jscomp$10;
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
          target$jscomp$0.push(endOfStartTag);
          if (null != innerHTML$jscomp$7) {
            if (null != children$jscomp$10)
              throw Error(
                "Can only set one of `children` or `props.dangerouslySetInnerHTML`."
              );
            if (
              "object" !== typeof innerHTML$jscomp$7 ||
              !("__html" in innerHTML$jscomp$7)
            )
              throw Error(
                "`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://react.dev/link/dangerously-set-inner-html for more information."
              );
            var html = innerHTML$jscomp$7.__html;
            null !== html &&
              void 0 !== html &&
              ("string" === typeof html && 0 < html.length && "\n" === html[0]
                ? target$jscomp$0.push(leadingNewline, html)
                : (checkHtmlStringCoercion(html),
                  target$jscomp$0.push("" + html)));
          }
          "string" === typeof children$jscomp$10 &&
            "\n" === children$jscomp$10[0] &&
            target$jscomp$0.push(leadingNewline);
          return children$jscomp$10;
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
              var crossOrigin =
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
                crossOrigin: crossOrigin,
                integrity: props.integrity,
                nonce: props.nonce,
                type: props.type,
                fetchPriority: props.fetchPriority,
                referrerPolicy: props.referrerPolicy
              })),
              0 <= (headers.remainingCapacity -= header.length + 2))
                ? ((renderState.resets.image[key$jscomp$0] = PRELOAD_NO_CREDS),
                  headers.highImagePreloads &&
                    (headers.highImagePreloads += ", "),
                  (headers.highImagePreloads += header))
                : ((resource$jscomp$1 = []),
                  pushLinkImpl(resource$jscomp$1, {
                    rel: "preload",
                    as: "image",
                    href: srcSet ? void 0 : src,
                    imageSrcSet: srcSet,
                    imageSizes: sizes,
                    crossOrigin: crossOrigin,
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
          if (formatContext.insertionMode < HTML_MODE) {
            var preamble = preambleState || renderState.preamble;
            if (preamble.headChunks)
              throw Error("The `<head>` tag may only be rendered once.");
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
          if (formatContext.insertionMode < HTML_MODE) {
            var preamble$jscomp$0 = preambleState || renderState.preamble;
            if (preamble$jscomp$0.bodyChunks)
              throw Error("The `<body>` tag may only be rendered once.");
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
          if (formatContext.insertionMode === ROOT_HTML_MODE) {
            var preamble$jscomp$1 = preambleState || renderState.preamble;
            if (preamble$jscomp$1.htmlChunks)
              throw Error("The `<html>` tag may only be rendered once.");
            null !== preambleState && target$jscomp$0.push("\x3c!--html--\x3e");
            preamble$jscomp$1.htmlChunks = [doctypeChunk];
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
            var children$jscomp$11 = null,
              innerHTML$jscomp$8 = null,
              propKey$jscomp$11;
            for (propKey$jscomp$11 in props)
              if (hasOwnProperty.call(props, propKey$jscomp$11)) {
                var propValue$jscomp$11 = props[propKey$jscomp$11];
                if (null != propValue$jscomp$11) {
                  var attributeName = propKey$jscomp$11;
                  switch (propKey$jscomp$11) {
                    case "children":
                      children$jscomp$11 = propValue$jscomp$11;
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
                        if (!0 === propValue$jscomp$11)
                          propValue$jscomp$11 = "";
                        else if ("object" === typeof propValue$jscomp$11)
                          continue;
                        target$jscomp$0.push(
                          attributeSeparator,
                          attributeName,
                          attributeAssign,
                          escapeTextForBrowser(propValue$jscomp$11),
                          attributeEnd
                        );
                      }
                  }
                }
              }
            pushViewTransitionAttributes(target$jscomp$0, formatContext);
            target$jscomp$0.push(endOfStartTag);
            pushInnerHTML(
              target$jscomp$0,
              innerHTML$jscomp$8,
              children$jscomp$11
            );
            return children$jscomp$11;
          }
      }
      return pushStartGenericElement(
        target$jscomp$0,
        props,
        type,
        formatContext
      );
    }
    function endChunkForTag(tag) {
      var chunk = endTagCache.get(tag);
      void 0 === chunk &&
        ((chunk = "</" + tag + ">"), endTagCache.set(tag, chunk));
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
      destination.push(startPendingSuspenseBoundary1);
      if (null === id)
        throw Error(
          "An ID must have been assigned before we can complete the boundary."
        );
      destination.push(renderState.boundaryPrefix);
      renderState = id.toString(16);
      destination.push(renderState);
      return destination.push(startPendingSuspenseBoundary2);
    }
    function writeStartSegment(destination, renderState, formatContext, id) {
      switch (formatContext.insertionMode) {
        case ROOT_HTML_MODE:
        case HTML_HTML_MODE:
        case HTML_HEAD_MODE:
        case HTML_MODE:
          return (
            destination.push(startSegmentHTML),
            destination.push(renderState.segmentPrefix),
            (renderState = id.toString(16)),
            destination.push(renderState),
            destination.push(startSegmentHTML2)
          );
        case SVG_MODE:
          return (
            destination.push(startSegmentSVG),
            destination.push(renderState.segmentPrefix),
            (renderState = id.toString(16)),
            destination.push(renderState),
            destination.push(startSegmentSVG2)
          );
        case MATHML_MODE:
          return (
            destination.push(startSegmentMathML),
            destination.push(renderState.segmentPrefix),
            (renderState = id.toString(16)),
            destination.push(renderState),
            destination.push(startSegmentMathML2)
          );
        case HTML_TABLE_MODE:
          return (
            destination.push(startSegmentTable),
            destination.push(renderState.segmentPrefix),
            (renderState = id.toString(16)),
            destination.push(renderState),
            destination.push(startSegmentTable2)
          );
        case HTML_TABLE_BODY_MODE:
          return (
            destination.push(startSegmentTableBody),
            destination.push(renderState.segmentPrefix),
            (renderState = id.toString(16)),
            destination.push(renderState),
            destination.push(startSegmentTableBody2)
          );
        case HTML_TABLE_ROW_MODE:
          return (
            destination.push(startSegmentTableRow),
            destination.push(renderState.segmentPrefix),
            (renderState = id.toString(16)),
            destination.push(renderState),
            destination.push(startSegmentTableRow2)
          );
        case HTML_COLGROUP_MODE:
          return (
            destination.push(startSegmentColGroup),
            destination.push(renderState.segmentPrefix),
            (renderState = id.toString(16)),
            destination.push(renderState),
            destination.push(startSegmentColGroup2)
          );
        default:
          throw Error("Unknown insertion mode. This is a bug in React.");
      }
    }
    function writeEndSegment(destination, formatContext) {
      switch (formatContext.insertionMode) {
        case ROOT_HTML_MODE:
        case HTML_HTML_MODE:
        case HTML_HEAD_MODE:
        case HTML_MODE:
          return destination.push(endSegmentHTML);
        case SVG_MODE:
          return destination.push(endSegmentSVG);
        case MATHML_MODE:
          return destination.push(endSegmentMathML);
        case HTML_TABLE_MODE:
          return destination.push(endSegmentTable);
        case HTML_TABLE_BODY_MODE:
          return destination.push(endSegmentTableBody);
        case HTML_TABLE_ROW_MODE:
          return destination.push(endSegmentTableRow);
        case HTML_COLGROUP_MODE:
          return destination.push(endSegmentColGroup);
        default:
          throw Error("Unknown insertion mode. This is a bug in React.");
      }
    }
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
    function flushStyleTagsLateForBoundary(styleQueue) {
      var rules = styleQueue.rules,
        hrefs = styleQueue.hrefs;
      0 < rules.length &&
        0 === hrefs.length &&
        console.error(
          "React expected to have at least one href for an a hoistable style but found none. This is a bug in React."
        );
      var i = 0;
      if (hrefs.length) {
        this.push(currentlyFlushingRenderState.startInlineStyle);
        this.push(lateStyleTagResourceOpen1);
        this.push(styleQueue.precedence);
        for (this.push(lateStyleTagResourceOpen2); i < hrefs.length - 1; i++)
          this.push(hrefs[i]), this.push(spaceSeparator);
        this.push(hrefs[i]);
        this.push(lateStyleTagResourceOpen3);
        for (i = 0; i < rules.length; i++) this.push(rules[i]);
        destinationHasCapacity = this.push(lateStyleTagTemplateClose);
        currentlyRenderingBoundaryHasStylesToHoist = !0;
        rules.length = 0;
        hrefs.length = 0;
      }
    }
    function hasStylesToHoist(stylesheet) {
      return stylesheet.state !== PREAMBLE
        ? (currentlyRenderingBoundaryHasStylesToHoist = !0)
        : !1;
    }
    function writeHoistablesForBoundary(
      destination,
      hoistableState,
      renderState
    ) {
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
    function flushStyleInPreamble(stylesheet) {
      pushLinkImpl(stylesheetFlushingQueue, stylesheet.props);
      for (var i = 0; i < stylesheetFlushingQueue.length; i++)
        this.push(stylesheetFlushingQueue[i]);
      stylesheetFlushingQueue.length = 0;
      stylesheet.state = PREAMBLE;
    }
    function flushStylesInPreamble(styleQueue) {
      var hasStylesheets = 0 < styleQueue.sheets.size;
      styleQueue.sheets.forEach(flushStyleInPreamble, this);
      styleQueue.sheets.clear();
      var rules = styleQueue.rules,
        hrefs = styleQueue.hrefs;
      if (!hasStylesheets || hrefs.length) {
        this.push(currentlyFlushingRenderState.startInlineStyle);
        this.push(styleTagResourceOpen1);
        this.push(styleQueue.precedence);
        styleQueue = 0;
        if (hrefs.length) {
          for (
            this.push(styleTagResourceOpen2);
            styleQueue < hrefs.length - 1;
            styleQueue++
          )
            this.push(hrefs[styleQueue]), this.push(spaceSeparator);
          this.push(hrefs[styleQueue]);
        }
        this.push(styleTagResourceOpen3);
        for (styleQueue = 0; styleQueue < rules.length; styleQueue++)
          this.push(rules[styleQueue]);
        this.push(styleTagResourceClose);
        rules.length = 0;
        hrefs.length = 0;
      }
    }
    function preloadLateStyle(stylesheet) {
      if (stylesheet.state === PENDING$1) {
        stylesheet.state = PRELOADED;
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
      (resumableState.instructions & SentCompletedShellId) === NothingSent &&
        ((resumableState.instructions |= SentCompletedShellId),
        (resumableState = "_" + resumableState.idPrefix + "R_"),
        destination.push(completedShellIdAttributeStart),
        (resumableState = escapeTextForBrowser(resumableState)),
        destination.push(resumableState),
        destination.push(attributeEnd));
    }
    function pushCompletedShellIdAttribute(target, resumableState) {
      (resumableState.instructions & SentCompletedShellId) === NothingSent &&
        ((resumableState.instructions |= SentCompletedShellId),
        target.push(
          completedShellIdAttributeStart,
          escapeTextForBrowser("_" + resumableState.idPrefix + "R_"),
          attributeEnd
        ));
    }
    function writeStyleResourceDependenciesInJS(destination, hoistableState) {
      destination.push(arrayFirstOpenBracket);
      var nextArrayOpenBrackChunk = arrayFirstOpenBracket;
      hoistableState.stylesheets.forEach(function (resource) {
        if (resource.state !== PREAMBLE)
          if (resource.state === LATE)
            destination.push(nextArrayOpenBrackChunk),
              (resource = resource.props.href),
              checkAttributeStringCoercion(resource, "href"),
              (resource = escapeJSObjectForInstructionScripts("" + resource)),
              destination.push(resource),
              destination.push(arrayCloseBracket),
              (nextArrayOpenBrackChunk = arraySubsequentOpenBracket);
          else {
            destination.push(nextArrayOpenBrackChunk);
            var precedence = resource.props["data-precedence"],
              props = resource.props,
              coercedHref = sanitizeURL("" + resource.props.href);
            coercedHref = escapeJSObjectForInstructionScripts(coercedHref);
            destination.push(coercedHref);
            checkAttributeStringCoercion(precedence, "precedence");
            precedence = "" + precedence;
            destination.push(arrayInterstitial);
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
                    throw Error(
                      "link is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`."
                    );
                  default:
                    writeStyleResourceAttributeInJS(
                      destination,
                      propKey,
                      precedence
                    );
                }
            destination.push(arrayCloseBracket);
            nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
            resource.state = LATE;
          }
      });
      destination.push(arrayCloseBracket);
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
          checkAttributeStringCoercion(value, attributeName);
          name = "" + value;
          break;
        case "hidden":
          if (!1 === value) return;
          name = "";
          break;
        case "src":
        case "href":
          value = sanitizeURL(value);
          checkAttributeStringCoercion(value, attributeName);
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
          checkAttributeStringCoercion(value, attributeName);
          name = "" + value;
      }
      destination.push(arrayInterstitial);
      attributeName = escapeJSObjectForInstructionScripts(attributeName);
      destination.push(attributeName);
      destination.push(arrayInterstitial);
      attributeName = escapeJSObjectForInstructionScripts(name);
      destination.push(attributeName);
    }
    function writeStyleResourceDependenciesInAttr(destination, hoistableState) {
      destination.push(arrayFirstOpenBracket);
      var nextArrayOpenBrackChunk = arrayFirstOpenBracket;
      hoistableState.stylesheets.forEach(function (resource) {
        if (resource.state !== PREAMBLE)
          if (resource.state === LATE)
            destination.push(nextArrayOpenBrackChunk),
              (resource = resource.props.href),
              checkAttributeStringCoercion(resource, "href"),
              (resource = escapeTextForBrowser(JSON.stringify("" + resource))),
              destination.push(resource),
              destination.push(arrayCloseBracket),
              (nextArrayOpenBrackChunk = arraySubsequentOpenBracket);
          else {
            destination.push(nextArrayOpenBrackChunk);
            var precedence = resource.props["data-precedence"],
              props = resource.props,
              coercedHref = sanitizeURL("" + resource.props.href);
            coercedHref = escapeTextForBrowser(JSON.stringify(coercedHref));
            destination.push(coercedHref);
            checkAttributeStringCoercion(precedence, "precedence");
            precedence = "" + precedence;
            destination.push(arrayInterstitial);
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
                    throw Error(
                      "link is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`."
                    );
                  default:
                    writeStyleResourceAttributeInAttr(
                      destination,
                      propKey,
                      precedence
                    );
                }
            destination.push(arrayCloseBracket);
            nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
            resource.state = LATE;
          }
      });
      destination.push(arrayCloseBracket);
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
          checkAttributeStringCoercion(value, attributeName);
          name = "" + value;
          break;
        case "hidden":
          if (!1 === value) return;
          name = "";
          break;
        case "src":
        case "href":
          value = sanitizeURL(value);
          checkAttributeStringCoercion(value, attributeName);
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
          checkAttributeStringCoercion(value, attributeName);
          name = "" + value;
      }
      destination.push(arrayInterstitial);
      attributeName = escapeTextForBrowser(JSON.stringify(attributeName));
      destination.push(attributeName);
      destination.push(arrayInterstitial);
      attributeName = escapeTextForBrowser(JSON.stringify(name));
      destination.push(attributeName);
    }
    function createHoistableState() {
      return { styles: new Set(), stylesheets: new Set(), suspenseyImages: !1 };
    }
    function preloadBootstrapScriptOrModule(
      resumableState,
      renderState,
      href,
      props
    ) {
      (resumableState.scriptResources.hasOwnProperty(href) ||
        resumableState.moduleScriptResources.hasOwnProperty(href)) &&
        console.error(
          'Internal React Error: React expected bootstrap script or module with src "%s" to not have been preloaded already. please file an issue',
          href
        );
      resumableState.scriptResources[href] = EXISTS;
      resumableState.moduleScriptResources[href] = EXISTS;
      resumableState = [];
      pushLinkImpl(resumableState, props);
      renderState.bootstrapScripts.add(resumableState);
    }
    function adoptPreloadCredentials(target, preloadState) {
      null == target.crossOrigin && (target.crossOrigin = preloadState[0]);
      null == target.integrity && (target.integrity = preloadState[1]);
    }
    function getPreloadAsHeader(href, as, params) {
      href = escapeHrefForLinkHeaderURLContext(href);
      as = escapeStringForLinkHeaderQuotedParamValueContext(as, "as");
      as = "<" + href + '>; rel=preload; as="' + as + '"';
      for (var paramName in params)
        hasOwnProperty.call(params, paramName) &&
          ((href = params[paramName]),
          "string" === typeof href &&
            (as +=
              "; " +
              paramName.toLowerCase() +
              '="' +
              escapeStringForLinkHeaderQuotedParamValueContext(
                href,
                paramName
              ) +
              '"'));
      return as;
    }
    function escapeHrefForLinkHeaderURLContext(hrefInput) {
      checkAttributeStringCoercion(hrefInput, "href");
      return ("" + hrefInput).replace(
        regexForHrefInLinkHeaderURLContext,
        escapeHrefForLinkHeaderURLContextReplacer
      );
    }
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
    function escapeStringForLinkHeaderQuotedParamValueContext(value, name) {
      willCoercionThrow(value) &&
        (console.error(
          "The provided `%s` option is an unsupported type %s. This value must be coerced to a string before using it here.",
          name,
          typeName(value)
        ),
        testStringCoercion(value));
      return ("" + value).replace(
        regexForLinkHeaderQuotedParamValueContext,
        escapeStringForLinkHeaderQuotedParamValueContextReplacer
      );
    }
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
          endOfStartTag,
          escapeEntireInlineScriptContent(bootstrapScriptContent),
          endInlineScript
        ));
      idPrefix = {
        placeholderPrefix: idPrefix + "P:",
        segmentPrefix: idPrefix + "S:",
        boundaryPrefix: idPrefix + "B:",
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
        preconnects: new Set(),
        fontPreloads: new Set(),
        highImagePreloads: new Set(),
        styles: new Map(),
        bootstrapScripts: new Set(),
        scripts: new Set(),
        bulkPreloads: new Set(),
        preloads: {
          images: new Map(),
          stylesheets: new Map(),
          scripts: new Map(),
          moduleScripts: new Map()
        },
        nonce: { script: void 0, style: void 0 },
        hoistableState: null,
        stylesToHoist: !1
      };
      if (void 0 !== bootstrapScripts)
        for (
          bootstrapScriptContent = 0;
          bootstrapScriptContent < bootstrapScripts.length;
          bootstrapScriptContent++
        ) {
          var scriptConfig = bootstrapScripts[bootstrapScriptContent],
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
                "string" === typeof scriptConfig ||
                null == scriptConfig.crossOrigin
                  ? void 0
                  : "use-credentials" === scriptConfig.crossOrigin
                    ? "use-credentials"
                    : ""));
          preloadBootstrapScriptOrModule(resumableState, idPrefix, src, props);
          bootstrapChunks.push(
            '<script src="',
            escapeTextForBrowser(src),
            attributeEnd
          );
          "string" === typeof integrity &&
            bootstrapChunks.push(
              ' integrity="',
              escapeTextForBrowser(integrity),
              attributeEnd
            );
          "string" === typeof crossOrigin &&
            bootstrapChunks.push(
              ' crossorigin="',
              escapeTextForBrowser(crossOrigin),
              attributeEnd
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
          (bootstrapScriptContent = bootstrapModules[bootstrapScripts]),
            (crossOrigin = src = void 0),
            (integrity = {
              rel: "modulepreload",
              fetchPriority: "low",
              nonce: void 0
            }),
            "string" === typeof bootstrapScriptContent
              ? (integrity.href = scriptConfig = bootstrapScriptContent)
              : ((integrity.href = scriptConfig = bootstrapScriptContent.src),
                (integrity.integrity = crossOrigin =
                  "string" === typeof bootstrapScriptContent.integrity
                    ? bootstrapScriptContent.integrity
                    : void 0),
                (integrity.crossOrigin = src =
                  "string" === typeof bootstrapScriptContent ||
                  null == bootstrapScriptContent.crossOrigin
                    ? void 0
                    : "use-credentials" === bootstrapScriptContent.crossOrigin
                      ? "use-credentials"
                      : "")),
            preloadBootstrapScriptOrModule(
              resumableState,
              idPrefix,
              scriptConfig,
              integrity
            ),
            bootstrapChunks.push(
              '<script type="module" src="',
              escapeTextForBrowser(scriptConfig),
              attributeEnd
            ),
            "string" === typeof crossOrigin &&
              bootstrapChunks.push(
                ' integrity="',
                escapeTextForBrowser(crossOrigin),
                attributeEnd
              ),
            "string" === typeof src &&
              bootstrapChunks.push(
                ' crossorigin="',
                escapeTextForBrowser(src),
                attributeEnd
              ),
            pushCompletedShellIdAttribute(bootstrapChunks, resumableState),
            bootstrapChunks.push(' async="">\x3c/script>');
      return {
        placeholderPrefix: idPrefix.placeholderPrefix,
        segmentPrefix: idPrefix.segmentPrefix,
        boundaryPrefix: idPrefix.boundaryPrefix,
        startInlineScript: idPrefix.startInlineScript,
        startInlineStyle: idPrefix.startInlineStyle,
        preamble: idPrefix.preamble,
        externalRuntimeScript: idPrefix.externalRuntimeScript,
        bootstrapChunks: idPrefix.bootstrapChunks,
        importMapChunks: idPrefix.importMapChunks,
        onHeaders: idPrefix.onHeaders,
        headers: idPrefix.headers,
        resets: idPrefix.resets,
        charsetChunks: idPrefix.charsetChunks,
        viewportChunks: idPrefix.viewportChunks,
        hoistableChunks: idPrefix.hoistableChunks,
        preconnects: idPrefix.preconnects,
        fontPreloads: idPrefix.fontPreloads,
        highImagePreloads: idPrefix.highImagePreloads,
        styles: idPrefix.styles,
        bootstrapScripts: idPrefix.bootstrapScripts,
        scripts: idPrefix.scripts,
        bulkPreloads: idPrefix.bulkPreloads,
        preloads: idPrefix.preloads,
        nonce: idPrefix.nonce,
        stylesToHoist: idPrefix.stylesToHoist,
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
    function pushSegmentFinale(
      target,
      renderState,
      lastPushedText,
      textEmbedded
    ) {
      renderState.generateStaticMarkup ||
        (lastPushedText && textEmbedded && target.push("\x3c!-- --\x3e"));
    }
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
        switch (
          ("number" === typeof type.tag &&
            console.error(
              "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
            ),
          type.$$typeof)
        ) {
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
    function getMaskedContext(type, unmaskedContext) {
      type = type.contextTypes;
      if (!type) return emptyContextObject;
      var context = {},
        key;
      for (key in type) context[key] = unmaskedContext[key];
      return context;
    }
    function popToNearestCommonAncestor(prev, next) {
      if (prev !== next) {
        prev.context._currentValue2 = prev.parentValue;
        prev = prev.parent;
        var parentNext = next.parent;
        if (null === prev) {
          if (null !== parentNext)
            throw Error(
              "The stacks must reach the root at the same time. This is a bug in React."
            );
        } else {
          if (null === parentNext)
            throw Error(
              "The stacks must reach the root at the same time. This is a bug in React."
            );
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
      if (null === prev)
        throw Error(
          "The depth must equal at least at zero before reaching the root. This is a bug in React."
        );
      prev.depth === next.depth
        ? popToNearestCommonAncestor(prev, next)
        : popPreviousToCommonLevel(prev, next);
    }
    function popNextToCommonLevel(prev, next) {
      var parentNext = next.parent;
      if (null === parentNext)
        throw Error(
          "The depth must equal at least at zero before reaching the root. This is a bug in React."
        );
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
    function warnOnInvalidCallback(callback) {
      if (null !== callback && "function" !== typeof callback) {
        var key = String(callback);
        didWarnOnInvalidCallback.has(key) ||
          (didWarnOnInvalidCallback.add(key),
          console.error(
            "Expected the last optional `callback` argument to be a function. Instead received: %s.",
            callback
          ));
      }
    }
    function warnNoop(publicInstance, callerName) {
      publicInstance =
        ((publicInstance = publicInstance.constructor) &&
          getComponentNameFromType(publicInstance)) ||
        "ReactClass";
      var warningKey = publicInstance + "." + callerName;
      didWarnAboutNoopUpdateForComponent[warningKey] ||
        (console.error(
          "Can only update a mounting component. This usually means you called %s() outside componentWillMount() on the server. This is a no-op.\n\nPlease check the code for the %s component.",
          callerName,
          publicInstance
        ),
        (didWarnAboutNoopUpdateForComponent[warningKey] = !0));
    }
    function getTreeId(context) {
      var overflow = context.overflow;
      context = context.id;
      return (
        (context & ~(1 << (32 - clz32(context) - 1))).toString(32) + overflow
      );
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
    function clz32Fallback(x) {
      x >>>= 0;
      return 0 === x ? 32 : (31 - ((log(x) / LN2) | 0)) | 0;
    }
    function noop() {}
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
            throw Error(
              "A rejected Promise was passed to React without a `reason` property. React threw a generic error from where the Promise was used to assist in identifying the problematic Promise. Make sure that instrumented Promises correctly set the `reason` property when setting `status` to `'rejected'`."
            );
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
          shouldCaptureSuspendedCallSite && captureSuspendedCallSite();
          throw SuspenseException;
      }
    }
    function getSuspendedThenable() {
      if (null === suspendedThenable)
        throw Error(
          "Expected a suspended thenable. This is a bug in React. Please file an issue."
        );
      var thenable = suspendedThenable;
      suspendedThenable = null;
      return thenable;
    }
    function captureSuspendedCallSite() {
      var currentTask = currentTaskInDEV;
      if (null === currentTask)
        throw Error(
          "Expected to have a current task when tracking a suspend call site. This is a bug in React."
        );
      var currentComponentStack = currentTask.componentStack;
      if (null === currentComponentStack)
        throw Error(
          "Expected to have a component stack on the current task when tracking a suspended call site. This is a bug in React."
        );
      suspendedCallSiteStack = {
        parent: currentComponentStack.parent,
        type: currentComponentStack.type,
        owner: currentComponentStack.owner,
        stack: Error("react-stack-top-frame")
      };
      suspendedCallSiteDebugTask = currentTask.debugTask;
    }
    function ensureSuspendableThenableStateDEV(thenableState) {
      var lastThenable = thenableState[thenableState.length - 1];
      switch (lastThenable.status) {
        case "fulfilled":
          var previousThenableValue = lastThenable.value,
            previousThenableThen = lastThenable.then.bind(lastThenable);
          delete lastThenable.value;
          delete lastThenable.status;
          lastThenable.then = noop;
          return function () {
            lastThenable.then = previousThenableThen;
            lastThenable.value = previousThenableValue;
            lastThenable.status = "fulfilled";
          };
        case "rejected":
          var previousThenableReason = lastThenable.reason,
            _previousThenableThen = lastThenable.then.bind(lastThenable);
          delete lastThenable.reason;
          delete lastThenable.status;
          lastThenable.then = noop;
          return function () {
            lastThenable.then = _previousThenableThen;
            lastThenable.reason = previousThenableReason;
            lastThenable.status = "rejected";
          };
      }
      return noop;
    }
    function is(x, y) {
      return (x === y && (0 !== x || 1 / x === 1 / y)) || (x !== x && y !== y);
    }
    function resolveCurrentlyRenderingComponent() {
      if (null === currentlyRenderingComponent)
        throw Error(
          "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
        );
      isInHookUserCodeInDev &&
        console.error(
          "Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. You can only call Hooks at the top level of your React function. For more information, see https://react.dev/link/rules-of-hooks"
        );
      return currentlyRenderingComponent;
    }
    function createHook() {
      if (0 < numberOfReRenders)
        throw Error("Rendered more hooks than during the previous render");
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
      isInHookUserCodeInDev = !1;
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
    function readContext(context) {
      isInHookUserCodeInDev &&
        console.error(
          "Context can only be read while React is rendering. In classes, you can read it in the render method or getDerivedStateFromProps. In function components, you can read it directly in the function body, but not inside Hooks like useReducer() or useMemo()."
        );
      return context._currentValue2;
    }
    function basicStateReducer(state, action) {
      return "function" === typeof action ? action(state) : action;
    }
    function useReducer(reducer, initialArg, init) {
      reducer !== basicStateReducer && (currentHookNameInDev = "useReducer");
      currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
      workInProgressHook = createWorkInProgressHook();
      if (isReRender) {
        init = workInProgressHook.queue;
        initialArg = init.dispatch;
        if (null !== renderPhaseUpdates) {
          var firstRenderPhaseUpdate = renderPhaseUpdates.get(init);
          if (void 0 !== firstRenderPhaseUpdate) {
            renderPhaseUpdates.delete(init);
            init = workInProgressHook.memoizedState;
            do {
              var action = firstRenderPhaseUpdate.action;
              isInHookUserCodeInDev = !0;
              init = reducer(init, action);
              isInHookUserCodeInDev = !1;
              firstRenderPhaseUpdate = firstRenderPhaseUpdate.next;
            } while (null !== firstRenderPhaseUpdate);
            workInProgressHook.memoizedState = init;
            return [init, initialArg];
          }
        }
        return [workInProgressHook.memoizedState, initialArg];
      }
      isInHookUserCodeInDev = !0;
      reducer =
        reducer === basicStateReducer
          ? "function" === typeof initialArg
            ? initialArg()
            : initialArg
          : void 0 !== init
            ? init(initialArg)
            : initialArg;
      isInHookUserCodeInDev = !1;
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
          a: {
            var JSCompiler_inline_result = prevState[1];
            if (null === JSCompiler_inline_result)
              console.error(
                "%s received a final argument during this render, but not during the previous render. Even though the final argument is optional, its type cannot change between renders.",
                currentHookNameInDev
              ),
                (JSCompiler_inline_result = !1);
            else {
              deps.length !== JSCompiler_inline_result.length &&
                console.error(
                  "The final argument passed to %s changed size between renders. The order and size of this array must remain constant.\n\nPrevious: %s\nIncoming: %s",
                  currentHookNameInDev,
                  "[" + deps.join(", ") + "]",
                  "[" + JSCompiler_inline_result.join(", ") + "]"
                );
              for (
                var i = 0;
                i < JSCompiler_inline_result.length && i < deps.length;
                i++
              )
                if (!objectIs(deps[i], JSCompiler_inline_result[i])) {
                  JSCompiler_inline_result = !1;
                  break a;
                }
              JSCompiler_inline_result = !0;
            }
          }
          if (JSCompiler_inline_result) return prevState[0];
        }
      }
      isInHookUserCodeInDev = !0;
      nextCreate = nextCreate();
      isInHookUserCodeInDev = !1;
      workInProgressHook.memoizedState = [nextCreate, deps];
      return nextCreate;
    }
    function dispatchAction(componentIdentity, queue, action) {
      if (25 <= numberOfReRenders)
        throw Error(
          "Too many re-renders. React limits the number of renders to prevent an infinite loop."
        );
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
      throw Error(
        "A function wrapped in useEffectEvent can't be called during rendering."
      );
    }
    function unsupportedStartTransition() {
      throw Error("startTransition cannot be called during server rendering.");
    }
    function unsupportedSetOptimisticState() {
      throw Error("Cannot update optimistic state while rendering.");
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
                    JSON.stringify([
                      componentKeyPath,
                      null,
                      actionStateHookIndex
                    ]),
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
              (checkAttributeStringCoercion(permalink, "target"),
              (permalink += ""),
              (prefix.action = permalink));
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
      var _boundAction = action.bind(null, initialState);
      return [
        initialState,
        function (payload) {
          _boundAction(payload);
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
      throw Error("Cache cannot be refreshed during server rendering.");
    }
    function disabledLog() {}
    function disableLogs() {
      if (0 === disabledDepth) {
        prevLog = console.log;
        prevInfo = console.info;
        prevWarn = console.warn;
        prevError = console.error;
        prevGroup = console.group;
        prevGroupCollapsed = console.groupCollapsed;
        prevGroupEnd = console.groupEnd;
        var props = {
          configurable: !0,
          enumerable: !0,
          value: disabledLog,
          writable: !0
        };
        Object.defineProperties(console, {
          info: props,
          log: props,
          warn: props,
          error: props,
          group: props,
          groupCollapsed: props,
          groupEnd: props
        });
      }
      disabledDepth++;
    }
    function reenableLogs() {
      disabledDepth--;
      if (0 === disabledDepth) {
        var props = { configurable: !0, enumerable: !0, writable: !0 };
        Object.defineProperties(console, {
          log: assign({}, props, { value: prevLog }),
          info: assign({}, props, { value: prevInfo }),
          warn: assign({}, props, { value: prevWarn }),
          error: assign({}, props, { value: prevError }),
          group: assign({}, props, { value: prevGroup }),
          groupCollapsed: assign({}, props, { value: prevGroupCollapsed }),
          groupEnd: assign({}, props, { value: prevGroupEnd })
        });
      }
      0 > disabledDepth &&
        console.error(
          "disabledDepth fell below zero. This is a bug in React. Please file an issue."
        );
    }
    function formatOwnerStack(error) {
      var prevPrepareStackTrace = Error.prepareStackTrace;
      Error.prepareStackTrace = void 0;
      error = error.stack;
      Error.prepareStackTrace = prevPrepareStackTrace;
      error.startsWith("Error: react-stack-top-frame\n") &&
        (error = error.slice(29));
      prevPrepareStackTrace = error.indexOf("\n");
      -1 !== prevPrepareStackTrace &&
        (error = error.slice(prevPrepareStackTrace + 1));
      prevPrepareStackTrace = error.indexOf("react_stack_bottom_frame");
      -1 !== prevPrepareStackTrace &&
        (prevPrepareStackTrace = error.lastIndexOf(
          "\n",
          prevPrepareStackTrace
        ));
      if (-1 !== prevPrepareStackTrace)
        error = error.slice(0, prevPrepareStackTrace);
      else return "";
      return error;
    }
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
    function describeNativeComponentFrame(fn, construct) {
      if (!fn || reentry) return "";
      var frame = componentFrameCache.get(fn);
      if (void 0 !== frame) return frame;
      reentry = !0;
      frame = Error.prepareStackTrace;
      Error.prepareStackTrace = void 0;
      var previousDispatcher = null;
      previousDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = null;
      disableLogs();
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
                  } catch (x$0) {
                    control = x$0;
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
                        ? Object.defineProperty(
                            fn.prototype,
                            "props",
                            prevProps
                          )
                        : delete fn.prototype.props);
                  }
                }
              } else {
                try {
                  throw Error();
                } catch (x$1) {
                  control = x$1;
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
        var _RunInRootFrame$Deter =
            RunInRootFrame.DetermineComponentFrameRoot(),
          sampleStack = _RunInRootFrame$Deter[0],
          controlStack = _RunInRootFrame$Deter[1];
        if (sampleStack && controlStack) {
          var sampleLines = sampleStack.split("\n"),
            controlLines = controlStack.split("\n");
          for (
            _RunInRootFrame$Deter = namePropDescriptor = 0;
            namePropDescriptor < sampleLines.length &&
            !sampleLines[namePropDescriptor].includes(
              "DetermineComponentFrameRoot"
            );

          )
            namePropDescriptor++;
          for (
            ;
            _RunInRootFrame$Deter < controlLines.length &&
            !controlLines[_RunInRootFrame$Deter].includes(
              "DetermineComponentFrameRoot"
            );

          )
            _RunInRootFrame$Deter++;
          if (
            namePropDescriptor === sampleLines.length ||
            _RunInRootFrame$Deter === controlLines.length
          )
            for (
              namePropDescriptor = sampleLines.length - 1,
                _RunInRootFrame$Deter = controlLines.length - 1;
              1 <= namePropDescriptor &&
              0 <= _RunInRootFrame$Deter &&
              sampleLines[namePropDescriptor] !==
                controlLines[_RunInRootFrame$Deter];

            )
              _RunInRootFrame$Deter--;
          for (
            ;
            1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter;
            namePropDescriptor--, _RunInRootFrame$Deter--
          )
            if (
              sampleLines[namePropDescriptor] !==
              controlLines[_RunInRootFrame$Deter]
            ) {
              if (1 !== namePropDescriptor || 1 !== _RunInRootFrame$Deter) {
                do
                  if (
                    (namePropDescriptor--,
                    _RunInRootFrame$Deter--,
                    0 > _RunInRootFrame$Deter ||
                      sampleLines[namePropDescriptor] !==
                        controlLines[_RunInRootFrame$Deter])
                  ) {
                    var _frame =
                      "\n" +
                      sampleLines[namePropDescriptor].replace(
                        " at new ",
                        " at "
                      );
                    fn.displayName &&
                      _frame.includes("<anonymous>") &&
                      (_frame = _frame.replace("<anonymous>", fn.displayName));
                    "function" === typeof fn &&
                      componentFrameCache.set(fn, _frame);
                    return _frame;
                  }
                while (1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter);
              }
              break;
            }
        }
      } finally {
        (reentry = !1),
          (ReactSharedInternals.H = previousDispatcher),
          reenableLogs(),
          (Error.prepareStackTrace = frame);
      }
      sampleLines = (sampleLines = fn ? fn.displayName || fn.name : "")
        ? describeBuiltInComponentFrame(sampleLines)
        : "";
      "function" === typeof fn && componentFrameCache.set(fn, sampleLines);
      return sampleLines;
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
            type = type.debugLocation;
            if (null != type) {
              type = formatOwnerStack(type);
              var idx = type.lastIndexOf("\n");
              type = -1 === idx ? type : type.slice(idx + 1);
              if (-1 !== type.indexOf(payload)) {
                payload = "\n" + type;
                break a;
              }
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
        (500 < boundary.byteSize || boundary.defer) &&
        null === boundary.preamble
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
      this.didWarnForKey = null;
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
      var now = getCurrentTime();
      1e3 < now - lastResetTime &&
        ((ReactSharedInternals.recentlyCreatedOwnerStacks = 0),
        (lastResetTime = now));
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
        emptyContextObject,
        null
      );
      pushComponentStack(children);
      resumableState.pingedTasks.push(children);
      return resumableState;
    }
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
        status: PENDING,
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
        tracked: null,
        errorMessage: null,
        errorStack: null,
        errorComponentStack: null
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
      legacyContext,
      debugTask
    ) {
      request.allPendingTasks++;
      null === blockedBoundary
        ? request.pendingRootTasks++
        : blockedBoundary.pendingTasks++;
      null !== row && row.pendingTasks++;
      var task$jscomp$0 = {
        replay: null,
        node: node,
        childIndex: childIndex,
        ping: {
          resolve: function () {
            return pingTask(request, task$jscomp$0);
          },
          reject: function (error) {
            var task = task$jscomp$0;
            request.aborted
              ? task.abortSet.delete(task) &&
                finishAbortedTaskDEV(task, request, error)
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
      task$jscomp$0.legacyContext = legacyContext;
      task$jscomp$0.debugTask = debugTask;
      abortSet.add(task$jscomp$0);
      return task$jscomp$0;
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
      legacyContext,
      debugTask
    ) {
      request.allPendingTasks++;
      null === blockedBoundary
        ? request.pendingRootTasks++
        : blockedBoundary.pendingTasks++;
      null !== row && row.pendingTasks++;
      replay.pendingTasks++;
      var task$jscomp$0 = {
        replay: replay,
        node: node,
        childIndex: childIndex,
        ping: {
          resolve: function () {
            return pingTask(request, task$jscomp$0);
          },
          reject: function (error) {
            var task = task$jscomp$0;
            request.aborted
              ? task.abortSet.delete(task) &&
                finishAbortedTaskDEV(task, request, error)
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
      task$jscomp$0.legacyContext = legacyContext;
      task$jscomp$0.debugTask = debugTask;
      abortSet.add(task$jscomp$0);
      return task$jscomp$0;
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
        status: PENDING,
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
    function getCurrentStackInDEV() {
      if (null === currentTaskInDEV || null === currentTaskInDEV.componentStack)
        return "";
      var componentStack = currentTaskInDEV.componentStack;
      try {
        var info = "";
        if ("string" === typeof componentStack.type)
          info += describeBuiltInComponentFrame(componentStack.type);
        else if ("function" === typeof componentStack.type) {
          if (!componentStack.owner) {
            var JSCompiler_temp_const = info,
              fn = componentStack.type,
              name = fn ? fn.displayName || fn.name : "";
            var JSCompiler_inline_result = name
              ? describeBuiltInComponentFrame(name)
              : "";
            info = JSCompiler_temp_const + JSCompiler_inline_result;
          }
        } else
          componentStack.owner ||
            (info += describeComponentStackByType(componentStack.type));
        for (; componentStack; )
          (JSCompiler_temp_const = null),
            null != componentStack.debugStack
              ? (JSCompiler_temp_const = formatOwnerStack(
                  componentStack.debugStack
                ))
              : ((JSCompiler_inline_result = componentStack),
                null != JSCompiler_inline_result.stack &&
                  (JSCompiler_temp_const =
                    "string" !== typeof JSCompiler_inline_result.stack
                      ? (JSCompiler_inline_result.stack = formatOwnerStack(
                          JSCompiler_inline_result.stack
                        ))
                      : JSCompiler_inline_result.stack)),
            (componentStack = componentStack.owner) &&
              JSCompiler_temp_const &&
              (info += "\n" + JSCompiler_temp_const);
        var JSCompiler_inline_result$jscomp$0 = info;
      } catch (x) {
        JSCompiler_inline_result$jscomp$0 =
          "\nError generating stack: " + x.message + "\n" + x.stack;
      }
      return JSCompiler_inline_result$jscomp$0;
    }
    function pushHaltedAwaitOnComponentStack(task, debugInfo) {
      if (null != debugInfo)
        for (var i = debugInfo.length - 1; 0 <= i; i--) {
          var info = debugInfo[i];
          if (null != info.awaited) {
            var bestStack = null == info.debugStack ? info.awaited : info;
            if (void 0 !== bestStack.debugStack) {
              task.componentStack = {
                parent: task.componentStack,
                type: info,
                owner: bestStack.owner,
                stack: bestStack.debugStack
              };
              task.debugTask = bestStack.debugTask;
              break;
            }
          }
        }
    }
    function pushSuspendedCallSiteOnComponentStack(request, task) {
      shouldCaptureSuspendedCallSite = !0;
      var restoreThenableState = ensureSuspendableThenableStateDEV(
        task.thenableState
      );
      try {
        var prevStatus = request.status,
          prevAborted = request.aborted;
        request.status = 14;
        request.aborted = !1;
        var prevContext = currentActiveSnapshot,
          prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = HooksDispatcher;
        var prevAsyncDispatcher = ReactSharedInternals.A;
        ReactSharedInternals.A = DefaultAsyncDispatcher;
        var prevRequest = currentRequest;
        currentRequest = request;
        var prevGetCurrentStackImpl = ReactSharedInternals.getCurrentStack;
        ReactSharedInternals.getCurrentStack = getCurrentStackInDEV;
        var prevResumableState = currentResumableState;
        currentResumableState = request.resumableState;
        switchContext(task.context);
        var prevTaskInDEV = currentTaskInDEV;
        currentTaskInDEV = task;
        try {
          retryNode(request, task);
        } catch (x) {
          resetHooksState();
        } finally {
          (currentTaskInDEV = prevTaskInDEV),
            (currentResumableState = prevResumableState),
            (ReactSharedInternals.H = prevDispatcher),
            (ReactSharedInternals.A = prevAsyncDispatcher),
            (ReactSharedInternals.getCurrentStack = prevGetCurrentStackImpl),
            prevDispatcher === HooksDispatcher && switchContext(prevContext),
            (currentRequest = prevRequest),
            (request.status = prevStatus),
            (request.aborted = prevAborted);
        }
      } finally {
        restoreThenableState(), (shouldCaptureSuspendedCallSite = !1);
      }
      null === suspendedCallSiteStack
        ? (request = null)
        : ((request = suspendedCallSiteStack), (suspendedCallSiteStack = null));
      null === suspendedCallSiteDebugTask
        ? (restoreThenableState = null)
        : ((restoreThenableState = suspendedCallSiteDebugTask),
          (suspendedCallSiteDebugTask = null));
      null !== request &&
        (task.componentStack = {
          owner: task.componentStack,
          parent: request.parent,
          stack: request.stack,
          type: request.type
        });
      task.debugTask = restoreThenableState;
    }
    function pushServerComponentStack(task, debugInfo) {
      if (null != debugInfo)
        for (var i = 0; i < debugInfo.length; i++) {
          var componentInfo = debugInfo[i];
          "string" === typeof componentInfo.name &&
            void 0 !== componentInfo.debugStack &&
            ((task.componentStack = {
              parent: task.componentStack,
              type: componentInfo,
              owner: componentInfo.owner,
              stack: componentInfo.debugStack
            }),
            (task.debugTask = componentInfo.debugTask));
        }
    }
    function pushComponentStack(task) {
      var node = task.node;
      if ("object" === typeof node && null !== node)
        switch (node.$$typeof) {
          case REACT_ELEMENT_TYPE:
            var type = node.type,
              owner = node._owner,
              stack = node._debugStack;
            pushServerComponentStack(task, node._debugInfo);
            task.debugTask = node._debugTask;
            task.componentStack = {
              parent: task.componentStack,
              type: type,
              owner: owner,
              stack: stack
            };
            break;
          case REACT_LAZY_TYPE:
            pushServerComponentStack(task, node._debugInfo);
            break;
          default:
            "function" === typeof node.then &&
              pushServerComponentStack(task, node._debugInfo);
        }
    }
    function replaceSuspenseComponentStackWithSuspenseFallbackStack(
      componentStack
    ) {
      return null === componentStack
        ? null
        : {
            parent: componentStack.parent,
            type: "Suspense Fallback",
            owner: componentStack.owner,
            stack: componentStack.stack
          };
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
              var stack = info;
            } catch (x) {
              stack = "\nError generating stack: " + x.message + "\n" + x.stack;
            }
            Object.defineProperty(errorInfo, "componentStack", {
              value: stack
            });
            return stack;
          }
        });
      return errorInfo;
    }
    function encodeErrorForBoundary(
      boundary,
      digest,
      error,
      thrownInfo,
      wasAborted
    ) {
      boundary.errorDigest = digest;
      error instanceof Error
        ? ((digest = String(error.message)), (error = String(error.stack)))
        : ((digest =
            "object" === typeof error && null !== error
              ? describeObjectForErrorMessage(error)
              : String(error)),
          (error = null));
      wasAborted = wasAborted
        ? "Switched to client rendering because the server rendering aborted due to:\n\n"
        : "Switched to client rendering because the server rendering errored:\n\n";
      boundary.errorMessage = wasAborted + digest;
      boundary.errorStack = null !== error ? wasAborted + error : null;
      boundary.errorComponentStack = thrownInfo.componentStack;
    }
    function logRecoverableError(request, error, errorInfo, debugTask) {
      request = request.onError;
      error = debugTask
        ? debugTask.run(request.bind(null, error, errorInfo))
        : request(error, errorInfo);
      if (null != error && "string" !== typeof error)
        console.error(
          'onError returned something with a type other than "string". onError should return a string and may return null or undefined but must not return anything else. It received something of type "%s" instead',
          typeof error
        );
      else return error;
    }
    function fatalError(request, error, errorInfo, debugTask) {
      errorInfo = request.onShellError;
      var onFatalError = request.onFatalError,
        shellComplete = 0 === request.pendingRootTasks;
      debugTask
        ? (shellComplete || debugTask.run(errorInfo.bind(null, error)),
          debugTask.run(onFatalError.bind(null, error)))
        : (shellComplete || errorInfo(error), onFatalError(error));
      null !== request.destination
        ? ((request.status = CLOSED), request.destination.destroy(error))
        : ((request.status = 12), (request.fatalError = error));
    }
    function finishSuspenseListRow(request, row) {
      unblockSuspenseListRow(request, row.next, row.hoistables);
    }
    function unblockSuspenseListRow(
      request,
      unblockedRow,
      inheritedHoistables
    ) {
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
              hoistHoistables(
                unblockedBoundary.contentState,
                inheritedHoistables
              );
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
      if (
        null !== boundaries &&
        togetherRow.pendingTasks === boundaries.length
      ) {
        for (
          var allCompleteAndInlinable = !0, i = 0;
          i < boundaries.length;
          i++
        ) {
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
        prevRow = task.row,
        previousComponentStack = task.componentStack;
      var previousDebugTask = task.debugTask;
      pushServerComponentStack(task, task.node.props.children._debugInfo);
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
              warnForMissingKey(request, task, i),
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
            warnForMissingKey(request, task, resumeSlots),
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
            "unstable_legacy-backwards" === revealOrder
              ? keyPath - 1 - node
              : node;
          var _node3 = rows[resumeSegmentID];
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
          warnForMissingKey(request, task, _node3);
          try {
            renderNode(request, task, _node3, resumeSegmentID),
              pushSegmentFinale(
                newSegment.chunks,
                request.renderState,
                newSegment.lastPushedText,
                newSegment.textEmbedded
              ),
              (newSegment.status = COMPLETED),
              0 === --previousSuspenseListRow.pendingTasks &&
                finishSuspenseListRow(request, previousSuspenseListRow);
          } catch (thrownValue) {
            throw (
              ((newSegment.status = request.aborted ? ABORTED : ERRORED),
              thrownValue)
            );
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
      task.componentStack = previousComponentStack;
      task.debugTask = previousDebugTask;
    }
    function renderWithHooks(
      request,
      task,
      keyPath,
      Component,
      props,
      secondArg
    ) {
      var prevThenableState = task.thenableState;
      task.thenableState = null;
      currentlyRenderingComponent = {};
      currentlyRenderingTask = task;
      currentlyRenderingRequest = request;
      currentlyRenderingKeyPath = keyPath;
      isInHookUserCodeInDev = !1;
      actionStateCounter = localIdCounter = 0;
      actionStateMatchingIndex = -1;
      thenableIndexCounter = 0;
      thenableState = prevThenableState;
      for (
        request = callComponentInDEV(Component, props, secondArg);
        didScheduleRenderPhaseUpdate;

      )
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
            for (var _propName in defaultProps)
              void 0 === newProps[_propName] &&
                (newProps[_propName] = defaultProps[_propName]);
          }
          var resolvedProps = newProps;
          var maskedContext = getMaskedContext(type, task.legacyContext),
            contextType = type.contextType;
          if (
            "contextType" in type &&
            null !== contextType &&
            (void 0 === contextType ||
              contextType.$$typeof !== REACT_CONTEXT_TYPE) &&
            !didWarnAboutInvalidateContextType.has(type)
          ) {
            didWarnAboutInvalidateContextType.add(type);
            var addendum =
              void 0 === contextType
                ? " However, it is set to undefined. This can be caused by a typo or by mixing up named and default imports. This can also happen due to a circular dependency, so try moving the createContext() call to a separate file."
                : "object" !== typeof contextType
                  ? " However, it is set to a " + typeof contextType + "."
                  : contextType.$$typeof === REACT_CONSUMER_TYPE
                    ? " Did you accidentally pass the Context.Consumer instead?"
                    : " However, it is set to an object with keys {" +
                      Object.keys(contextType).join(", ") +
                      "}.";
            console.error(
              "%s defines an invalid contextType. contextType should point to the Context object returned by React.createContext().%s",
              getComponentNameFromType(type) || "Component",
              addendum
            );
          }
          var instance = new type(
            resolvedProps,
            "object" === typeof contextType && null !== contextType
              ? contextType._currentValue2
              : maskedContext
          );
          if (
            "function" === typeof type.getDerivedStateFromProps &&
            (null === instance.state || void 0 === instance.state)
          ) {
            var componentName = getComponentNameFromType(type) || "Component";
            didWarnAboutUninitializedState.has(componentName) ||
              (didWarnAboutUninitializedState.add(componentName),
              console.error(
                "`%s` uses `getDerivedStateFromProps` but its initial state is %s. This is not recommended. Instead, define the initial state by assigning an object to `this.state` in the constructor of `%s`. This ensures that `getDerivedStateFromProps` arguments have a consistent shape.",
                componentName,
                null === instance.state ? "null" : "undefined",
                componentName
              ));
          }
          if (
            "function" === typeof type.getDerivedStateFromProps ||
            "function" === typeof instance.getSnapshotBeforeUpdate
          ) {
            var foundWillMountName = null,
              foundWillReceivePropsName = null,
              foundWillUpdateName = null;
            "function" === typeof instance.componentWillMount &&
            !0 !== instance.componentWillMount.__suppressDeprecationWarning
              ? (foundWillMountName = "componentWillMount")
              : "function" === typeof instance.UNSAFE_componentWillMount &&
                (foundWillMountName = "UNSAFE_componentWillMount");
            "function" === typeof instance.componentWillReceiveProps &&
            !0 !==
              instance.componentWillReceiveProps.__suppressDeprecationWarning
              ? (foundWillReceivePropsName = "componentWillReceiveProps")
              : "function" ===
                  typeof instance.UNSAFE_componentWillReceiveProps &&
                (foundWillReceivePropsName =
                  "UNSAFE_componentWillReceiveProps");
            "function" === typeof instance.componentWillUpdate &&
            !0 !== instance.componentWillUpdate.__suppressDeprecationWarning
              ? (foundWillUpdateName = "componentWillUpdate")
              : "function" === typeof instance.UNSAFE_componentWillUpdate &&
                (foundWillUpdateName = "UNSAFE_componentWillUpdate");
            if (
              null !== foundWillMountName ||
              null !== foundWillReceivePropsName ||
              null !== foundWillUpdateName
            ) {
              var _componentName =
                  getComponentNameFromType(type) || "Component",
                newApiName =
                  "function" === typeof type.getDerivedStateFromProps
                    ? "getDerivedStateFromProps()"
                    : "getSnapshotBeforeUpdate()";
              didWarnAboutLegacyLifecyclesAndDerivedState.has(_componentName) ||
                (didWarnAboutLegacyLifecyclesAndDerivedState.add(
                  _componentName
                ),
                console.error(
                  "Unsafe legacy lifecycles will not be called for components using new component APIs.\n\n%s uses %s but also contains the following legacy lifecycles:%s%s%s\n\nThe above lifecycles should be removed. Learn more about this warning here:\nhttps://react.dev/link/unsafe-component-lifecycles",
                  _componentName,
                  newApiName,
                  null !== foundWillMountName
                    ? "\n  " + foundWillMountName
                    : "",
                  null !== foundWillReceivePropsName
                    ? "\n  " + foundWillReceivePropsName
                    : "",
                  null !== foundWillUpdateName
                    ? "\n  " + foundWillUpdateName
                    : ""
                ));
            }
          }
          var name = getComponentNameFromType(type) || "Component";
          instance.render ||
            (type.prototype && "function" === typeof type.prototype.render
              ? console.error(
                  "No `render` method found on the %s instance: did you accidentally return an object from the constructor?",
                  name
                )
              : console.error(
                  "No `render` method found on the %s instance: you may have forgotten to define `render`.",
                  name
                ));
          !instance.getInitialState ||
            instance.getInitialState.isReactClassApproved ||
            instance.state ||
            console.error(
              "getInitialState was defined on %s, a plain JavaScript class. This is only supported for classes created using React.createClass. Did you mean to define a state property instead?",
              name
            );
          instance.getDefaultProps &&
            !instance.getDefaultProps.isReactClassApproved &&
            console.error(
              "getDefaultProps was defined on %s, a plain JavaScript class. This is only supported for classes created using React.createClass. Use a static property to define defaultProps instead.",
              name
            );
          instance.contextType &&
            console.error(
              "contextType was defined as an instance property on %s. Use a static property to define contextType instead.",
              name
            );
          instance.contextTypes &&
            console.error(
              "contextTypes was defined as an instance property on %s. Use a static property to define contextTypes instead. (https://react.dev/link/legacy-context)",
              name
            );
          type.contextType &&
            type.contextTypes &&
            !didWarnAboutContextTypeAndContextTypes.has(type) &&
            (didWarnAboutContextTypeAndContextTypes.add(type),
            console.error(
              "%s declares both contextTypes and contextType static properties. The legacy contextTypes property will be ignored.",
              name
            ));
          type.childContextTypes &&
            !didWarnAboutChildContextTypes.has(type) &&
            (didWarnAboutChildContextTypes.add(type),
            console.error(
              "%s uses the legacy childContextTypes API which will soon be removed. Use React.createContext() instead. (https://react.dev/link/legacy-context)",
              name
            ));
          type.contextTypes &&
            !didWarnAboutContextTypes$1.has(type) &&
            (didWarnAboutContextTypes$1.add(type),
            console.error(
              "%s uses the legacy contextTypes API which will soon be removed. Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)",
              name
            ));
          "function" === typeof instance.componentShouldUpdate &&
            console.error(
              "%s has a method called componentShouldUpdate(). Did you mean shouldComponentUpdate()? The name is phrased as a question because the function is expected to return a value.",
              name
            );
          type.prototype &&
            type.prototype.isPureReactComponent &&
            "undefined" !== typeof instance.shouldComponentUpdate &&
            console.error(
              "%s has a method called shouldComponentUpdate(). shouldComponentUpdate should not be used when extending React.PureComponent. Please extend React.Component if shouldComponentUpdate is used.",
              getComponentNameFromType(type) || "A pure component"
            );
          "function" === typeof instance.componentDidUnmount &&
            console.error(
              "%s has a method called componentDidUnmount(). But there is no such lifecycle method. Did you mean componentWillUnmount()?",
              name
            );
          "function" === typeof instance.componentDidReceiveProps &&
            console.error(
              "%s has a method called componentDidReceiveProps(). But there is no such lifecycle method. If you meant to update the state in response to changing props, use componentWillReceiveProps(). If you meant to fetch data or run side-effects or mutations after React has updated the UI, use componentDidUpdate().",
              name
            );
          "function" === typeof instance.componentWillRecieveProps &&
            console.error(
              "%s has a method called componentWillRecieveProps(). Did you mean componentWillReceiveProps()?",
              name
            );
          "function" === typeof instance.UNSAFE_componentWillRecieveProps &&
            console.error(
              "%s has a method called UNSAFE_componentWillRecieveProps(). Did you mean UNSAFE_componentWillReceiveProps()?",
              name
            );
          var hasMutatedProps = instance.props !== resolvedProps;
          void 0 !== instance.props &&
            hasMutatedProps &&
            console.error(
              "When calling super() in `%s`, make sure to pass up the same props that your component's constructor was passed.",
              name
            );
          instance.defaultProps &&
            console.error(
              "Setting defaultProps as an instance property on %s is not supported and will be ignored. Instead, define defaultProps as a static property on %s.",
              name,
              name
            );
          "function" !== typeof instance.getSnapshotBeforeUpdate ||
            "function" === typeof instance.componentDidUpdate ||
            didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate.has(type) ||
            (didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate.add(type),
            console.error(
              "%s: getSnapshotBeforeUpdate() should be used with componentDidUpdate(). This component defines getSnapshotBeforeUpdate() only.",
              getComponentNameFromType(type)
            ));
          "function" === typeof instance.getDerivedStateFromProps &&
            console.error(
              "%s: getDerivedStateFromProps() is defined as an instance method and will be ignored. Instead, declare it as a static method.",
              name
            );
          "function" === typeof instance.getDerivedStateFromError &&
            console.error(
              "%s: getDerivedStateFromError() is defined as an instance method and will be ignored. Instead, declare it as a static method.",
              name
            );
          "function" === typeof type.getSnapshotBeforeUpdate &&
            console.error(
              "%s: getSnapshotBeforeUpdate() is defined as a static method and will be ignored. Instead, declare it as an instance method.",
              name
            );
          var state = instance.state;
          state &&
            ("object" !== typeof state || isArrayImpl(state)) &&
            console.error("%s.state: must be set to an object or null", name);
          "function" === typeof instance.getChildContext &&
            "object" !== typeof type.childContextTypes &&
            console.error(
              "%s.getChildContext(): childContextTypes must be defined in order to use getChildContext().",
              name
            );
          var initialState = void 0 !== instance.state ? instance.state : null;
          instance.updater = classComponentUpdater;
          instance.props = resolvedProps;
          instance.state = initialState;
          var internalInstance = { queue: [], replace: !1 };
          instance._reactInternals = internalInstance;
          var contextType$jscomp$0 = type.contextType;
          instance.context =
            "object" === typeof contextType$jscomp$0 &&
            null !== contextType$jscomp$0
              ? contextType$jscomp$0._currentValue2
              : maskedContext;
          if (instance.state === resolvedProps) {
            var componentName$jscomp$0 =
              getComponentNameFromType(type) || "Component";
            didWarnAboutDirectlyAssigningPropsToState.has(
              componentName$jscomp$0
            ) ||
              (didWarnAboutDirectlyAssigningPropsToState.add(
                componentName$jscomp$0
              ),
              console.error(
                "%s: It is not recommended to assign props directly to state because updates to props won't be reflected in state. In most cases, it is better to use props directly.",
                componentName$jscomp$0
              ));
          }
          var getDerivedStateFromProps = type.getDerivedStateFromProps;
          if ("function" === typeof getDerivedStateFromProps) {
            var partialState = getDerivedStateFromProps(
              resolvedProps,
              initialState
            );
            if (void 0 === partialState) {
              var componentName$jscomp$1 =
                getComponentNameFromType(type) || "Component";
              didWarnAboutUndefinedDerivedState.has(componentName$jscomp$1) ||
                (didWarnAboutUndefinedDerivedState.add(componentName$jscomp$1),
                console.error(
                  "%s.getDerivedStateFromProps(): A valid state object (or null) must be returned. You have returned undefined.",
                  componentName$jscomp$1
                ));
            }
            var JSCompiler_inline_result =
              null === partialState || void 0 === partialState
                ? initialState
                : assign({}, initialState, partialState);
            instance.state = JSCompiler_inline_result;
          }
          if (
            "function" !== typeof type.getDerivedStateFromProps &&
            "function" !== typeof instance.getSnapshotBeforeUpdate &&
            ("function" === typeof instance.UNSAFE_componentWillMount ||
              "function" === typeof instance.componentWillMount)
          ) {
            var oldState = instance.state;
            if ("function" === typeof instance.componentWillMount) {
              if (
                !0 !== instance.componentWillMount.__suppressDeprecationWarning
              ) {
                var componentName$jscomp$2 =
                  getComponentNameFromType(type) || "Unknown";
                didWarnAboutDeprecatedWillMount[componentName$jscomp$2] ||
                  (console.warn(
                    "componentWillMount has been renamed, and is not recommended for use. See https://react.dev/link/unsafe-component-lifecycles for details.\n\n* Move code from componentWillMount to componentDidMount (preferred in most cases) or the constructor.\n\nPlease update the following components: %s",
                    componentName$jscomp$2
                  ),
                  (didWarnAboutDeprecatedWillMount[componentName$jscomp$2] =
                    !0));
              }
              instance.componentWillMount();
            }
            "function" === typeof instance.UNSAFE_componentWillMount &&
              instance.UNSAFE_componentWillMount();
            oldState !== instance.state &&
              (console.error(
                "%s.componentWillMount(): Assigning directly to this.state is deprecated (except inside a component's constructor). Use setState instead.",
                getComponentNameFromType(type) || "Component"
              ),
              classComponentUpdater.enqueueReplaceState(
                instance,
                instance.state,
                null
              ));
            if (
              null !== internalInstance.queue &&
              0 < internalInstance.queue.length
            ) {
              var oldQueue = internalInstance.queue,
                oldReplace = internalInstance.replace;
              internalInstance.queue = null;
              internalInstance.replace = !1;
              if (oldReplace && 1 === oldQueue.length)
                instance.state = oldQueue[0];
              else {
                for (
                  var nextState = oldReplace ? oldQueue[0] : instance.state,
                    dontMutate = !0,
                    i = oldReplace ? 1 : 0;
                  i < oldQueue.length;
                  i++
                ) {
                  var partial = oldQueue[i],
                    partialState$jscomp$0 =
                      "function" === typeof partial
                        ? partial.call(
                            instance,
                            nextState,
                            resolvedProps,
                            maskedContext
                          )
                        : partial;
                  null != partialState$jscomp$0 &&
                    (dontMutate
                      ? ((dontMutate = !1),
                        (nextState = assign(
                          {},
                          nextState,
                          partialState$jscomp$0
                        )))
                      : assign(nextState, partialState$jscomp$0));
                }
                instance.state = nextState;
              }
            } else internalInstance.queue = null;
          }
          var nextChildren = callRenderInDEV(instance);
          if (request.aborted) throw null;
          instance.props !== resolvedProps &&
            (didWarnAboutReassigningProps ||
              console.error(
                "It looks like %s is reassigning its own `this.props` while rendering. This is not supported and can lead to confusing bugs.",
                getComponentNameFromType(type) || "a component"
              ),
            (didWarnAboutReassigningProps = !0));
          var childContextTypes = type.childContextTypes;
          if (null !== childContextTypes && void 0 !== childContextTypes) {
            var previousContext = task.legacyContext;
            if ("function" !== typeof instance.getChildContext) {
              var componentName$jscomp$3 =
                getComponentNameFromType(type) || "Unknown";
              warnedAboutMissingGetChildContext[componentName$jscomp$3] ||
                ((warnedAboutMissingGetChildContext[componentName$jscomp$3] =
                  !0),
                console.error(
                  "%s.childContextTypes is specified but there is no getChildContext() method on the instance. You can either define getChildContext() on %s or remove childContextTypes from it.",
                  componentName$jscomp$3,
                  componentName$jscomp$3
                ));
              var mergedContext = previousContext;
            } else {
              var childContext = instance.getChildContext(),
                contextKey;
              for (contextKey in childContext)
                if (!(contextKey in childContextTypes))
                  throw Error(
                    (getComponentNameFromType(type) || "Unknown") +
                      '.getChildContext(): key "' +
                      contextKey +
                      '" is not defined in childContextTypes.'
                  );
              mergedContext = assign({}, previousContext, childContext);
            }
            task.legacyContext = mergedContext;
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
          if (type.prototype && "function" === typeof type.prototype.render) {
            var componentName$jscomp$4 =
              getComponentNameFromType(type) || "Unknown";
            didWarnAboutBadClass[componentName$jscomp$4] ||
              (console.error(
                "The <%s /> component appears to have a render method, but doesn't extend React.Component. This is likely to cause errors. Change %s to extend React.Component instead.",
                componentName$jscomp$4,
                componentName$jscomp$4
              ),
              (didWarnAboutBadClass[componentName$jscomp$4] = !0));
          }
          var value = renderWithHooks(
            request,
            task,
            keyPath,
            type,
            props,
            legacyContext
          );
          if (request.aborted) throw null;
          var hasId = 0 !== localIdCounter,
            actionStateCount = actionStateCounter,
            actionStateMatchingIndex$jscomp$0 = actionStateMatchingIndex;
          if (type.contextTypes) {
            var _componentName$jscomp$0 =
              getComponentNameFromType(type) || "Unknown";
            didWarnAboutContextTypes[_componentName$jscomp$0] ||
              ((didWarnAboutContextTypes[_componentName$jscomp$0] = !0),
              console.error(
                "%s uses the legacy contextTypes API which will be removed soon. Use React.createContext() with React.useContext() instead. (https://react.dev/link/legacy-context)",
                _componentName$jscomp$0
              ));
          }
          type &&
            type.childContextTypes &&
            console.error(
              "childContextTypes cannot be defined on a function component.\n  %s.childContextTypes = ...",
              type.displayName || type.name || "Component"
            );
          if ("function" === typeof type.getDerivedStateFromProps) {
            var componentName$jscomp$5 =
              getComponentNameFromType(type) || "Unknown";
            didWarnAboutGetDerivedStateOnFunctionComponent[
              componentName$jscomp$5
            ] ||
              (console.error(
                "%s: Function components do not support getDerivedStateFromProps.",
                componentName$jscomp$5
              ),
              (didWarnAboutGetDerivedStateOnFunctionComponent[
                componentName$jscomp$5
              ] = !0));
          }
          if (
            "object" === typeof type.contextType &&
            null !== type.contextType
          ) {
            var _componentName2 = getComponentNameFromType(type) || "Unknown";
            didWarnAboutContextTypeOnFunctionComponent[_componentName2] ||
              (console.error(
                "%s: Function components do not support contextType.",
                _componentName2
              ),
              (didWarnAboutContextTypeOnFunctionComponent[_componentName2] =
                !0));
          }
          finishFunctionComponent(
            request,
            task,
            keyPath,
            value,
            hasId,
            actionStateCount,
            actionStateMatchingIndex$jscomp$0
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
          var _children = pushStartInstance(
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
          var _prevContext2 = task.formatContext,
            _prevKeyPath3 = task.keyPath;
          task.keyPath = keyPath;
          if (
            (task.formatContext = getChildFormatContext(
              _prevContext2,
              type,
              props
            )).insertionMode === HTML_HEAD_MODE
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
              renderNode(request, task, _children, -1),
                pushSegmentFinale(
                  preambleSegment.chunks,
                  request.renderState,
                  preambleSegment.lastPushedText,
                  preambleSegment.textEmbedded
                ),
                (preambleSegment.status = COMPLETED);
            } finally {
              task.blockedSegment = segment;
            }
          } else renderNode(request, task, _children, -1);
          task.formatContext = _prevContext2;
          task.keyPath = _prevKeyPath3;
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
                if (_prevContext2.insertionMode <= HTML_HTML_MODE) {
                  resumableState.hasBody = !0;
                  break a;
                }
                break;
              case "html":
                if (_prevContext2.insertionMode === ROOT_HTML_MODE) {
                  resumableState.hasHtml = !0;
                  break a;
                }
                break;
              case "head":
                if (_prevContext2.insertionMode <= HTML_HTML_MODE) break a;
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
              var _prevKeyPath4 = task.keyPath;
              task.keyPath = keyPath;
              renderNode(request, task, props.children, -1);
              task.keyPath = _prevKeyPath4;
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
                    validateIterable(
                      task,
                      children$jscomp$0,
                      -1,
                      iterator,
                      iteratorFn
                    );
                    var step = iterator.next();
                    if (!step.done) {
                      var rows = [];
                      do rows.push(step.value), (step = iterator.next());
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
                var _prevKeyPath2 = task.keyPath,
                  prevRow = task.row,
                  newRow = (task.row = createSuspenseListRow(null));
                newRow.boundaries = [];
                newRow.together = !0;
                task.keyPath = keyPath;
                renderNodeDestructive(request, task, children$jscomp$0, -1);
                0 === --newRow.pendingTasks &&
                  finishSuspenseListRow(request, newRow);
                task.keyPath = _prevKeyPath2;
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
            var _prevKeyPath5 = task.keyPath;
            task.keyPath = keyPath;
            renderNodeDestructive(request, task, props.children, -1);
            task.keyPath = _prevKeyPath5;
            return;
          case REACT_SUSPENSE_TYPE:
            a: if (null !== task.replay) {
              var _prevKeyPath = task.keyPath,
                _prevContext = task.formatContext,
                _prevRow = task.row;
              task.keyPath = keyPath;
              task.formatContext = getSuspenseContentFormatContext(
                request.resumableState,
                _prevContext
              );
              task.row = null;
              var _content = props.children;
              try {
                renderNode(request, task, _content, -1);
              } finally {
                (task.keyPath = _prevKeyPath),
                  (task.formatContext = _prevContext),
                  (task.row = _prevRow);
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
                  fallbackKeyPath = [
                    keyPath[0],
                    "Suspense Fallback",
                    keyPath[2]
                  ];
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
                    (boundarySegment.status = COMPLETED);
                } catch (thrownValue) {
                  throw (
                    ((boundarySegment.status = request.aborted
                      ? ABORTED
                      : ERRORED),
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
                  task.legacyContext,
                  task.debugTask
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
                    (contentRootSegment.status = COMPLETED),
                    queueCompletedSegment(newBoundary, contentRootSegment),
                    0 === newBoundary.pendingTasks &&
                      newBoundary.status === PENDING)
                  ) {
                    if (
                      ((newBoundary.status = COMPLETED),
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
                } catch (thrownValue$2) {
                  newBoundary.status = CLIENT_RENDERED;
                  if (request.aborted) {
                    contentRootSegment.status = ABORTED;
                    var error = request.fatalError;
                  } else
                    (contentRootSegment.status = ERRORED),
                      (error = thrownValue$2);
                  var thrownInfo = getThrownInfo(task.componentStack),
                    errorDigest = logRecoverableError(
                      request,
                      error,
                      thrownInfo,
                      task.debugTask
                    );
                  encodeErrorForBoundary(
                    newBoundary,
                    errorDigest,
                    error,
                    thrownInfo,
                    !1
                  );
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
                  task.legacyContext,
                  task.debugTask
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
              var value$jscomp$0 = props.value,
                children$jscomp$2 = props.children;
              var prevSnapshot = task.context;
              var prevKeyPath$jscomp$6 = task.keyPath;
              var prevValue = type._currentValue2;
              type._currentValue2 = value$jscomp$0;
              void 0 !== type._currentRenderer2 &&
                null !== type._currentRenderer2 &&
                type._currentRenderer2 !== rendererSigil &&
                console.error(
                  "Detected multiple renderers concurrently rendering the same context provider. This is currently unsupported."
                );
              type._currentRenderer2 = rendererSigil;
              var prevNode = currentActiveSnapshot,
                newNode = {
                  parent: prevNode,
                  depth: null === prevNode ? 0 : prevNode.depth + 1,
                  context: type,
                  parentValue: prevValue,
                  value: value$jscomp$0
                };
              currentActiveSnapshot = newNode;
              task.context = newNode;
              task.keyPath = keyPath;
              renderNodeDestructive(request, task, children$jscomp$2, -1);
              var prevSnapshot$jscomp$0 = currentActiveSnapshot;
              if (null === prevSnapshot$jscomp$0)
                throw Error(
                  "Tried to pop a Context at the root of the app. This is a bug in React."
                );
              prevSnapshot$jscomp$0.context !== type &&
                console.error(
                  "The parent context is not the expected context. This is probably a bug in React."
                );
              prevSnapshot$jscomp$0.context._currentValue2 =
                prevSnapshot$jscomp$0.parentValue;
              void 0 !== type._currentRenderer2 &&
                null !== type._currentRenderer2 &&
                type._currentRenderer2 !== rendererSigil &&
                console.error(
                  "Detected multiple renderers concurrently rendering the same context provider. This is currently unsupported."
                );
              type._currentRenderer2 = rendererSigil;
              var JSCompiler_inline_result$jscomp$0 = (currentActiveSnapshot =
                prevSnapshot$jscomp$0.parent);
              task.context = JSCompiler_inline_result$jscomp$0;
              task.keyPath = prevKeyPath$jscomp$6;
              prevSnapshot !== task.context &&
                console.error(
                  "Popping the context provider did not return back to the original snapshot. This is a bug in React."
                );
              return;
            case REACT_CONSUMER_TYPE:
              var context = type._context,
                render = props.children;
              "function" !== typeof render &&
                console.error(
                  "A context consumer was rendered with multiple children, or a child that isn't a function. A context consumer expects a single child that is a function. If you did pass a function, make sure there is no trailing or leading whitespace around it."
                );
              var newChildren = render(context._currentValue2),
                prevKeyPath$jscomp$7 = task.keyPath;
              task.keyPath = keyPath;
              renderNodeDestructive(request, task, newChildren, -1);
              task.keyPath = prevKeyPath$jscomp$7;
              return;
            case REACT_LAZY_TYPE:
              var Component = callLazyInitInDEV(type);
              if (request.aborted) throw null;
              renderElement(request, task, keyPath, Component, props, ref);
              return;
          }
        var info = "";
        if (
          void 0 === type ||
          ("object" === typeof type &&
            null !== type &&
            0 === Object.keys(type).length)
        )
          info +=
            " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
        throw Error(
          "Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: " +
            ((null == type ? type : typeof type) + "." + info)
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
          (resumedSegment.status = COMPLETED),
          null === blockedBoundary
            ? (request.completedRootSegment = resumedSegment)
            : (queueCompletedSegment(blockedBoundary, resumedSegment),
              blockedBoundary.parentFlushed &&
                request.partialBoundaries.push(blockedBoundary));
      } finally {
        (task.replay = prevReplay), (task.blockedSegment = null);
      }
    }
    function replayElement(
      request,
      task,
      keyPath,
      name,
      keyOrIndex,
      childIndex,
      type,
      props,
      ref,
      replay
    ) {
      childIndex = replay.nodes;
      for (var i = 0; i < childIndex.length; i++) {
        var node = childIndex[i];
        if (keyOrIndex === node[1]) {
          if (4 === node.length) {
            if (null !== name && name !== node[0])
              throw Error(
                "Expected the resume to render <" +
                  node[0] +
                  "> in this slot but instead it rendered <" +
                  name +
                  ">. The tree doesn't match so React will fallback to client rendering."
              );
            var childNodes = node[2],
              childSlots = node[3],
              currentNode = task.node;
            task.replay = {
              nodes: childNodes,
              slots: childSlots,
              pendingTasks: 1
            };
            try {
              renderElement(request, task, keyPath, type, props, ref);
              if (
                1 === task.replay.pendingTasks &&
                0 < task.replay.nodes.length
              )
                throw Error(
                  "Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering."
                );
              task.replay.pendingTasks--;
            } catch (x) {
              if (
                "object" === typeof x &&
                null !== x &&
                (x === SuspenseException || "function" === typeof x.then)
              )
                throw (
                  (task.node === currentNode
                    ? (task.replay = replay)
                    : childIndex.splice(i, 1),
                  x)
                );
              task.replay.pendingTasks--;
              keyPath = getThrownInfo(task.componentStack);
              props = request;
              currentNode = task.blockedBoundary;
              request = request.aborted ? request.fatalError : x;
              type = logRecoverableError(
                props,
                request,
                keyPath,
                task.debugTask
              );
              abortRemainingReplayNodes(
                props,
                currentNode,
                childNodes,
                childSlots,
                request,
                type,
                keyPath,
                !1
              );
            }
            task.replay = replay;
          } else {
            if (type !== REACT_SUSPENSE_TYPE)
              throw Error(
                "Expected the resume to render <Suspense> in this slot but instead it rendered <" +
                  (getComponentNameFromType(type) || "Unknown") +
                  ">. The tree doesn't match so React will fallback to client rendering."
              );
            a: {
              replay = request;
              request = keyPath;
              keyPath = node[5];
              type = node[2];
              ref = node[3];
              name = null === node[4] ? [] : node[4][2];
              node = null === node[4] ? null : node[4][3];
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
                replay,
                task.row,
                props,
                null,
                defer
              );
              defer.parentFlushed = !0;
              defer.rootSegmentID = keyPath;
              task.blockedBoundary = defer;
              task.hoistableState = defer.contentState;
              task.keyPath = request;
              task.formatContext = getSuspenseContentFormatContext(
                replay.resumableState,
                prevContext
              );
              task.row = null;
              task.replay = { nodes: type, slots: ref, pendingTasks: 1 };
              try {
                renderNode(replay, task, content, -1);
                if (
                  1 === task.replay.pendingTasks &&
                  0 < task.replay.nodes.length
                )
                  throw Error(
                    "Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering."
                  );
                task.replay.pendingTasks--;
                if (0 === defer.pendingTasks && defer.status === PENDING) {
                  defer.status = COMPLETED;
                  replay.completedBoundaries.push(defer);
                  break a;
                }
              } catch (thrownValue) {
                (defer.status = CLIENT_RENDERED),
                  (childNodes = replay.aborted
                    ? replay.fatalError
                    : thrownValue),
                  (childSlots = getThrownInfo(task.componentStack)),
                  (currentNode = logRecoverableError(
                    replay,
                    childNodes,
                    childSlots,
                    task.debugTask
                  )),
                  encodeErrorForBoundary(
                    defer,
                    currentNode,
                    childNodes,
                    childSlots,
                    !1
                  ),
                  task.replay.pendingTasks--,
                  replay.clientRenderedBoundaries.push(defer);
              } finally {
                (task.blockedBoundary = parentBoundary),
                  (task.hoistableState = parentHoistableState),
                  (task.replay = previousReplaySet),
                  (task.keyPath = keyOrIndex),
                  (task.formatContext = prevContext),
                  (task.row = prevRow);
              }
              props = createReplayTask(
                replay,
                null,
                { nodes: name, slots: node, pendingTasks: 0 },
                fallback,
                -1,
                parentBoundary,
                defer.fallbackState,
                props,
                [request[0], "Suspense Fallback", request[2]],
                getSuspenseFallbackFormatContext(
                  replay.resumableState,
                  task.formatContext
                ),
                task.context,
                task.treeContext,
                task.row,
                replaceSuspenseComponentStackWithSuspenseFallbackStack(
                  task.componentStack
                ),
                task.legacyContext,
                task.debugTask
              );
              pushComponentStack(props);
              replay.pingedTasks.push(props);
            }
          }
          childIndex.splice(i, 1);
          break;
        }
      }
    }
    function validateIterable(
      task,
      iterable,
      childIndex,
      iterator,
      iteratorFn
    ) {
      if (iterator === iterable) {
        if (
          -1 !== childIndex ||
          null === task.componentStack ||
          "function" !== typeof task.componentStack.type ||
          "[object GeneratorFunction]" !==
            Object.prototype.toString.call(task.componentStack.type) ||
          "[object Generator]" !== Object.prototype.toString.call(iterator)
        )
          didWarnAboutGenerators ||
            console.error(
              "Using Iterators as children is unsupported and will likely yield unexpected results because enumerating a generator mutates it. You may convert it to an array with `Array.from()` or the `[...spread]` operator before rendering. You can also use an Iterable that can iterate multiple times over the same items."
            ),
            (didWarnAboutGenerators = !0);
      } else
        iterable.entries !== iteratorFn ||
          didWarnAboutMaps ||
          (console.error(
            "Using Maps as children is not supported. Use an array of keyed ReactElements instead."
          ),
          (didWarnAboutMaps = !0));
    }
    function renderNodeDestructive(request, task, node, childIndex) {
      null !== task.replay && "number" === typeof task.replay.slots
        ? resumeNode(request, task, task.replay.slots, node, childIndex)
        : ((task.node = node),
          (task.childIndex = childIndex),
          (node = task.componentStack),
          (childIndex = task.debugTask),
          pushComponentStack(task),
          retryNode(request, task),
          (task.componentStack = node),
          (task.debugTask = childIndex));
    }
    function retryNode(request, task) {
      var node = task.node,
        childIndex = task.childIndex;
      if (null !== node) {
        if ("object" === typeof node) {
          switch (node.$$typeof) {
            case REACT_ELEMENT_TYPE:
              var type = node.type,
                key = node.key;
              node = node.props;
              var refProp = node.ref;
              refProp = void 0 !== refProp ? refProp : null;
              var debugTask = task.debugTask,
                name = getComponentNameFromType(type);
              key =
                null == key || key === REACT_OPTIMISTIC_KEY
                  ? -1 === childIndex
                    ? 0
                    : childIndex
                  : key;
              var keyPath = [task.keyPath, name, key];
              null !== task.replay
                ? debugTask
                  ? debugTask.run(
                      replayElement.bind(
                        null,
                        request,
                        task,
                        keyPath,
                        name,
                        key,
                        childIndex,
                        type,
                        node,
                        refProp,
                        task.replay
                      )
                    )
                  : replayElement(
                      request,
                      task,
                      keyPath,
                      name,
                      key,
                      childIndex,
                      type,
                      node,
                      refProp,
                      task.replay
                    )
                : debugTask
                  ? debugTask.run(
                      renderElement.bind(
                        null,
                        request,
                        task,
                        keyPath,
                        type,
                        node,
                        refProp
                      )
                    )
                  : renderElement(request, task, keyPath, type, node, refProp);
              return;
            case REACT_PORTAL_TYPE:
              throw Error(
                "Portals are not currently supported by the server renderer. Render them conditionally so that they only appear on the client render."
              );
            case REACT_LAZY_TYPE:
              type = callLazyInitInDEV(node);
              if (request.aborted) throw null;
              renderNodeDestructive(request, task, type, childIndex);
              return;
          }
          if (isArrayImpl(node)) {
            renderChildrenArray(request, task, node, childIndex);
            return;
          }
          if ((key = getIteratorFn(node)))
            if ((type = key.call(node))) {
              validateIterable(task, node, childIndex, type, key);
              node = type.next();
              if (!node.done) {
                key = [];
                do key.push(node.value), (node = type.next());
                while (!node.done);
                renderChildrenArray(request, task, key, childIndex);
              }
              return;
            }
          if ("function" === typeof node.then)
            return (
              (task.thenableState = null),
              renderNodeDestructive(
                request,
                task,
                unwrapThenable(node),
                childIndex
              )
            );
          if (node.$$typeof === REACT_CONTEXT_TYPE)
            return renderNodeDestructive(
              request,
              task,
              node._currentValue2,
              childIndex
            );
          request = Object.prototype.toString.call(node);
          throw Error(
            "Objects are not valid as a React child (found: " +
              ("[object Object]" === request
                ? "object with keys {" + Object.keys(node).join(", ") + "}"
                : request) +
              "). If you meant to render a collection of children, use an array instead."
          );
        }
        "string" === typeof node
          ? ((task = task.blockedSegment),
            null !== task &&
              (task.lastPushedText = pushTextInstance(
                task.chunks,
                node,
                request.renderState,
                task.lastPushedText
              )))
          : "number" === typeof node || "bigint" === typeof node
            ? ((task = task.blockedSegment),
              null !== task &&
                (task.lastPushedText = pushTextInstance(
                  task.chunks,
                  "" + node,
                  request.renderState,
                  task.lastPushedText
                )))
            : ("function" === typeof node &&
                ((request = node.displayName || node.name || "Component"),
                console.error(
                  "Functions are not valid as a React child. This may happen if you return %s instead of <%s /> from render. Or maybe you meant to call this function rather than return it.",
                  request,
                  request
                )),
              "symbol" === typeof node &&
                console.error(
                  "Symbols are not valid as a React child.\n  %s",
                  String(node)
                ));
      }
    }
    function warnForMissingKey(request, task, child) {
      if (
        null !== child &&
        "object" === typeof child &&
        (child.$$typeof === REACT_ELEMENT_TYPE ||
          child.$$typeof === REACT_PORTAL_TYPE) &&
        child._store &&
        ((!child._store.validated && null == child.key) ||
          2 === child._store.validated)
      ) {
        if ("object" !== typeof child._store)
          throw Error(
            "React Component in warnForMissingKey should have a _store. This error is likely caused by a bug in React. Please file an issue."
          );
        child._store.validated = 1;
        var didWarnForKey = request.didWarnForKey;
        null == didWarnForKey &&
          (didWarnForKey = request.didWarnForKey = new WeakSet());
        request = task.componentStack;
        if (null !== request && !didWarnForKey.has(request)) {
          didWarnForKey.add(request);
          var componentName = getComponentNameFromType(child.type);
          didWarnForKey = child._owner;
          var parentOwner = request.owner;
          request = "";
          if (parentOwner && "undefined" !== typeof parentOwner.type) {
            var name = getComponentNameFromType(parentOwner.type);
            name &&
              (request = "\n\nCheck the render method of `" + name + "`.");
          }
          request ||
            (componentName &&
              (request =
                "\n\nCheck the top-level render call using <" +
                componentName +
                ">."));
          componentName = "";
          null != didWarnForKey &&
            parentOwner !== didWarnForKey &&
            ((parentOwner = null),
            "undefined" !== typeof didWarnForKey.type
              ? (parentOwner = getComponentNameFromType(didWarnForKey.type))
              : "string" === typeof didWarnForKey.name &&
                (parentOwner = didWarnForKey.name),
            parentOwner &&
              (componentName =
                " It was passed a child from " + parentOwner + "."));
          didWarnForKey = task.componentStack;
          task.componentStack = {
            parent: task.componentStack,
            type: child.type,
            owner: child._owner,
            stack: child._debugStack
          };
          console.error(
            'Each child in a list should have a unique "key" prop.%s%s See https://react.dev/link/warning-keys for more information.',
            request,
            componentName
          );
          task.componentStack = didWarnForKey;
        }
      }
    }
    function renderChildrenArray(request, task, children, childIndex) {
      var prevKeyPath = task.keyPath,
        previousComponentStack = task.componentStack;
      var previousDebugTask = task.debugTask;
      pushServerComponentStack(task, task.node._debugInfo);
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
            var childSlots = node[3];
            task.replay = {
              nodes: childIndex,
              slots: childSlots,
              pendingTasks: 1
            };
            try {
              renderChildrenArray(request, task, children, -1);
              if (
                1 === task.replay.pendingTasks &&
                0 < task.replay.nodes.length
              )
                throw Error(
                  "Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering."
                );
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
              node = task.blockedBoundary;
              request = request.aborted ? request.fatalError : x;
              var errorDigest = logRecoverableError(
                children,
                request,
                thrownInfo,
                task.debugTask
              );
              abortRemainingReplayNodes(
                children,
                node,
                childIndex,
                childSlots,
                request,
                errorDigest,
                thrownInfo,
                !1
              );
            }
            task.replay = replay;
            replayNodes.splice(j, 1);
            break;
          }
        }
        task.keyPath = prevKeyPath;
        task.componentStack = previousComponentStack;
        task.debugTask = previousDebugTask;
        return;
      }
      replay = task.treeContext;
      replayNodes = children.length;
      if (
        null !== task.replay &&
        ((j = task.replay.slots), null !== j && "object" === typeof j)
      ) {
        for (node = 0; node < replayNodes; node++)
          (childIndex = children[node]),
            (task.treeContext = pushTreeContext(replay, replayNodes, node)),
            (childSlots = j[node]),
            "number" === typeof childSlots
              ? (resumeNode(request, task, childSlots, childIndex, node),
                delete j[node])
              : renderNode(request, task, childIndex, node);
        task.treeContext = replay;
        task.keyPath = prevKeyPath;
        task.componentStack = previousComponentStack;
        task.debugTask = previousDebugTask;
        return;
      }
      for (j = 0; j < replayNodes; j++)
        (node = children[j]),
          warnForMissingKey(request, task, node),
          (task.treeContext = pushTreeContext(replay, replayNodes, j)),
          renderNode(request, task, node, j);
      task.treeContext = replay;
      task.keyPath = prevKeyPath;
      task.componentStack = previousComponentStack;
      task.debugTask = previousDebugTask;
    }
    function trackPostponedBoundary(request, trackedPostpones, boundary) {
      boundary.status = POSTPONED;
      boundary.rootSegmentID = request.nextSegmentId++;
      var tracked = boundary.tracked;
      if (null === tracked)
        throw Error(
          "It should not be possible to postpone at the root. This is a bug in React."
        );
      request = tracked.contentKeyPath;
      if (null === request)
        throw Error(
          "It should not be possible to postpone at the root. This is a bug in React."
        );
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
      segment.status = POSTPONED;
      var keyPath = task.keyPath,
        boundary = task.blockedBoundary;
      if (null === boundary)
        (segment.id = request.nextSegmentId++),
          (trackedPostpones.rootSlots = segment.id),
          null !== request.completedRootSegment &&
            (request.completedRootSegment.status = POSTPONED);
      else {
        if (null !== boundary && boundary.status === PENDING) {
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
                throw Error(
                  "It should not be possible to postpone both at the root of an element as well as a slot below. This is a bug in React."
                );
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
            throw Error(
              "It should not be possible to postpone both at the root of an element as well as a slot below. This is a bug in React."
            );
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
        task.legacyContext,
        task.debugTask
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
        task.legacyContext,
        task.debugTask
      );
    }
    function renderNode(request, task, node, childIndex) {
      var previousFormatContext = task.formatContext,
        previousLegacyContext = task.legacyContext,
        previousContext = task.context,
        previousKeyPath = task.keyPath,
        previousTreeContext = task.treeContext,
        previousComponentStack = task.componentStack,
        previousDebugTask = task.debugTask,
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
              request = spawnNewSuspendedReplayTask(
                request,
                task,
                childIndex
              ).ping;
              node.then(request.resolve, request.reject);
              task.formatContext = previousFormatContext;
              task.legacyContext = previousLegacyContext;
              task.context = previousContext;
              task.keyPath = previousKeyPath;
              task.treeContext = previousTreeContext;
              task.componentStack = previousComponentStack;
              task.replay = segment;
              task.debugTask = previousDebugTask;
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
              task.debugTask = previousDebugTask;
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
        } catch (thrownValue$3) {
          if (
            (resetHooksState(),
            (segment.children.length = childrenLength),
            (segment.chunks.length = chunkLength),
            (node =
              thrownValue$3 === SuspenseException
                ? getSuspendedThenable()
                : thrownValue$3),
            !request.aborted && "object" === typeof node && null !== node)
          ) {
            if ("function" === typeof node.then) {
              segment = node;
              node =
                thrownValue$3 === SuspenseException
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
              task.debugTask = previousDebugTask;
              switchContext(previousContext);
              return;
            }
            if ("Maximum call stack size exceeded" === node.message) {
              segment =
                thrownValue$3 === SuspenseException
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
              task.debugTask = previousDebugTask;
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
        ((segment.status = ABORTED),
        finishedTask(this, boundary, task.row, segment));
    }
    function abortRemainingReplayNodes(
      request$jscomp$0,
      boundary,
      nodes,
      slots,
      error$jscomp$0,
      errorDigest$jscomp$0,
      errorInfo$jscomp$0,
      aborted
    ) {
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (4 === node.length)
          abortRemainingReplayNodes(
            request$jscomp$0,
            boundary,
            node[2],
            node[3],
            error$jscomp$0,
            errorDigest$jscomp$0,
            errorInfo$jscomp$0,
            aborted
          );
        else {
          var request = request$jscomp$0;
          node = node[5];
          var error = error$jscomp$0,
            errorDigest = errorDigest$jscomp$0,
            errorInfo = errorInfo$jscomp$0,
            wasAborted = aborted,
            resumedBoundary = createSuspenseBoundary(
              request,
              null,
              new Set(),
              null,
              !1
            );
          resumedBoundary.parentFlushed = !0;
          resumedBoundary.rootSegmentID = node;
          resumedBoundary.status = CLIENT_RENDERED;
          encodeErrorForBoundary(
            resumedBoundary,
            errorDigest,
            error,
            errorInfo,
            wasAborted
          );
          resumedBoundary.parentFlushed &&
            request.clientRenderedBoundaries.push(resumedBoundary);
        }
      }
      nodes.length = 0;
      if (null !== slots) {
        if (null === boundary)
          throw Error(
            "We should not have any resumable nodes in the shell. This is a bug in React."
          );
        boundary.status !== CLIENT_RENDERED &&
          ((boundary.status = CLIENT_RENDERED),
          encodeErrorForBoundary(
            boundary,
            errorDigest$jscomp$0,
            error$jscomp$0,
            errorInfo$jscomp$0,
            aborted
          ),
          boundary.parentFlushed &&
            request$jscomp$0.clientRenderedBoundaries.push(boundary));
        if ("object" === typeof slots)
          for (var index in slots) delete slots[index];
      }
    }
    function abortTask(task, request) {
      if (task !== request.currentTask) {
        var boundary = task.blockedBoundary,
          segment = task.blockedSegment;
        null !== segment && (segment.status = ABORTED);
        segment = task.node;
        if (null !== segment && "object" === typeof segment) {
          for (
            var debugInfo = segment._debugInfo;
            "object" === typeof segment &&
            null !== segment &&
            segment.$$typeof === REACT_LAZY_TYPE;

          ) {
            var payload = segment._payload;
            if ("fulfilled" === payload.status) segment = payload.value;
            else break;
          }
          "object" === typeof segment &&
            null !== segment &&
            (isArrayImpl(segment) ||
              "function" === typeof segment[ASYNC_ITERATOR] ||
              segment.$$typeof === REACT_ELEMENT_TYPE ||
              segment.$$typeof === REACT_LAZY_TYPE) &&
            isArrayImpl(segment._debugInfo) &&
            (debugInfo = segment._debugInfo);
          pushHaltedAwaitOnComponentStack(task, debugInfo);
          null !== task.thenableState &&
            pushSuspendedCallSiteOnComponentStack(request, task);
        }
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
        if (null === segment || segment.status === ABORTED) {
          var errorInfo = getThrownInfo(task.componentStack);
          if (null === boundary) {
            boundary = task.replay;
            if (null === boundary) {
              null !== request.trackedPostpones && null !== segment
                ? ((boundary = request.trackedPostpones),
                  logRecoverableError(
                    request,
                    error,
                    errorInfo,
                    task.debugTask
                  ),
                  trackPostpone(request, boundary, task, segment),
                  finishedTask(request, null, task.row, segment))
                : (logRecoverableError(
                    request,
                    error,
                    errorInfo,
                    task.debugTask
                  ),
                  12 !== request.status &&
                    request.status !== CLOSED &&
                    fatalError(request, error, errorInfo, task.debugTask));
              return;
            }
            12 !== request.status &&
              request.status !== CLOSED &&
              (boundary.pendingTasks--,
              0 === boundary.pendingTasks &&
                0 < boundary.nodes.length &&
                ((segment = logRecoverableError(
                  request,
                  error,
                  errorInfo,
                  null
                )),
                abortRemainingReplayNodes(
                  request,
                  null,
                  boundary.nodes,
                  boundary.slots,
                  error,
                  segment,
                  errorInfo,
                  !0
                )),
              request.pendingRootTasks--,
              0 === request.pendingRootTasks && completeShell(request));
          } else {
            var _trackedPostpones = request.trackedPostpones;
            if (boundary.status !== CLIENT_RENDERED) {
              if (null !== _trackedPostpones && null !== segment)
                return (
                  logRecoverableError(
                    request,
                    error,
                    errorInfo,
                    task.debugTask
                  ),
                  trackPostpone(request, _trackedPostpones, task, segment),
                  boundary.fallbackAbortableTasks.forEach(
                    function (fallbackTask) {
                      return finishAbortedTask(fallbackTask, request, error);
                    }
                  ),
                  boundary.fallbackAbortableTasks.clear(),
                  finishedTask(request, boundary, task.row, segment)
                );
              boundary.status = CLIENT_RENDERED;
              segment = logRecoverableError(
                request,
                error,
                errorInfo,
                task.debugTask
              );
              boundary.status = CLIENT_RENDERED;
              encodeErrorForBoundary(boundary, segment, error, errorInfo, !0);
              untrackBoundary(request, boundary);
              boundary.parentFlushed &&
                request.clientRenderedBoundaries.push(boundary);
            }
            boundary.pendingTasks--;
            errorInfo = boundary.row;
            null !== errorInfo &&
              0 === --errorInfo.pendingTasks &&
              finishSuspenseListRow(request, errorInfo);
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
    function finishAbortedTaskDEV(task, request, error) {
      var prevTaskInDEV = currentTaskInDEV,
        prevGetCurrentStackImpl = ReactSharedInternals.getCurrentStack;
      currentTaskInDEV = task;
      ReactSharedInternals.getCurrentStack = getCurrentStackInDEV;
      try {
        finishAbortedTask(task, request, error);
      } finally {
        (currentTaskInDEV = prevTaskInDEV),
          (ReactSharedInternals.getCurrentStack = prevGetCurrentStackImpl);
      }
    }
    function abortTaskDEV(task, request) {
      var prevTaskInDEV = currentTaskInDEV,
        prevGetCurrentStackImpl = ReactSharedInternals.getCurrentStack;
      currentTaskInDEV = task;
      ReactSharedInternals.getCurrentStack = getCurrentStackInDEV;
      try {
        abortTask(task, request);
      } finally {
        (currentTaskInDEV = prevTaskInDEV),
          (ReactSharedInternals.getCurrentStack = prevGetCurrentStackImpl);
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
                    props$jscomp$0 = sheet.props;
                  var header = getPreloadAsHeader(
                    props$jscomp$0.href,
                    "style",
                    {
                      crossOrigin: props$jscomp$0.crossOrigin,
                      integrity: props$jscomp$0.integrity,
                      nonce: props$jscomp$0.nonce,
                      type: props$jscomp$0.type,
                      fetchPriority: props$jscomp$0.fetchPriority,
                      referrerPolicy: props$jscomp$0.referrerPolicy,
                      media: props$jscomp$0.media
                    }
                  );
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
        logRecoverableError(request, error, {}, null);
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
              request.completedRootSegment.status !== POSTPONED
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
        (childSegment.status !== COMPLETED &&
          childSegment.status !== ABORTED &&
          childSegment.status !== ERRORED) ||
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
            throw Error(
              "There can only be one root segment. This is a bug in React."
            );
          request.completedRootSegment = segment;
        }
        request.pendingRootTasks--;
        0 === request.pendingRootTasks && completeShell(request);
      } else if ((boundary.pendingTasks--, boundary.status !== CLIENT_RENDERED))
        if (0 === boundary.pendingTasks)
          if (
            (boundary.status === PENDING && (boundary.status = COMPLETED),
            null !== segment &&
              segment.parentFlushed &&
              (segment.status === COMPLETED || segment.status === ABORTED) &&
              queueCompletedSegment(boundary, segment),
            boundary.parentFlushed &&
              request.completedBoundaries.push(boundary),
            boundary.status === COMPLETED)
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
              boundary.status === POSTPONED &&
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
            (segment.status !== COMPLETED && segment.status !== ABORTED) ||
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
        var prevGetCurrentStackImpl = ReactSharedInternals.getCurrentStack;
        ReactSharedInternals.getCurrentStack = getCurrentStackInDEV;
        var prevResumableState = currentResumableState;
        currentResumableState = request$jscomp$1.resumableState;
        try {
          var pingedTasks = request$jscomp$1.pingedTasks,
            i;
          for (i = 0; i < pingedTasks.length; i++) {
            var request = request$jscomp$1,
              task = pingedTasks[i],
              segment = task.blockedSegment;
            if (null === segment) {
              var prevTaskInDEV = void 0,
                task$jscomp$0 = task;
              if (0 !== task$jscomp$0.replay.pendingTasks) {
                var prevTask = request.currentTask;
                request.currentTask = task$jscomp$0;
                switchContext(task$jscomp$0.context);
                prevTaskInDEV = currentTaskInDEV;
                currentTaskInDEV = task$jscomp$0;
                try {
                  "number" === typeof task$jscomp$0.replay.slots
                    ? resumeNode(
                        request,
                        task$jscomp$0,
                        task$jscomp$0.replay.slots,
                        task$jscomp$0.node,
                        task$jscomp$0.childIndex
                      )
                    : retryNode(request, task$jscomp$0);
                  if (
                    1 === task$jscomp$0.replay.pendingTasks &&
                    0 < task$jscomp$0.replay.nodes.length
                  )
                    throw Error(
                      "Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering."
                    );
                  task$jscomp$0.replay.pendingTasks--;
                  task$jscomp$0.abortSet.delete(task$jscomp$0);
                  finishedTask(
                    request,
                    task$jscomp$0.blockedBoundary,
                    task$jscomp$0.row,
                    null
                  );
                } catch (thrownValue) {
                  resetHooksState();
                  var x =
                    thrownValue === SuspenseException
                      ? getSuspendedThenable()
                      : thrownValue;
                  if (request.aborted) {
                    thrownValue === SuspenseException &&
                      (task$jscomp$0.thenableState =
                        getThenableStateAfterSuspending());
                    request.currentTask = prevTask;
                    var request$jscomp$0 = request;
                    abortTaskDEV(task$jscomp$0, request$jscomp$0);
                    task$jscomp$0.abortSet.delete(task$jscomp$0);
                    finishAbortedTaskDEV(
                      task$jscomp$0,
                      request$jscomp$0,
                      request$jscomp$0.fatalError
                    );
                  } else if (
                    "object" === typeof x &&
                    null !== x &&
                    "function" === typeof x.then
                  ) {
                    var ping = task$jscomp$0.ping;
                    x.then(ping.resolve, ping.reject);
                    task$jscomp$0.thenableState =
                      thrownValue === SuspenseException
                        ? getThenableStateAfterSuspending()
                        : null;
                  } else {
                    task$jscomp$0.replay.pendingTasks--;
                    task$jscomp$0.abortSet.delete(task$jscomp$0);
                    var errorInfo = getThrownInfo(task$jscomp$0.componentStack);
                    request$jscomp$0 = request;
                    var boundary = task$jscomp$0.blockedBoundary,
                      error$jscomp$0 = request.aborted ? request.fatalError : x,
                      errorInfo$jscomp$0 = errorInfo,
                      replayNodes = task$jscomp$0.replay.nodes,
                      resumeSlots = task$jscomp$0.replay.slots,
                      errorDigest = logRecoverableError(
                        request$jscomp$0,
                        error$jscomp$0,
                        errorInfo$jscomp$0,
                        task$jscomp$0.debugTask
                      );
                    abortRemainingReplayNodes(
                      request$jscomp$0,
                      boundary,
                      replayNodes,
                      resumeSlots,
                      error$jscomp$0,
                      errorDigest,
                      errorInfo$jscomp$0,
                      !1
                    );
                    request.pendingRootTasks--;
                    0 === request.pendingRootTasks && completeShell(request);
                    request.allPendingTasks--;
                    0 === request.allPendingTasks && completeAll(request);
                  }
                } finally {
                  (request.currentTask = prevTask),
                    (currentTaskInDEV = prevTaskInDEV);
                }
              }
            } else if (
              ((prevTaskInDEV = void 0),
              (task$jscomp$0 = task),
              (request$jscomp$0 = segment),
              request$jscomp$0.status === PENDING)
            ) {
              var prevTask$jscomp$0 = request.currentTask;
              request.currentTask = task$jscomp$0;
              switchContext(task$jscomp$0.context);
              prevTaskInDEV = currentTaskInDEV;
              currentTaskInDEV = task$jscomp$0;
              var childrenLength = request$jscomp$0.children.length,
                chunkLength = request$jscomp$0.chunks.length;
              try {
                retryNode(request, task$jscomp$0),
                  pushSegmentFinale(
                    request$jscomp$0.chunks,
                    request.renderState,
                    request$jscomp$0.lastPushedText,
                    request$jscomp$0.textEmbedded
                  ),
                  task$jscomp$0.abortSet.delete(task$jscomp$0),
                  (request$jscomp$0.status = COMPLETED),
                  finishedTask(
                    request,
                    task$jscomp$0.blockedBoundary,
                    task$jscomp$0.row,
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
                    (task$jscomp$0.thenableState =
                      getThenableStateAfterSuspending()),
                    (request.currentTask = prevTask$jscomp$0),
                    (request$jscomp$0 = request),
                    abortTaskDEV(task$jscomp$0, request$jscomp$0),
                    task$jscomp$0.abortSet.delete(task$jscomp$0),
                    finishAbortedTaskDEV(
                      task$jscomp$0,
                      request$jscomp$0,
                      request$jscomp$0.fatalError
                    );
                else if (
                  "object" === typeof x$jscomp$0 &&
                  null !== x$jscomp$0 &&
                  "function" === typeof x$jscomp$0.then
                ) {
                  request$jscomp$0.status = PENDING;
                  task$jscomp$0.thenableState =
                    thrownValue === SuspenseException
                      ? getThenableStateAfterSuspending()
                      : null;
                  var ping$jscomp$0 = task$jscomp$0.ping;
                  x$jscomp$0.then(ping$jscomp$0.resolve, ping$jscomp$0.reject);
                } else {
                  var errorInfo$jscomp$1 = getThrownInfo(
                    task$jscomp$0.componentStack
                  );
                  task$jscomp$0.abortSet.delete(task$jscomp$0);
                  request$jscomp$0.status = ERRORED;
                  var boundary$jscomp$0 = task$jscomp$0.blockedBoundary,
                    row = task$jscomp$0.row,
                    debugTask = task$jscomp$0.debugTask;
                  null !== row &&
                    0 === --row.pendingTasks &&
                    finishSuspenseListRow(request, row);
                  request.allPendingTasks--;
                  var errorDigest$jscomp$0 = logRecoverableError(
                    request,
                    x$jscomp$0,
                    errorInfo$jscomp$1,
                    debugTask
                  );
                  if (null === boundary$jscomp$0)
                    fatalError(
                      request,
                      x$jscomp$0,
                      errorInfo$jscomp$1,
                      debugTask
                    );
                  else {
                    boundary$jscomp$0.pendingTasks--;
                    if (boundary$jscomp$0.status !== CLIENT_RENDERED) {
                      boundary$jscomp$0.status = CLIENT_RENDERED;
                      encodeErrorForBoundary(
                        boundary$jscomp$0,
                        errorDigest$jscomp$0,
                        x$jscomp$0,
                        errorInfo$jscomp$1,
                        !1
                      );
                      untrackBoundary(request, boundary$jscomp$0);
                      var boundaryRow = boundary$jscomp$0.row;
                      null !== boundaryRow &&
                        (request.allPendingTasks++,
                        0 === --boundaryRow.pendingTasks &&
                          finishSuspenseListRow(request, boundaryRow),
                        request.allPendingTasks--);
                      boundary$jscomp$0.parentFlushed &&
                        request.clientRenderedBoundaries.push(
                          boundary$jscomp$0
                        );
                      0 === request.pendingRootTasks &&
                        null === request.trackedPostpones &&
                        null !== boundary$jscomp$0.preamble &&
                        preparePreamble(request);
                    }
                    0 === request.allPendingTasks && completeAll(request);
                  }
                }
              } finally {
                (request.currentTask = prevTask$jscomp$0),
                  (currentTaskInDEV = prevTaskInDEV);
              }
            }
          }
          pingedTasks.splice(0, i);
          null !== request$jscomp$1.destination &&
            flushCompletedQueues(
              request$jscomp$1,
              request$jscomp$1.destination
            );
        } catch (error) {
          (pingedTasks = {}),
            logRecoverableError(request$jscomp$1, error, pingedTasks, null),
            fatalError(request$jscomp$1, error, pingedTasks, null);
        } finally {
          (currentResumableState = prevResumableState),
            (ReactSharedInternals.H = prevDispatcher),
            (ReactSharedInternals.A = prevAsyncDispatcher),
            (ReactSharedInternals.getCurrentStack = prevGetCurrentStackImpl),
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
        case COMPLETED:
          hoistPreambleState(request.renderState, preamble.content);
          request.byteSize += boundary.byteSize;
          segment = boundary.completedSegments[0];
          if (!segment)
            throw Error(
              "A previously unvisited boundary must have exactly one root segment. This is a bug in React."
            );
          return preparePreambleFromSubtree(
            request,
            segment,
            collectedPreambleSegments
          );
        case POSTPONED:
          if (null !== request.trackedPostpones) return !0;
        case CLIENT_RENDERED:
          if (segment.status === COMPLETED)
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
        !1 === hasPendingPreambles ||
        (preamble.headChunks && preamble.bodyChunks)
          ? (request.completedPreambleSegments = collectedPreambleSegments)
          : (request.byteSize = originalRequestByteSize);
      }
    }
    function flushSubtree(request, destination, segment, hoistableState) {
      segment.parentFlushed = !0;
      switch (segment.status) {
        case PENDING:
          segment.id = request.nextSegmentId++;
        case POSTPONED:
          return (
            (hoistableState = segment.id),
            (segment.lastPushedText = !1),
            (segment.textEmbedded = !1),
            (request = request.renderState),
            destination.push(placeholder1),
            destination.push(request.placeholderPrefix),
            (request = hoistableState.toString(16)),
            destination.push(request),
            destination.push(placeholder2)
          );
        case COMPLETED:
          segment.status = FLUSHED;
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
        case ABORTED:
          return !0;
        default:
          throw Error(
            "Aborted, errored or already flushed boundaries should not be flushed again. This is a bug in React."
          );
      }
    }
    function flushSegment(request, destination, segment, hoistableState) {
      var boundary = segment.boundary;
      if (null === boundary)
        return flushSubtree(request, destination, segment, hoistableState);
      segment.boundary = null;
      boundary.parentFlushed = !0;
      if (boundary.status === CLIENT_RENDERED) {
        var row = boundary.row;
        null !== row &&
          0 === --row.pendingTasks &&
          finishSuspenseListRow(request, row);
        if (!request.renderState.generateStaticMarkup) {
          var errorDigest = boundary.errorDigest,
            errorMessage = boundary.errorMessage;
          row = boundary.errorStack;
          boundary = boundary.errorComponentStack;
          destination.push(startClientRenderedSuspenseBoundary);
          destination.push(clientRenderedSuspenseBoundaryError1);
          errorDigest &&
            (destination.push(clientRenderedSuspenseBoundaryError1A),
            (errorDigest = escapeTextForBrowser(errorDigest)),
            destination.push(errorDigest),
            destination.push(
              clientRenderedSuspenseBoundaryErrorAttrInterstitial
            ));
          errorMessage &&
            (destination.push(clientRenderedSuspenseBoundaryError1B),
            (errorMessage = escapeTextForBrowser(errorMessage)),
            destination.push(errorMessage),
            destination.push(
              clientRenderedSuspenseBoundaryErrorAttrInterstitial
            ));
          row &&
            (destination.push(clientRenderedSuspenseBoundaryError1C),
            (row = escapeTextForBrowser(row)),
            destination.push(row),
            destination.push(
              clientRenderedSuspenseBoundaryErrorAttrInterstitial
            ));
          boundary &&
            (destination.push(clientRenderedSuspenseBoundaryError1D),
            (row = escapeTextForBrowser(boundary)),
            destination.push(row),
            destination.push(
              clientRenderedSuspenseBoundaryErrorAttrInterstitial
            ));
          destination.push(clientRenderedSuspenseBoundaryError2);
        }
        flushSubtree(request, destination, segment, hoistableState);
        request = request.renderState.generateStaticMarkup
          ? !0
          : destination.push(endSuspenseBoundary);
        return request;
      }
      if (boundary.status !== COMPLETED)
        return (
          boundary.status === PENDING &&
            (boundary.rootSegmentID = request.nextSegmentId++),
          0 < boundary.completedSegments.length &&
            request.partialBoundaries.push(boundary),
          writeStartPendingSuspenseBoundary(
            destination,
            request.renderState,
            boundary.rootSegmentID
          ),
          hoistableState &&
            hoistHoistables(hoistableState, boundary.fallbackState),
          flushSubtree(request, destination, segment, hoistableState),
          destination.push(endSuspenseBoundary)
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
          destination.push(endSuspenseBoundary)
        );
      flushedByteSize += boundary.byteSize;
      hoistableState && hoistHoistables(hoistableState, boundary.contentState);
      segment = boundary.row;
      null !== segment &&
        isEligibleForOutlining(request, boundary) &&
        0 === --segment.pendingTasks &&
        finishSuspenseListRow(request, segment);
      request.renderState.generateStaticMarkup ||
        destination.push(startCompletedSuspenseBoundary);
      segment = boundary.completedSegments;
      if (1 !== segment.length)
        throw Error(
          "A previously unvisited boundary must have exactly one root segment. This is a bug in React."
        );
      flushSegment(request, destination, segment[0], hoistableState);
      request = request.renderState.generateStaticMarkup
        ? !0
        : destination.push(endSuspenseBoundary);
      return request;
    }
    function flushSegmentContainer(
      request,
      destination,
      segment,
      hoistableState
    ) {
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
          enableViewTransition &&
          (completedSegments.instructions & NeedUpgradeToViewTransitions) !==
            NothingSent;
      request.stylesToHoist = !1;
      var scriptFormat =
        completedSegments.streamingFormat === ScriptStreamingFormat;
      scriptFormat
        ? (destination.push(request.startInlineScript),
          destination.push(endOfStartTag),
          requiresStyleInsertion
            ? ((completedSegments.instructions & SentClientRenderFunction) ===
                NothingSent &&
                ((completedSegments.instructions |= SentClientRenderFunction),
                destination.push(clientRenderScriptFunctionOnly)),
              (completedSegments.instructions &
                SentCompleteBoundaryFunction) ===
                NothingSent &&
                ((completedSegments.instructions |=
                  SentCompleteBoundaryFunction),
                destination.push(completeBoundaryScriptFunctionOnly)),
              requiresViewTransitions &&
                (completedSegments.instructions &
                  SentUpgradeToViewTransitions) ===
                  NothingSent &&
                ((completedSegments.instructions |=
                  SentUpgradeToViewTransitions),
                destination.push(
                  completeBoundaryUpgradeToViewTransitionsInstruction
                )),
              (completedSegments.instructions & SentStyleInsertionFunction) ===
              NothingSent
                ? ((completedSegments.instructions |=
                    SentStyleInsertionFunction),
                  destination.push(
                    completeBoundaryWithStylesScript1FullPartial
                  ))
                : destination.push(completeBoundaryWithStylesScript1Partial))
            : ((completedSegments.instructions &
                SentCompleteBoundaryFunction) ===
                NothingSent &&
                ((completedSegments.instructions |=
                  SentCompleteBoundaryFunction),
                destination.push(completeBoundaryScriptFunctionOnly)),
              requiresViewTransitions &&
                (completedSegments.instructions &
                  SentUpgradeToViewTransitions) ===
                  NothingSent &&
                ((completedSegments.instructions |=
                  SentUpgradeToViewTransitions),
                destination.push(
                  completeBoundaryUpgradeToViewTransitionsInstruction
                )),
              destination.push(completeBoundaryScript1Partial)))
        : requiresStyleInsertion
          ? destination.push(completeBoundaryWithStylesData1)
          : destination.push(completeBoundaryData1);
      completedSegments = i.toString(16);
      destination.push(request.boundaryPrefix);
      destination.push(completedSegments);
      scriptFormat
        ? destination.push(completeBoundaryScript2)
        : destination.push(completeBoundaryData2);
      destination.push(request.segmentPrefix);
      destination.push(completedSegments);
      requiresStyleInsertion
        ? scriptFormat
          ? (destination.push(completeBoundaryScript3a),
            writeStyleResourceDependenciesInJS(destination, boundary))
          : (destination.push(completeBoundaryData3a),
            writeStyleResourceDependenciesInAttr(destination, boundary))
        : scriptFormat && destination.push(completeBoundaryScript3b);
      completedSegments = scriptFormat
        ? destination.push(completeBoundaryScriptEnd)
        : destination.push(completeBoundaryDataEnd);
      return writeBootstrap(destination, request) && completedSegments;
    }
    function flushPartiallyCompletedSegment(
      request,
      destination,
      boundary,
      segment
    ) {
      if (segment.status === FLUSHED) return !0;
      var hoistableState = boundary.contentState,
        segmentID = segment.id;
      if (-1 === segmentID) {
        if (-1 === (segment.id = boundary.rootSegmentID))
          throw Error(
            "A root segment ID must have been assigned by now. This is a bug in React."
          );
        return flushSegmentContainer(
          request,
          destination,
          segment,
          hoistableState
        );
      }
      if (segmentID === boundary.rootSegmentID)
        return flushSegmentContainer(
          request,
          destination,
          segment,
          hoistableState
        );
      flushSegmentContainer(request, destination, segment, hoistableState);
      boundary = request.resumableState;
      request = request.renderState;
      (segment = boundary.streamingFormat === ScriptStreamingFormat)
        ? (destination.push(request.startInlineScript),
          destination.push(endOfStartTag),
          (boundary.instructions & SentCompleteSegmentFunction) === NothingSent
            ? ((boundary.instructions |= SentCompleteSegmentFunction),
              destination.push(completeSegmentScript1Full))
            : destination.push(completeSegmentScript1Partial))
        : destination.push(completeSegmentData1);
      destination.push(request.segmentPrefix);
      segmentID = segmentID.toString(16);
      destination.push(segmentID);
      segment
        ? destination.push(completeSegmentScript2)
        : destination.push(completeSegmentData2);
      destination.push(request.placeholderPrefix);
      destination.push(segmentID);
      destination = segment
        ? destination.push(completeSegmentScriptEnd)
        : destination.push(completeSegmentDataEnd);
      return destination;
    }
    function flushCompletedQueues(request, destination) {
      try {
        if (!(0 < request.pendingRootTasks)) {
          var i,
            completedRootSegment = request.completedRootSegment;
          if (null !== completedRootSegment) {
            if (completedRootSegment.status === POSTPONED) return;
            var completedPreambleSegments = request.completedPreambleSegments;
            if (null === completedPreambleSegments) return;
            flushedByteSize = request.byteSize;
            var blockingRenderMaxSize = 40 * request.progressiveChunkSize;
            flushedByteSize > blockingRenderMaxSize &&
              logRecoverableError(
                request,
                Error(
                  "This rendered a large document (>" +
                    Math.round(blockingRenderMaxSize / 1e3) +
                    " kB) without any Suspense boundaries around most of it. That can delay initial paint longer than necessary. To improve load performance, add a <Suspense> or <SuspenseList> around the content you expect to be below the header or below the fold. In the meantime, the content will deopt to paint arbitrary incomplete pieces of HTML."
                ),
                {},
                null
              );
            var resumableState = request.resumableState,
              renderState = request.renderState;
            if (renderState.externalRuntimeScript) {
              var _renderState$external = renderState.externalRuntimeScript,
                src = _renderState$external.src,
                chunks = _renderState$external.chunks;
              resumableState.scriptResources.hasOwnProperty(src) ||
                ((resumableState.scriptResources[src] = EXISTS),
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
                for (
                  i$jscomp$0 = 0;
                  i$jscomp$0 < headChunks.length;
                  i$jscomp$0++
                )
                  destination.push(headChunks[i$jscomp$0]);
              else {
                var chunk = startChunkForTag("head");
                destination.push(chunk);
                destination.push(endOfStartTag);
              }
            } else if (headChunks)
              for (i$jscomp$0 = 0; i$jscomp$0 < headChunks.length; i$jscomp$0++)
                destination.push(headChunks[i$jscomp$0]);
            var charsetChunks = renderState.charsetChunks;
            for (
              i$jscomp$0 = 0;
              i$jscomp$0 < charsetChunks.length;
              i$jscomp$0++
            )
              destination.push(charsetChunks[i$jscomp$0]);
            charsetChunks.length = 0;
            renderState.preconnects.forEach(flushResource, destination);
            renderState.preconnects.clear();
            var viewportChunks = renderState.viewportChunks;
            for (
              i$jscomp$0 = 0;
              i$jscomp$0 < viewportChunks.length;
              i$jscomp$0++
            )
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
            for (
              i$jscomp$0 = 0;
              i$jscomp$0 < importMapChunks.length;
              i$jscomp$0++
            )
              destination.push(importMapChunks[i$jscomp$0]);
            importMapChunks.length = 0;
            renderState.bootstrapScripts.forEach(flushResource, destination);
            renderState.scripts.forEach(flushResource, destination);
            renderState.scripts.clear();
            renderState.bulkPreloads.forEach(flushResource, destination);
            renderState.bulkPreloads.clear();
            resumableState.instructions |= SentCompletedShellId;
            var hoistableChunks = renderState.hoistableChunks;
            for (
              i$jscomp$0 = 0;
              i$jscomp$0 < hoistableChunks.length;
              i$jscomp$0++
            )
              destination.push(hoistableChunks[i$jscomp$0]);
            for (
              blockingRenderMaxSize = hoistableChunks.length = 0;
              blockingRenderMaxSize < completedPreambleSegments.length;
              blockingRenderMaxSize++
            ) {
              var segments = completedPreambleSegments[blockingRenderMaxSize];
              for (
                resumableState = 0;
                resumableState < segments.length;
                resumableState++
              )
                flushSegment(
                  request,
                  destination,
                  segments[resumableState],
                  null
                );
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
              resumableState$jscomp$0.streamingFormat !==
                ScriptStreamingFormat ||
              (resumableState$jscomp$0.instructions & SentMarkShellTime) !==
                NothingSent ||
              ((resumableState$jscomp$0.instructions |= SentMarkShellTime),
              destination.push(renderState$jscomp$0.startInlineScript),
              writeCompletedShellIdAttribute(
                destination,
                resumableState$jscomp$0
              ),
              destination.push(endOfStartTag),
              destination.push(shellTimeRuntimeScript),
              destination.push(endInlineScript));
            var preamble$jscomp$1 = renderState$jscomp$0.preamble;
            if (
              (preamble$jscomp$1.htmlChunks || preamble$jscomp$1.headChunks) &&
              (resumableState$jscomp$0.instructions & SentCompletedShellId) ===
                NothingSent
            ) {
              var chunk$jscomp$1 = startChunkForTag("template");
              destination.push(chunk$jscomp$1);
              writeCompletedShellIdAttribute(
                destination,
                resumableState$jscomp$0
              );
              destination.push(endOfStartTag);
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
              errorMessage = boundary.errorMessage,
              errorStack = boundary.errorStack,
              errorComponentStack = boundary.errorComponentStack,
              scriptFormat =
                resumableState$jscomp$1.streamingFormat ===
                ScriptStreamingFormat;
            scriptFormat
              ? (renderState$jscomp$1.push(
                  renderState$jscomp$2.startInlineScript
                ),
                renderState$jscomp$1.push(endOfStartTag),
                (resumableState$jscomp$1.instructions &
                  SentClientRenderFunction) ===
                NothingSent
                  ? ((resumableState$jscomp$1.instructions |=
                      SentClientRenderFunction),
                    renderState$jscomp$1.push(clientRenderScript1Full))
                  : renderState$jscomp$1.push(clientRenderScript1Partial))
              : renderState$jscomp$1.push(clientRenderData1);
            renderState$jscomp$1.push(renderState$jscomp$2.boundaryPrefix);
            var chunk$jscomp$3 = id.toString(16);
            renderState$jscomp$1.push(chunk$jscomp$3);
            scriptFormat && renderState$jscomp$1.push(clientRenderScript1A);
            if (
              errorDigest ||
              errorMessage ||
              errorStack ||
              errorComponentStack
            )
              if (scriptFormat) {
                renderState$jscomp$1.push(
                  clientRenderErrorScriptArgInterstitial
                );
                var chunk$jscomp$4 = escapeJSStringsForInstructionScripts(
                  errorDigest || ""
                );
                renderState$jscomp$1.push(chunk$jscomp$4);
              } else {
                renderState$jscomp$1.push(clientRenderData2);
                var chunk$jscomp$5 = escapeTextForBrowser(errorDigest || "");
                renderState$jscomp$1.push(chunk$jscomp$5);
              }
            if (errorMessage || errorStack || errorComponentStack)
              if (scriptFormat) {
                renderState$jscomp$1.push(
                  clientRenderErrorScriptArgInterstitial
                );
                var chunk$jscomp$6 = escapeJSStringsForInstructionScripts(
                  errorMessage || ""
                );
                renderState$jscomp$1.push(chunk$jscomp$6);
              } else {
                renderState$jscomp$1.push(clientRenderData3);
                var chunk$jscomp$7 = escapeTextForBrowser(errorMessage || "");
                renderState$jscomp$1.push(chunk$jscomp$7);
              }
            if (errorStack || errorComponentStack)
              if (scriptFormat) {
                renderState$jscomp$1.push(
                  clientRenderErrorScriptArgInterstitial
                );
                var chunk$jscomp$8 = escapeJSStringsForInstructionScripts(
                  errorStack || ""
                );
                renderState$jscomp$1.push(chunk$jscomp$8);
              } else {
                renderState$jscomp$1.push(clientRenderData4);
                var chunk$jscomp$9 = escapeTextForBrowser(errorStack || "");
                renderState$jscomp$1.push(chunk$jscomp$9);
              }
            if (errorComponentStack)
              if (scriptFormat) {
                renderState$jscomp$1.push(
                  clientRenderErrorScriptArgInterstitial
                );
                var chunk$jscomp$10 =
                  escapeJSStringsForInstructionScripts(errorComponentStack);
                renderState$jscomp$1.push(chunk$jscomp$10);
              } else {
                renderState$jscomp$1.push(clientRenderData5);
                var chunk$jscomp$11 = escapeTextForBrowser(errorComponentStack);
                renderState$jscomp$1.push(chunk$jscomp$11);
              }
            var JSCompiler_inline_result = scriptFormat
              ? renderState$jscomp$1.push(clientRenderScriptEnd)
              : renderState$jscomp$1.push(clientRenderDataEnd);
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
              !flushCompletedBoundary(
                request,
                destination,
                completedBoundaries[i]
              )
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
            a: {
              clientRenderedBoundaries = request;
              boundary = destination;
              var boundary$jscomp$0 = partialBoundaries[i];
              flushedByteSize = boundary$jscomp$0.byteSize;
              var completedSegments = boundary$jscomp$0.completedSegments;
              for (
                JSCompiler_inline_result = 0;
                JSCompiler_inline_result < completedSegments.length;
                JSCompiler_inline_result++
              )
                if (
                  !flushPartiallyCompletedSegment(
                    clientRenderedBoundaries,
                    boundary,
                    boundary$jscomp$0,
                    completedSegments[JSCompiler_inline_result]
                  )
                ) {
                  JSCompiler_inline_result++;
                  completedSegments.splice(0, JSCompiler_inline_result);
                  var JSCompiler_inline_result$jscomp$0 = !1;
                  break a;
                }
              completedSegments.splice(0, JSCompiler_inline_result);
              var row = boundary$jscomp$0.row;
              null !== row &&
                row.together &&
                1 === boundary$jscomp$0.pendingTasks &&
                (1 === row.pendingTasks
                  ? unblockSuspenseListRow(
                      clientRenderedBoundaries,
                      row,
                      row.hoistables
                    )
                  : row.pendingTasks--);
              JSCompiler_inline_result$jscomp$0 = writeHoistablesForBoundary(
                boundary,
                boundary$jscomp$0.contentState,
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
            if (
              !flushCompletedBoundary(request, destination, largeBoundaries[i])
            ) {
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
            0 !== request.abortableTasks.size &&
              console.error(
                "There was still abortable task at the root when we closed. This is a bug in React."
              ),
            (request.status = CLOSED),
            destination.push(null),
            (request.destination = null));
      }
    }
    function startWork(request) {
      request.flushScheduled = null !== request.destination;
      performWork(request);
      10 === request.status && (request.status = 11);
      null === request.trackedPostpones &&
        safelyEmitEarlyPreloads(request, 0 === request.pendingRootTasks);
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
        (request.status = CLOSED), destination.destroy(request.fatalError);
      else if (request.status !== CLOSED && null === request.destination) {
        request.destination = destination;
        try {
          flushCompletedQueues(request, destination);
        } catch (error) {
          (destination = {}),
            logRecoverableError(request, error, destination, null),
            fatalError(request, error, destination, null);
        }
      }
    }
    function finishAbort(request, abortableTasks) {
      try {
        if (0 < abortableTasks.size) {
          var error = request.fatalError;
          abortableTasks.forEach(function (task) {
            return finishAbortedTaskDEV(task, request, error);
          });
          abortableTasks.clear();
        }
        null !== request.destination &&
          flushCompletedQueues(request, request.destination);
      } catch (error$4) {
        (abortableTasks = {}),
          logRecoverableError(request, error$4, abortableTasks, null),
          fatalError(request, error$4, abortableTasks, null);
      }
    }
    function abort(request, reason) {
      request.aborted ||
        (11 !== request.status && 10 !== request.status) ||
        ((request.aborted = !0),
        (request.fatalError =
          void 0 === reason
            ? Error("The render was aborted by the server without a reason.")
            : "object" === typeof reason &&
                null !== reason &&
                "function" === typeof reason.then
              ? Error("The render was aborted by the server with a promise.")
              : reason),
        (reason = request.abortableTasks),
        reason.forEach(function (task) {
          return abortTaskDEV(task, request);
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
        createFormatContext(ROOT_HTML_MODE, null, 0, null),
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
      startWork(children);
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
      if (!readyToStream)
        throw Error(
          "A component suspended while responding to synchronous input. This will cause the UI to be replaced with a loading indicator. To fix, updates that suspend should be wrapped with startTransition."
        );
      return result;
    }
    var React = require("react"),
      ReactDOM = require("react-dom"),
      REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
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
      MAYBE_ITERATOR_SYMBOL = Symbol.iterator,
      ASYNC_ITERATOR = Symbol.asyncIterator,
      REACT_OPTIMISTIC_KEY = Symbol.for("react.optimistic_key"),
      isArrayImpl = Array.isArray,
      dynamicFeatureFlags = require("ReactFeatureFlags"),
      disableLegacyContextForFunctionComponents =
        dynamicFeatureFlags.disableLegacyContextForFunctionComponents,
      enableTransitionTracing = dynamicFeatureFlags.enableTransitionTracing,
      enableViewTransition = dynamicFeatureFlags.enableViewTransition,
      jsxPropsParents = new WeakMap(),
      jsxChildrenParents = new WeakMap(),
      CLIENT_REFERENCE_TAG = Symbol.for("react.client.reference"),
      assign = Object.assign,
      hasOwnProperty = Object.prototype.hasOwnProperty,
      VALID_ATTRIBUTE_NAME_REGEX = RegExp(
        "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
      ),
      illegalAttributeNameCache = {},
      validatedAttributeNameCache = {},
      unitlessNumbers = new Set(
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
      hasReadOnlyValue = {
        button: !0,
        checkbox: !0,
        image: !0,
        hidden: !0,
        radio: !0,
        reset: !0,
        submit: !0
      },
      ariaProperties = {
        "aria-current": 0,
        "aria-description": 0,
        "aria-details": 0,
        "aria-disabled": 0,
        "aria-hidden": 0,
        "aria-invalid": 0,
        "aria-keyshortcuts": 0,
        "aria-label": 0,
        "aria-roledescription": 0,
        "aria-autocomplete": 0,
        "aria-checked": 0,
        "aria-expanded": 0,
        "aria-haspopup": 0,
        "aria-level": 0,
        "aria-modal": 0,
        "aria-multiline": 0,
        "aria-multiselectable": 0,
        "aria-orientation": 0,
        "aria-placeholder": 0,
        "aria-pressed": 0,
        "aria-readonly": 0,
        "aria-required": 0,
        "aria-selected": 0,
        "aria-sort": 0,
        "aria-valuemax": 0,
        "aria-valuemin": 0,
        "aria-valuenow": 0,
        "aria-valuetext": 0,
        "aria-atomic": 0,
        "aria-busy": 0,
        "aria-live": 0,
        "aria-relevant": 0,
        "aria-dropeffect": 0,
        "aria-grabbed": 0,
        "aria-activedescendant": 0,
        "aria-colcount": 0,
        "aria-colindex": 0,
        "aria-colspan": 0,
        "aria-controls": 0,
        "aria-describedby": 0,
        "aria-errormessage": 0,
        "aria-flowto": 0,
        "aria-labelledby": 0,
        "aria-owns": 0,
        "aria-posinset": 0,
        "aria-rowcount": 0,
        "aria-rowindex": 0,
        "aria-rowspan": 0,
        "aria-setsize": 0,
        "aria-braillelabel": 0,
        "aria-brailleroledescription": 0,
        "aria-colindextext": 0,
        "aria-rowindextext": 0
      },
      warnedProperties$1 = {},
      rARIA$1 = RegExp(
        "^(aria)-[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
      ),
      rARIACamel$1 = RegExp(
        "^(aria)[A-Z][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
      ),
      didWarnValueNull = !1,
      possibleStandardNames = {
        accept: "accept",
        acceptcharset: "acceptCharset",
        "accept-charset": "acceptCharset",
        accesskey: "accessKey",
        action: "action",
        allowfullscreen: "allowFullScreen",
        alt: "alt",
        as: "as",
        async: "async",
        autocapitalize: "autoCapitalize",
        autocomplete: "autoComplete",
        autocorrect: "autoCorrect",
        autofocus: "autoFocus",
        autoplay: "autoPlay",
        autosave: "autoSave",
        capture: "capture",
        cellpadding: "cellPadding",
        cellspacing: "cellSpacing",
        challenge: "challenge",
        charset: "charSet",
        checked: "checked",
        children: "children",
        cite: "cite",
        class: "className",
        classid: "classID",
        classname: "className",
        cols: "cols",
        colspan: "colSpan",
        content: "content",
        contenteditable: "contentEditable",
        contextmenu: "contextMenu",
        controls: "controls",
        controlslist: "controlsList",
        coords: "coords",
        credentialless: "credentialless",
        crossorigin: "crossOrigin",
        dangerouslysetinnerhtml: "dangerouslySetInnerHTML",
        data: "data",
        datetime: "dateTime",
        default: "default",
        defaultchecked: "defaultChecked",
        defaultvalue: "defaultValue",
        defer: "defer",
        dir: "dir",
        disabled: "disabled",
        disablepictureinpicture: "disablePictureInPicture",
        disableremoteplayback: "disableRemotePlayback",
        download: "download",
        draggable: "draggable",
        enctype: "encType",
        enterkeyhint: "enterKeyHint",
        fetchpriority: "fetchPriority",
        for: "htmlFor",
        form: "form",
        formmethod: "formMethod",
        formaction: "formAction",
        formenctype: "formEncType",
        formnovalidate: "formNoValidate",
        formtarget: "formTarget",
        frameborder: "frameBorder",
        headers: "headers",
        height: "height",
        hidden: "hidden",
        high: "high",
        href: "href",
        hreflang: "hrefLang",
        htmlfor: "htmlFor",
        httpequiv: "httpEquiv",
        "http-equiv": "httpEquiv",
        icon: "icon",
        id: "id",
        imagesizes: "imageSizes",
        imagesrcset: "imageSrcSet",
        inert: "inert",
        innerhtml: "innerHTML",
        inputmode: "inputMode",
        integrity: "integrity",
        is: "is",
        itemid: "itemID",
        itemprop: "itemProp",
        itemref: "itemRef",
        itemscope: "itemScope",
        itemtype: "itemType",
        keyparams: "keyParams",
        keytype: "keyType",
        kind: "kind",
        label: "label",
        lang: "lang",
        list: "list",
        loop: "loop",
        low: "low",
        manifest: "manifest",
        marginwidth: "marginWidth",
        marginheight: "marginHeight",
        max: "max",
        maxlength: "maxLength",
        media: "media",
        mediagroup: "mediaGroup",
        method: "method",
        min: "min",
        minlength: "minLength",
        multiple: "multiple",
        muted: "muted",
        name: "name",
        nomodule: "noModule",
        nonce: "nonce",
        novalidate: "noValidate",
        open: "open",
        optimum: "optimum",
        pattern: "pattern",
        placeholder: "placeholder",
        playsinline: "playsInline",
        poster: "poster",
        preload: "preload",
        profile: "profile",
        radiogroup: "radioGroup",
        readonly: "readOnly",
        referrerpolicy: "referrerPolicy",
        rel: "rel",
        required: "required",
        reversed: "reversed",
        role: "role",
        rows: "rows",
        rowspan: "rowSpan",
        sandbox: "sandbox",
        scope: "scope",
        scoped: "scoped",
        scrolling: "scrolling",
        seamless: "seamless",
        selected: "selected",
        shape: "shape",
        size: "size",
        sizes: "sizes",
        span: "span",
        spellcheck: "spellCheck",
        src: "src",
        srcdoc: "srcDoc",
        srclang: "srcLang",
        srcset: "srcSet",
        start: "start",
        step: "step",
        style: "style",
        summary: "summary",
        tabindex: "tabIndex",
        target: "target",
        title: "title",
        type: "type",
        usemap: "useMap",
        value: "value",
        width: "width",
        wmode: "wmode",
        wrap: "wrap",
        about: "about",
        accentheight: "accentHeight",
        "accent-height": "accentHeight",
        accumulate: "accumulate",
        additive: "additive",
        alignmentbaseline: "alignmentBaseline",
        "alignment-baseline": "alignmentBaseline",
        allowreorder: "allowReorder",
        alphabetic: "alphabetic",
        amplitude: "amplitude",
        arabicform: "arabicForm",
        "arabic-form": "arabicForm",
        ascent: "ascent",
        attributename: "attributeName",
        attributetype: "attributeType",
        autoreverse: "autoReverse",
        azimuth: "azimuth",
        basefrequency: "baseFrequency",
        baselineshift: "baselineShift",
        "baseline-shift": "baselineShift",
        baseprofile: "baseProfile",
        bbox: "bbox",
        begin: "begin",
        bias: "bias",
        by: "by",
        calcmode: "calcMode",
        capheight: "capHeight",
        "cap-height": "capHeight",
        clip: "clip",
        clippath: "clipPath",
        "clip-path": "clipPath",
        clippathunits: "clipPathUnits",
        cliprule: "clipRule",
        "clip-rule": "clipRule",
        color: "color",
        colorinterpolation: "colorInterpolation",
        "color-interpolation": "colorInterpolation",
        colorinterpolationfilters: "colorInterpolationFilters",
        "color-interpolation-filters": "colorInterpolationFilters",
        colorprofile: "colorProfile",
        "color-profile": "colorProfile",
        colorrendering: "colorRendering",
        "color-rendering": "colorRendering",
        contentscripttype: "contentScriptType",
        contentstyletype: "contentStyleType",
        cursor: "cursor",
        cx: "cx",
        cy: "cy",
        d: "d",
        datatype: "datatype",
        decelerate: "decelerate",
        descent: "descent",
        diffuseconstant: "diffuseConstant",
        direction: "direction",
        display: "display",
        divisor: "divisor",
        dominantbaseline: "dominantBaseline",
        "dominant-baseline": "dominantBaseline",
        dur: "dur",
        dx: "dx",
        dy: "dy",
        edgemode: "edgeMode",
        elevation: "elevation",
        enablebackground: "enableBackground",
        "enable-background": "enableBackground",
        end: "end",
        exponent: "exponent",
        externalresourcesrequired: "externalResourcesRequired",
        fill: "fill",
        fillopacity: "fillOpacity",
        "fill-opacity": "fillOpacity",
        fillrule: "fillRule",
        "fill-rule": "fillRule",
        filter: "filter",
        filterres: "filterRes",
        filterunits: "filterUnits",
        floodopacity: "floodOpacity",
        "flood-opacity": "floodOpacity",
        floodcolor: "floodColor",
        "flood-color": "floodColor",
        focusable: "focusable",
        fontfamily: "fontFamily",
        "font-family": "fontFamily",
        fontsize: "fontSize",
        "font-size": "fontSize",
        fontsizeadjust: "fontSizeAdjust",
        "font-size-adjust": "fontSizeAdjust",
        fontstretch: "fontStretch",
        "font-stretch": "fontStretch",
        fontstyle: "fontStyle",
        "font-style": "fontStyle",
        fontvariant: "fontVariant",
        "font-variant": "fontVariant",
        fontweight: "fontWeight",
        "font-weight": "fontWeight",
        format: "format",
        from: "from",
        fx: "fx",
        fy: "fy",
        g1: "g1",
        g2: "g2",
        glyphname: "glyphName",
        "glyph-name": "glyphName",
        glyphorientationhorizontal: "glyphOrientationHorizontal",
        "glyph-orientation-horizontal": "glyphOrientationHorizontal",
        glyphorientationvertical: "glyphOrientationVertical",
        "glyph-orientation-vertical": "glyphOrientationVertical",
        glyphref: "glyphRef",
        gradienttransform: "gradientTransform",
        gradientunits: "gradientUnits",
        hanging: "hanging",
        horizadvx: "horizAdvX",
        "horiz-adv-x": "horizAdvX",
        horizoriginx: "horizOriginX",
        "horiz-origin-x": "horizOriginX",
        ideographic: "ideographic",
        imagerendering: "imageRendering",
        "image-rendering": "imageRendering",
        in2: "in2",
        in: "in",
        inlist: "inlist",
        intercept: "intercept",
        k1: "k1",
        k2: "k2",
        k3: "k3",
        k4: "k4",
        k: "k",
        kernelmatrix: "kernelMatrix",
        kernelunitlength: "kernelUnitLength",
        kerning: "kerning",
        keypoints: "keyPoints",
        keysplines: "keySplines",
        keytimes: "keyTimes",
        lengthadjust: "lengthAdjust",
        letterspacing: "letterSpacing",
        "letter-spacing": "letterSpacing",
        lightingcolor: "lightingColor",
        "lighting-color": "lightingColor",
        limitingconeangle: "limitingConeAngle",
        local: "local",
        markerend: "markerEnd",
        "marker-end": "markerEnd",
        markerheight: "markerHeight",
        markermid: "markerMid",
        "marker-mid": "markerMid",
        markerstart: "markerStart",
        "marker-start": "markerStart",
        markerunits: "markerUnits",
        markerwidth: "markerWidth",
        mask: "mask",
        maskcontentunits: "maskContentUnits",
        masktype: "maskType",
        maskunits: "maskUnits",
        mathematical: "mathematical",
        mode: "mode",
        numoctaves: "numOctaves",
        offset: "offset",
        opacity: "opacity",
        operator: "operator",
        order: "order",
        orient: "orient",
        orientation: "orientation",
        origin: "origin",
        overflow: "overflow",
        overlineposition: "overlinePosition",
        "overline-position": "overlinePosition",
        overlinethickness: "overlineThickness",
        "overline-thickness": "overlineThickness",
        paintorder: "paintOrder",
        "paint-order": "paintOrder",
        panose1: "panose1",
        "panose-1": "panose1",
        pathlength: "pathLength",
        patterncontentunits: "patternContentUnits",
        patterntransform: "patternTransform",
        patternunits: "patternUnits",
        pointerevents: "pointerEvents",
        "pointer-events": "pointerEvents",
        points: "points",
        pointsatx: "pointsAtX",
        pointsaty: "pointsAtY",
        pointsatz: "pointsAtZ",
        popover: "popover",
        popovertarget: "popoverTarget",
        popovertargetaction: "popoverTargetAction",
        prefix: "prefix",
        preservealpha: "preserveAlpha",
        preserveaspectratio: "preserveAspectRatio",
        primitiveunits: "primitiveUnits",
        property: "property",
        r: "r",
        radius: "radius",
        refx: "refX",
        refy: "refY",
        renderingintent: "renderingIntent",
        "rendering-intent": "renderingIntent",
        repeatcount: "repeatCount",
        repeatdur: "repeatDur",
        requiredextensions: "requiredExtensions",
        requiredfeatures: "requiredFeatures",
        resource: "resource",
        restart: "restart",
        result: "result",
        results: "results",
        rotate: "rotate",
        rx: "rx",
        ry: "ry",
        scale: "scale",
        security: "security",
        seed: "seed",
        shaperendering: "shapeRendering",
        "shape-rendering": "shapeRendering",
        slope: "slope",
        spacing: "spacing",
        specularconstant: "specularConstant",
        specularexponent: "specularExponent",
        speed: "speed",
        spreadmethod: "spreadMethod",
        startoffset: "startOffset",
        stddeviation: "stdDeviation",
        stemh: "stemh",
        stemv: "stemv",
        stitchtiles: "stitchTiles",
        stopcolor: "stopColor",
        "stop-color": "stopColor",
        stopopacity: "stopOpacity",
        "stop-opacity": "stopOpacity",
        strikethroughposition: "strikethroughPosition",
        "strikethrough-position": "strikethroughPosition",
        strikethroughthickness: "strikethroughThickness",
        "strikethrough-thickness": "strikethroughThickness",
        string: "string",
        stroke: "stroke",
        strokedasharray: "strokeDasharray",
        "stroke-dasharray": "strokeDasharray",
        strokedashoffset: "strokeDashoffset",
        "stroke-dashoffset": "strokeDashoffset",
        strokelinecap: "strokeLinecap",
        "stroke-linecap": "strokeLinecap",
        strokelinejoin: "strokeLinejoin",
        "stroke-linejoin": "strokeLinejoin",
        strokemiterlimit: "strokeMiterlimit",
        "stroke-miterlimit": "strokeMiterlimit",
        strokewidth: "strokeWidth",
        "stroke-width": "strokeWidth",
        strokeopacity: "strokeOpacity",
        "stroke-opacity": "strokeOpacity",
        suppresscontenteditablewarning: "suppressContentEditableWarning",
        suppresshydrationwarning: "suppressHydrationWarning",
        surfacescale: "surfaceScale",
        systemlanguage: "systemLanguage",
        tablevalues: "tableValues",
        targetx: "targetX",
        targety: "targetY",
        textanchor: "textAnchor",
        "text-anchor": "textAnchor",
        textdecoration: "textDecoration",
        "text-decoration": "textDecoration",
        textlength: "textLength",
        textrendering: "textRendering",
        "text-rendering": "textRendering",
        to: "to",
        transform: "transform",
        transformorigin: "transformOrigin",
        "transform-origin": "transformOrigin",
        typeof: "typeof",
        u1: "u1",
        u2: "u2",
        underlineposition: "underlinePosition",
        "underline-position": "underlinePosition",
        underlinethickness: "underlineThickness",
        "underline-thickness": "underlineThickness",
        unicode: "unicode",
        unicodebidi: "unicodeBidi",
        "unicode-bidi": "unicodeBidi",
        unicoderange: "unicodeRange",
        "unicode-range": "unicodeRange",
        unitsperem: "unitsPerEm",
        "units-per-em": "unitsPerEm",
        unselectable: "unselectable",
        valphabetic: "vAlphabetic",
        "v-alphabetic": "vAlphabetic",
        values: "values",
        vectoreffect: "vectorEffect",
        "vector-effect": "vectorEffect",
        version: "version",
        vertadvy: "vertAdvY",
        "vert-adv-y": "vertAdvY",
        vertoriginx: "vertOriginX",
        "vert-origin-x": "vertOriginX",
        vertoriginy: "vertOriginY",
        "vert-origin-y": "vertOriginY",
        vhanging: "vHanging",
        "v-hanging": "vHanging",
        videographic: "vIdeographic",
        "v-ideographic": "vIdeographic",
        viewbox: "viewBox",
        viewtarget: "viewTarget",
        visibility: "visibility",
        vmathematical: "vMathematical",
        "v-mathematical": "vMathematical",
        vocab: "vocab",
        widths: "widths",
        wordspacing: "wordSpacing",
        "word-spacing": "wordSpacing",
        writingmode: "writingMode",
        "writing-mode": "writingMode",
        x1: "x1",
        x2: "x2",
        x: "x",
        xchannelselector: "xChannelSelector",
        xheight: "xHeight",
        "x-height": "xHeight",
        xlinkactuate: "xlinkActuate",
        "xlink:actuate": "xlinkActuate",
        xlinkarcrole: "xlinkArcrole",
        "xlink:arcrole": "xlinkArcrole",
        xlinkhref: "xlinkHref",
        "xlink:href": "xlinkHref",
        xlinkrole: "xlinkRole",
        "xlink:role": "xlinkRole",
        xlinkshow: "xlinkShow",
        "xlink:show": "xlinkShow",
        xlinktitle: "xlinkTitle",
        "xlink:title": "xlinkTitle",
        xlinktype: "xlinkType",
        "xlink:type": "xlinkType",
        xmlbase: "xmlBase",
        "xml:base": "xmlBase",
        xmllang: "xmlLang",
        "xml:lang": "xmlLang",
        xmlns: "xmlns",
        "xml:space": "xmlSpace",
        xmlnsxlink: "xmlnsXlink",
        "xmlns:xlink": "xmlnsXlink",
        xmlspace: "xmlSpace",
        y1: "y1",
        y2: "y2",
        y: "y",
        ychannelselector: "yChannelSelector",
        z: "z",
        zoomandpan: "zoomAndPan"
      },
      warnedProperties = {},
      EVENT_NAME_REGEX = /^on./,
      INVALID_EVENT_NAME_REGEX = /^on[^A-Z]/,
      rARIA = RegExp(
        "^(aria)-[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
      ),
      rARIACamel = RegExp(
        "^(aria)[A-Z][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
      ),
      badVendoredStyleNamePattern = /^(?:webkit|moz|o)[A-Z]/,
      msPattern$1 = /^-ms-/,
      hyphenPattern = /-(.)/g,
      badStyleValueWithSemicolonPattern = /;\s*$/,
      warnedStyleNames = {},
      warnedStyleValues = {},
      warnedForNaNValue = !1,
      warnedForInfinityValue = !1,
      matchHtmlRegExp = /["'&<>]/,
      uppercasePattern = /([A-Z])/g,
      msPattern = /^ms-/,
      isJavaScriptProtocol =
        /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i,
      ReactSharedInternals =
        React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
      ReactDOMSharedInternals =
        ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
      NotPending = Object.freeze({
        pending: !1,
        data: null,
        method: null,
        action: null
      }),
      previousDispatcher = ReactDOMSharedInternals.d;
    ReactDOMSharedInternals.d = {
      f: previousDispatcher.f,
      r: previousDispatcher.r,
      D: function (href) {
        var request = currentRequest ? currentRequest : null;
        if (request) {
          var resumableState = request.resumableState,
            renderState = request.renderState;
          if ("string" === typeof href && href) {
            if (!resumableState.dnsResources.hasOwnProperty(href)) {
              resumableState.dnsResources[href] = EXISTS;
              resumableState = renderState.headers;
              var header, JSCompiler_temp;
              if (
                (JSCompiler_temp =
                  resumableState && 0 < resumableState.remainingCapacity)
              )
                JSCompiler_temp =
                  ((header =
                    "<" +
                    escapeHrefForLinkHeaderURLContext(href) +
                    ">; rel=dns-prefetch"),
                  0 <= (resumableState.remainingCapacity -= header.length + 2));
              JSCompiler_temp
                ? ((renderState.resets.dns[href] = EXISTS),
                  resumableState.preconnects &&
                    (resumableState.preconnects += ", "),
                  (resumableState.preconnects += header))
                : ((header = []),
                  pushLinkImpl(header, { href: href, rel: "dns-prefetch" }),
                  renderState.preconnects.add(header));
            }
            enqueueFlush(request);
          }
        } else previousDispatcher.D(href);
      },
      C: function (href, crossOrigin) {
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
              resumableState.connectResources[bucket][href] = EXISTS;
              resumableState = renderState.headers;
              var header, JSCompiler_temp;
              if (
                (JSCompiler_temp =
                  resumableState && 0 < resumableState.remainingCapacity)
              ) {
                JSCompiler_temp =
                  "<" +
                  escapeHrefForLinkHeaderURLContext(href) +
                  ">; rel=preconnect";
                if ("string" === typeof crossOrigin) {
                  var escapedCrossOrigin =
                    escapeStringForLinkHeaderQuotedParamValueContext(
                      crossOrigin,
                      "crossOrigin"
                    );
                  JSCompiler_temp +=
                    '; crossorigin="' + escapedCrossOrigin + '"';
                }
                JSCompiler_temp =
                  ((header = JSCompiler_temp),
                  0 <= (resumableState.remainingCapacity -= header.length + 2));
              }
              JSCompiler_temp
                ? ((renderState.resets.connect[bucket][href] = EXISTS),
                  resumableState.preconnects &&
                    (resumableState.preconnects += ", "),
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
      },
      L: function (href, as, options) {
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
                        {
                          rel: "preload",
                          href: imageSrcSet ? void 0 : href,
                          as: as
                        },
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
                    (href = assign(
                      { rel: "preload", href: href, as: as },
                      options
                    )),
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
      },
      m: function (href, options) {
        var request = currentRequest ? currentRequest : null;
        if (request) {
          var resumableState = request.resumableState,
            renderState = request.renderState;
          if (href) {
            var as =
              options && "string" === typeof options.as ? options.as : "script";
            switch (as) {
              case "script":
                if (resumableState.moduleScriptResources.hasOwnProperty(href))
                  return;
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
            pushLinkImpl(
              as,
              assign({ rel: "modulepreload", href: href }, options)
            );
            renderState.bulkPreloads.add(as);
            enqueueFlush(request);
          }
        } else previousDispatcher.m(href, options);
      },
      X: function (src, options) {
        var request = currentRequest ? currentRequest : null;
        if (request) {
          var resumableState = request.resumableState,
            renderState = request.renderState;
          if (src) {
            var resourceState = resumableState.scriptResources.hasOwnProperty(
              src
            )
              ? resumableState.scriptResources[src]
              : void 0;
            resourceState !== EXISTS &&
              ((resumableState.scriptResources[src] = EXISTS),
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
      },
      S: function (href, precedence, options) {
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
            resourceState !== EXISTS &&
              ((resumableState.styleResources[href] = EXISTS),
              styleQueue ||
                ((styleQueue = {
                  precedence: escapeTextForBrowser(precedence),
                  rules: [],
                  hrefs: [],
                  sheets: new Map()
                }),
                renderState.styles.set(precedence, styleQueue)),
              (precedence = {
                state: PENDING$1,
                props: assign(
                  {
                    rel: "stylesheet",
                    href: href,
                    "data-precedence": precedence
                  },
                  options
                )
              }),
              resourceState &&
                (2 === resourceState.length &&
                  adoptPreloadCredentials(precedence.props, resourceState),
                (renderState = renderState.preloads.stylesheets.get(href)) &&
                0 < renderState.length
                  ? (renderState.length = 0)
                  : (precedence.state = PRELOADED)),
              styleQueue.sheets.set(href, precedence),
              enqueueFlush(request));
          }
        } else previousDispatcher.S(href, precedence, options);
      },
      M: function (src, options) {
        var request = currentRequest ? currentRequest : null;
        if (request) {
          var resumableState = request.resumableState,
            renderState = request.renderState;
          if (src) {
            var resourceState =
              resumableState.moduleScriptResources.hasOwnProperty(src)
                ? resumableState.moduleScriptResources[src]
                : void 0;
            resourceState !== EXISTS &&
              ((resumableState.moduleScriptResources[src] = EXISTS),
              (options = assign(
                { src: src, type: "module", async: !0 },
                options
              )),
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
    };
    var ScriptStreamingFormat = 0,
      NothingSent = 0,
      SentCompleteSegmentFunction = 1,
      SentCompleteBoundaryFunction = 2,
      SentClientRenderFunction = 4,
      SentStyleInsertionFunction = 8,
      SentCompletedShellId = 32,
      SentMarkShellTime = 64,
      NeedUpgradeToViewTransitions = 128,
      SentUpgradeToViewTransitions = 256,
      EXISTS = null,
      PRELOAD_NO_CREDS = [];
    Object.freeze(PRELOAD_NO_CREDS);
    var currentlyFlushingRenderState = null,
      endInlineScript = "\x3c/script>",
      scriptRegex = /(<\/|<)(s)(cript)/gi;
    var didWarnForNewBooleanPropsWithEmptyValue = {};
    var ROOT_HTML_MODE = 0,
      HTML_HTML_MODE = 1,
      HTML_MODE = 2,
      HTML_HEAD_MODE = 3,
      SVG_MODE = 4,
      MATHML_MODE = 5,
      HTML_TABLE_MODE = 6,
      HTML_TABLE_BODY_MODE = 7,
      HTML_TABLE_ROW_MODE = 8,
      HTML_COLGROUP_MODE = 9,
      styleNameCache = new Map(),
      styleAttributeStart = ' style="',
      styleAssign = ":",
      styleSeparator = ";",
      attributeSeparator = " ",
      attributeAssign = '="',
      attributeEnd = '"',
      attributeEmptyString = '=""',
      actionJavaScriptURL = escapeTextForBrowser(
        "javascript:throw new Error('React form unexpectedly submitted.')"
      ),
      endOfStartTag = ">",
      endOfStartTagSelfClosing = "/>",
      didWarnDefaultInputValue = !1,
      didWarnDefaultChecked = !1,
      didWarnDefaultSelectValue = !1,
      didWarnDefaultTextareaValue = !1,
      didWarnInvalidOptionChildren = !1,
      didWarnInvalidOptionInnerHTML = !1,
      didWarnSelectedSetOnOption = !1,
      didWarnFormActionType = !1,
      didWarnFormActionName = !1,
      didWarnFormActionTarget = !1,
      didWarnFormActionMethod = !1,
      formReplayingRuntimeScript =
        'addEventListener("submit",function(a){if(!a.defaultPrevented){var b=a.target,d=a.submitter,c=b.action,e=d;if(d){var f=d.getAttribute("formAction");null!=f&&(c=f,e=null)}"javascript:throw new Error(\'React form unexpectedly submitted.\')"===c&&(a.preventDefault(),a=new FormData(b,e),c=b.ownerDocument||b,(c.$$reactFormReplay=c.$$reactFormReplay||[]).push(b,d,a))}});',
      styleRegex = /(<\/|<)(s)(tyle)/gi,
      leadingNewline = "\n",
      VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/,
      validatedTagCache = new Map(),
      endTagCache = new Map(),
      shellTimeRuntimeScript =
        "requestAnimationFrame(function(){$RT=performance.now()});",
      placeholder1 = '<template id="',
      placeholder2 = '"></template>',
      startCompletedSuspenseBoundary = "\x3c!--$--\x3e",
      startPendingSuspenseBoundary1 = '\x3c!--$?--\x3e<template id="',
      startPendingSuspenseBoundary2 = '"></template>',
      startClientRenderedSuspenseBoundary = "\x3c!--$!--\x3e",
      endSuspenseBoundary = "\x3c!--/$--\x3e",
      clientRenderedSuspenseBoundaryError1 = "<template",
      clientRenderedSuspenseBoundaryErrorAttrInterstitial = '"',
      clientRenderedSuspenseBoundaryError1A = ' data-dgst="',
      clientRenderedSuspenseBoundaryError1B = ' data-msg="',
      clientRenderedSuspenseBoundaryError1C = ' data-stck="',
      clientRenderedSuspenseBoundaryError1D = ' data-cstck="',
      clientRenderedSuspenseBoundaryError2 = "></template>",
      startSegmentHTML = '<div hidden id="',
      startSegmentHTML2 = '">',
      endSegmentHTML = "</div>",
      startSegmentSVG = '<svg aria-hidden="true" style="display:none" id="',
      startSegmentSVG2 = '">',
      endSegmentSVG = "</svg>",
      startSegmentMathML = '<math aria-hidden="true" style="display:none" id="',
      startSegmentMathML2 = '">',
      endSegmentMathML = "</math>",
      startSegmentTable = '<table hidden id="',
      startSegmentTable2 = '">',
      endSegmentTable = "</table>",
      startSegmentTableBody = '<table hidden><tbody id="',
      startSegmentTableBody2 = '">',
      endSegmentTableBody = "</tbody></table>",
      startSegmentTableRow = '<table hidden><tr id="',
      startSegmentTableRow2 = '">',
      endSegmentTableRow = "</tr></table>",
      startSegmentColGroup = '<table hidden><colgroup id="',
      startSegmentColGroup2 = '">',
      endSegmentColGroup = "</colgroup></table>",
      completeSegmentScript1Full =
        '$RS=function(a,b){a=document.getElementById(a);b=document.getElementById(b);for(a.parentNode.removeChild(a);a.firstChild;)b.parentNode.insertBefore(a.firstChild,b);b.parentNode.removeChild(b)};$RS("',
      completeSegmentScript1Partial = '$RS("',
      completeSegmentScript2 = '","',
      completeSegmentScriptEnd = '")\x3c/script>',
      completeSegmentData1 = '<template data-rsi="" data-sid="',
      completeSegmentData2 = '" data-pid="',
      completeSegmentDataEnd = '"></template>',
      completeBoundaryScriptFunctionOnly =
        '$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};\n$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};',
      completeBoundaryUpgradeToViewTransitionsInstruction =
        '$RV=function(A,g){function k(a,b){var e=a.getAttribute(b);e&&(b=a.style,l.push(a,b.viewTransitionName,b.viewTransitionClass),"auto"!==e&&(b.viewTransitionClass=e),(a=a.getAttribute("vt-name"))||(a="_T_"+K++ +"_"),a=CSS.escape(a)!==a?"r-"+btoa(a).replace(/=/g,""):a,b.viewTransitionName=a,B=!0)}var B=!1,K=0,l=[];try{var f=document.__reactViewTransition;if(f){f.finished.finally($RV.bind(null,g));return}var m=new Map;for(f=1;f<g.length;f+=2)for(var h=g[f].querySelectorAll("[vt-share]"),d=0;d<h.length;d++){var c=h[d];m.set(c.getAttribute("vt-name"),c)}var u=[];for(h=0;h<g.length;h+=2){var C=g[h],x=C.parentNode;if(x){var v=x.getBoundingClientRect();if(v.left||v.top||v.width||v.height){c=C;for(f=0;c;){if(8===c.nodeType){var r=c.data;if("/$"===r)if(0===f)break;else f--;else"$"!==r&&"$?"!==r&&"$~"!==r&&"$!"!==r||f++}else if(1===c.nodeType){d=c;var D=d.getAttribute("vt-name"),y=m.get(D);k(d,y?"vt-share":"vt-exit");y&&(k(y,"vt-share"),m.set(D,null));var E=d.querySelectorAll("[vt-share]");\nfor(d=0;d<E.length;d++){var F=E[d],G=F.getAttribute("vt-name"),H=m.get(G);H&&(k(F,"vt-share"),k(H,"vt-share"),m.set(G,null))}}c=c.nextSibling}for(var I=g[h+1],t=I.firstElementChild;t;)null!==m.get(t.getAttribute("vt-name"))&&k(t,"vt-enter"),t=t.nextElementSibling;c=x;do for(var n=c.firstElementChild;n;){var J=n.getAttribute("vt-update");J&&"none"!==J&&!l.includes(n)&&k(n,"vt-update");n=n.nextElementSibling}while((c=c.parentNode)&&1===c.nodeType&&"none"!==c.getAttribute("vt-update"));u.push.apply(u,\nI.querySelectorAll(\'img[src]:not([loading="lazy"])\'))}}}if(B){var z=document.__reactViewTransition=document.startViewTransition({update:function(){A(g);for(var a=[document.documentElement.clientHeight,document.fonts.ready],b={},e=0;e<u.length;b={g:b.g},e++)if(b.g=u[e],!b.g.complete){var p=b.g.getBoundingClientRect();0<p.bottom&&0<p.right&&p.top<window.innerHeight&&p.left<window.innerWidth&&(p=new Promise(function(w){return function(q){w.g.addEventListener("load",q);w.g.addEventListener("error",q)}}(b)),\na.push(p))}return Promise.race([Promise.all(a),new Promise(function(w){var q=performance.now();setTimeout(w,2300>q&&2E3<q?2300-q:500)})])},types:[]});z.ready.finally(function(){for(var a=l.length-3;0<=a;a-=3){var b=l[a],e=b.style;e.viewTransitionName=l[a+1];e.viewTransitionClass=l[a+1];""===b.getAttribute("style")&&b.removeAttribute("style")}});z.finished.finally(function(){document.__reactViewTransition===z&&(document.__reactViewTransition=null)});$RB=[];return}}catch(a){}A(g)}.bind(null,\n$RV);',
      completeBoundaryScript1Partial = '$RC("',
      completeBoundaryWithStylesScript1FullPartial =
        '$RM=new Map;$RR=function(n,w,p){function u(q){this._p=null;q()}for(var r=new Map,t=document,h,b,e=t.querySelectorAll("link[data-precedence],style[data-precedence]"),v=[],k=0;b=e[k++];)"not all"===b.getAttribute("media")?v.push(b):("LINK"===b.tagName&&$RM.set(b.getAttribute("href"),b),r.set(b.dataset.precedence,h=b));e=0;b=[];var l,a;for(k=!0;;){if(k){var f=p[e++];if(!f){k=!1;e=0;continue}var c=!1,m=0;var d=f[m++];if(a=$RM.get(d)){var g=a._p;c=!0}else{a=t.createElement("link");a.href=d;a.rel=\n"stylesheet";for(a.dataset.precedence=l=f[m++];g=f[m++];)a.setAttribute(g,f[m++]);g=a._p=new Promise(function(q,x){a.onload=u.bind(a,q);a.onerror=u.bind(a,x)});$RM.set(d,a)}d=a.getAttribute("media");!g||d&&!matchMedia(d).matches||b.push(g);if(c)continue}else{a=v[e++];if(!a)break;l=a.getAttribute("data-precedence");a.removeAttribute("media")}c=r.get(l)||h;c===h&&(h=a);r.set(l,a);c?c.parentNode.insertBefore(a,c.nextSibling):(c=t.head,c.insertBefore(a,c.firstChild))}if(p=document.getElementById(n))p.previousSibling.data=\n"$~";Promise.all(b).then($RC.bind(null,n,w),$RX.bind(null,n,"CSS failed to load"))};$RR("',
      completeBoundaryWithStylesScript1Partial = '$RR("',
      completeBoundaryScript2 = '","',
      completeBoundaryScript3a = '",',
      completeBoundaryScript3b = '"',
      completeBoundaryScriptEnd = ")\x3c/script>",
      completeBoundaryData1 = '<template data-rci="" data-bid="',
      completeBoundaryWithStylesData1 = '<template data-rri="" data-bid="',
      completeBoundaryData2 = '" data-sid="',
      completeBoundaryData3a = '" data-sty="',
      completeBoundaryDataEnd = '"></template>',
      clientRenderScriptFunctionOnly =
        '$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};',
      clientRenderScript1Full =
        '$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};;$RX("',
      clientRenderScript1Partial = '$RX("',
      clientRenderScript1A = '"',
      clientRenderErrorScriptArgInterstitial = ",",
      clientRenderScriptEnd = ")\x3c/script>",
      clientRenderData1 = '<template data-rxi="" data-bid="',
      clientRenderData2 = '" data-dgst="',
      clientRenderData3 = '" data-msg="',
      clientRenderData4 = '" data-stck="',
      clientRenderData5 = '" data-cstck="',
      clientRenderDataEnd = '"></template>',
      regexForJSStringsInInstructionScripts = /[<\u2028\u2029]/g,
      regexForJSStringsInScripts = /[&><\u2028\u2029]/g,
      lateStyleTagResourceOpen1 = ' media="not all" data-precedence="',
      lateStyleTagResourceOpen2 = '" data-href="',
      lateStyleTagResourceOpen3 = '">',
      lateStyleTagTemplateClose = "</style>",
      currentlyRenderingBoundaryHasStylesToHoist = !1,
      destinationHasCapacity = !0,
      stylesheetFlushingQueue = [],
      styleTagResourceOpen1 = ' data-precedence="',
      styleTagResourceOpen2 = '" data-href="',
      spaceSeparator = " ",
      styleTagResourceOpen3 = '">',
      styleTagResourceClose = "</style>",
      completedShellIdAttributeStart = ' id="',
      arrayFirstOpenBracket = "[",
      arraySubsequentOpenBracket = ",[",
      arrayInterstitial = ",",
      arrayCloseBracket = "]",
      PENDING$1 = 0,
      PRELOADED = 1,
      PREAMBLE = 2,
      LATE = 3,
      regexForHrefInLinkHeaderURLContext = /[<>\r\n]/g,
      regexForLinkHeaderQuotedParamValueContext = /["';,\r\n]/g,
      doctypeChunk = "",
      bind = Function.prototype.bind,
      REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
    var warnedAboutMissingGetChildContext = {};
    var emptyContextObject = {};
    Object.freeze(emptyContextObject);
    var rendererSigil = {};
    var currentActiveSnapshot = null,
      didWarnAboutNoopUpdateForComponent = {},
      didWarnAboutDeprecatedWillMount = {};
    var didWarnAboutUninitializedState = new Set();
    var didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate = new Set();
    var didWarnAboutLegacyLifecyclesAndDerivedState = new Set();
    var didWarnAboutDirectlyAssigningPropsToState = new Set();
    var didWarnAboutUndefinedDerivedState = new Set();
    var didWarnAboutContextTypeAndContextTypes = new Set();
    var didWarnAboutContextTypes$1 = new Set();
    var didWarnAboutChildContextTypes = new Set();
    var didWarnAboutInvalidateContextType = new Set();
    var didWarnOnInvalidCallback = new Set();
    var classComponentUpdater = {
        enqueueSetState: function (inst, payload, callback) {
          var internals = inst._reactInternals;
          null === internals.queue
            ? warnNoop(inst, "setState")
            : (internals.queue.push(payload),
              void 0 !== callback &&
                null !== callback &&
                warnOnInvalidCallback(callback));
        },
        enqueueReplaceState: function (inst, payload, callback) {
          inst = inst._reactInternals;
          inst.replace = !0;
          inst.queue = [payload];
          void 0 !== callback &&
            null !== callback &&
            warnOnInvalidCallback(callback);
        },
        enqueueForceUpdate: function (inst, callback) {
          null === inst._reactInternals.queue
            ? warnNoop(inst, "forceUpdate")
            : void 0 !== callback &&
              null !== callback &&
              warnOnInvalidCallback(callback);
        }
      },
      emptyTreeContext = { id: 1, overflow: "" },
      clz32 = Math.clz32 ? Math.clz32 : clz32Fallback,
      log = Math.log,
      LN2 = Math.LN2,
      currentTaskInDEV = null,
      SuspenseException = Error(
        "Suspense Exception: This is not a real error! It's an implementation detail of `use` to interrupt the current render. You must either rethrow it immediately, or move the `use` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary, or call the promise's `.catch` method and pass the result to `use`."
      ),
      suspendedThenable = null,
      shouldCaptureSuspendedCallSite = !1,
      suspendedCallSiteStack = null,
      suspendedCallSiteDebugTask = null,
      objectIs = "function" === typeof Object.is ? Object.is : is,
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
      numberOfReRenders = 0,
      isInHookUserCodeInDev = !1,
      currentHookNameInDev,
      HooksDispatcher = {
        readContext: readContext,
        use: function (usable) {
          if (null !== usable && "object" === typeof usable) {
            if ("function" === typeof usable.then)
              return unwrapThenable(usable);
            if (usable.$$typeof === REACT_CONTEXT_TYPE)
              return readContext(usable);
          }
          throw Error(
            "An unsupported type was passed to use(): " + String(usable)
          );
        },
        useContext: function (context) {
          currentHookNameInDev = "useContext";
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
              Object.seal(initialValue),
              (workInProgressHook.memoizedState = initialValue))
            : previousRef;
        },
        useState: function (initialState) {
          currentHookNameInDev = "useState";
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
          if (null === resumableState)
            throw Error(
              "Invalid hook call. Hooks can only be called inside of the body of a function component."
            );
          var localId = localIdCounter++;
          return makeId(resumableState, treeId, localId);
        },
        useSyncExternalStore: function (
          subscribe,
          getSnapshot,
          getServerSnapshot
        ) {
          if (void 0 === getServerSnapshot)
            throw Error(
              "Missing getServerSnapshot, which is required for server-rendered content. Will revert to client rendering."
            );
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
          return NotPending;
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
          throw Error("Not implemented.");
        },
        cacheSignal: function () {
          throw Error("Not implemented.");
        },
        getOwner: function () {
          return null === currentTaskInDEV
            ? null
            : currentTaskInDEV.componentStack;
        }
      },
      disabledDepth = 0,
      prevLog,
      prevInfo,
      prevWarn,
      prevError,
      prevGroup,
      prevGroupCollapsed,
      prevGroupEnd;
    disabledLog.__reactDisabledLog = !0;
    var prefix,
      suffix,
      reentry = !1;
    var componentFrameCache = new (
      "function" === typeof WeakMap ? WeakMap : Map
    )();
    var callComponent = {
        react_stack_bottom_frame: function (Component, props, secondArg) {
          return Component(props, secondArg);
        }
      },
      callComponentInDEV =
        callComponent.react_stack_bottom_frame.bind(callComponent),
      callRender = {
        react_stack_bottom_frame: function (instance) {
          return instance.render();
        }
      },
      callRenderInDEV = callRender.react_stack_bottom_frame.bind(callRender),
      callLazyInit = {
        react_stack_bottom_frame: function (lazy) {
          var init = lazy._init;
          return init(lazy._payload);
        }
      },
      callLazyInitInDEV =
        callLazyInit.react_stack_bottom_frame.bind(callLazyInit),
      lastResetTime = 0;
    if (
      "object" === typeof performance &&
      "function" === typeof performance.now
    ) {
      var localPerformance = performance;
      var getCurrentTime = function () {
        return localPerformance.now();
      };
    } else {
      var localDate = Date;
      getCurrentTime = function () {
        return localDate.now();
      };
    }
    var CLIENT_RENDERED = 4,
      PENDING = 0,
      COMPLETED = 1,
      FLUSHED = 2,
      ABORTED = 3,
      ERRORED = 4,
      POSTPONED = 5,
      CLOSED = 13,
      currentRequest = null,
      didWarnAboutBadClass = {},
      didWarnAboutContextTypes = {},
      didWarnAboutContextTypeOnFunctionComponent = {},
      didWarnAboutGetDerivedStateOnFunctionComponent = {},
      didWarnAboutReassigningProps = !1,
      didWarnAboutGenerators = !1,
      didWarnAboutMaps = !1,
      flushedByteSize = 0,
      flushingPartialBoundaries = !1;
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
    exports.version = "19.3.0-www-classic-08725f21-20260706";
  })();
