/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {useCallback, useMemo} from 'react';
import {useLocalStorage} from 'react-devtools-shared/src/devtools/views/hooks';
import {LOCAL_STORAGE_AI_SKILLS_KEY} from 'react-devtools-shared/src/constants';
import {getBuiltInSkills, parseSkillMarkdown} from './skills';

import type {Skill} from './types';

type StoredUserSkill = {
  markdown: string,
  enabled: boolean,
};

// Stored as a JSON string because useLocalStorage snapshots via JSON.parse —
// a non-primitive stored value would produce a new identity per snapshot and
// re-render forever.
export function useSkills(): {
  skills: Array<Skill>,
  addSkill: (markdown: string) => Skill | null,
  removeSkill: (name: string) => void,
  toggleSkill: (name: string, enabled: boolean) => void,
} {
  const [storedJSON, setStoredJSON] = useLocalStorage<string>(
    LOCAL_STORAGE_AI_SKILLS_KEY,
    '[]',
  );

  const userSkillEntries: Array<StoredUserSkill> = useMemo(() => {
    try {
      const parsed = JSON.parse(storedJSON);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }, [storedJSON]);

  const skills = useMemo(() => {
    const all = getBuiltInSkills();
    for (let i = 0; i < userSkillEntries.length; i++) {
      const entry = userSkillEntries[i];
      const parsed = parseSkillMarkdown(entry.markdown);
      if (parsed != null) {
        all.push({...parsed, enabled: entry.enabled});
      }
    }
    return all;
  }, [userSkillEntries]);

  const persist = useCallback(
    (entries: Array<StoredUserSkill>) => {
      setStoredJSON(JSON.stringify(entries));
    },
    [setStoredJSON],
  );

  const addSkill = useCallback(
    (markdown: string): Skill | null => {
      const parsed = parseSkillMarkdown(markdown);
      if (parsed == null) {
        return null;
      }
      // Replace an existing user skill with the same name.
      const next = userSkillEntries.filter(entry => {
        const existing = parseSkillMarkdown(entry.markdown);
        return existing == null || existing.name !== parsed.name;
      });
      next.push({markdown, enabled: true});
      persist(next);
      return parsed;
    },
    [userSkillEntries, persist],
  );

  const removeSkill = useCallback(
    (name: string) => {
      persist(
        userSkillEntries.filter(entry => {
          const existing = parseSkillMarkdown(entry.markdown);
          return existing == null || existing.name !== name;
        }),
      );
    },
    [userSkillEntries, persist],
  );

  const toggleSkill = useCallback(
    (name: string, enabled: boolean) => {
      persist(
        userSkillEntries.map(entry => {
          const existing = parseSkillMarkdown(entry.markdown);
          return existing != null && existing.name === name
            ? {...entry, enabled}
            : entry;
        }),
      );
    },
    [userSkillEntries, persist],
  );

  return {skills, addSkill, removeSkill, toggleSkill};
}
