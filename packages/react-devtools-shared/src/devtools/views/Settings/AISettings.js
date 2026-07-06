/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useState} from 'react';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import {
  PROVIDERS,
  getProvider,
} from 'react-devtools-shared/src/devtools/aiChat/providers';
import {useAIProviderConfig} from 'react-devtools-shared/src/devtools/aiChat/useAIProviderConfig';
import {useSkills} from 'react-devtools-shared/src/devtools/aiChat/useSkills';
import {
  getAccessTokenExpiryMs,
  getStoredCodexAuthText,
  parseCodexAuthInput,
  setStoredCodexAuthText,
} from 'react-devtools-shared/src/devtools/aiChat/codexAuth';

import styles from './SettingsShared.css';

export default function AISettings(_: {}): React.Node {
  const {config, setProviderId, setBaseUrl, setApiKey, setModel} =
    useAIProviderConfig();
  const {skills, addSkill, removeSkill, toggleSkill} = useSkills();

  const [newSkillMarkdown, setNewSkillMarkdown] = useState('');
  const [skillError, setSkillError] = useState<string | null>(null);

  // Auto-saves like the API key field: state mirrors localStorage.
  const [codexAuthText, setCodexAuthText] = useState(getStoredCodexAuthText);

  const handleCodexAuthChange = (text: string) => {
    setCodexAuthText(text);
    setStoredCodexAuthText(text);
  };

  const provider = getProvider(config.providerId);
  const usesApiKey = provider.auth === 'api-key';
  const usesSubscription = provider.auth === 'subscription';

  // Inline validation only; nothing blocks typing.
  let codexHint = null;
  if (usesSubscription && codexAuthText.trim() !== '') {
    const codexTokens = parseCodexAuthInput(codexAuthText);
    if (codexTokens == null) {
      codexHint =
        'This does not look like auth.json — paste the full file contents.';
    } else {
      const expiryMs = getAccessTokenExpiryMs(codexTokens.accessToken);
      if (expiryMs != null && expiryMs <= Date.now()) {
        codexHint =
          'These tokens have expired. Run `codex login`, then paste the ' +
          'new auth.json.';
      }
    }
  }

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
          <div className={styles.RadioLabel}>Codex auth.json</div>
          <div>
            Run <code>codex login</code> in a terminal, then paste the contents
            of <code>~/.codex/auth.json</code>. If the tokens expire, run{' '}
            <code>codex login</code> and paste again.
          </div>
          <input
            type="password"
            value={codexAuthText}
            placeholder="contents of ~/.codex/auth.json"
            onChange={({currentTarget}) =>
              handleCodexAuthChange(currentTarget.value)
            }
            size={40}
          />
          {codexHint !== null && (
            <div className={styles.ModelError}>{codexHint}</div>
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
