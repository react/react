/** @flow */

import type {DevToolsHookSettings} from 'react-devtools-shared/src/backend/types';
import type {ComponentFilter} from 'react-devtools-shared/src/frontend/types';

export function postMessage(event: UnknownMessageEventData): void {
  window.postMessage(event);
}

export interface UnknownMessageEvent
  extends MessageEvent<UnknownMessageEventData> {}

export type UnknownMessageEventData =
  | SettingsInjectorEventData
  | HookInstallerEventData;

export type HookInstallerEventData = {
  source: 'react-devtools-hook-installer',
  payload: HookInstallerEventPayload,
};

export type HookInstallerEventPayload = HookInstallerEventPayloadHandshake;

export type HookInstallerEventPayloadHandshake = {
  handshake: true,
};

export type SettingsInjectorEventData = {
  source: 'react-devtools-settings-injector',
  payload: SettingsInjectorEventPayload,
};

export type SettingsInjectorEventPayload =
  | SettingsInjectorEventPayloadHandshake
  | SettingsInjectorEventPayloadSettings;

export type SettingsInjectorEventPayloadHandshake = {
  handshake: true,
};

export type SettingsInjectorEventPayloadSettings = {
  hookSettings: DevToolsHookSettings,
  componentFilters: Array<ComponentFilter>,
};
