/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('EventPluginRegistry', () => {
  let EventPluginRegistry;
  let createPlugin;

  beforeEach(() => {
    jest.resetModules();
    // These tests are intentionally testing the private injection interface.
    // The public API surface of this is covered by other tests so
    // if `EventPluginRegistry` is ever deleted, these tests should be
    // safe to remove too.
    EventPluginRegistry = require('react-native-renderer/src/legacy-events/EventPluginRegistry');

    createPlugin = function (properties) {
      return Object.assign({extractEvents: function () {}}, properties);
    };
  });

  it('should be able to inject ordering before plugins', () => {
    const OnePlugin = createPlugin();
    const TwoPlugin = createPlugin();
    const ThreePlugin = createPlugin();

    EventPluginRegistry.injectEventPluginOrder(['one', 'two', 'three']);
    EventPluginRegistry.injectEventPluginsByName({
      one: OnePlugin,
      two: TwoPlugin,
    });
    EventPluginRegistry.injectEventPluginsByName({
      three: ThreePlugin,
    });

    expect(EventPluginRegistry.plugins.length).toBe(3);
    expect(EventPluginRegistry.plugins[0]).toBe(OnePlugin);
    expect(EventPluginRegistry.plugins[1]).toBe(TwoPlugin);
    expect(EventPluginRegistry.plugins[2]).toBe(ThreePlugin);
  });

  it('should be able to inject plugins before and after ordering', () => {
    const OnePlugin = createPlugin();
    const TwoPlugin = createPlugin();
    const ThreePlugin = createPlugin();

    EventPluginRegistry.injectEventPluginsByName({
      one: OnePlugin,
      two: TwoPlugin,
    });
    EventPluginRegistry.injectEventPluginOrder(['one', 'two', 'three']);
    EventPluginRegistry.injectEventPluginsByName({
      three: ThreePlugin,
    });

    expect(EventPluginRegistry.plugins.length).toBe(3);
    expect(EventPluginRegistry.plugins[0]).toBe(OnePlugin);
    expect(EventPluginRegistry.plugins[1]).toBe(TwoPlugin);
    expect(EventPluginRegistry.plugins[2]).toBe(ThreePlugin);
  });

  it('should be able to inject repeated plugins and out-of-order', () => {
    const OnePlugin = createPlugin();
    const TwoPlugin = createPlugin();
    const ThreePlugin = createPlugin();

    EventPluginRegistry.injectEventPluginsByName({
      one: OnePlugin,
      three: ThreePlugin,
    });
    EventPluginRegistry.injectEventPluginOrder(['one', 'two', 'three']);
    EventPluginRegistry.injectEventPluginsByName({
      two: TwoPlugin,
      three: ThreePlugin,
    });

    expect(EventPluginRegistry.plugins.length).toBe(3);
    expect(EventPluginRegistry.plugins[0]).toBe(OnePlugin);
    expect(EventPluginRegistry.plugins[1]).toBe(TwoPlugin);
    expect(EventPluginRegistry.plugins[2]).toBe(ThreePlugin);
  });

  it('should throw if plugin does not implement `extractEvents`', () => {
    const BadPlugin = {};

    EventPluginRegistry.injectEventPluginOrder(['bad']);

    expect(function () {
      EventPluginRegistry.injectEventPluginsByName({
        bad: BadPlugin,
      });
    }).toThrowError(
      'EventPluginRegistry: Event plugins must implement an `extractEvents` ' +
        'method, but `bad` does not.',
    );
  });

  it('should throw if plugin does not exist in ordering', () => {
    const OnePlugin = createPlugin();
    const RandomPlugin = createPlugin();

    EventPluginRegistry.injectEventPluginOrder(['one']);

    expect(function () {
      EventPluginRegistry.injectEventPluginsByName({
        one: OnePlugin,
        random: RandomPlugin,
      });
    }).toThrowError(
      'EventPluginRegistry: Cannot inject event plugins that do not exist ' +
        'in the plugin ordering, `random`.',
    );
  });

  it('should throw if ordering is injected more than once', () => {
    const pluginOrdering = [];

    EventPluginRegistry.injectEventPluginOrder(pluginOrdering);

    expect(function () {
      EventPluginRegistry.injectEventPluginOrder(pluginOrdering);
    }).toThrowError(
      'EventPluginRegistry: Cannot inject event plugin ordering more than ' +
        'once. You are likely trying to load more than one copy of React.',
    );
  });

  it('should throw if different plugins injected using same name', () => {
    const OnePlugin = createPlugin();
    const TwoPlugin = createPlugin();

    EventPluginRegistry.injectEventPluginsByName({same: OnePlugin});

    expect(function () {
      EventPluginRegistry.injectEventPluginsByName({same: TwoPlugin});
    }).toThrowError(
      'EventPluginRegistry: Cannot inject two different event plugins using ' +
        'the same name, `same`.',
    );
  });

  it('should publish registration names of injected plugins', () => {
    const OnePlugin = createPlugin({
      eventTypes: {
        click: {registrationName: 'onClick'},
        focus: {registrationName: 'onFocus'},
      },
    });
    const TwoPlugin = createPlugin({
      eventTypes: {
        magic: {
          phasedRegistrationNames: {
            bubbled: 'onMagicBubble',
            captured: 'onMagicCapture',
          },
        },
      },
    });

    EventPluginRegistry.injectEventPluginsByName({one: OnePlugin});
    EventPluginRegistry.injectEventPluginOrder(['one', 'two']);

    expect(
      Object.keys(EventPluginRegistry.registrationNameModules).length,
    ).toBe(2);
    expect(EventPluginRegistry.registrationNameModules.onClick).toBe(OnePlugin);
    expect(EventPluginRegistry.registrationNameModules.onFocus).toBe(OnePlugin);

    EventPluginRegistry.injectEventPluginsByName({two: TwoPlugin});

    expect(
      Object.keys(EventPluginRegistry.registrationNameModules).length,
    ).toBe(4);
    expect(EventPluginRegistry.registrationNameModules.onMagicBubble).toBe(
      TwoPlugin,
    );
    expect(EventPluginRegistry.registrationNameModules.onMagicCapture).toBe(
      TwoPlugin,
    );
  });

  it('should throw if multiple registration names collide', () => {
    const OnePlugin = createPlugin({
      eventTypes: {
        photoCapture: {registrationName: 'onPhotoCapture'},
      },
    });
    const TwoPlugin = createPlugin({
      eventTypes: {
        photo: {
          phasedRegistrationNames: {
            bubbled: 'onPhotoBubble',
            captured: 'onPhotoCapture',
          },
        },
      },
    });

    EventPluginRegistry.injectEventPluginsByName({
      one: OnePlugin,
      two: TwoPlugin,
    });

    expect(function () {
      EventPluginRegistry.injectEventPluginOrder(['one', 'two']);
    }).toThrowError(
      'EventPluginRegistry: More than one plugin attempted to publish the same ' +
        'registration name, `onPhotoCapture`.',
    );
  });

  it('should throw if an invalid event is published', () => {
    const OnePlugin = createPlugin({
      eventTypes: {
        badEvent: {
          /* missing configuration */
        },
      },
    });

    EventPluginRegistry.injectEventPluginsByName({one: OnePlugin});

    expect(function () {
      EventPluginRegistry.injectEventPluginOrder(['one']);
    }).toThrowError(
      'EventPluginRegistry: Failed to publish event `badEvent` for plugin ' +
        '`one`.',
    );
  });
});
