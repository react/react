/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const ReactFabricGlobalResponderHandler = {
  onChange: function (from: any, to: any, blockNativeResponder: boolean) {
    if (from && from.stateNode) {
      // equivalent to clearJSResponder
      nativeFabricUIManager.setIsJSResponder(
        from.stateNode.node,
        false,
        blockNativeResponder || false,
      );
    }

    if (to && to.stateNode) {
      // equivalent to setJSResponder
      nativeFabricUIManager.setIsJSResponder(
        to.stateNode.node,
        true,
        blockNativeResponder || false,
      );
    }
  },
};

export default ReactFabricGlobalResponderHandler;
