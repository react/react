/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {useMemo} from 'react';
import {useLocalStorage} from 'react-devtools-shared/src/devtools/views/hooks';
import {
  LOCAL_STORAGE_AI_API_KEY_KEY,
  LOCAL_STORAGE_AI_BASE_URL_KEY,
  LOCAL_STORAGE_AI_MODEL_KEY,
  LOCAL_STORAGE_AI_PROVIDER_ID_KEY,
} from 'react-devtools-shared/src/constants';
import {DEFAULT_PROVIDER_ID, getProviderPreset} from './providers';

import type {AIProviderConfig} from './types';

type SetString = (value: string | (() => string)) => void;

export type AIProviderConfigHook = {
  config: AIProviderConfig,
  setProviderId: SetString,
  setBaseUrl: SetString,
  setApiKey: SetString,
  setModel: SetString,
};

// Reads and writes the persisted AI chat provider settings.
// The stored base URL and model apply per provider; switching providers
// re-derives defaults from the preset when nothing was stored yet.
export function useAIProviderConfig(): AIProviderConfigHook {
  const [providerId, setProviderId] = useLocalStorage<string>(
    LOCAL_STORAGE_AI_PROVIDER_ID_KEY,
    DEFAULT_PROVIDER_ID,
  );
  const [baseUrl, setBaseUrl] = useLocalStorage<string>(
    LOCAL_STORAGE_AI_BASE_URL_KEY,
    '',
  );
  const [apiKey, setApiKey] = useLocalStorage<string>(
    LOCAL_STORAGE_AI_API_KEY_KEY,
    '',
  );
  const [model, setModel] = useLocalStorage<string>(
    LOCAL_STORAGE_AI_MODEL_KEY,
    '',
  );

  const config = useMemo(() => {
    const preset = getProviderPreset(providerId);
    return {
      providerId,
      baseUrl: baseUrl !== '' ? baseUrl : preset.baseUrl,
      apiKey,
      model:
        model !== '' ? model : preset.models.length > 0 ? preset.models[0] : '',
    };
  }, [providerId, baseUrl, apiKey, model]);

  return {config, setProviderId, setBaseUrl, setApiKey, setModel};
}
