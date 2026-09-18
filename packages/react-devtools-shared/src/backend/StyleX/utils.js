/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {StyleXPlugin} from 'react-devtools-shared/src/frontend/types';
import isArray from 'react-devtools-shared/src/isArray';

const cachedStyleNameToValueMap: Map<string, string> = new Map();

export function getStyleXData(data: any): StyleXPlugin {
  const sources = new Set<string>();
  const resolvedStyles = {};

  crawlData(data, sources, resolvedStyles);

  return {
    sources: Array.from(sources).sort(),
    resolvedStyles,
  };
}

export function crawlData(
  data: any,
  sources: Set<string>,
  resolvedStyles: Object,
): void {
  if (data == null) {
    return;
  }

  if (isArray(data)) {
    data.forEach(entry => {
      if (entry == null) {
        return;
      }

      if (isArray(entry)) {
        crawlData(entry, sources, resolvedStyles);
      } else {
        crawlObjectProperties(entry, sources, resolvedStyles);
      }
    });
  } else {
    crawlObjectProperties(data, sources, resolvedStyles);
  }

  resolvedStyles = Object.fromEntries<string, any>(
    Object.entries(resolvedStyles).sort(),
  );
}

function crawlObjectProperties(
  entry: Object,
  sources: Set<string>,
  resolvedStyles: Object,
): void {
  const keys = Object.keys(entry);
  keys.forEach(key => {
    const value = entry[key];
    if (typeof value === 'string') {
      if (key === value) {
        // Special case; this key is the name of the style's source/file/module.
        sources.add(key);
      } else {
        const propertyValue = getPropertyValueForStyleName(value);
        if (propertyValue != null) {
          resolvedStyles[key] = propertyValue;
        }
      }
    } else {
      const nestedStyle = {};
      resolvedStyles[key] = nestedStyle;
      crawlData([value], sources, nestedStyle);
    }
  });
}

function getPropertyValueForStyleName(styleName: string): string | null {
  if (cachedStyleNameToValueMap.has(styleName)) {
    return cachedStyleNameToValueMap.get(styleName) as any as string;
  }

  for (
    let styleSheetIndex = 0;
    styleSheetIndex < document.styleSheets.length;
    styleSheetIndex++
  ) {
    const styleSheet = document.styleSheets[
      styleSheetIndex
    ] as any as CSSStyleSheet;
    let rules: CSSRuleList | null = null;
    // this might throw if CORS rules are enforced https://www.w3.org/TR/cssom-1/#the-cssstylesheet-interface
    try {
      rules = styleSheet.cssRules;
    } catch (_e) {
      continue;
    }

    for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
      if (!(rules[ruleIndex] instanceof CSSStyleRule)) {
        continue;
      }
      const rule = rules[ruleIndex] as any as CSSStyleRule;
      const {cssText, selectorText, style} = rule;

      if (selectorText != null) {
        if (selectorText.startsWith(`.${styleName}`)) {
          const match = cssText.match(/{ *([a-z\-]+):/);
          if (match !== null) {
            const property = match[1];
            const value = style.getPropertyValue(property);

            cachedStyleNameToValueMap.set(styleName, value);

            return value;
          } else {
            return null;
          }
        }
      }
    }
  }

  return null;
}
