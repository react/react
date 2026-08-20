'use strict';

jest.mock('scheduler', () => jest.requireActual('scheduler/unstable_mock'));

global.__unmockReact = () => jest.unmock('react');
