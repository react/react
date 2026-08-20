/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {Fragment, useState} from 'react';
import {Button, Text, View} from 'react-native-web';

export default function ReactNativeWeb(): React.Node {
  const [backgroundColor, setBackgroundColor] = useState('purple');
  const toggleColor = () =>
    setBackgroundColor(backgroundColor === 'purple' ? 'green' : 'purple');
  return (
    <Fragment>
      <h1>ReactNativeWeb</h1>
      <View>
        <Text>auto (default) - english LTR</Text>
        <Text>
          {
            '\u0623\u062D\u0628 \u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 auto (default) - arabic RTL'
          }
        </Text>
        <Text style={{textAlign: 'left'}}>
          left left left left left left left left left left left left left left
          left
        </Text>
        <Button
          color={backgroundColor}
          onPress={toggleColor}
          title={`Switch background color to "${
            backgroundColor === 'purple' ? 'green' : 'purple'
          }"`}
        />
      </View>
    </Fragment>
  );
}
