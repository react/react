/**
 *  * @flow strict
 * @format
 */

/**
 * creates a cache for Component props so we prevent rendering a component
 * sequentially if the props didn't change. Useful to wrap FluxContainer
 * with pure calculateState and getStores functions.
 */

'use strict';

import * as React from 'react';
import {PureComponent} from 'react';

export default function createPureComponent<
  DefaultProps extends {...} | void,
  Props extends {...},
>(
  Component: React.ComponentType<Props> & {
    defaultProps?: DefaultProps,
    displayName?: string,
  }
): React.ComponentType<Props> {
  class PureComponentCache extends PureComponent<Props, void> {
    static defaultProps: DefaultProps;

    render(): React.MixedElement {
      return <Component {...this.props} />;
    }
  }

  if (Component.defaultProps) {
    PureComponentCache.defaultProps = Component.defaultProps;
  }
  PureComponentCache.displayName = `PureComponentCache(${
    /* $FlowFixMe[incompatible-type] (>=0.66.0 site=www) This comment
     * suppresses an error found when Flow v0.66 was deployed. To see the
     * error delete this comment and run Flow. */
    Component.displayName
  })`;
  // $FlowFixMe[incompatible-type]
  return PureComponentCache;
}
