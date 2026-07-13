/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import styles from './ButtonIcon.css';

export type IconType =
  | 'add'
  | 'cancel'
  | 'clear'
  | 'close'
  | 'collapsed'
  | 'copy'
  | 'delete'
  | 'down'
  | 'editor'
  | 'expanded'
  | 'export'
  | 'filter'
  | 'import'
  | 'log-data'
  | 'more'
  | 'next'
  | 'parse-hook-names'
  | 'previous'
  | 'record'
  | 'reload'
  | 'save'
  | 'search'
  | 'settings'
  | 'panel-left-close'
  | 'panel-left-open'
  | 'panel-right-close'
  | 'panel-right-open'
  | 'panel-bottom-open'
  | 'panel-bottom-close'
  | 'filter-on'
  | 'filter-off'
  | 'play'
  | 'pause'
  | 'skip-previous'
  | 'skip-next'
  | 'error'
  | 'suspend'
  | 'undo'
  | 'up'
  | 'view-dom'
  | 'view-source';

type Props = {
  className?: string,
  type: IconType,
};

const panelIcons = '96 -864 768 768';
export default function ButtonIcon({className = '', type}: Props): React.Node {
  let pathData = null;
  let viewBox = '0 0 24 24';
  switch (type) {
    case 'add':
      pathData = PATH_ADD;
      break;
    case 'cancel':
      pathData = PATH_CANCEL;
      break;
    case 'clear':
      pathData = PATH_CLEAR;
      break;
    case 'close':
      pathData = PATH_CLOSE;
      break;
    case 'collapsed':
      pathData = PATH_COLLAPSED;
      break;
    case 'copy':
      pathData = PATH_COPY;
      break;
    case 'delete':
      pathData = PATH_DELETE;
      break;
    case 'down':
      pathData = PATH_DOWN;
      break;
    case 'editor':
      pathData = PATH_EDITOR;
      break;
    case 'expanded':
      pathData = PATH_EXPANDED;
      break;
    case 'export':
      pathData = PATH_EXPORT;
      break;
    case 'filter':
      pathData = PATH_FILTER;
      break;
    case 'import':
      pathData = PATH_IMPORT;
      break;
    case 'log-data':
      pathData = PATH_LOG_DATA;
      break;
    case 'more':
      pathData = PATH_MORE;
      break;
    case 'next':
      pathData = PATH_NEXT;
      break;
    case 'parse-hook-names':
      pathData = PATH_PARSE_HOOK_NAMES;
      break;
    case 'previous':
      pathData = PATH_PREVIOUS;
      break;
    case 'record':
      pathData = PATH_RECORD;
      break;
    case 'reload':
      pathData = PATH_RELOAD;
      break;
    case 'save':
      pathData = PATH_SAVE;
      break;
    case 'search':
      pathData = PATH_SEARCH;
      break;
    case 'settings':
      pathData = PATH_SETTINGS;
      break;
    case 'error':
      pathData = PATH_ERROR;
      break;
    case 'panel-left-close':
      pathData = PATH_MATERIAL_PANEL_LEFT_CLOSE;
      viewBox = panelIcons;
      break;
    case 'panel-left-open':
      pathData = PATH_MATERIAL_PANEL_LEFT_OPEN;
      viewBox = panelIcons;
      break;
    case 'panel-right-close':
      pathData = PATH_MATERIAL_PANEL_RIGHT_CLOSE;
      viewBox = panelIcons;
      break;
    case 'panel-right-open':
      pathData = PATH_MATERIAL_PANEL_RIGHT_OPEN;
      viewBox = panelIcons;
      break;
    case 'panel-bottom-open':
      pathData = PATH_MATERIAL_PANEL_BOTTOM_OPEN;
      viewBox = panelIcons;
      break;
    case 'panel-bottom-close':
      pathData = PATH_MATERIAL_PANEL_BOTTOM_CLOSE;
      viewBox = panelIcons;
      break;
    case 'filter-on':
      pathData = PATH_MATERIAL_FILTER_ALT;
      viewBox = panelIcons;
      break;
    case 'filter-off':
      pathData = PATH_MATERIAL_FILTER_ALT_OFF;
      viewBox = panelIcons;
      break;
    case 'play':
      pathData = PATH_MATERIAL_PLAY_ARROW;
      viewBox = panelIcons;
      break;
    case 'pause':
      pathData = PATH_MATERIAL_PAUSE;
      viewBox = panelIcons;
      break;
    case 'skip-previous':
      pathData = PATH_MATERIAL_SKIP_PREVIOUS_ARROW;
      viewBox = panelIcons;
      break;
    case 'skip-next':
      pathData = PATH_MATERIAL_SKIP_NEXT_ARROW;
      viewBox = panelIcons;
      break;
    case 'suspend':
      pathData = PATH_SUSPEND;
      break;
    case 'undo':
      pathData = PATH_UNDO;
      break;
    case 'up':
      pathData = PATH_UP;
      break;
    case 'view-dom':
      pathData = PATH_VIEW_DOM;
      break;
    case 'view-source':
      pathData = PATH_VIEW_SOURCE;
      break;
    default:
      console.warn(`Unsupported type "${type}" specified for ButtonIcon`);
      break;
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`${styles.ButtonIcon} ${className}`}
      width="24"
      height="24"
      viewBox={viewBox}>
      <path d="M0 0h24v24H0z" fill="none" />
      {typeof pathData === 'string' ? (
        <path fill="currentColor" d={pathData} />
      ) : (
        pathData
      )}
    </svg>
  );
}

const PATH_ADD =
  'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z';

const PATH_CANCEL = `
  M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z
`;

const PATH_CLEAR = `
  M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69
  16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z
`;

const PATH_CLOSE =
  'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z';

const PATH_COLLAPSED = 'M10 17l5-5-5-5v10z';

const PATH_COPY = `
  M3 13h2v-2H3v2zm0 4h2v-2H3v2zm2 4v-2H3a2 2 0 0 0 2 2zM3 9h2V7H3v2zm12 12h2v-2h-2v2zm4-18H9a2 2 0 0 0-2
  2v10a2 2 0 0 0 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H9V5h10v10zm-8 6h2v-2h-2v2zm-4 0h2v-2H7v2z
`;

const PATH_DELETE = `
  M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12
  13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z
`;

const PATH_DOWN = 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z';

const PATH_EXPANDED = 'M7 10l5 5 5-5z';

const PATH_EXPORT = 'M15.82,2.14v7H21l-9,9L3,9.18H8.18v-7ZM3,20.13H21v1.73H3Z';

const PATH_FILTER = 'M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z';

const PATH_IMPORT = 'M8.18,18.13v-7H3l9-8.95,9,9H15.82v7ZM3,20.13H21v1.73H3Z';

const PATH_LOG_DATA = `
  M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41
  3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04
  1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6
  8h-4v-2h4v2zm0-4h-4v-2h4v2z
`;

const PATH_MORE = `
  M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9
  2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z
`;

const PATH_NEXT = 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z';

const PATH_PARSE_HOOK_NAMES = (
  <g>
    <polygon points="20,7 20.94,4.94 23,4 20.94,3.06 20,1 19.06,3.06 17,4 19.06,4.94" />
    <polygon points="8.5,7 9.44,4.94 11.5,4 9.44,3.06 8.5,1 7.56,3.06 5.5,4 7.56,4.94" />
    <polygon points="20,12.5 19.06,14.56 17,15.5 19.06,16.44 20,18.5 20.94,16.44 23,15.5 20.94,14.56" />
    <path d="M17.71,9.12l-2.83-2.83C14.68,6.1,14.43,6,14.17,6c-0.26,0-0.51,0.1-0.71,0.29L2.29,17.46c-0.39,0.39-0.39,1.02,0,1.41 l2.83,2.83C5.32,21.9,5.57,22,5.83,22s0.51-0.1,0.71-0.29l11.17-11.17C18.1,10.15,18.1,9.51,17.71,9.12z M14.17,8.42l1.41,1.41 L14.41,11L13,9.59L14.17,8.42z M5.83,19.59l-1.41-1.41L11.59,11L13,12.41L5.83,19.59z" />
  </g>
);

const PATH_PREVIOUS =
  'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z';

const PATH_RECORD = 'M4,12a8,8 0 1,0 16,0a8,8 0 1,0 -16,0';

const PATH_RELOAD = `
  M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0
  6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0
  3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z
`;

const PATH_SAVE = `
  M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z
`;

const PATH_SEARCH = `
  M8.5,22H3.7l-1.4-1.5V3.8l1.3-1.5h17.2l1,1.5v4.9h-1.3V4.3l-0.4-0.6H4.2L3.6,4.3V20l0.7,0.7h4.2V22z
  M23,13.9l-4.6,3.6l4.6,4.6l-1.1,1.1l-4.7-4.4l-3.3,4.4l-3.2-12.3L23,13.9z
`;

const PATH_SETTINGS = `
  M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49
  1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38
  2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11
  1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4
  1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49
  1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5
  3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z
`;

const PATH_ERROR =
  'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z';

const PATH_SUSPEND = `
  M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97
  0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z
`;

const PATH_UNDO = `
  M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88
  3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z
`;

const PATH_UP = 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z';

const PATH_VIEW_DOM = `
  M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12
  17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3
  3-1.34 3-3-1.34-3-3-3z
`;

const PATH_VIEW_SOURCE = `
  M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z
  `;

const PATH_EDITOR = `
  M7 5h10v2h2V3c0-1.1-.9-1.99-2-1.99L7 1c-1.1 0-2 .9-2 2v4h2V5zm8.41 11.59L20 12l-4.59-4.59L14 8.83 17.17 12 14 15.17l1.41 1.42zM10 15.17L6.83 12 10 8.83 8.59 7.41 4 12l4.59 4.59L10 15.17zM17 19H7v-2H5v4c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-4h-2v2z
`;

// Source: Material Design Icons left_panel_close
const PATH_MATERIAL_PANEL_LEFT_CLOSE = `
  M648-324v-312L480-480l168 156ZM211-144q-27.64 0-47.32-19.68T144-211v-538q0-27.64 19.68-47.32T211-816h538q27.64 0 47.32 19.68T816-749v538q0 27.64-19.68 47.32T749-144H211Zm125-72v-528H216v528h120Zm72 0h336v-528H408v528Zm-72 0H216h120Z
`;

// Source: Material Design Icons left_panel_open
const PATH_MATERIAL_PANEL_LEFT_OPEN = `
  M504-595v230q0 12.25 10.5 16.62Q525-344 534-352l110-102q11-11.18 11-26.09T644-506L534-608q-8.82-8-19.41-3.5T504-595ZM211-144q-27.64 0-47.32-19.68T144-211v-538q0-27.64 19.68-47.32T211-816h538q27.64 0 47.32 19.68T816-749v538q0 27.64-19.68 47.32T749-144H211Zm125-72v-528H216v528h120Zm72 0h336v-528H408v528Zm-72 0H216h120Z
`;

// Source: Material Design Icons right_panel_close
const PATH_MATERIAL_PANEL_RIGHT_CLOSE = `
  M312-365q0 12.25 10.5 16.62Q333-344 342-352l110-102q11-11.18 11-26.09T452-506L342-608q-8.82-8-19.41-3.5T312-595v230ZM211-144q-27.64 0-47.32-19.68T144-211v-538q0-27.64 19.68-47.32T211-816h538q27.64 0 47.32 19.68T816-749v538q0 27.64-19.68 47.32T749-144H211Zm413-72h120v-528H624v528Zm-72 0v-528H216v528h336Zm72 0h120-120Z
`;

// Source: Material Design Icons right_panel_open
const PATH_MATERIAL_PANEL_RIGHT_OPEN = `
  M456-365v-230q0-12.25-10.5-16.63Q435-616 426-608L316-506q-11 11.18-11 26.09T316-454l110 102q8.82 8 19.41 3.5T456-365ZM211-144q-27.64 0-47.32-19.68T144-211v-538q0-27.64 19.68-47.32T211-816h538q27.64 0 47.32 19.68T816-749v538q0 27.64-19.68 47.32T749-144H211Zm413-72h120v-528H624v528Zm-72 0v-528H216v528h336Zm72 0h120-120Z
`;

// Source: Material Design Icons bottom_panel_open
const PATH_MATERIAL_PANEL_BOTTOM_OPEN = `
  M365-504h230q12.25 0 16.63-10.5Q616-525 608-534L506-644q-11.18-11-26.09-11T454-644L352-534q-8 8.82-3.5 19.41T365-504ZM211-144q-27.64 0-47.32-19.68T144-211v-538q0-27.64 19.68-47.32T211-816h538q27.64 0 47.32 19.68T816-749v538q0 27.64-19.68 47.32T749-144H211Zm5-192v120h528v-120H216Zm0-72h528v-336H216v336Zm0 72v120-120Z
`;

// Source: Material Design Icons bottom_panel_close
const PATH_MATERIAL_PANEL_BOTTOM_CLOSE = `
  m506-508 102-110q8-8.82 3.5-19.41T595-648H365q-12.25 0-16.62 10.5Q344-627 352-618l102 110q11.18 11 26.09 11T506-508Zm243-308q27.64 0 47.32 19.68T816-749v538q0 27.64-19.68 47.32T749-144H211q-27.64 0-47.32-19.68T144-211v-538q0-27.64 19.68-47.32T211-816h538ZM216-336v120h528v-120H216Zm528-72v-336H216v336h528Zm-528 72v120-120Z
`;

// Source: Material Design Icons filter_alt
const PATH_MATERIAL_FILTER_ALT = `
  M440-160q-17 0-28.5-11.5T400-200v-240L168-736q-15-20-4.5-42t36.5-22h560q26 0 36.5 22t-4.5 42L560-440v240q0 17-11.5 28.5T520-160h-80Zm40-308 198-252H282l198 252Zm0 0Z
`;

// Source: Material Design Icons filter_alt_off
const PATH_MATERIAL_FILTER_ALT_OFF = `
  m592-481-57-57 143-182H353l-80-80h487q25 0 36 22t-4 42L592-481ZM791-56 560-287v87q0 17-11.5 28.5T520-160h-80q-17 0-28.5-11.5T400-200v-247L56-791l56-57 736 736-57 56ZM535-538Z
`;

// Source: Material Design Icons play_arrow
const PATH_MATERIAL_PLAY_ARROW = `
  M320-200v-560l440 280-440 280Zm80-280Zm0 134 210-134-210-134v268Z
`;

// Source: Material Design Icons pause
const PATH_MATERIAL_PAUSE = `
  M520-200v-560h240v560H520Zm-320 0v-560h240v560H200Zm400-80h80v-400h-80v400Zm-320 0h80v-400h-80v400Zm0-400v400-400Zm320 0v400-400Z
`;

// Source: Material Design Icons skip_previous
const PATH_MATERIAL_SKIP_PREVIOUS_ARROW = `
  M220-240v-480h80v480h-80Zm520 0L380-480l360-240v480Zm-80-240Zm0 90v-180l-136 90 136 90Z
`;

// Source: Material Design Icons skip_next
const PATH_MATERIAL_SKIP_NEXT_ARROW = `
  M660-240v-480h80v480h-80Zm-440 0v-480l360 240-360 240Zm80-240Zm0 90 136-90-136-90v180Z
`;
