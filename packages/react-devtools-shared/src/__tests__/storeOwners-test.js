/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const {printOwnersList} = require('../devtools/utils');
const {getVersionedRenderImplementation} = require('./utils');

describe('Store owners list', () => {
  let React;
  let act;
  let store;

  beforeEach(() => {
    store = global.store;
    store.collapseNodesByDefault = false;

    React = require('react');

    const utils = require('./utils');
    act = utils.act;
  });

  const {render} = getVersionedRenderImplementation();

  function getFormattedOwnersList(elementID) {
    const ownersList = store.getOwnersListForElement(elementID);
    return printOwnersList(ownersList);
  }

  it('should drill through intermediate components', () => {
    const Root = () => (
      <Intermediate>
        <div>
          <Leaf />
        </div>
      </Intermediate>
    );
    const Wrapper = ({children}) => children;
    const Leaf = () => <div>Leaf</div>;
    const Intermediate = ({children}) => <Wrapper>{children}</Wrapper>;

    act(() => render(<Root />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Root>
          ▾ <Intermediate>
            ▾ <Wrapper>
                <Leaf>
    `);

    const rootID = store.getElementIDAtIndex(0);
    expect(getFormattedOwnersList(rootID)).toMatchInlineSnapshot(`
      "  ▾ <Root>
          ▾ <Intermediate>
              <Leaf>"
    `);

    const intermediateID = store.getElementIDAtIndex(1);
    expect(getFormattedOwnersList(intermediateID)).toMatchInlineSnapshot(`
      "  ▾ <Intermediate>
          ▾ <Wrapper>"
    `);
  });

  it('should drill through interleaved intermediate components', () => {
    const Root = () => [
      <Intermediate key="intermediate">
        <Leaf />
      </Intermediate>,
      <Leaf key="leaf" />,
    ];
    const Wrapper = ({children}) => children;
    const Leaf = () => <div>Leaf</div>;
    const Intermediate = ({children}) => [
      <Leaf key="leaf" />,
      <Wrapper key="wrapper">{children}</Wrapper>,
    ];

    act(() => render(<Root />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Root>
          ▾ <Intermediate key="intermediate">
              <Leaf key="leaf">
            ▾ <Wrapper key="wrapper">
                <Leaf>
            <Leaf key="leaf">
    `);

    const rootID = store.getElementIDAtIndex(0);
    expect(getFormattedOwnersList(rootID)).toMatchInlineSnapshot(`
      "  ▾ <Root>
          ▾ <Intermediate key="intermediate">
              <Leaf>
            <Leaf key="leaf">"
    `);

    const intermediateID = store.getElementIDAtIndex(1);
    expect(getFormattedOwnersList(intermediateID)).toMatchInlineSnapshot(`
      "  ▾ <Intermediate key="intermediate">
            <Leaf key="leaf">
          ▾ <Wrapper key="wrapper">"
    `);
  });

  it('should show the proper owners list order and contents after insertions and deletions', () => {
    const Root = ({includeDirect, includeIndirect}) => (
      <div>
        {includeDirect ? <Leaf /> : null}
        {includeIndirect ? (
          <Intermediate>
            <Leaf />
          </Intermediate>
        ) : null}
      </div>
    );
    const Wrapper = ({children}) => children;
    const Leaf = () => <div>Leaf</div>;
    const Intermediate = ({children}) => <Wrapper>{children}</Wrapper>;

    act(() => render(<Root includeDirect={false} includeIndirect={true} />));

    const rootID = store.getElementIDAtIndex(0);
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Root>
          ▾ <Intermediate>
            ▾ <Wrapper>
                <Leaf>
    `);
    expect(getFormattedOwnersList(rootID)).toMatchInlineSnapshot(`
      "  ▾ <Root>
          ▾ <Intermediate>
              <Leaf>"
    `);

    act(() => render(<Root includeDirect={true} includeIndirect={true} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Root>
            <Leaf>
          ▾ <Intermediate>
            ▾ <Wrapper>
                <Leaf>
    `);
    expect(getFormattedOwnersList(rootID)).toMatchInlineSnapshot(`
      "  ▾ <Root>
            <Leaf>
          ▾ <Intermediate>
              <Leaf>"
    `);

    act(() => render(<Root includeDirect={true} includeIndirect={false} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Root>
            <Leaf>
    `);
    expect(getFormattedOwnersList(rootID)).toMatchInlineSnapshot(`
      "  ▾ <Root>
            <Leaf>"
    `);

    act(() => render(<Root includeDirect={false} includeIndirect={false} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
          <Root>
    `);
    expect(getFormattedOwnersList(rootID)).toMatchInlineSnapshot(
      `"    <Root>"`,
    );
  });

  it('should show the proper owners list ordering after reordered children', () => {
    const Root = ({ascending}) =>
      ascending
        ? [<Leaf key="A" />, <Leaf key="B" />, <Leaf key="C" />]
        : [<Leaf key="C" />, <Leaf key="B" />, <Leaf key="A" />];
    const Leaf = () => <div>Leaf</div>;

    act(() => render(<Root ascending={true} />));

    const rootID = store.getElementIDAtIndex(0);
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Root>
            <Leaf key="A">
            <Leaf key="B">
            <Leaf key="C">
    `);
    expect(getFormattedOwnersList(rootID)).toMatchInlineSnapshot(`
      "  ▾ <Root>
            <Leaf key="A">
            <Leaf key="B">
            <Leaf key="C">"
    `);

    act(() => render(<Root ascending={false} />));
    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <Root>
            <Leaf key="C">
            <Leaf key="B">
            <Leaf key="A">
    `);
    expect(getFormattedOwnersList(rootID)).toMatchInlineSnapshot(`
      "  ▾ <Root>
            <Leaf key="C">
            <Leaf key="B">
            <Leaf key="A">"
    `);
  });
});
