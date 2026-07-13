/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import {enableLogger} from 'react-devtools-feature-flags';

export type LoggerEvent =
  | {
      +event_name: 'loaded-dev-tools',
    }
  | {
      +event_name: 'error',
      +error_message: string | null,
      +error_stack: string | null,
      +error_component_stack: string | null,
    }
  | {
      +event_name: 'selected-components-tab',
    }
  | {
      +event_name: 'selected-profiler-tab',
    }
  | {
      +event_name: 'selected-suspense-tab',
    }
  | {
      +event_name: 'load-hook-names',
      +event_status: 'success' | 'error' | 'timeout' | 'unknown',
      +duration_ms: number,
      +inspected_element_display_name: string | null,
      +inspected_element_number_of_hooks: number | null,
    }
  | {
      +event_name: 'select-element',
      +metadata: {
        +source: string,
      },
    }
  | {
      +event_name: 'inspect-element-button-clicked',
    }
  | {
      +event_name: 'profiling-start',
      +metadata: {
        +current_tab: string,
      },
    }
  | {
      +event_name: 'profiler-tab-changed',
      +metadata: {
        +tabId: string,
      },
    }
  | {
      +event_name: 'settings-changed',
      +metadata: {
        +key: string,
        +value: any,
        ...
      },
    }
  | {
      +event_name: 'selected-editor-pane',
    }
  | {+event_name: 'selected-inspected-element-pane'};

export type LogFunction = LoggerEvent => void | Promise<void>;

let logFunctions: Array<LogFunction> = [];
export const logEvent: LogFunction =
  enableLogger === true
    ? function logEvent(event: LoggerEvent): void {
        logFunctions.forEach(log => {
          log(event);
        });
      }
    : function logEvent() {};

export const registerEventLogger: (logFunction: LogFunction) => () => void =
  enableLogger === true
    ? function registerEventLogger(logFunction: LogFunction): () => void {
        // $FlowFixMe[constant-condition]
        if (enableLogger) {
          logFunctions.push(logFunction);
          return function unregisterEventLogger() {
            logFunctions = logFunctions.filter(log => log !== logFunction);
          };
        }
        return () => {};
      }
    : function registerEventLogger(logFunction: LogFunction) {
        return () => {};
      };
