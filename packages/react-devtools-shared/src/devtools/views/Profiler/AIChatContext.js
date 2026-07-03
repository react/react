/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactContext} from 'shared/ReactTypes';

import * as React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {ProfilerContext} from './ProfilerContext';
import {StoreContext} from '../context';
import {InspectedElementContext} from '../Components/InspectedElementContext';
import {runAgentLoop} from 'react-devtools-shared/src/devtools/aiChat/agentLoop';
import ToolRegistry from 'react-devtools-shared/src/devtools/aiChat/toolRegistry';
import {createProfilerTools} from 'react-devtools-shared/src/devtools/aiChat/profilerTools';
import {
  buildSkillCatalog,
  createSkillLoaderTool,
} from 'react-devtools-shared/src/devtools/aiChat/skills';
import {useSkills} from 'react-devtools-shared/src/devtools/aiChat/useSkills';
import {
  buildInteractionsSummary,
  buildProfileSummary,
  buildSelectionContext,
  buildSystemPrompt,
  INTERACTION_GUIDANCE,
} from 'react-devtools-shared/src/devtools/aiChat/profileSummary';
import {useAIProviderConfig} from 'react-devtools-shared/src/devtools/aiChat/useAIProviderConfig';

import type {
  AIProviderConfig,
  ChatMessage,
} from 'react-devtools-shared/src/devtools/aiChat/types';

export type AIChatContextType = {
  messages: Array<ChatMessage>,
  isStreaming: boolean,
  error: string | null,
  config: AIProviderConfig,
  sendMessage: (text: string) => void,
  stopStreaming: () => void,
  clearConversation: () => void,
};

export const AIChatContext: ReactContext<AIChatContextType> =
  createContext<AIChatContextType>(null as any as AIChatContextType);
AIChatContext.displayName = 'AIChatContext';

type Props = {
  children: React$Node,
};

// Owns the chat conversation so it survives switching between the
// Flamegraph/Ranked/Timeline tabs (which unmounts the chat pane view).
// The conversation resets only when a different profiling session is
// loaded, since previous answers would refer to stale data.
export function AIChatContextController({children}: Props): React.Node {
  const {
    profilingData,
    rootID,
    selectedCommitIndex,
    selectedFiberID,
    selectedFiberName,
  } = useContext(ProfilerContext);
  const store = useContext(StoreContext);
  // May be null when the Profiler is rendered without the Components tab's
  // InspectedElementContextController (e.g. in tests).
  const inspectedElementContext = useContext(InspectedElementContext);
  const hookNames =
    inspectedElementContext != null ? inspectedElementContext.hookNames : null;
  const inspectedElement =
    inspectedElementContext != null
      ? inspectedElementContext.inspectedElement
      : null;
  const {config} = useAIProviderConfig();
  const {skills} = useSkills();

  const [messages, setMessages] = useState<Array<ChatMessage>>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current !== null) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearConversation = useCallback(() => {
    stopStreaming();
    setMessages([]);
    setError(null);
  }, [stopStreaming]);

  // Reset the conversation when a different profiling session is recorded
  // or imported.
  const prevProfilingDataRef = useRef(profilingData);
  useEffect(() => {
    if (prevProfilingDataRef.current !== profilingData) {
      prevProfilingDataRef.current = profilingData;
      clearConversation();
    }
  }, [profilingData, clearConversation]);

  // Abort any in-flight request when the Profiler tab itself unmounts.
  useEffect(() => stopStreaming, [stopStreaming]);

  const sendMessage = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (question === '' || isStreaming) {
        return;
      }
      if (profilingData === null || rootID === null) {
        setError('Record a profiling session first, then ask about it.');
        return;
      }

      setError(null);
      setIsStreaming(true);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const registry = new ToolRegistry();
        createProfilerTools(profilingData, rootID, store.profilerStore).forEach(
          tool => registry.register(tool),
        );
        const enabledSkills = skills.filter(skill => skill.enabled);
        if (enabledSkills.length > 0) {
          registry.register(createSkillLoaderTool(skills));
        }

        // The system prompt is rebuilt per message so it always reflects the
        // current profile and the current selection in the Profiler UI.
        const summary = buildProfileSummary(
          profilingData,
          rootID,
          store.profilerStore,
        );
        const interactions = buildInteractionsSummary(profilingData);
        const selection = buildSelectionContext(
          profilingData,
          rootID,
          store.profilerStore,
          selectedCommitIndex,
          selectedFiberID,
          selectedFiberName,
          inspectedElement,
          hookNames,
        );

        const extraSections = [];
        if (interactions !== '') {
          extraSections.push(interactions);
          extraSections.push(INTERACTION_GUIDANCE);
        }
        const skillCatalog = buildSkillCatalog(skills);
        if (skillCatalog !== '') {
          extraSections.push(skillCatalog);
        }

        const systemPrompt = buildSystemPrompt(
          summary,
          selection,
          extraSections.join('\n\n'),
        );

        const userMessage: ChatMessage = {role: 'user', content: question};
        const history = [...messages, userMessage];
        setMessages(history);

        // NOTE: state updaters below must stay pure (no ref mutation inside):
        // React may re-run them while rebasing rapid streamed updates. The
        // replace-vs-append decision is derived from the previous state via
        // the message's `streaming` marker.
        await runAgentLoop(
          config,
          [{role: 'system', content: systemPrompt}, ...history],
          registry,
          abortController.signal,
          {
            onTextDelta: delta => {
              setMessages(currentMessages => {
                const lastMessage = currentMessages[currentMessages.length - 1];
                if (lastMessage != null && lastMessage.streaming === true) {
                  const nextMessages = currentMessages.slice();
                  nextMessages[nextMessages.length - 1] = {
                    role: 'assistant',
                    content: lastMessage.content + delta,
                    streaming: true,
                  };
                  return nextMessages;
                }
                return [
                  ...currentMessages,
                  {role: 'assistant', content: delta, streaming: true},
                ];
              });
            },
            onAssistantMessage: message => {
              setMessages(currentMessages => {
                const lastMessage = currentMessages[currentMessages.length - 1];
                if (lastMessage != null && lastMessage.streaming === true) {
                  const nextMessages = currentMessages.slice();
                  nextMessages[nextMessages.length - 1] = message;
                  return nextMessages;
                }
                return [...currentMessages, message];
              });
            },
            onToolMessage: message => {
              setMessages(currentMessages => [...currentMessages, message]);
            },
          },
        );
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message);
        }
      } finally {
        abortControllerRef.current = null;
        // Clear any dangling streaming marker (e.g. after an abort).
        setMessages(currentMessages => {
          const lastMessage = currentMessages[currentMessages.length - 1];
          if (lastMessage != null && lastMessage.streaming === true) {
            const nextMessages = currentMessages.slice();
            nextMessages[nextMessages.length - 1] = {
              role: 'assistant',
              content: lastMessage.content,
            };
            return nextMessages;
          }
          return currentMessages;
        });
        setIsStreaming(false);
      }
    },
    [
      isStreaming,
      messages,
      profilingData,
      rootID,
      selectedCommitIndex,
      selectedFiberID,
      selectedFiberName,
      inspectedElement,
      hookNames,
      store,
      config,
      skills,
    ],
  );

  const value = useMemo(
    () => ({
      messages,
      isStreaming,
      error,
      config,
      sendMessage,
      stopStreaming,
      clearConversation,
    }),
    [
      messages,
      isStreaming,
      error,
      config,
      sendMessage,
      stopStreaming,
      clearConversation,
    ],
  );

  return (
    <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>
  );
}
