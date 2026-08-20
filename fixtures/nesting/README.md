# Nested React Demo

This is a demo of how you can configure a build system to serve **two different versions of React** side by side in the same app. This is not optimal, and should only be used as a compromise to prevent your app from getting stuck on an old version of React.

## You Probably Don't Need This

Note that **this approach is meant to be an escape hatch, not the norm**.

Normally, we encourage you to use a single version of React across your whole app. When you need to upgrade React, it is better to try to upgrade it all at once. We try to keep breaking changes between versions to the minimum, and often there are automatic scripts ("codemods") that can assist you with migration. You can always find the migration information for any release on [our blog](https://reactjs.org/blog/).

Using a single version of React removes a lot of complexity. It is also essential to ensure the best experience for your users who don't have to download the code twice. Always prefer using one React.

## What Is This For?

However, for some apps that have been in production for many years, upgrading all screens at once may be prohibitively difficult. For example, React components written in 2014 may still rely on [the unofficial legacy context API](https://reactjs.org/docs/legacy-context.html) (not to be confused with the modern one), and are not always maintained. 

Traditionally, this meant that if a legacy API is deprecated, you would be stuck on the old version of React forever. That prevents your whole app from receiving improvements and bugfixes. This repository demonstrates a hybrid approach. It shows how you can use a newer version of React for some parts of your app, while **lazy-loading an older version of React** for the parts that haven't been migrated yet.

This approach is inherently more complex, and should be used as a last resort when you can't upgrade.

## Version Requirements

This demo uses two different versions of React: React 17 for "modern" components (in `src/modern`), and React 16.8 for "legacy" components (in `src/legacy`).

**We still recommend upgrading your whole app to React 17 in one piece.** The React 17 release intentionally has minimal breaking changes so that it's easier to upgrade to. In particular, React 17 solves some problems with nesting related to event propagation that earlier versions of React did not handle well. We expect that this nesting demo may not be as useful today as during a future migration from React 17 to the future major versions where some of the long-deprecated APIs may be removed.

However, if you're already stuck on an old version of React, you may found this approach useful today. If you remove a Hook call from `src/shared/Clock.js`, you can downgrade the legacy React all the way down to React 16.3. If you then remove Context API usage from `src/legacy/createLegacyRoot.js`, you can further downgrade the legacy React version, but keep in mind that the usage of third-party libraries included in this demo (React Router and React Redux) may need to be adjusted or removed.

## Installation

To run this demo, open its folder in Terminal and execute:

```sh
npm install
npm start
```

If you want to test the production build, you can run instead:

```
npm install
npm run build
npx serve -s build
```

This sample app uses client-side routing and consists of two routes:

- `/` renders a page which uses a newer version of React. (In the production build, you can verify that only one version of React is being loaded when this route is rendered.)
- `/about` renders a page which uses an older version of React for a part of its tree. (In the production build, you can verify that both versions of React are loaded from different chunks.)

**The purpose of this demo is to show some nuances of such setup:**

- How to install two versions of React in a single app with npm side by side.
- How to avoid the ["invalid Hook call" error](https://github.com/facebook/react/issues/13991) while nesting React trees.
- How to pass context between different versions of React.
- How to lazy-load the second React bundle so it's only loaded on the screens that use it.
- How to do all of this without a special bundler configuration.

## How It Works

File structure is extremely important in this demo. It has a direct effect on which code is going to use which version of React. This particular demo is using Create React App without ejecting, so **it doesn't rely on any bundler plugins or configuration**. The principle of this demo is portable to other setups.

### Dependencies

We will use three different `package.json`s: one for non-React code at the root, and two in the respective `src/legacy` and `src/modern` folders that specify the React dependencies:

- **`package.json`**: The root `package.json` is a place for build dependencies (such as `react-scripts`) and any React-agnostic libraries (for example, `lodash`, `immer`, or `redux`). We do **not** include React or any React-related libraries in this file.
- **`src/legacy/package.json`**: This is where we declare the `react` and `react-dom`  dependencies for the "legacy" trees. In this demo, we're using React 16.8 (although, as noted above, we could downgrade it further below). This is **also** where we specify any third-party libraries that use React. For example, we include `react-router` and `react-redux` in this example. 
- **`src/modern/package.json`**: This is where we declare the `react` and `react-dom`  dependencies for the "modern" trees. In this demo, we're using React 17. Here, we also specify third-party dependencies that use React and are used from the modern part of our app. This is why we *also* have `react-router` and `react-redux` in this file. (Their versions don't strictly have to match their `legacy` counterparts, but features that rely on context may require workarounds if they differ.)

The `scripts` in the root `package.json` are set up so that when you run `npm install` in it, it also runs `npm install` in both `src/legacy` and `src/modern` folders.

**Note:** This demo is set up to use a few third-party dependencies (React Router and Redux). These are not essential, and you can remove them from the demo. They are included so we can show how to make them work with this approach.

### Folders

There are a few key folders in this example:

- **`src`**: Root of the source tree. At this level (or below it, except for the special folders noted below), you can put any logic that's agnostic of React. For example, in this demo we have `src/index.js` which is the app's entry point, and `src/store.js` which exports a Redux store. These regular modules only execute once, and are **not** duplicated between the bundles.
- **`src/legacy`**: This is where all the code using the older version of React should go. This includes React components and Hooks, and general product code that is **only** used by the legacy trees.
- **`src/modern`**: This is where all the code using the newer version of React should go. This includes React components and Hooks, and general product code that is **only** used by the modern trees.
- **`src/shared`**: You may have some components or Hooks that you wish to use from both modern and legacy subtrees. The build process is set up so that **everything inside `src/shared` gets copied by a file watcher** into both `src/legacy/shared` and `src/modern/shared` on every change. This lets you write a component or a Hook once, but reuse it in both places.
 
### Lazy Loading

Loading two Reacts on the same page is bad for the user experience, so you should strive to push this as far as possible from the critical path of your app. For example, if there is a dialog that is less commonly used, or a route that is rarely visited, those are better candidates for staying on an older version of React than parts of your homepage.

To encourage only loading the older React when necessary, this demo includes a helper that works similarly to `React.lazy`. For example, `src/modern/AboutPage.js`, simplified, looks like this:

```js
import lazyLegacyRoot from './lazyLegacyRoot';

// Lazy-load a component from the bundle using legacy React.
const Greeting = lazyLegacyRoot(() => import('../legacy/Greeting'));

function AboutPage() {
  return (
    <>
      <h3>This component is rendered by React ({React.version}).</h3>
      <Greeting />
    </>
  );
}
```

As a result, only if the `AboutPage` (and as a result, `<Greeting />`) gets rendered, we will load the bundle containing the legacy React and the legacy `Greeting` component. Like with `React.lazy()`, we wrap it in `<Suspense>` to specify the loading indicator:

```js
<Suspense fallback={<Spinner />}>
  <AboutPage />
</Suspense>
```

If the legacy component is only rendered conditionally, we won't load the second React until it's shown:

```js
<>
  <button onClick={() => setShowGreeting(true)}>
    Say hi
  </button>
  {showGreeting && (
    <Suspense fallback={<Spinner />}>
      <Greeting />
    </Suspense>
  )}
</>
```


The implementation of the `src/modern/lazyLegacyRoot.js` helper is included so you can tweak it and customize it to your needs. Remember to test lazy loading with the production builds because the bundler may not optimize it in development.

### Context

If you have nested trees managed by different versions of React, the inner tree won't "see" the outer tree's Context.

This breaks third-party libraries like React Redux or React Router, as well as any of your own usage of Context (for example, for theming).

To solve this problem, we read all the Contexts we care about in the outer tree, pass them to the inner tree, and then wrap the inner tree in the corresponding Providers. You can see this in action in two files:

* `src/modern/lazyLegacyRoot.js`: Look for `useContext` calls, and how their results are combined into a single object that is passed through. **You can read more Contexts there** if your app requires them.
* `src/legacy/createLegacyRoot.js`: Look for the `Bridge` component which receives that object and wraps its children with the appropriate Context Providers. **You can wrap them with more Providers there** if your app requires them.

Note that, generally saying, this approach is somewhat fragile, especially because some libraries may not expose their Contexts officially or consider their structure private. You may be able to expose private Contexts by using a tool like [patch-package](https://www.npmjs.com/package/patch-package), but remember to keep all the versions pinned because even a patch release of a third-party library may change the behavior.

### Nesting Direction

In this demo, we use an older React inside an app managed by the newer React. However, we could rename the folders and apply the same approach in the other direction.

### Event Propagation

Note that before React 17, `event.stopPropagation()` in the inner React tree does not prevent the event propagation to the outer React tree. This may cause unexpected behavior when extracting a UI tree like a dialog to use a separate React. This is because prior to React 17, both Reacts would attach the event listener at the `document` level. React 17 fixes this by attaching handlers to the roots. We strongly recommend upgrading to React 17 before considering the nesting strategy for future upgrades.

### Gotchas

This setup is unusual, so it has a few gotchas.

* Don't add `package.json` to the `src/shared` folder. For example, if you want to use an npm React component inside `src/shared`, you should add it to both `src/modern/package.json` and `src/legacy/package.json` instead. You can use different versions of it but make sure your code works with both of them — and that it works with both Reacts!
* Don't use React outside of the `src/modern`, `src/legacy`, or `src/shared`. Don't add React-related libraries outside of `src/modern/package.json` or `src/legacy/package.json`.
* Remember that `src/shared` is where you write shared components, but the files you write there are automatically copied into `src/modern/shared` and `src/legacy/shared`, **from which you should import them**. Both of the target directories are in `.gitignore`. Importing directly from `src/shared` **will not work** because it is ambiguous what `react` refers to in that folder.
* Keep in mind that any code in `src/shared` gets duplicated between the legacy and the modern bundles. Code that should not be duplicated needs to be anywhere else in `src` (but you can't use React there since the version is ambiguous).
* You'll want to exclude `src/*/node_modules` from your linter's configuration, as this demo does in `.eslintignorerc`.

This setup is complicated, and we don't recommend it for most apps. However, we believe it is important to offer it as an option for apps that would otherwise get left behind. There might be ways to simplify it with a layer of tooling, but this example is intentionally showing the low-level mechanism that other tools may build on.
