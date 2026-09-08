/**
 * @flow strict-local
 * @format
 */

'use strict';

import type {BurmeseFontSignals} from 'ZawgyiTypes';

import FontCapability from 'FontCapability';
import * as DOM from 'DOMUtils';
import ZawgyiDetectionLogEvent from 'ZawgyiDetectionLogEvent';
import MutationObserver from 'MutationObserver';
import {detectFont, gatherFontDetectionSignals} from 'ZawgyiDetection';

const ZG_TO_UNICODE_RULES = [
  [RegExp('\u200B', 'g'), ''],
  [RegExp('(\u103d|\u1087)', 'g'), '\u103e'],
  [RegExp('\u103c', 'g'), '\u103d'],
  [
    RegExp('(\u103b|\u107e|\u107f|\u1080|\u1081|\u1082|\u1083|\u1084)', 'g'),
    '\u103c',
  ],
  [RegExp('(\u103a|\u107d)', 'g'), '\u103b'],
  [RegExp('\u1039', 'g'), '\u103a'],
  [RegExp('(\u1066|\u1067)', 'g'), '\u1039\u1006'],
  [RegExp('\u106a', 'g'), '\u1009'],
  [RegExp('\u106b', 'g'), '\u100a'],
  [RegExp('\u106c', 'g'), '\u1039\u100b'],
  [RegExp('\u106d', 'g'), '\u1039\u100c'],
  [RegExp('\u106e', 'g'), '\u100d\u1039\u100d'],
  [RegExp('\u106f', 'g'), '\u100d\u1039\u100e'],
  [RegExp('\u1070', 'g'), '\u1039\u100f'],
  [RegExp('(\u1071|\u1072)', 'g'), '\u1039\u1010'],
  [RegExp('\u1060', 'g'), '\u1039\u1000'],
  [RegExp('\u1061', 'g'), '\u1039\u1001'],
  [RegExp('\u1062', 'g'), '\u1039\u1002'],
  [RegExp('\u1063', 'g'), '\u1039\u1003'],
  [RegExp('\u1065', 'g'), '\u1039\u1005'],
  [RegExp('\u1068', 'g'), '\u1039\u1007'],
  [RegExp('\u1069', 'g'), '\u1039\u1008'],
  [RegExp('(\u1073|\u1074)', 'g'), '\u1039\u1011'],
  [RegExp('\u1075', 'g'), '\u1039\u1012'],
  [RegExp('\u1076', 'g'), '\u1039\u1013'],
  [RegExp('\u1077', 'g'), '\u1039\u1014'],
  [RegExp('\u1078', 'g'), '\u1039\u1015'],
  [RegExp('\u1079', 'g'), '\u1039\u1016'],
  [RegExp('\u107a', 'g'), '\u1039\u1017'],
  [RegExp('\u107c', 'g'), '\u1039\u1019'],
  [RegExp('\u1085', 'g'), '\u1039\u101c'],
  [RegExp('\u1033', 'g'), '\u102f'],
  [RegExp('\u1034', 'g'), '\u1030'],
  [RegExp('\u103f', 'g'), '\u1030'],
  [RegExp('\u1086', 'g'), '\u103f'],
  [RegExp('\u1036\u1088', 'g'), '\u1088\u1036'],
  [RegExp('\u1088', 'g'), '\u103e\u102f'],
  [RegExp('\u1089', 'g'), '\u103e\u1030'],
  [RegExp('\u108a', 'g'), '\u103d\u103e'],
  [RegExp('\u103B\u1064', 'g'), '\u1064\u103B'],
  [RegExp('(\u1031)?([\u1000-\u1021])\u1064', 'g'), '\u1004\u103a\u1039$1$2'],
  [
    RegExp('(\u1031)?([\u1000-\u1021])\u108b', 'g'),
    '\u1004\u103a\u1039$1$2\u102d',
  ],
  [
    RegExp('(\u1031)?([\u1000-\u1021])\u108c', 'g'),
    '\u1004\u103a\u1039$1$2\u102e',
  ],
  [
    RegExp('(\u1031)?([\u1000-\u1021])\u108d', 'g'),
    '\u1004\u103a\u1039$1$2\u1036',
  ],
  [RegExp('\u108e', 'g'), '\u102d\u1036'],
  [RegExp('\u108f', 'g'), '\u1014'],
  [RegExp('\u1090', 'g'), '\u101b'],
  [RegExp('\u1091', 'g'), '\u100f\u1039\u100d'],
  [RegExp('\u1019\u102c(\u107b|\u1093)', 'g'), '\u1019\u1039\u1018\u102c'],
  [RegExp('(\u107b|\u1093)', 'g'), '\u1039\u1018'],
  [RegExp('(\u1094|\u1095)', 'g'), '\u1037'],
  [RegExp('([\u1000-\u1021])\u1037\u1032', 'g'), '$1\u1032\u1037'],
  [RegExp('\u1096', 'g'), '\u1039\u1010\u103d'],
  [RegExp('\u1097', 'g'), '\u100b\u1039\u100b'],
  [RegExp('\u103c([\u1000-\u1021])([\u1000-\u1021])?', 'g'), '$1\u103c$2'],
  [RegExp('([\u1000-\u1021])\u103c\u103a', 'g'), '\u103c$1\u103a'],
  [
    RegExp('\u1047([\u102c-\u1030\u1032\u1036-\u1038\u103d\u1038])', 'g'),
    '\u101b$1',
  ],
  [RegExp('\u1031\u1047', 'g'), '\u1031\u101b'],
  [
    RegExp(
      '\u1040(\u102e|\u102f|\u102d\u102f|\u1030|\u1036|\u103d|\u103e)',
      'g'
    ),
    '\u101d$1',
  ],
  [
    // Equivalent to:
    // /([^\u1040\u1041\u1042\u1043\u1044\u1045\u1046\u1047\u1048\u1049])\u1040\u102b/u
    RegExp(
      '((?:[\0-\u103F\u104A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]))\u1040\u102B',
      'g'
    ),
    '$1\u101d\u102b',
  ],
  [
    // Equivalent to:
    // /([\u1040\u1041\u1042\u1043\u1044\u1045\u1046\u1047\u1048\u1049])\u1040\u102b([^\u1038])/u
    RegExp(
      '([\u1040-\u1049])\u1040\u102B((?:[\0-\u1037\u1039-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]))',
      'g'
    ),
    '$1\u101d\u102b$2',
  ],
  [RegExp('^\u1040(\u102b)', 'g'), '\u101d$1'],
  [
    // Equivalent to:
    // /\u1040\u102d([^\u0020]?)/u
    RegExp(
      '\u1040\u102D((?:[\0-\x1F!-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])?)',
      'g'
    ),
    '\u101d\u102d$1',
  ],
  [
    // Equivalent to:
    // /([^\u1040-\u1049])\u1040([^\u1040-\u1049\u0020]|[\u104a\u104b])/u
    RegExp(
      '((?:[\0-\u103F\u104A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]))\u1040((?:[\0-\x1F!-\u103F\u104A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])|[\u104A\u104B])',
      'g'
    ),
    '$1\u101d$2',
  ],
  [
    // Equivalent to:
    // /([^\u1040-\u1049])\u1040([$f$n$r])/u
    RegExp(
      '((?:[\0-\u103F\u104A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]))\u1040([$fnr])',
      'g'
    ),
    '$1\u101d$2',
  ],
  [
    // Equivalent to:
    // /([^\u1040-\u1049])\u1040$/u
    RegExp(
      '((?:[\0-\u103F\u104A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]))\u1040$',
      'g'
    ),
    '$1\u101d',
  ],
  [RegExp('\u1031([\u1000-\u1021])(\u103e)?(\u103b)?', 'g'), '$1$2$3\u1031'],
  [
    RegExp('([\u1000-\u1021])\u1031([\u103b\u103c\u103d\u103e]+)', 'g'),
    '$1$2\u1031',
  ],
  [RegExp('\u1032\u103d', 'g'), '\u103d\u1032'],
  [RegExp('([\u102d\u102e])\u103b', 'g'), '\u103b$1'],
  [RegExp('\u103d\u103b', 'g'), '\u103b\u103d'],
  [RegExp('\u103a\u1037', 'g'), '\u1037\u103a'],
  [RegExp('\u102f(\u102d|\u102e|\u1036|\u1037)\u102f', 'g'), '\u102f$1'],
  [RegExp('(\u102f|\u1030)(\u102d|\u102e)', 'g'), '$2$1'],
  [RegExp('(\u103e)(\u103b|\u103c)', 'g'), '$2$1'],
  [RegExp('\u1025([\u1037]?[\u103a\u102c])', 'g'), '\u1009$1'],
  [RegExp('\u1025\u102e', 'g'), '\u1026'],
  [RegExp('\u1005\u103b', 'g'), '\u1008'],
  [RegExp('\u1036(\u102f|\u1030)', 'g'), '$1\u1036'],
  [RegExp('\u1031\u1037\u103e', 'g'), '\u103e\u1031\u1037'],
  [RegExp('\u1031\u103e\u102c', 'g'), '\u103e\u1031\u102c'],
  [RegExp('\u105a', 'g'), '\u102b\u103a'],
  [RegExp('\u1031\u103b\u103e', 'g'), '\u103b\u103e\u1031'],
  [RegExp('(\u102d|\u102e)(\u103d|\u103e)', 'g'), '$2$1'],
  [RegExp('\u102c\u1039([\u1000-\u1021])', 'g'), '\u1039$1\u102c'],
  [
    RegExp('\u103c\u1004\u103a\u1039([\u1000-\u1021])', 'g'),
    '\u1004\u103a\u1039$1\u103c',
  ],
  [
    RegExp('\u1039\u103c\u103a\u1039([\u1000-\u1021])', 'g'),
    '\u103a\u1039$1\u103c',
  ],
  [RegExp('\u103c\u1039([\u1000-\u1021])', 'g'), '\u1039$1\u103c'],
  [RegExp('\u1036\u1039([\u1000-\u1021])', 'g'), '\u1039$1\u1036'],
  [RegExp('\u1092', 'g'), '\u100b\u1039\u100c'],
  [RegExp('\u104e', 'g'), '\u104e\u1004\u103a\u1038'],
  [RegExp('\u1040(\u102b|\u102c|\u1036)', 'g'), '\u101d$1'],
  [RegExp('\u1025\u1039', 'g'), '\u1009\u1039'],
  [RegExp('([\u1000-\u1021])\u103c\u1031\u103d', 'g'), '$1\u103c\u103d\u1031'],
  [
    RegExp('([\u1000-\u1021])\u103b\u1031\u103d(\u103e)?', 'g'),
    '$1\u103b\u103d$2\u1031',
  ],
  [RegExp('([\u1000-\u1021])\u103d\u1031\u103b', 'g'), '$1\u103b\u103d\u1031'],
  [RegExp('([\u1000-\u1021])\u1031(\u1039[\u1000-\u1021])', 'g'), '$1$2\u1031'],
  [RegExp('\u1038\u103a', 'g'), '\u103a\u1038'],
  [RegExp('\u102d\u103a|\u103a\u102d', 'g'), '\u102d'],
  [RegExp('\u102d\u102f\u103a', 'g'), '\u102d\u102f'],
  [RegExp('\u0020\u1037', 'g'), '\u1037'],
  [RegExp('\u1037\u1036', 'g'), '\u1036\u1037'],
  [RegExp(' \u1037', 'g'), '\u1037'],
  [RegExp('[\u102d]+', 'g'), '\u102d'],
  [RegExp('[\u103a]+', 'g'), '\u103a'],
  [RegExp('[\u103d]+', 'g'), '\u103d'],
  [RegExp('[\u1037]+', 'g'), '\u1037'],
  [RegExp('[\u102e]+', 'g'), '\u102e'],
  [RegExp('\u102d\u102e|\u102e\u102d', 'g'), '\u102e'],
  [RegExp('\u102f\u102d', 'g'), '\u102d\u102f'],
  [RegExp('\u1037\u1037', 'g'), '\u1037'],
  [RegExp('\u1032\u1032', 'g'), '\u1032'],
  [RegExp('\u1044\u1004\u103a\u1038', 'g'), '\u104E\u1004\u103a\u1038'],
  [RegExp('([\u102d\u102e])\u1039([\u1000-\u1021])', 'g'), '\u1039$2$1'],
  [RegExp('\u1036\u103d', 'g'), '\u103d\u1036'],
];

function convertZawgyiToUnicode(text: string): string {
  let result = text;
  for (let i = 0; i < ZG_TO_UNICODE_RULES.length; i++) {
    result = result.replace(
      ZG_TO_UNICODE_RULES[i][0],
      ZG_TO_UNICODE_RULES[i][1]
    );
  }
  return result;
}

function isZawgyiEncodedText(text: string): boolean {
  const unicodeMatches = text.match(
    /\u103e|\u103f|\u100a\u103a|\u1014\u103a|\u1004\u103a|\u1031\u1038|\u1031\u102c|\u103a\u1038|\u1035|[\u1050-\u1059]|^([\u1000-\u1021]\u103c|[\u1000-\u1021]\u1031)/g
  );
  const zawgyiMatches = text.match(
    /\u102c\u1039|\u103a\u102c|\p{Z}(\u103b|\u1031|[\u107e-\u1084])[\u1000-\u1021]|^(\u103b|\u1031|[\u107e-\u1084])[\u1000-\u1021]|[\u1000-\u1021]\u1039[^\u1000-\u1021]|\u1025\u1039|\u1039\u1038|[\u102b-\u1030\u1031\u103a\u1038](\u103b|[\u107e-\u1084])[\u1000-\u1021]|\u1036\u102f|[\u1000-\u1021]\u1039\u1031|\u1064|\u1039\p{Z}|\u102c\u1031|[\u102b-\u1030\u103a\u1038]\u1031[\u1000-\u1021]|\u1031\u1031|\u102f\u102d|(\u1039$)/g
  );
  const unicodeCount = unicodeMatches == null ? 0 : unicodeMatches.length;
  const zawgyiCount = zawgyiMatches == null ? 0 : zawgyiMatches.length;
  // Total heuristic: Use the Unicode to Zawgyi pattern ratio. Lean towards
  // false positives for now.
  return 1.2 * zawgyiCount > unicodeCount;
}

// Hard-code these since they will only ever be needed for Burmese Unicode.
const TEXT_BURMESE_UNREADABLE_LINK =
  '\u1005\u102C\u101E\u102C\u1038\u1019\u1016\u1010\u103A\u101C\u102D\u102F\u1037\u1019\u101B\u1021\u1031\u102C\u1004\u103A?';
const TEXT_BURMESE_REVERT =
  '\u1019\u101C\u102F\u1015\u103A\u1010\u1031\u102C\u1037\u1015\u102B';

function convertRecursively(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.parentElement != null) {
      node.parentElement.setAttribute(
        'data-zg-pre-conversion',
        node.textContent
      );
    }
    node.textContent = convertZawgyiToUnicode(node.textContent);
  }
  for (let i = 0; i < node.childNodes.length; i++) {
    convertRecursively(node.childNodes[i]);
  }
}

function revertRecursively(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.parentElement != null) {
      const previousText = node.parentElement.getAttribute(
        'data-zg-pre-conversion'
      );
      if (previousText != null) {
        node.textContent = previousText;
      }
    }
  }
  for (let i = 0; i < node.childNodes.length; i++) {
    revertRecursively(node.childNodes[i]);
  }
}

export function logEvent(
  event: string,
  fontSignals: ?BurmeseFontSignals
): void {
  ZawgyiDetectionLogEvent.log(() => ({
    msite_event: event,
    aforementioned_width: String(fontSignals?.aforementioned_width ?? 0),
    detected_font: (fontSignals?.detected_font ?? '') as string,
    ka_virama_ka_width: String(fontSignals?.ka_virama_ka_width ?? 0),
    ka_width: String(fontSignals?.ka_width ?? 0),
    msite_user_agent: fontSignals?.user_agent,
    requested_with: fontSignals?.requested_with,
  }));
}

function convertOnClick(element: HTMLElement, link: HTMLElement) {
  if (element.getAttribute('data-is-zg-converted') === 'false') {
    convertRecursively(element);
    element.setAttribute('data-is-zg-converted', 'true');
    link.textContent = TEXT_BURMESE_REVERT;
    logEvent('uni_to_zg_convert_clicked');
  } else {
    revertRecursively(element);
    element.setAttribute('data-is-zg-converted', 'false');
    link.textContent = TEXT_BURMESE_UNREADABLE_LINK;
    logEvent('uni_to_zg_revert_clicked');
  }
}

function addConvertLinkToDiv(element: HTMLElement) {
  if (element.hasAttribute('data-is-zg-converted')) {
    // Already added link.
    return;
  }
  if (!isZawgyiEncodedText(element.textContent)) {
    return;
  }
  element.setAttribute('data-is-zg-converted', 'false');
  const link = DOM.create('a', {href: '#'}, TEXT_BURMESE_UNREADABLE_LINK);
  link.style.display = 'inline-block';
  link.style.textAlign = 'center';
  link.style.fontSize = '0.85em';
  link.style.width = '100%';
  link.addEventListener('click', () => convertOnClick(element, link));
  element.insertBefore(link, element.firstChild);
}

function createConversionLinks() {
  const posts = document.getElementsByClassName('story_body_container');
  for (let i = 0; i < posts.length; i++) {
    addConvertLinkToDiv(posts[i]);
  }
}

function initializeZawgyiToUnicodeConversion(): void {
  // Create conversion links for stories already on the page.
  createConversionLinks();
  // Now see if there's a feed and start listening for mutatations that might
  // add new stories to it to make sure links are added for newly added stories.
  const feed = document.getElementById('viewport');
  if (feed == null) {
    return;
  }
  const observer = new MutationObserver(function () {
    createConversionLinks();
  });
  observer.observe(feed, {
    childList: true,
    subtree: true,
  });
}

// @ServerCallable
export function logBurmeseFontSignals(requestedWith: ?string) {
  const data = gatherFontDetectionSignals(true);
  data.requested_with = requestedWith == null ? '' : requestedWith;
  data.user_agent = navigator.userAgent;
  data.detected_font = detectFont();
  logEvent('font_detected', data);
}
// @ServerCallable
export function enableZawgyiToUnicodeConversionLinks() {
  const deviceFont = detectFont();
  // Only add conversion links if device font is Unicode.
  if (deviceFont !== FontCapability.UNICODE) {
    return;
  }
  initializeZawgyiToUnicodeConversion();
}
