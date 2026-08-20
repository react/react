/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import SyntheticEvent from './SyntheticEvent';

/**
 * `touchHistory` isn't actually on the native event, but putting it in the
 * interface will ensure that it is cleaned up when pooled/destroyed. The
 * `ResponderEventPlugin` will populate it appropriately.
 */
const ResponderSyntheticEvent = SyntheticEvent.extend({
  touchHistory: function (nativeEvent) {
    return null; // Actually doesn't even look at the native event.
  },
});

export default ResponderSyntheticEvent;
