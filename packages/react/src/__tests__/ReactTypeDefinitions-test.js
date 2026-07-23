/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Regression tests for React 19.2 API export completeness.
 *
 * Every export asserted here corresponds directly to a type declaration in
 * testDefinitions/React.d.ts. The two files must stay in sync: whenever a
 * new type is added to the stub, a matching assertion must be added here so
 * that the export cannot silently disappear without failing this suite.
 */

'use strict';

describe('React 19.2 API exports', () => {
  let React;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
  });

  // -------------------------------------------------------------------------
  // React 19.2 — Activity
  // Declared in testDefinitions/React.d.ts: Activity, ActivityProps
  // -------------------------------------------------------------------------
  describe('Activity component', () => {
    it('exports Activity', () => {
      expect(React.Activity).toBeDefined();
    });

    it('Activity is not null', () => {
      expect(React.Activity).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // React 19.2 — ViewTransition
  // Declared in testDefinitions/React.d.ts: ViewTransition
  // -------------------------------------------------------------------------
  describe('ViewTransition component', () => {
    it('exports ViewTransition', () => {
      expect(React.ViewTransition).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // React 19 — use()
  // Declared in testDefinitions/React.d.ts: use<T>, Usable<T>
  // -------------------------------------------------------------------------
  describe('use() hook', () => {
    it('exports use', () => {
      expect(React.use).toBeDefined();
    });

    it('use is a function', () => {
      expect(typeof React.use).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // React 19 — useActionState
  // Declared in testDefinitions/React.d.ts: useActionState (2 overloads)
  // -------------------------------------------------------------------------
  describe('useActionState hook', () => {
    it('exports useActionState', () => {
      expect(React.useActionState).toBeDefined();
    });

    it('useActionState is a function', () => {
      expect(typeof React.useActionState).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // React 19 — useOptimistic
  // Declared in testDefinitions/React.d.ts: useOptimistic (2 overloads)
  // -------------------------------------------------------------------------
  describe('useOptimistic hook', () => {
    it('exports useOptimistic', () => {
      expect(React.useOptimistic).toBeDefined();
    });

    it('useOptimistic is a function', () => {
      expect(typeof React.useOptimistic).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // React 19.2 — captureOwnerStack
  // Declared in testDefinitions/React.d.ts: captureOwnerStack
  // -------------------------------------------------------------------------
  describe('captureOwnerStack', () => {
    it('exports captureOwnerStack', () => {
      expect(React.captureOwnerStack).toBeDefined();
    });

    it('captureOwnerStack is a function', () => {
      expect(typeof React.captureOwnerStack).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // React 19.2 — addTransitionType
  // Declared in testDefinitions/React.d.ts: addTransitionType
  // -------------------------------------------------------------------------
  describe('addTransitionType', () => {
    it('exports addTransitionType', () => {
      expect(React.addTransitionType).toBeDefined();
    });

    it('addTransitionType is a function', () => {
      expect(typeof React.addTransitionType).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // React 18+ — Concurrent Mode hooks
  // Declared in testDefinitions/React.d.ts: useTransition, startTransition,
  //   useDeferredValue, useId
  // -------------------------------------------------------------------------
  describe('concurrent mode hooks', () => {
    it('exports useTransition', () => {
      expect(typeof React.useTransition).toBe('function');
    });

    it('exports startTransition', () => {
      expect(typeof React.startTransition).toBe('function');
    });

    it('exports useDeferredValue', () => {
      expect(typeof React.useDeferredValue).toBe('function');
    });

    it('exports useId', () => {
      expect(typeof React.useId).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // Standard hooks
  // Declared in testDefinitions/React.d.ts: useState, useEffect,
  //   useLayoutEffect, useInsertionEffect, useCallback, useMemo, useContext,
  //   useReducer, useRef, useDebugValue, useImperativeHandle,
  //   useSyncExternalStore
  //
  // NOTE: These were previously untested here, meaning they could silently
  // disappear from the stub without failing this suite. Each hook below now
  // has a corresponding assertion to prevent that regression.
  // -------------------------------------------------------------------------
  describe('standard hooks', () => {
    it('exports useState', () => {
      expect(typeof React.useState).toBe('function');
    });

    it('exports useEffect', () => {
      expect(typeof React.useEffect).toBe('function');
    });

    it('exports useLayoutEffect', () => {
      expect(typeof React.useLayoutEffect).toBe('function');
    });

    it('exports useInsertionEffect', () => {
      expect(typeof React.useInsertionEffect).toBe('function');
    });

    it('exports useCallback', () => {
      expect(typeof React.useCallback).toBe('function');
    });

    it('exports useMemo', () => {
      expect(typeof React.useMemo).toBe('function');
    });

    it('exports useContext', () => {
      expect(typeof React.useContext).toBe('function');
    });

    it('exports useReducer', () => {
      expect(typeof React.useReducer).toBe('function');
    });

    it('exports useRef', () => {
      expect(typeof React.useRef).toBe('function');
    });

    it('exports useDebugValue', () => {
      expect(typeof React.useDebugValue).toBe('function');
    });

    it('exports useImperativeHandle', () => {
      expect(typeof React.useImperativeHandle).toBe('function');
    });

    it('exports useSyncExternalStore', () => {
      expect(typeof React.useSyncExternalStore).toBe('function');
    });
  });
});
