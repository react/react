/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useEffect, useState} from 'react';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import {
  PROVIDERS,
  getProvider,
} from 'react-devtools-shared/src/devtools/aiChat/providers';
import {useAIProviderConfig} from 'react-devtools-shared/src/devtools/aiChat/useAIProviderConfig';
import {useSkills} from 'react-devtools-shared/src/devtools/aiChat/useSkills';
import {
  hasCodexAuthFile,
  pickCodexAuthFile,
  setCodexAuthFallbackFile,
  supportsCodexFilePicker,
} from 'react-devtools-shared/src/devtools/aiChat/codexAuth';

import styles from './SettingsShared.css';

export default function AISettings(_: {}): React.Node {
  const {config, setProviderId, setBaseUrl, setApiKey, setModel} =
    useAIProviderConfig();
  const {skills, addSkill, removeSkill, toggleSkill} = useSkills();

  const [newSkillMarkdown, setNewSkillMarkdown] = useState('');
  const [skillError, setSkillError] = useState<string | null>(null);

  const [codexConnected, setCodexConnected] = useState(false);
  const [codexError, setCodexError] = useState<string | null>(null);
  // The picker can be unavailable/blocked in some panel frames; fall back to
  // a plain file input (session-only — plain Files can't be persisted).
  const [usePickerFallback, setUsePickerFallback] = useState(
    !supportsCodexFilePicker(),
  );

  useEffect(() => {
    let cancelled = false;
    hasCodexAuthFile().then(connected => {
      if (!cancelled) {
        setCodexConnected(connected);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePickCodexFile = async () => {
    try {
      await pickCodexAuthFile();
      setCodexConnected(true);
      setCodexError(null);
    } catch (error) {
      if (error.name === 'AbortError') {
        return; // User cancelled the dialog.
      }
      if (error.name === 'SecurityError') {
        setUsePickerFallback(true);
        return;
      }
      setCodexError(error.message);
    }
  };

  const handleCodexFallbackFile = (file: any) => {
    if (file != null) {
      setCodexAuthFallbackFile(file);
      setCodexConnected(true);
      setCodexError(null);
    }
  };

  const handleAddSkill = () => {
    const added = addSkill(newSkillMarkdown);
    if (added == null) {
      setSkillError(
        'Could not parse skill. Expected SKILL.md format: "---" frontmatter ' +
          'with name (kebab-case) and description, then a markdown body.',
      );
    } else {
      setSkillError(null);
      setNewSkillMarkdown('');
    }
  };

  const provider = getProvider(config.providerId);
  const usesApiKey = provider.auth === 'api-key';
  const usesSubscription = provider.auth === 'subscription';

  const selectProvider = (providerId: string) => {
    setProviderId(providerId);
    // Reset per-provider fields so the new provider's defaults apply.
    setBaseUrl('');
    const nextProvider = getProvider(providerId);
    setModel(nextProvider.models.length > 0 ? nextProvider.models[0] : '');
  };

  return (
    <div className={styles.SettingList}>
      <div className={styles.SettingWrapper}>
        <div className={styles.RadioLabel}>Provider</div>
        <select
          value={config.providerId}
          onChange={({currentTarget}) => selectProvider(currentTarget.value)}>
          {PROVIDERS.map(({id, label}) => (
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
          placeholder={
            provider.baseUrl !== '' ? provider.baseUrl : 'https://…/v1'
          }
          onChange={({currentTarget}) => setBaseUrl(currentTarget.value)}
          size={40}
        />
      </div>

      {usesApiKey && (
        <div className={styles.SettingWrapper}>
          <div className={styles.RadioLabel}>API key</div>
          <input
            type="password"
            value={config.apiKey}
            onChange={({currentTarget}) => setApiKey(currentTarget.value)}
            size={40}
          />
        </div>
      )}

      {usesSubscription && (
        <div className={styles.SettingWrapper}>
          <div className={styles.RadioLabel}>ChatGPT sign-in</div>
          <div>
            Run <code>codex login</code> in a terminal, then select{' '}
            <code>~/.codex/auth.json</code>. The file is read on each request —
            tokens are never copied or refreshed by this panel; re-run{' '}
            <code>codex login</code> when they expire. In the file dialog, press{' '}
            <kbd>Cmd/Ctrl+Shift+.</kbd> to show the hidden <code>.codex</code>{' '}
            folder.
          </div>
          {usePickerFallback ? (
            <input
              type="file"
              accept=".json,application/json"
              onChange={({currentTarget}) =>
                handleCodexFallbackFile(
                  currentTarget.files != null ? currentTarget.files[0] : null,
                )
              }
            />
          ) : (
            <Button
              onClick={handlePickCodexFile}
              title="Select ~/.codex/auth.json">
              {codexConnected ? 'Change auth.json…' : 'Select auth.json…'}
            </Button>
          )}
          {codexConnected && <span> Connected.</span>}
          {codexError !== null && (
            <div className={styles.ModelError}>{codexError}</div>
          )}
        </div>
      )}

      <div className={styles.SettingWrapper}>
        <div className={styles.RadioLabel}>Model</div>
        <input
          type="text"
          value={config.model}
          placeholder={
            provider.models.length > 0
              ? provider.models.join(', ')
              : 'model name'
          }
          onChange={({currentTarget}) => setModel(currentTarget.value)}
          size={40}
        />
        {config.model.trim() === '' && (
          <div className={styles.ModelError}>
            A model is required — the chat cannot send requests without one.
          </div>
        )}
      </div>

      <div className={styles.SettingWrapper}>
        {usesApiKey
          ? "The API key is stored unencrypted in this DevTools panel's local " +
            'storage and is only sent to the API base URL above. '
          : ''}
        When using local Ollama, start it with OLLAMA_ORIGINS="*" (or
        "chrome-extension://*" in the extension) so it accepts requests from
        DevTools.
      </div>

      <div className={styles.SettingWrapper}>
        <div className={styles.RadioLabel}>Skills</div>
        <div>
          Skills are SKILL.md instruction packs that extend what the AI knows
          (the model loads them on demand when relevant).
        </div>
        <ul className={styles.List}>
          {skills.map(skill => (
            <li key={skill.name}>
              {skill.builtIn ? (
                <input type="checkbox" checked={true} disabled={true} />
              ) : (
                <input
                  type="checkbox"
                  checked={skill.enabled}
                  onChange={({currentTarget}) =>
                    toggleSkill(skill.name, currentTarget.checked)
                  }
                />
              )}{' '}
              <strong>{skill.name}</strong>
              {skill.builtIn ? ' (built-in)' : ''} — {skill.description}{' '}
              {!skill.builtIn && (
                <Button
                  onClick={() => removeSkill(skill.name)}
                  title="Remove skill">
                  <ButtonIcon type="clear" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        <textarea
          rows={5}
          cols={60}
          placeholder={
            '---\nname: my-skill\ndescription: When to use this skill.\n---\nInstructions…'
          }
          value={newSkillMarkdown}
          onChange={({currentTarget}) =>
            setNewSkillMarkdown(currentTarget.value)
          }
        />
        <div>
          <Button
            onClick={handleAddSkill}
            title="Add skill from SKILL.md markdown">
            Add skill
          </Button>
        </div>
        {skillError !== null && <div>{skillError}</div>}
      </div>
    </div>
  );
}
