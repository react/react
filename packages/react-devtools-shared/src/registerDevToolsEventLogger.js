/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {LoggerEvent} from 'react-devtools-shared/src/Logger';

import {registerEventLogger} from 'react-devtools-shared/src/Logger';
import {enableLogger} from 'react-devtools-feature-flags';

let currentLoggingIFrame = null;
let currentSessionId = null;
let missedEvents: Array<LoggerEvent> = [];
let hasRegisteredEventLogger = false;

type LoggerContext = {
  page_url: ?string,
};

export function registerDevToolsEventLogger(
  surface: string,
  fetchAdditionalContext?:
    | (() => LoggerContext)
    | (() => Promise<LoggerContext>),
): void {
  async function logEvent(event: LoggerEvent) {
    if (enableLogger) {
      if (currentLoggingIFrame != null && currentSessionId != null) {
        const {metadata, ...eventWithoutMetadata} = event;
        const additionalContext: LoggerContext | {} =
          fetchAdditionalContext != null ? await fetchAdditionalContext() : {};

        currentLoggingIFrame?.contentWindow?.postMessage(
          {
            source: 'react-devtools-logging',
            event: eventWithoutMetadata,
            context: {
              ...additionalContext,
              metadata: metadata != null ? JSON.stringify(metadata) : '',
              session_id: currentSessionId,
              surface,
              version: process.env.DEVTOOLS_VERSION,
            },
          },
          '*',
        );
      } else {
        missedEvents.push(event);
      }
    }
  }

  function handleLoggingIFrameLoaded(iframe: HTMLIFrameElement) {
    currentLoggingIFrame = iframe;

    if (missedEvents.length > 0) {
      missedEvents.forEach(event => logEvent(event));
      missedEvents = [];
    }
  }

  // If logger is enabled, register a logger that captures logged events
  // and render iframe where the logged events will be reported to
  if (enableLogger) {
    const loggingUrl = process.env.LOGGING_URL;
    const body = document.body;

    if (
      typeof loggingUrl === 'string' &&
      loggingUrl.length > 0 &&
      body != null &&
      !hasRegisteredEventLogger
    ) {
      hasRegisteredEventLogger = true;
      registerEventLogger(logEvent);
      currentSessionId = window.crypto.randomUUID();

      const iframe = document.createElement('iframe');

      iframe.onload = () => handleLoggingIFrameLoaded(iframe);
      iframe.src = loggingUrl;

      body.appendChild(iframe);
    }
  }
}
