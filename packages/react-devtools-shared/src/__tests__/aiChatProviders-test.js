/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

'use strict';

import {
  PROVIDERS,
  getProvider,
} from 'react-devtools-shared/src/devtools/aiChat/providers';
import {resolveRequest} from 'react-devtools-shared/src/devtools/aiChat/providerRuntime';
import {streamChatCompletion} from 'react-devtools-shared/src/devtools/aiChat/client';
import {streamOpenAIChat} from 'react-devtools-shared/src/devtools/aiChat/wire/openaiChat';
import {streamOpenAIResponses} from 'react-devtools-shared/src/devtools/aiChat/wire/openaiResponses';
import {
  parseCodexAuthInput,
  getAccessTokenExpiryMs,
  getStoredCodexAuthText,
  setStoredCodexAuthText,
  getValidCodexAuth,
} from 'react-devtools-shared/src/devtools/aiChat/codexAuth';
import {LOCAL_STORAGE_AI_CODEX_AUTH_KEY} from 'react-devtools-shared/src/constants';

// The wire adapters decode streamed chunks with TextDecoder; make sure the
// encoder/decoder pair exists in the jsdom test environment.
if (typeof global.TextEncoder === 'undefined') {
  const util = require('util');
  global.TextEncoder = util.TextEncoder;
  global.TextDecoder = util.TextDecoder;
}

function base64url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// A structurally valid JWT whose payload carries the given claims.
function makeJWT(claims: Object): string {
  return `${base64url('{}')}.${base64url(JSON.stringify(claims))}.sig`;
}

function futureJWT(): string {
  return makeJWT({exp: Math.floor(Date.now() / 1000) + 60 * 60});
}

function expiredJWT(): string {
  return makeJWT({exp: Math.floor(Date.now() / 1000) - 60});
}

function storeValidCodexAuth(): void {
  setStoredCodexAuthText(
    JSON.stringify({
      tokens: {
        access_token: futureJWT(),
        refresh_token: 'refresh-1',
        account_id: 'acct-1',
      },
    }),
  );
}

// Builds a fetch response whose body streams the given chunks — the same
// surface (ok/status/body.getReader) the wire adapters consume.
function sseResponse(chunks: Array<string>): Object {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader() {
        return {
          read() {
            if (index < chunks.length) {
              return Promise.resolve({
                done: false,
                value: encoder.encode(chunks[index++]),
              });
            }
            return Promise.resolve({done: true, value: undefined});
          },
        };
      },
    },
  };
}

function chatChunk(delta: Object): string {
  return `data: ${JSON.stringify({choices: [{delta}]})}\n\n`;
}

const noSignal = () => new AbortController().signal;

describe('AI chat provider layer', () => {
  beforeEach(() => {
    localStorage.removeItem(LOCAL_STORAGE_AI_CODEX_AUTH_KEY);
  });

  describe('provider catalog', () => {
    it('every provider has a known wire protocol and auth method', () => {
      const wires = ['openai-chat', 'openai-responses'];
      const auths = ['none', 'api-key', 'subscription'];
      PROVIDERS.forEach(provider => {
        expect(wires).toContain(provider.wire);
        expect(auths).toContain(provider.auth);
        expect(provider.id).not.toBe('');
        expect(provider.label).not.toBe('');
        expect(provider.baseUrl).not.toBe('');
      });
    });

    it('provider ids are unique', () => {
      const ids = PROVIDERS.map(provider => provider.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('getProvider falls back to the first provider for unknown ids', () => {
      expect(getProvider('does-not-exist')).toBe(PROVIDERS[0]);
      expect(getProvider('ollama-local').id).toBe('ollama-local');
    });
  });

  describe('resolveRequest (auth loader)', () => {
    it('resolves an auth:none provider with only the content-type header', async () => {
      const resolved = await resolveRequest({
        providerId: 'ollama-local',
        baseUrl: '',
        apiKey: '',
        model: 'qwen3',
      });
      expect(resolved).toEqual({
        wire: 'openai-chat',
        baseUrl: 'http://localhost:11434/v1',
        model: 'qwen3',
        headers: {'Content-Type': 'application/json'},
      });
    });

    it('prefers a user-provided base URL over the catalog default', async () => {
      const resolved = await resolveRequest({
        providerId: 'ollama-local',
        baseUrl: 'http://192.168.1.20:11434/v1',
        apiKey: '',
        model: 'qwen3',
      });
      expect(resolved.baseUrl).toBe('http://192.168.1.20:11434/v1');
    });

    it('adds a bearer header for api-key providers', async () => {
      const resolved = await resolveRequest({
        providerId: 'openai',
        baseUrl: '',
        apiKey: 'sk-test',
        model: 'gpt-5.1',
      });
      expect(resolved.headers.Authorization).toBe('Bearer sk-test');
      expect(resolved.wire).toBe('openai-chat');
    });

    it('errors when an api-key provider has no key', async () => {
      const resolved = await resolveRequest({
        providerId: 'openai',
        baseUrl: '',
        apiKey: '',
        model: 'gpt-5.1',
      });
      expect(resolved.error).toContain('API key');
    });

    it('errors when no model is configured', async () => {
      const resolved = await resolveRequest({
        providerId: 'ollama-local',
        baseUrl: '',
        apiKey: '',
        model: '',
      });
      expect(resolved.error).toContain('model');
    });

    it('resolves subscription auth from the stored auth.json', async () => {
      storeValidCodexAuth();
      const resolved = await resolveRequest({
        providerId: 'openai-codex',
        baseUrl: '',
        apiKey: '',
        model: 'gpt-5.5',
      });
      expect(resolved.wire).toBe('openai-responses');
      expect(resolved.headers.Authorization).toMatch(/^Bearer /);
      expect(resolved.headers['ChatGPT-Account-Id']).toBe('acct-1');
    });

    it('errors (not throws) when subscription auth is missing', async () => {
      const resolved = await resolveRequest({
        providerId: 'openai-codex',
        baseUrl: '',
        apiKey: '',
        model: 'gpt-5.5',
      });
      expect(resolved.error).toContain('codex login');
    });
  });

  describe('codexAuth', () => {
    it('parses a full auth.json and a bare tokens object', () => {
      const tokens = {
        access_token: 'a',
        refresh_token: 'r',
        account_id: 'acc',
      };
      const expected = {
        accessToken: 'a',
        refreshToken: 'r',
        accountId: 'acc',
      };
      expect(parseCodexAuthInput(JSON.stringify({tokens}))).toEqual(expected);
      expect(parseCodexAuthInput(JSON.stringify(tokens))).toEqual(expected);
    });

    it('rejects garbage and incomplete token objects', () => {
      expect(parseCodexAuthInput('not json')).toBeNull();
      expect(parseCodexAuthInput('"a string"')).toBeNull();
      expect(
        parseCodexAuthInput(JSON.stringify({tokens: {access_token: 'a'}})),
      ).toBeNull();
    });

    it('decodes the exp claim from a JWT in milliseconds', () => {
      expect(getAccessTokenExpiryMs(makeJWT({exp: 1234}))).toBe(1234000);
      expect(getAccessTokenExpiryMs('not-a-jwt')).toBeNull();
      expect(getAccessTokenExpiryMs(makeJWT({sub: 'x'}))).toBeNull();
    });

    it('round-trips stored auth text and clears on empty', () => {
      setStoredCodexAuthText('{"a":1}');
      expect(getStoredCodexAuthText()).toBe('{"a":1}');
      setStoredCodexAuthText('   ');
      expect(getStoredCodexAuthText()).toBe('');
      expect(localStorage.getItem(LOCAL_STORAGE_AI_CODEX_AUTH_KEY)).toBeNull();
    });

    it('getValidCodexAuth returns tokens for a valid stored auth.json', async () => {
      storeValidCodexAuth();
      const auth = await getValidCodexAuth();
      expect(auth.accountId).toBe('acct-1');
      expect(auth.accessToken.split('.')).toHaveLength(3);
    });

    it('getValidCodexAuth throws helpful errors per failure mode', async () => {
      await expect(getValidCodexAuth()).rejects.toThrow('codex login');

      setStoredCodexAuthText('garbage');
      await expect(getValidCodexAuth()).rejects.toThrow('not a Codex');

      setStoredCodexAuthText(
        JSON.stringify({
          tokens: {
            access_token: expiredJWT(),
            refresh_token: 'r',
            account_id: 'acc',
          },
        }),
      );
      await expect(getValidCodexAuth()).rejects.toThrow('expired');
    });
  });

  describe('wire/openaiChat', () => {
    const request = {
      wire: 'openai-chat',
      baseUrl: 'https://example.com/v1/',
      model: 'test-model',
      headers: {'Content-Type': 'application/json'},
    };

    it('posts a chat-completions body and assembles streamed text', async () => {
      global.fetch = jest.fn(async () =>
        sseResponse([
          chatChunk({content: 'Hel'}),
          chatChunk({content: 'lo'}),
          'data: [DONE]\n\n',
        ]),
      );
      const onTextDelta = jest.fn();

      const result = await streamOpenAIChat({
        request,
        messages: [
          {role: 'system', content: 'be brief'},
          {role: 'user', content: 'hi'},
        ],
        signal: noSignal(),
        onTextDelta,
      });

      expect(result).toEqual({content: 'Hello', toolCalls: []});
      expect(onTextDelta.mock.calls.map(call => call[0])).toEqual([
        'Hel',
        'lo',
      ]);

      const [url, init] = global.fetch.mock.calls[0];
      expect(url).toBe('https://example.com/v1/chat/completions');
      const body = JSON.parse(init.body);
      expect(body.model).toBe('test-model');
      expect(body.stream).toBe(true);
      expect(body.messages).toEqual([
        {role: 'system', content: 'be brief'},
        {role: 'user', content: 'hi'},
      ]);
    });

    it('serializes assistant tool calls and tool results to the wire shape', async () => {
      global.fetch = jest.fn(async () => sseResponse(['data: [DONE]\n\n']));

      await streamOpenAIChat({
        request,
        messages: [
          {
            role: 'assistant',
            content: '',
            toolCalls: [
              {id: 'call_1', name: 'get_commit', argumentsJSON: '{"n":1}'},
            ],
          },
          {
            role: 'tool',
            content: 'commit data',
            toolCallId: 'call_1',
            name: 'get_commit',
          },
        ],
        signal: noSignal(),
        onTextDelta: jest.fn(),
      });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.messages[0].tool_calls).toEqual([
        {
          id: 'call_1',
          type: 'function',
          function: {name: 'get_commit', arguments: '{"n":1}'},
        },
      ]);
      expect(body.messages[1]).toEqual({
        role: 'tool',
        content: 'commit data',
        tool_call_id: 'call_1',
      });
    });

    it('accumulates tool_calls streamed as deltas across chunks', async () => {
      global.fetch = jest.fn(async () =>
        sseResponse([
          chatChunk({
            tool_calls: [
              {
                index: 0,
                id: 'call_abc',
                function: {name: 'get_commit', arguments: ''},
              },
            ],
          }),
          chatChunk({
            tool_calls: [{index: 0, function: {arguments: '{"commit_'}}],
          }),
          chatChunk({
            tool_calls: [{index: 0, function: {arguments: 'number":2}'}}],
          }),
          'data: [DONE]\n\n',
        ]),
      );

      const result = await streamOpenAIChat({
        request,
        messages: [{role: 'user', content: 'hi'}],
        tools: [{type: 'function', function: {name: 'get_commit'}}],
        signal: noSignal(),
        onTextDelta: jest.fn(),
      });

      expect(result.toolCalls).toEqual([
        {
          id: 'call_abc',
          name: 'get_commit',
          argumentsJSON: '{"commit_number":2}',
        },
      ]);
    });

    it('buffers SSE lines split across network chunks', async () => {
      const line = chatChunk({content: 'split across chunks'});
      const mid = Math.floor(line.length / 2);
      global.fetch = jest.fn(async () =>
        sseResponse([line.slice(0, mid), line.slice(mid), 'data: [DONE]\n\n']),
      );

      const result = await streamOpenAIChat({
        request,
        messages: [{role: 'user', content: 'hi'}],
        signal: noSignal(),
        onTextDelta: jest.fn(),
      });
      expect(result.content).toBe('split across chunks');
    });

    it('maps 401 to an API key error', async () => {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      }));
      await expect(
        streamOpenAIChat({
          request,
          messages: [{role: 'user', content: 'hi'}],
          signal: noSignal(),
          onTextDelta: jest.fn(),
        }),
      ).rejects.toThrow('API key');
    });

    it('maps 403 from a localhost server to origin guidance', async () => {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 403,
        text: async () => 'forbidden',
      }));
      await expect(
        streamOpenAIChat({
          request: {...request, baseUrl: 'http://localhost:11434/v1'},
          messages: [{role: 'user', content: 'hi'}],
          signal: noSignal(),
          onTextDelta: jest.fn(),
        }),
      ).rejects.toThrow('OLLAMA_ORIGINS');
    });

    it('surfaces other failures with status and detail', async () => {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 500,
        text: async () => 'server exploded',
      }));
      await expect(
        streamOpenAIChat({
          request,
          messages: [{role: 'user', content: 'hi'}],
          signal: noSignal(),
          onTextDelta: jest.fn(),
        }),
      ).rejects.toThrow('500: server exploded');
    });
  });

  describe('wire/openaiResponses', () => {
    const request = {
      wire: 'openai-responses',
      baseUrl: 'https://chatgpt.example/backend-api/codex',
      model: 'gpt-5.5',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'ChatGPT-Account-Id': 'acct-1',
      },
    };

    it('maps the transcript to Responses API input items', async () => {
      global.fetch = jest.fn(async () => sseResponse(['data: [DONE]\n\n']));

      await streamOpenAIResponses({
        request,
        messages: [
          {role: 'system', content: 'be brief'},
          {role: 'user', content: 'hi'},
          {
            role: 'assistant',
            content: 'checking',
            toolCalls: [
              {id: 'call_1', name: 'get_commit', argumentsJSON: '{"n":1}'},
            ],
          },
          {
            role: 'tool',
            content: 'commit data',
            toolCallId: 'call_1',
            name: 'get_commit',
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_commit',
              description: 'Reads a commit.',
              parameters: {type: 'object', properties: {}},
            },
          },
        ],
        signal: noSignal(),
        onTextDelta: jest.fn(),
      });

      const [url, init] = global.fetch.mock.calls[0];
      expect(url).toBe('https://chatgpt.example/backend-api/codex/responses');
      expect(init.headers['ChatGPT-Account-Id']).toBe('acct-1');

      const body = JSON.parse(init.body);
      expect(body.model).toBe('gpt-5.5');
      expect(body.store).toBe(false);
      expect(body.stream).toBe(true);
      expect(body.instructions).toBe('be brief');
      expect(body.input).toEqual([
        {
          type: 'message',
          role: 'user',
          content: [{type: 'input_text', text: 'hi'}],
        },
        {
          type: 'message',
          role: 'assistant',
          content: [{type: 'output_text', text: 'checking'}],
        },
        {
          type: 'function_call',
          call_id: 'call_1',
          name: 'get_commit',
          arguments: '{"n":1}',
        },
        {
          type: 'function_call_output',
          call_id: 'call_1',
          output: 'commit data',
        },
      ]);
      // Responses API tools are flat, not nested under `function`.
      expect(body.tools).toEqual([
        {
          type: 'function',
          name: 'get_commit',
          description: 'Reads a commit.',
          parameters: {type: 'object', properties: {}},
          strict: false,
        },
      ]);
    });

    it('assembles streamed output_text deltas', async () => {
      global.fetch = jest.fn(async () =>
        sseResponse([
          `data: ${JSON.stringify({type: 'response.created'})}\n\n`,
          `data: ${JSON.stringify({
            type: 'response.output_text.delta',
            delta: 'Hel',
          })}\n\n`,
          `data: ${JSON.stringify({
            type: 'response.output_text.delta',
            delta: 'lo',
          })}\n\n`,
          `data: ${JSON.stringify({type: 'response.completed'})}\n\n`,
          'data: [DONE]\n\n',
        ]),
      );
      const onTextDelta = jest.fn();

      const result = await streamOpenAIResponses({
        request,
        messages: [{role: 'user', content: 'hi'}],
        signal: noSignal(),
        onTextDelta,
      });

      expect(result.content).toBe('Hello');
      expect(onTextDelta).toHaveBeenCalledTimes(2);
    });

    it('collects function calls from output_item.done events', async () => {
      // Mirrors the live event shape captured from the ChatGPT backend.
      global.fetch = jest.fn(async () =>
        sseResponse([
          `data: ${JSON.stringify({
            type: 'response.output_item.done',
            item: {
              type: 'function_call',
              call_id: 'call_live',
              name: 'get_number',
              arguments: '{}',
            },
          })}\n\n`,
          `data: ${JSON.stringify({type: 'response.completed'})}\n\n`,
          'data: [DONE]\n\n',
        ]),
      );

      const result = await streamOpenAIResponses({
        request,
        messages: [{role: 'user', content: 'hi'}],
        signal: noSignal(),
        onTextDelta: jest.fn(),
      });

      expect(result.toolCalls).toEqual([
        {id: 'call_live', name: 'get_number', argumentsJSON: '{}'},
      ]);
    });

    it('throws on stream error events', async () => {
      global.fetch = jest.fn(async () =>
        sseResponse([
          `data: ${JSON.stringify({
            type: 'error',
            message: 'model melted',
          })}\n\n`,
        ]),
      );
      await expect(
        streamOpenAIResponses({
          request,
          messages: [{role: 'user', content: 'hi'}],
          signal: noSignal(),
          onTextDelta: jest.fn(),
        }),
      ).rejects.toThrow('model melted');
    });

    it('maps 401 to a codex login error', async () => {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      }));
      await expect(
        streamOpenAIResponses({
          request,
          messages: [{role: 'user', content: 'hi'}],
          signal: noSignal(),
          onTextDelta: jest.fn(),
        }),
      ).rejects.toThrow('codex login');
    });
  });

  describe('client dispatch', () => {
    it('routes openai-chat providers to /chat/completions', async () => {
      global.fetch = jest.fn(async () => sseResponse(['data: [DONE]\n\n']));

      await streamChatCompletion({
        config: {
          providerId: 'ollama-local',
          baseUrl: '',
          apiKey: '',
          model: 'qwen3',
        },
        messages: [{role: 'user', content: 'hi'}],
        signal: noSignal(),
        onTextDelta: jest.fn(),
      });

      expect(global.fetch.mock.calls[0][0]).toBe(
        'http://localhost:11434/v1/chat/completions',
      );
    });

    // Regression test for the missing-await bug: resolveRequest is async;
    // dispatching on an unawaited Promise made resolved.wire undefined and
    // broke EVERY provider with 'Unsupported wire protocol "undefined"'.
    it('routes subscription providers to /responses with resolved auth headers', async () => {
      storeValidCodexAuth();
      global.fetch = jest.fn(async () => sseResponse(['data: [DONE]\n\n']));

      await streamChatCompletion({
        config: {
          providerId: 'openai-codex',
          baseUrl: '',
          apiKey: '',
          model: 'gpt-5.5',
        },
        messages: [{role: 'user', content: 'hi'}],
        signal: noSignal(),
        onTextDelta: jest.fn(),
      });

      const [url, init] = global.fetch.mock.calls[0];
      expect(url).toBe('https://chatgpt.com/backend-api/codex/responses');
      expect(init.headers.Authorization).toMatch(/^Bearer /);
      expect(init.headers['ChatGPT-Account-Id']).toBe('acct-1');
    });

    it('surfaces resolveRequest errors as thrown errors, not wire failures', async () => {
      global.fetch = jest.fn();
      await expect(
        streamChatCompletion({
          config: {providerId: 'openai', baseUrl: '', apiKey: '', model: ''},
          messages: [{role: 'user', content: 'hi'}],
          signal: noSignal(),
          onTextDelta: jest.fn(),
        }),
      ).rejects.toThrow('model');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects unknown wire protocols explicitly', async () => {
      PROVIDERS.push(
        ({
          id: 'broken-provider',
          label: 'Broken',
          baseUrl: 'https://example.com',
          wire: ('bogus-wire': any),
          auth: 'none',
          models: [],
        }: any),
      );
      try {
        await expect(
          streamChatCompletion({
            config: {
              providerId: 'broken-provider',
              baseUrl: '',
              apiKey: '',
              model: 'm',
            },
            messages: [{role: 'user', content: 'hi'}],
            signal: noSignal(),
            onTextDelta: jest.fn(),
          }),
        ).rejects.toThrow('Unsupported wire protocol "bogus-wire"');
      } finally {
        PROVIDERS.pop();
      }
    });
  });
});
