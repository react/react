// flow-typed signature: b6bb53397d83d2d821e258cc73818d1b
// flow-typed version: 9c71eca8ef/react-test-renderer_v16.x.x/flow_>=v0.47.x

// Type definitions for react-test-renderer 16.x.x
// Ported from: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react-test-renderer

'use strict';

/* eslint-disable no-unused-vars */

type ReactComponentInstance = React$Component<any>;

type ReactTestRendererJSON = {
  type: string,
  props: {[propName: string]: any},
  children: null | ReactTestRendererJSON[],
};

type ReactTestRendererTree = ReactTestRendererJSON & {
  nodeType: 'component' | 'host',
  instance: ?ReactComponentInstance,
  rendered: null | ReactTestRendererTree,
};

type ReactTestInstance = {
  instance: ?ReactComponentInstance,
  type: string,
  props: {[propName: string]: any},
  parent: null | ReactTestInstance,
  children: Array<ReactTestInstance | string>,

  find(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance,
  findByType(type: React$ElementType): ReactTestInstance,
  findByProps(props: {[propName: string]: any}): ReactTestInstance,

  findAll(
    predicate: (node: ReactTestInstance) => boolean,
    options?: {deep: boolean}
  ): ReactTestInstance[],
  findAllByType(
    type: React$ElementType,
    options?: {deep: boolean}
  ): ReactTestInstance[],
  findAllByProps(
    props: {[propName: string]: any},
    options?: {deep: boolean}
  ): ReactTestInstance[],
};

type TestRendererOptions = {
  createNodeMock(element: React$Element<any>): any,
};

declare module 'react-test-renderer' {
  declare export type ReactTestRenderer = {
    toJSON(): null | ReactTestRendererJSON,
    toTree(): null | ReactTestRendererTree,
    unmount(nextElement?: React$Element<any>): void,
    update(nextElement: React$Element<any>): void,
    getInstance(): ?ReactComponentInstance,
    root: ReactTestInstance,
  };

  declare type Thenable = {
    then(resolve: () => mixed, reject?: () => mixed): mixed,
  };

  declare function create(
    nextElement: React$Element<any>,
    options?: TestRendererOptions
  ): ReactTestRenderer;

  declare function act(callback: () => ?Thenable): Thenable;
}

declare module 'react-test-renderer/shallow' {
  declare export default class ShallowRenderer {
    static createRenderer(): ShallowRenderer;
    getMountedInstance(): ReactTestInstance;
    getRenderOutput<E: React$Element<any>>(): E;
    render(element: React$Element<any>, context?: any): void;
    unmount(): void;
  }
}
