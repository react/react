/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';

const arrayOne: $FlowFixMe = [];
const arrayTwo: $FlowFixMe = [];
arrayTwo.push(arrayOne);
arrayOne.push(arrayTwo);

type ObjectOne = {
  objectTwo?: ObjectTwo,
};
type ObjectTwo = {
  objectOne: ObjectOne,
};

const objectOne: ObjectOne = {};
const objectTwo: ObjectTwo = {objectOne};
objectOne.objectTwo = objectTwo;

export default function CircularReferences(): React.Node {
  return <ChildComponent arrayOne={arrayOne} objectOne={objectOne} />;
}

function ChildComponent(props: any) {
  return null;
}
