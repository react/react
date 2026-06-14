/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import JSON5 from 'json5';

import type {ReactFunctionLocation} from 'shared/ReactTypes';
import {ElementTypeActivity} from 'react-devtools-shared/src/frontend/types';
import type {
  Element,
  SuspenseNode,
} from 'react-devtools-shared/src/frontend/types';
import type {StateContext} from './views/Components/TreeContext';
import type Store from './store';

export function printElement(
  element: Element,
  includeWeight: boolean = false,
): string {
  let prefix = ' ';
  if (element.children.length > 0) {
    prefix = element.isCollapsed ? '▸' : '▾';
  }

  let key = '';
  if (element.key !== null) {
    key = ` key="${element.key}"`;
  }

  let name = '';
  if (element.nameProp !== null) {
    name = ` name="${element.nameProp}"`;
  }

  let hocDisplayNames = null;
  if (element.hocDisplayNames !== null) {
    hocDisplayNames = [...element.hocDisplayNames];
  }

  const hocs =
    hocDisplayNames === null ? '' : ` [${hocDisplayNames.join('][')}]`;

  let mode = '';
  if (element.type === ElementTypeActivity) {
    mode = ` mode="${element.isActivityHidden ? 'hidden' : 'visible'}"`;
  }

  let suffix = '';
  if (includeWeight) {
    suffix = ` (${element.isCollapsed ? 1 : element.weight})`;
  }

  return `${'  '.repeat(element.depth + 1)}${prefix} <${
    element.displayName || 'null'
  }${key}${name}${mode}>${hocs}${suffix}`;
}

function printRects(rects: SuspenseNode['rects']): string {
  if (rects === null) {
    return ' rects={null}';
  } else {
    return ` rects={[${rects.map(rect => `{x:${rect.x},y:${rect.y},width:${rect.width},height:${rect.height}}`).join(', ')}]}`;
  }
}

function printSuspense(suspense: SuspenseNode): string {
  const name = ` name="${suspense.name || 'Unknown'}"`;
  const hasUniqueSuspenders = ` uniqueSuspenders={${suspense.hasUniqueSuspenders ? 'true' : 'false'}}`;
  const printedRects = printRects(suspense.rects);

  return `<Suspense${name}${hasUniqueSuspenders}${printedRects}>`;
}

function printSuspenseWithChildren(
  store: Store,
  suspense: SuspenseNode,
  depth: number,
): Array<string> {
  const lines = ['  '.repeat(depth) + printSuspense(suspense)];
  for (let i = 0; i < suspense.children.length; i++) {
    const childID = suspense.children[i];
    const child = store.getSuspenseByID(childID);
    if (child === null) {
      throw new Error(`Could not find Suspense node with ID "${childID}".`);
    }
    lines.push(...printSuspenseWithChildren(store, child, depth + 1));
  }

  return lines;
}

export function printOwnersList(
  elements: Array<Element>,
  includeWeight: boolean = false,
): string {
  return elements
    .map(element => printElement(element, includeWeight))
    .join('\n');
}

export function printStore(
  store: Store,
  includeWeight: boolean = false,
  state: StateContext | null = null,
  includeSuspense: boolean = true,
): string {
  const snapshotLines = [];

  let rootWeight = 0;

  function printSelectedMarker(index: number): string {
    if (state === null) {
      return '';
    }
    return state.inspectedElementIndex === index ? `→` : ' ';
  }

  function printErrorsAndWarnings(element: Element): string {
    const {errorCount, warningCount} =
      store.getErrorAndWarningCountForElementID(element.id);
    if (errorCount === 0 && warningCount === 0) {
      return '';
    }
    return ` ${errorCount > 0 ? '✕' : ''}${warningCount > 0 ? '⚠' : ''}`;
  }

  const ownerFlatTree = state !== null ? state.ownerFlatTree : null;
  if (ownerFlatTree !== null) {
    snapshotLines.push(
      '[owners]' + (includeWeight ? ` (${ownerFlatTree.length})` : ''),
    );
    ownerFlatTree.forEach((element, index) => {
      const printedSelectedMarker = printSelectedMarker(index);
      const printedElement = printElement(element, false);
      const printedErrorsAndWarnings = printErrorsAndWarnings(element);
      snapshotLines.push(
        `${printedSelectedMarker}${printedElement}${printedErrorsAndWarnings}`,
      );
    });
  } else {
    const errorsAndWarnings = store._errorsAndWarnings;
    if (errorsAndWarnings.size > 0) {
      let errorCount = 0;
      let warningCount = 0;
      errorsAndWarnings.forEach(entry => {
        errorCount += entry.errorCount;
        warningCount += entry.warningCount;
      });

      snapshotLines.push(`✕ ${errorCount}, ⚠ ${warningCount}`);
    }

    store.roots.forEach(rootID => {
      const {weight} = store.getElementByID(rootID) as any as Element;
      const maybeWeightLabel = includeWeight ? ` (${weight})` : '';

      // Store does not (yet) expose a way to get errors/warnings per root.
      snapshotLines.push(`[root]${maybeWeightLabel}`);

      for (let i = rootWeight; i < rootWeight + weight; i++) {
        const element = store.getElementAtIndex(i);

        if (element == null) {
          throw Error(`Could not find element at index "${i}"`);
        }

        const printedSelectedMarker = printSelectedMarker(i);
        const printedElement = printElement(element, includeWeight);
        const printedErrorsAndWarnings = printErrorsAndWarnings(element);
        snapshotLines.push(
          `${printedSelectedMarker}${printedElement}${printedErrorsAndWarnings}`,
        );
      }

      rootWeight += weight;

      if (includeSuspense) {
        const root = store.getSuspenseByID(rootID);
        // Roots from legacy renderers don't have a separate Suspense tree
        if (root !== null) {
          if (root.children.length > 0) {
            snapshotLines.push('[suspense-root] ' + printRects(root.rects));
            for (let i = 0; i < root.children.length; i++) {
              const childID = root.children[i];
              const child = store.getSuspenseByID(childID);
              if (child === null) {
                throw new Error(
                  `Could not find Suspense node with ID "${childID}".`,
                );
              }
              snapshotLines.push(...printSuspenseWithChildren(store, child, 1));
            }
          }
        }
      }
    });

    // Make sure the pretty-printed test align with the Store's reported number of total rows.
    if (rootWeight !== store.numElements) {
      throw Error(
        `Inconsistent Store state. Individual root weights ("${rootWeight}") do not match total weight ("${store.numElements}")`,
      );
    }

    // If roots have been unmounted, verify that they've been removed from maps.
    // This helps ensure the Store doesn't leak memory.
    store.assertExpectedRootMapSizes();
  }

  return snapshotLines.join('\n');
}

// We use JSON.parse to parse string values
// e.g. 'foo' is not valid JSON but it is a valid string
// so this method replaces e.g. 'foo' with "foo"
export function sanitizeForParse(value: any): any | string {
  if (typeof value === 'string') {
    if (
      value.length >= 2 &&
      value.charAt(0) === "'" &&
      value.charAt(value.length - 1) === "'"
    ) {
      return '"' + value.slice(1, value.length - 1) + '"';
    }
  }
  return value;
}

export function smartParse(value: any): any | void | number {
  switch (value) {
    case 'Infinity':
      return Infinity;
    case '-Infinity':
      return -Infinity;
    case 'NaN':
      return NaN;
    case 'undefined':
      return undefined;
    default:
      return JSON5.parse(sanitizeForParse(value));
  }
}

export function smartStringify(value: any): string {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return 'NaN';
    } else if (!Number.isFinite(value)) {
      return value > 0 ? 'Infinity' : '-Infinity';
    }
  } else if (value === undefined) {
    return 'undefined';
  }

  return JSON.stringify(value);
}

const STACK_DELIMETER = /\n\s+at /;
const STACK_SOURCE_LOCATION = /([^\s]+) \((.+):(.+):(.+)\)/;

export function stackToComponentLocations(
  stack: string,
): Array<[string, ?ReactFunctionLocation]> {
  const out: Array<[string, ?ReactFunctionLocation]> = [];
  stack
    .split(STACK_DELIMETER)
    .slice(1)
    .forEach(entry => {
      const match = STACK_SOURCE_LOCATION.exec(entry);
      if (match) {
        const [, component, url, row, column] = match;
        out.push([
          component,
          [component, url, parseInt(row, 10), parseInt(column, 10)],
        ]);
      } else {
        out.push([entry, null]);
      }
    });
  return out;
}
