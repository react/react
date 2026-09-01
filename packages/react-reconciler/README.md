# react-reconciler

This is an experimental package for creating custom React renderers.

**Its API is not as stable as that of React, React Native, or React DOM, and does not follow the common versioning scheme.**

**Use it at your own risk.**

## Usage

```js
const Reconciler = require('react-reconciler');

const HostConfig = {
  // You'll need to implement some methods here.
  // See below for more information and examples.
};

const MyRenderer = Reconciler(HostConfig);

const RendererPublicAPI = {
  render(element, container, callback) {
    // Call MyRenderer.updateContainer() to schedule changes on the roots.
    // See ReactDOM, React Native, or React ART for practical examples.
  }
};

module.exports = RendererPublicAPI;
```

## Practical Examples

A "host config" is an object that you need to provide, and that describes how to make something happen in the "host" environment (e.g. DOM, canvas, console, or whatever your rendering target is). It looks like this:

```js
const HostConfig = {
  createInstance(type, props) {
    // e.g. DOM renderer returns a DOM node
  },
  // ...
  supportsMutation: true, // it works by mutating nodes
  appendChild(parent, child) {
    // e.g. DOM renderer would call .appendChild() here
  },
  // ...
};
```

**For an introduction to writing a very simple custom renderer, check out this article series:**

* **[Building a simple custom renderer to DOM](https://medium.com/@agent_hunt/hello-world-custom-react-renderer-9a95b7cd04bc)**
* **[Building a simple custom renderer to native](https://medium.com/@agent_hunt/introduction-to-react-native-renderers-aka-react-native-is-the-java-and-react-native-renderers-are-828a0022f433)**

The full list of supported methods [can be found here](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/forks/ReactFiberConfig.custom.js). For their signatures, we recommend looking at specific examples below.

The React repository includes several renderers. Each of them has its own host config.

The examples in the React repository are declared a bit differently than a third-party renderer would be. In particular, the `HostConfig` object mentioned above is never explicitly declared, and instead is a *module* in our code. However, its exports correspond directly to properties on a `HostConfig` object you'd need to declare in your code:

* [React ART](https://github.com/facebook/react/blob/main/packages/react-art/src/ReactART.js) and its [host config](https://github.com/facebook/react/blob/main/packages/react-art/src/ReactFiberConfigART.js)
* [React DOM](https://github.com/facebook/react/blob/main/packages/react-dom/src/client/ReactDOM.js) and its [host config](https://github.com/facebook/react/blob/main/packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js)
* [React Native](https://github.com/facebook/react/blob/main/packages/react-native-renderer/src/ReactFabric.js) and its [host config](https://github.com/facebook/react/blob/main/packages/react-native-renderer/src/ReactFiberConfigFabric.js)

If these links break please file an issue and we’ll fix them. They intentionally link to the latest versions since the API is still evolving. If you have more questions please file an issue and we’ll try to help!

## An (Incomplete!) Reference

At the moment, we can't commit to documenting every API detail because the host config still changes very often between the releases. The documentation below is **provided in the spirit of making our best effort rather than an API guarantee**. It focuses on the parts that don't change too often. This is a compromise that strikes a balance between the need for a fast-paced development of React itself, and the usefulness of this package to the custom renderer community. If you notice parts that are out of date or don't match how the latest stable update is behaving, please file an issue or send a pull request, although a response might take time.

#### Modes

The reconciler has two modes: mutation mode and persistent mode. You must specify one of them.

If your target platform is similar to the DOM and has methods similar to `appendChild`, `removeChild`, and so on, you'll want to use the **mutation mode**. This is the same mode used by React DOM, React ART, and the classic React Native renderer.

```js
const HostConfig = {
  // ...
  supportsMutation: true,
  // ...
}
```

If your target platform has immutable trees, you'll want the **persistent mode** instead. In that mode, existing nodes are never mutated, and instead every change clones the parent tree and then replaces the whole parent tree at the root. This is the mode used by the new React Native renderer, codenamed "Fabric".

```js
const HostConfig = {
  // ...
  supportsPersistence: true,
  // ...
}
```

Depending on the mode, the reconciler will call different methods on your host config.

If you're not sure which one you want, you likely need the mutation mode.

#### Core Methods

#### `createInstance(type, props, rootContainer, hostContext, internalHandle)`

This method should return a newly created node. For example, the DOM renderer would call `document.createElement(type)` here and then set the properties from `props`.

You can use `rootContainer` to access the root container associated with that tree. For example, in the DOM renderer, this is useful to get the correct `document` reference that the root belongs to.

The `hostContext` parameter lets you keep track of some information about your current place in the tree. To learn more about it, see `getChildHostContext` below.

The `internalHandle` data structure is meant to be opaque. If you bend the rules and rely on its internal fields, be aware that it may change significantly between versions. You're taking on additional maintenance risk by reading from it, and giving up all guarantees if you write something to it.

This method happens **in the render phase**. It can (and usually should) mutate the node it has just created before returning it, but it must not modify any other nodes. It must not register any event handlers on the parent tree. This is because an instance being created doesn't guarantee it would be placed in the tree — it could be left unused and later collected by GC. If you need to do something when an instance is definitely in the tree, look at `commitMount` instead.

#### `createTextInstance(text, rootContainer, hostContext, internalHandle)`

Same as `createInstance`, but for text nodes. If your renderer doesn't support text nodes, you can throw here.

#### `appendInitialChild(parentInstance, child)`

This method should mutate the `parentInstance` and add the child to its list of children. For example, in the DOM this would translate to a `parentInstance.appendChild(child)` call.

This method happens **in the render phase**. It can mutate `parentInstance` and `child`, but it must not modify any other nodes. It's called while the tree is still being built up and not connected to the actual tree on the screen.

#### `finalizeInitialChildren(instance, type, props, rootContainer, hostContext)`

In this method, you can perform some final mutations on the `instance`. Unlike with `createInstance`, by the time `finalizeInitialChildren` is called, all the initial children have already been added to the `instance`, but the instance itself has not yet been connected to the tree on the screen.

This method happens **in the render phase**. It can mutate `instance`, but it must not modify any other nodes. It's called while the tree is still being built up and not connected to the actual tree on the screen.

There is a second purpose to this method. It lets you specify whether there is some work that needs to happen when the node is connected to the tree on the screen. If you return `true`, the instance will receive a `commitMount` call later. See its documentation below.

If you don't want to do anything here, you should return `false`.

#### `shouldSetTextContent(type, props)`

Some target platforms support setting an instance's text content without manually creating a text node. For example, in the DOM, you can set `node.textContent` instead of creating a text node and appending it.

If you return `true` from this method, React will assume that this node's children are text, and will not create nodes for them. It will instead rely on you to have filled that text during `createInstance`. This is a performance optimization. For example, the DOM renderer returns `true` only if `type` is a known text-only parent (like `'textarea'`) or if `props.children` has a `'string'` type. If you return `true`, you will need to implement `resetTextContent` too.

If you don't want to do anything here, you should return `false`.

This method happens **in the render phase**. Do not mutate the tree from it.

#### `getRootHostContext(rootContainer)`

This method lets you return the initial host context from the root of the tree. See `getChildHostContext` for the explanation of host context.

If you don't intend to use host context, you can return `null`.

This method happens **in the render phase**. Do not mutate the tree from it.

#### `getChildHostContext(parentHostContext, type, rootContainer)`

Host context lets you track some information about where you are in the tree so that it's available inside `createInstance` as the `hostContext` parameter. For example, the DOM renderer uses it to track whether it's inside an HTML or an SVG tree, because `createInstance` implementation needs to be different for them.

If the node of this `type` does not influence the context you want to pass down, you can return `parentHostContext`. Alternatively, you can return any custom object representing the information you want to pass down.

If you don't want to do anything here, return `parentHostContext`.

This method happens **in the render phase**. Do not mutate the tree from it.

#### `getPublicInstance(instance)`

Determines what object gets exposed as a ref. You'll likely want to return the `instance` itself. But in some cases it might make sense to only expose some part of it.

If you don't want to do anything here, return `instance`.

#### `prepareForCommit(containerInfo)`

This method lets you store some information before React starts making changes to the tree on the screen. For example, the DOM renderer stores the current text selection so that it can later restore it. This method is mirrored by `resetAfterCommit`.

Even if you don't want to do anything here, you need to return `null` from it.

#### `resetAfterCommit(containerInfo)`

This method is called right after React has performed the tree mutations. You can use it to restore something you've stored in `prepareForCommit` — for example, text selection.

You can leave it empty.

#### `preparePortalMount(containerInfo)`

This method is called for a container that's used as a portal target. Usually you can leave it empty.

#### `scheduleTimeout(fn, delay)`

You can proxy this to `setTimeout` or its equivalent in your environment.

#### `cancelTimeout(id)`

You can proxy this to `clearTimeout` or its equivalent in your environment.

#### `noTimeout`

This is a property (not a function) that should be set to something that can never be a valid timeout ID. For example, you can set it to `-1`.

#### `supportsMicrotasks`

Set this to true to indicate that your renderer supports `scheduleMicrotask`. We use microtasks as part of our discrete event implementation in React DOM. If you're not sure if your renderer should support this, you probably should. The option to not implement `scheduleMicrotask` exists so that platforms with more control over user events, like React Native, can choose to use a different mechanism.
#### `scheduleMicrotask(fn)`

Optional. You can proxy this to `queueMicrotask` or its equivalent in your environment.

#### `isPrimaryRenderer`

This is a property (not a function) that should be set to `true` if your renderer is the main one on the page. For example, if you're writing a renderer for the Terminal, it makes sense to set it to `true`, but if your renderer is used *on top of* React DOM or some other existing renderer, set it to `false`.

#### `getCurrentEventPriority`

To implement this method, you'll need some constants available on the special `react-reconciler/constants` entry point:

```js
import {
  DiscreteEventPriority,
  ContinuousEventPriority,
  DefaultEventPriority,
} from 'react-reconciler/constants';

const HostConfig = {
  // ...
  getCurrentEventPriority() {
    return DefaultEventPriority;
  },
  // ...
}

const MyRenderer = Reconciler(HostConfig);
```

The constant you return depends on which event, if any, is being handled right now. (In the browser, you can check this using `window.event && window.event.type`).

* **Discrete events:** If the active event is _directly caused by the user_ (such as mouse and keyboard events) and _each event in a sequence is intentional_ (e.g. `click`), return `DiscreteEventPriority`. This tells React that they should interrupt any background work and cannot be batched across time.

* **Continuous events:** If the active event is _directly caused by the user_ but _the user can't distinguish between individual events in a sequence_ (e.g. `mouseover`), return `ContinuousEventPriority`. This tells React they should interrupt any background work but can be batched across time.

* **Other events / No active event:** In all other cases, return `DefaultEventPriority`. This tells React that this event is considered background work, and interactive events will be prioritized over it.

You can consult the `getCurrentEventPriority()` implementation in `ReactFiberConfigDOM.js` for a reference implementation.

### Mutation Methods

If you're using React in mutation mode (you probably do), you'll need to implement a few more methods.

#### `appendChild(parentInstance, child)`

This method should mutate the `parentInstance` and add the child to its list of children. For example, in the DOM this would translate to a `parentInstance.appendChild(child)` call.

Although this method currently runs in the commit phase, you still should not mutate any other nodes in it. If you need to do some additional work when a node is definitely connected to the visible tree, look at `commitMount`.

#### `appendChildToContainer(container, child)`

Same as `appendChild`, but for when a node is attached to the root container. This is useful if attaching to the root has a slightly different implementation, or if the root container nodes are of a different type than the rest of the tree.

#### `insertBefore(parentInstance, child, beforeChild)`

This method should mutate the `parentInstance` and place the `child` before `beforeChild` in the list of its children. For example, in the DOM this would translate to a `parentInstance.insertBefore(child, beforeChild)` call.

Note that React uses this method both for insertions and for reordering nodes. Similar to DOM, it is expected that you can call `insertBefore` to reposition an existing child. Do not mutate any other parts of the tree from it.

#### `insertInContainerBefore(container, child, beforeChild)`

Same as `insertBefore`, but for when a node is attached to the root container. This is useful if attaching to the root has a slightly different implementation, or if the root container nodes are of a different type than the rest of the tree.

#### `removeChild(parentInstance, child)`

This method should mutate the `parentInstance` to remove the `child` from the list of its children.

React will only call it for the top-level node that is being removed. It is expected that garbage collection would take care of the whole subtree. You are not expected to traverse the child tree in it.

#### `removeChildFromContainer(container, child)`

Same as `removeChild`, but for when a node is detached from the root container. This is useful if attaching to the root has a slightly different implementation, or if the root container nodes are of a different type than the rest of the tree.

#### `resetTextContent(instance)`

If you returned `true` from `shouldSetTextContent` for the previous props, but returned `false` from `shouldSetTextContent` for the next props, React will call this method so that you can clear the text content you were managing manually. For example, in the DOM you could set `node.textContent = ''`.

If you never return `true` from `shouldSetTextContent`, you can leave it empty.

#### `commitTextUpdate(textInstance, prevText, nextText)`

This method should mutate the `textInstance` and update its text content to `nextText`.

Here, `textInstance` is a node created by `createTextInstance`.

#### `commitMount(instance, type, props, internalHandle)`

This method is only called if you returned `true` from `finalizeInitialChildren` for this instance.

It lets you do some additional work after the node is actually attached to the tree on the screen for the first time. For example, the DOM renderer uses it to trigger focus on nodes with the `autoFocus` attribute.

Note that `commitMount` does not mirror `removeChild` one to one because `removeChild` is only called for the top-level removed node. This is why ideally `commitMount` should not mutate any nodes other than the `instance` itself. For example, if it registers some events on some node above, it will be your responsibility to traverse the tree in `removeChild` and clean them up, which is not ideal.

The `internalHandle` data structure is meant to be opaque. If you bend the rules and rely on its internal fields, be aware that it may change significantly between versions. You're taking on additional maintenance risk by reading from it, and giving up all guarantees if you write something to it.

If you never return `true` from `finalizeInitialChildren`, you can leave it empty.

#### `commitUpdate(instance, type, prevProps, nextProps, internalHandle)`

This method should mutate the `instance` to match `nextProps`.

The `internalHandle` data structure is meant to be opaque. If you bend the rules and rely on its internal fields, be aware that it may change significantly between versions. You're taking on additional maintenance risk by reading from it, and giving up all guarantees if you write something to it.

#### `hideInstance(instance)`

This method should make the `instance` invisible without removing it from the tree. For example, it can apply visual styling to hide it. It is used by Suspense to hide the tree while the fallback is visible.

#### `hideTextInstance(textInstance)`

Same as `hideInstance`, but for nodes created by `createTextInstance`.

#### `unhideInstance(instance, props)`

This method should make the `instance` visible, undoing what `hideInstance` did.

#### `unhideTextInstance(textInstance, text)`

Same as `unhideInstance`, but for nodes created by `createTextInstance`.

#### `clearContainer(container)`

This method should mutate the `container` root node and remove all children from it.

#### `maySuspendCommit(type, props)`

This method is called during render to determine if the Host Component type and props require some kind of loading process to complete before committing an update.

#### `preloadInstance(type, props)`

This method may be called during render if the Host Component type and props might suspend a commit. It can be used to initiate any work that might shorten the duration of a suspended commit.

#### `startSuspendingCommit()`

This method is called just before the commit phase. Use it to set up any necessary state while any Host Components that might suspend this commit are evaluated to determine if the commit must be suspended.

#### `suspendInstance(type, props)`

This method is called after `startSuspendingCommit` for each Host Component that indicated it might suspend a commit.

#### `waitForCommitToBeReady()`

This method is called after all `suspendInstance` calls are complete.

Return `null` if the commit can happen immediately.

Return `(initiateCommit: Function) => Function` if the commit must be suspended. The argument to this callback will initiate the commit when called. The return value is a cancellation function that the Reconciler can use to abort the commit.

### Persistence Methods

If you use the persistent mode instead of the mutation mode, you would still need the "Core Methods". However, instead of the Mutation Methods above you will implement a different set of methods that performs cloning nodes and replacing them at the root level. You can find a list of them in the "Persistence" section [listed in this file](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/forks/ReactFiberConfig.custom.js). File an issue if you need help.

### Hydration Methods

You can optionally implement hydration to "attach" to the existing tree during the initial render instead of creating it from scratch. For example, the DOM renderer uses this to attach to an HTML markup.

To support hydration, you need to declare `supportsHydration: true` and then implement the methods in the "Hydration" section [listed in this file](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/forks/ReactFiberConfig.custom.js). File an issue if you need help.
