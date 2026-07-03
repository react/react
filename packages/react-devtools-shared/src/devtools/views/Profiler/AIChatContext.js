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
import {streamChatCompletion} from 'react-devtools-shared/src/devtools/aiChat/client';
import {
  buildProfileSummary,
  buildSelectionContext,
  buildSystemPrompt,
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

      // The system prompt is rebuilt per message so it always reflects the
      // current profile and the current selection in the Profiler UI.
      const summary = buildProfileSummary(
        profilingData,
        rootID,
        store.profilerStore,
      );
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
      const systemPrompt = buildSystemPrompt(summary, selection);

      const history = [...messages, {role: 'user', content: question}];
      setMessages([...history, {role: 'assistant', content: ''}]);
      setIsStreaming(true);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        await streamChatCompletion({
          config,
          messages: [{role: 'system', content: systemPrompt}, ...history],
          signal: abortController.signal,
          onTextDelta: delta => {
            setMessages(currentMessages => {
              const nextMessages = currentMessages.slice();
              const lastIndex = nextMessages.length - 1;
              nextMessages[lastIndex] = {
                role: 'assistant',
                content: nextMessages[lastIndex].content + delta,
              };
              return nextMessages;
            });
          },
        });
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message);
        }
        // Drop the empty assistant placeholder if nothing streamed in.
        setMessages(currentMessages => {
          const lastMessage = currentMessages[currentMessages.length - 1];
          if (
            lastMessage != null &&
            lastMessage.role === 'assistant' &&
            lastMessage.content === ''
          ) {
            return currentMessages.slice(0, -1);
          }
          return currentMessages;
        });
      } finally {
        abortControllerRef.current = null;
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
