/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {Fragment, useCallback, useState} from 'react';
import UserForm from './UserForm';
import UserList from './UserList';

export type User = {
  id: number,
  name: string,
  age: number,
};

type Props = {};

export default function UserListApp(props: Props): React.Node {
  const [users, setUsers] = useState<Array<User>>([
    {id: 1, name: 'Ada Lovelace', age: 36},
    {id: 2, name: 'Grace Hopper', age: 85},
  ]);
  const [uid, setUID] = useState<number>(3);

  const saveUser = useCallback(
    (name: string, age: number) => {
      setUsers([...users, {id: uid, name, age}]);
      setUID(uid + 1);
    },
    [users, uid],
  );

  return (
    <Fragment>
      <h1>Users</h1>
      <UserForm onSave={saveUser} />
      <UserList users={users} />
    </Fragment>
  );
}
