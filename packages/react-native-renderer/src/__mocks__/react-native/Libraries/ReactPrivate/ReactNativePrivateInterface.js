/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

module.exports = {
  get ReactFiberErrorDialog() {
    return require('./ReactFiberErrorDialog');
  },
  get ReactNativeViewConfigRegistry() {
    return require('./ReactNativeViewConfigRegistry');
  },
  get deepFreezeAndThrowOnMutationInDev() {
    return require('./deepFreezeAndThrowOnMutationInDev');
  },
  get RawEventEmitter() {
    return require('./RawEventEmitter').default;
  },
  get getNativeTagFromPublicInstance() {
    return require('./getNativeTagFromPublicInstance').default;
  },
  get getNodeFromPublicInstance() {
    return require('./getNodeFromPublicInstance').default;
  },
  get createPublicInstance() {
    return require('./createPublicInstance').default;
  },
  get createPublicTextInstance() {
    return require('./createPublicTextInstance').default;
  },
  get createPublicRootInstance() {
    return require('./createPublicRootInstance').default;
  },
  get createAttributePayload() {
    return require('./createAttributePayload').default;
  },
  get diffAttributePayloads() {
    return require('./diffAttributePayloads').default;
  },
  dispatchNativeEvent() {},
};
