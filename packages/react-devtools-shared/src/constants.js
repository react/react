/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export const CHROME_WEBSTORE_EXTENSION_ID = 'fmkadmapgofadopljbjfkapdkoienihi';
export const INTERNAL_EXTENSION_ID = 'dnjnjgbfilfphmojnmhliehogmojhclc';
export const LOCAL_EXTENSION_ID = 'ikiahnapldjmdmpkmfhjdjilojjhgcbf';

// Flip this flag to true to enable verbose console debug logging.
export const __DEBUG__ = false;

// Flip this flag to true to enable performance.mark() and performance.measure() timings.
export const __PERFORMANCE_PROFILE__ = false;

export const TREE_OPERATION_ADD = 1;
export const TREE_OPERATION_REMOVE = 2;
export const TREE_OPERATION_REORDER_CHILDREN = 3;
export const TREE_OPERATION_UPDATE_TREE_BASE_DURATION = 4;
export const TREE_OPERATION_UPDATE_ERRORS_OR_WARNINGS = 5;
// Removed `TREE_OPERATION_REMOVE_ROOT`
export const TREE_OPERATION_SET_SUBTREE_MODE = 7;
export const SUSPENSE_TREE_OPERATION_ADD = 8;
export const SUSPENSE_TREE_OPERATION_REMOVE = 9;
export const SUSPENSE_TREE_OPERATION_REORDER_CHILDREN = 10;
export const SUSPENSE_TREE_OPERATION_RESIZE = 11;
export const SUSPENSE_TREE_OPERATION_SUSPENDERS = 12;
export const TREE_OPERATION_APPLIED_ACTIVITY_SLICE_CHANGE = 13;

export const PROFILING_FLAG_BASIC_SUPPORT /*.             */ = 0b001;
export const PROFILING_FLAG_TIMELINE_SUPPORT /*           */ = 0b010;
export const PROFILING_FLAG_PERFORMANCE_TRACKS_SUPPORT /* */ = 0b100;

export const UNKNOWN_SUSPENDERS_NONE: UnknownSuspendersReason = 0; // If we had at least one debugInfo, then that might have been the reason.
export const UNKNOWN_SUSPENDERS_REASON_PRODUCTION: UnknownSuspendersReason = 1; // We're running in prod. That might be why we had unknown suspenders.
export const UNKNOWN_SUSPENDERS_REASON_OLD_VERSION: UnknownSuspendersReason = 2; // We're running an old version of React that doesn't have full coverage. That might be the reason.
export const UNKNOWN_SUSPENDERS_REASON_THROWN_PROMISE: UnknownSuspendersReason = 3; // If we're in dev, didn't detect and debug info and still suspended (other than CSS/image) the only reason is thrown promise.

export opaque type UnknownSuspendersReason = 0 | 1 | 2 | 3;

export const LOCAL_STORAGE_DEFAULT_TAB_KEY = 'React::DevTools::defaultTab';
export const LOCAL_STORAGE_COMPONENT_FILTER_PREFERENCES_KEY =
  'React::DevTools::componentFilters';
export const SESSION_STORAGE_LAST_SELECTION_KEY =
  'React::DevTools::lastSelection';
export const LOCAL_STORAGE_OPEN_IN_EDITOR_URL =
  'React::DevTools::openInEditorUrl';
export const LOCAL_STORAGE_OPEN_IN_EDITOR_URL_PRESET =
  'React::DevTools::openInEditorUrlPreset';
export const LOCAL_STORAGE_ALWAYS_OPEN_IN_EDITOR =
  'React::DevTools::alwaysOpenInEditor';
export const LOCAL_STORAGE_PARSE_HOOK_NAMES_KEY =
  'React::DevTools::parseHookNames';
export const SESSION_STORAGE_RECORD_CHANGE_DESCRIPTIONS_KEY =
  'React::DevTools::recordChangeDescriptions';
export const SESSION_STORAGE_RECORD_TIMELINE_KEY =
  'React::DevTools::recordTimeline';
export const SESSION_STORAGE_RELOAD_AND_PROFILE_KEY =
  'React::DevTools::reloadAndProfile';
export const LOCAL_STORAGE_BROWSER_THEME = 'React::DevTools::theme';
export const LOCAL_STORAGE_TRACE_UPDATES_ENABLED_KEY =
  'React::DevTools::traceUpdatesEnabled';
export const LOCAL_STORAGE_SUPPORTS_PROFILING_KEY =
  'React::DevTools::supportsProfiling';

export const PROFILER_EXPORT_VERSION = 5;

export const FIREFOX_CONSOLE_DIMMING_COLOR = 'color: rgba(124, 124, 124, 0.75)';
export const ANSI_STYLE_DIMMING_TEMPLATE = '\x1b[2;38;2;124;124;124m%s\x1b[0m';
export const ANSI_STYLE_DIMMING_TEMPLATE_WITH_COMPONENT_STACK =
  '\x1b[2;38;2;124;124;124m%s %o\x1b[0m';
