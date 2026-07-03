/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import styles from './UserList.css';

import type {User} from './UserListApp';

// Artificial bottleneck for Profiler demos: every list item burns CPU while
// rendering, so commits that re-render the list (e.g. saving a user) are
// slow, while commits that only touch the form stay fast.
const ARTIFICIAL_RENDER_COST_MS = 25;

function burnCPU(milliseconds: number): void {
  const start = performance.now();
  while (performance.now() - start < milliseconds) {
    // Busy-wait to simulate expensive render work.
  }
}

type ItemProps = {
  user: User,
};

function UserListItem({user}: ItemProps): React.Node {
  burnCPU(ARTIFICIAL_RENDER_COST_MS);

  return (
    <li className={styles.ListItem}>
      {user.name} ({user.age})
    </li>
  );
}

type Props = {
  users: Array<User>,
};

export default function UserList({users}: Props): React.Node {
  return (
    <ul className={styles.List}>
      {users.map(user => (
        <UserListItem key={user.id} user={user} />
      ))}
    </ul>
  );
}
