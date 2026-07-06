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
  PROVIDER_PRESETS,
  getProviderPreset,
} from 'react-devtools-shared/src/devtools/aiChat/providers';
import {useAIProviderConfig} from 'react-devtools-shared/src/devtools/aiChat/useAIProviderConfig';
import {useSkills} from 'react-devtools-shared/src/devtools/aiChat/useSkills';

import styles from './SettingsShared.css';

export default function AISettings(_: {}): React.Node {
  const {config, setProviderId, setBaseUrl, setApiKey, setModel} =
    useAIProviderConfig();
  const {skills, addSkill, removeSkill, toggleSkill} = useSkills();

  const [newSkillMarkdown, setNewSkillMarkdown] = useState('');
  const [skillError, setSkillError] = useState<string | null>(null);

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

  const preset = getProviderPreset(config.providerId);

  const selectProvider = (providerId: string) => {
    setProviderId(providerId);
    // Reset per-provider fields so the new preset's defaults apply.
    setBaseUrl('');
    const nextPreset = getProviderPreset(providerId);
    setModel(nextPreset.models.length > 0 ? nextPreset.models[0] : '');
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
          size={40}
        />
        {config.model.trim() === '' && (
          <div className={styles.ModelError}>
            A model is required — the chat cannot send requests without one.
          </div>
        )}
      </div>

      <div className={styles.SettingWrapper}>
        The API key is stored unencrypted in this DevTools panel's local storage
        and is only sent to the API base URL above. When using local Ollama,
        start it with OLLAMA_ORIGINS="*" so it accepts requests from DevTools.
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
