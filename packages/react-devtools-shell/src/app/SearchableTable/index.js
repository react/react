/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {Fragment} from 'react';

// A large tree of similarly-named components (Table, TableRow, TableCell, ...).
// This mirrors a real virtualized table and is meant for exercising the
// component-tree search box in DevTools:
//   1. Open DevTools and search "Table" — there are 100+ matches.
//   2. Type a number into the result-index field (left of "| N") to jump
//      directly to a specific match instead of scrolling/pressing Enter.
//   3. Select a match, clear the search, then retype the same text — the
//      search advances to the *next* match instead of snapping back.

const ROWS = 25;
const COLS = 4;

function TableCell({row, col}: {row: number, col: number}): React.Node {
  return <td>{`r${row}c${col}`}</td>;
}

function TableColumnHeader({col}: {col: number}): React.Node {
  return <th>{`Column ${col}`}</th>;
}

function TableRow({row}: {row: number}): React.Node {
  return (
    <tr>
      {Array.from({length: COLS}, (_, col) => (
        <TableCell key={col} row={row} col={col} />
      ))}
    </tr>
  );
}

function TableHeaderRow(): React.Node {
  return (
    <tr>
      {Array.from({length: COLS}, (_, col) => (
        <TableColumnHeader key={col} col={col} />
      ))}
    </tr>
  );
}

function TableBody(): React.Node {
  return (
    <tbody>
      {Array.from({length: ROWS}, (_, row) => (
        <TableRow key={row} row={row} />
      ))}
    </tbody>
  );
}

function Table(): React.Node {
  return (
    <table>
      <thead>
        <TableHeaderRow />
      </thead>
      <TableBody />
    </table>
  );
}

export default function SearchableTable(): React.Node {
  return (
    <Fragment>
      <h1>Searchable Table</h1>
      <Table />
    </Fragment>
  );
}
