/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export enum MessageSource {
  Babel,
  Forget,
  Playground,
}

export enum MessageLevel {
  Info,
  Warning,
  Error,
}

export interface Message {
  title: string;
  level: MessageLevel;
  source: MessageSource; // Can be used to further style messages differently.
  codeframe: string | undefined;
}

export function createMessage(
  message: string,
  level: MessageLevel,
  source: MessageSource,
): Message {
  const [title, ...body] = message.split('\n');
  const codeframe = body.length > 0 ? body.join('\n') : undefined;

  return {
    source,
    level,
    title,
    codeframe,
  };
}
