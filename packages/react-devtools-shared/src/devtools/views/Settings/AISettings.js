/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {
  PROVIDER_PRESETS,
  getProviderPreset,
} from 'react-devtools-shared/src/devtools/aiChat/providers';
import {useAIProviderConfig} from 'react-devtools-shared/src/devtools/aiChat/useAIProviderConfig';

import styles from './SettingsShared.css';

export default function AISettings(_: {}): React.Node {
  const {config, setProviderId, setBaseUrl, setApiKey, setModel} =
    useAIProviderConfig();

  const preset = getProviderPreset(config.providerId);

  const selectProvider = (providerId: string) => {
    setProviderId(providerId);
    // Reset per-provider fields so the new preset's defaults apply.
    setBaseUrl('');
    setModel('');
  };

  return (
    <div className={styles.SettingList}>
      <div className={styles.SettingWrapper}>
        <div className={styles.RadioLabel}>Provider</div>
        <select
          value={config.providerId}
          onChange={({currentTarget}) => selectProvider(currentTarget.value)}>
          {PROVIDER_PRESETS.map(({id, label}) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.SettingWrapper}>
        <div className={styles.RadioLabel}>API base URL</div>
        <input
          type="text"
          value={config.baseUrl}
          placeholder={preset.baseUrl !== '' ? preset.baseUrl : 'https://…/v1'}
          onChange={({currentTarget}) => setBaseUrl(currentTarget.value)}
          size={40}
        />
      </div>

      <div className={styles.SettingWrapper}>
        <div className={styles.RadioLabel}>
          API key{preset.requiresApiKey ? '' : ' (optional)'}
        </div>
        <input
          type="password"
          value={config.apiKey}
          onChange={({currentTarget}) => setApiKey(currentTarget.value)}
          size={40}
        />
      </div>

      <div className={styles.SettingWrapper}>
        <div className={styles.RadioLabel}>Model</div>
        <input
          type="text"
          value={config.model}
          placeholder={
            preset.models.length > 0 ? preset.models.join(', ') : 'model name'
          }
          onChange={({currentTarget}) => setModel(currentTarget.value)}
          list="ai-settings-model-suggestions"
          size={40}
        />
        <datalist id="ai-settings-model-suggestions">
          {preset.models.map(model => (
            <option key={model} value={model} />
          ))}
        </datalist>
      </div>

      <div className={styles.SettingWrapper}>
        The API key is stored unencrypted in this DevTools panel's local storage
        and is only sent to the API base URL above. When using local Ollama,
        start it with OLLAMA_ORIGINS="*" so it accepts requests from DevTools.
      </div>
    </div>
  );
}
