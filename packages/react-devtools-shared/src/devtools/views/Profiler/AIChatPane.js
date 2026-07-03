/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useContext, useEffect, useRef, useState} from 'react';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import {AIChatContext} from './AIChatContext';
import ChatMarkdown from './ChatMarkdown';
import {SettingsModalContext} from 'react-devtools-shared/src/devtools/views/Settings/SettingsModalContext';

import styles from './AIChatPane.css';

import type {ChatMessage} from 'react-devtools-shared/src/devtools/aiChat/types';

function formatArguments(argumentsJSON: string): string {
  try {
    return JSON.stringify(JSON.parse(argumentsJSON));
  } catch (_) {
    return argumentsJSON;
  }
}

function TranscriptEntry({message}: {message: ChatMessage}) {
  if (message.role === 'tool') {
    return (
      <details className={styles.ToolMessage}>
        <summary className={styles.ToolMessageSummary}>
          Result: {message.name != null ? message.name : 'tool'} (
          {message.content.length} chars)
        </summary>
        <pre className={styles.ToolMessageContent}>{message.content}</pre>
      </details>
    );
  }

  const toolCalls = message.toolCalls;
  if (message.content === '' && toolCalls == null) {
    return null;
  }
  return (
    <div
      className={
        message.role === 'user' ? styles.UserMessage : styles.AIMessage
      }>
      {message.content !== '' ? (
        message.role === 'assistant' ? (
          <ChatMarkdown content={message.content} />
        ) : (
          message.content
        )
      ) : null}
      {toolCalls != null &&
        toolCalls.map(toolCall => (
          <div key={toolCall.id} className={styles.ToolCall}>
            → {toolCall.name}({formatArguments(toolCall.argumentsJSON)})
          </div>
        ))}
    </div>
  );
}

export default function AIChatPane(_: {}): React.Node {
  const {
    messages,
    isStreaming,
    error,
    config,
    sendMessage,
    stopStreaming,
    clearConversation,
  } = useContext(AIChatContext);
  const {setIsModalShowing} = useContext(SettingsModalContext);

  const [input, setInput] = useState('');

  const messagesRef = useRef<HTMLDivElement | null>(null);
  // Follow the streamed response only while the user is at the bottom;
  // scrolling up to read pauses auto-scroll instead of fighting it.
  const isPinnedToBottomRef = useRef<boolean>(true);

  const handleMessagesScroll = () => {
    const element = messagesRef.current;
    if (element !== null) {
      isPinnedToBottomRef.current =
        element.scrollHeight - element.scrollTop - element.clientHeight < 40;
    }
  };

  useEffect(() => {
    const element = messagesRef.current;
    if (element !== null && isPinnedToBottomRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  const submit = () => {
    if (input.trim() === '' || isStreaming) {
      return;
    }
    isPinnedToBottomRef.current = true;
    sendMessage(input);
    setInput('');
  };

  const isConfigured = config.baseUrl !== '' && config.model !== '';

  return (
    <div className={styles.AIChatPane}>
      <div
        className={styles.Messages}
        ref={messagesRef}
        onScroll={handleMessagesScroll}>
        {messages.length === 0 && (
          <div className={styles.EmptyState}>
            Ask about the recorded profiling session, e.g. "Which components are
            worth optimizing?" or select a commit and ask "Why was this commit
            slow?".
            {!isConfigured && (
              <div className={styles.EmptyStateWarning}>
                No AI provider is configured yet.{' '}
                <Button
                  onClick={() => setIsModalShowing(true)}
                  title="Open settings">
                  Open Settings &gt; AI
                </Button>
              </div>
            )}
          </div>
        )}
        {messages.map((message, index) => (
          <TranscriptEntry key={index} message={message} />
        ))}
        {isStreaming &&
          (messages.length === 0 ||
            messages[messages.length - 1].streaming !== true) && (
            <div className={styles.AIMessage}>…</div>
          )}
        {error !== null && <div className={styles.Error}>{error}</div>}
      </div>
      <div className={styles.InputRow}>
        <textarea
          className={styles.Input}
          placeholder="Ask about this profiling session…"
          value={input}
          onChange={({currentTarget}) => setInput(currentTarget.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          rows={2}
        />
        {isStreaming ? (
          <Button onClick={stopStreaming} title="Stop generating">
            Stop
          </Button>
        ) : (
          <Button onClick={submit} title="Send message">
            Send
          </Button>
        )}
        <Button onClick={clearConversation} title="Clear conversation">
          <ButtonIcon type="clear" />
        </Button>
      </div>
    </div>
  );
}
