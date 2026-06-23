/**
 * @flow strict-local
 * @format
 */

'use strict';

import type {SimpleTooltipMessageTypesType} from 'SimpleTooltipMessageTypes';
import type {Alignment, Position, Width} from 'AmbientTooltip.react';

import * as SimpleTooltipMessage from 'SimpleTooltipMessage';
import AmbientTooltip from 'AmbientTooltip.react';

import * as React from 'react';

export type NUXProps = {
  alignment?: Alignment,
  children: React.Node,
  customWidth?: number,
  disabled?: boolean,
  hideOnXout?: boolean,
  position: Position,
  showOnce?: boolean,
  type: SimpleTooltipMessageTypesType,
  width?: Width,
};

type CurrentState = {
  showNux: boolean,
};

type ExposedProps<Props extends {...}> = {
  ...$Exact<Props>,
  nuxProps: NUXProps,
};

export default function WidgetWithTooltip<
  Props extends {...},
  WidgetWithTooltipComponent extends React.ComponentType<Props>,
>(
  WrappedComponent: WidgetWithTooltipComponent
): Class<
  React.Component<
    ExposedProps<React.ElementConfig<WidgetWithTooltipComponent>>,
    CurrentState,
  >,
> {
  class WithNux extends React.PureComponent<ExposedProps<Props>, CurrentState> {
    state: CurrentState = {
      showNux:
        this.props.nuxProps.disabled !== true &&
        !SimpleTooltipMessage.hasUserSeenMessage_LEGACY(
          this.props.nuxProps.type
        ),
    };

    wrappedRef: {
      current: HTMLSpanElement | null,
      ...
    } = React.createRef();

    componentDidMount(): void {
      if (this.props.nuxProps.showOnce === true && this.state.showNux) {
        SimpleTooltipMessage.markMessageSeenByUser(this.props.nuxProps.type);
      }
    }

    #onNuxClose = (): void => {
      if (this.props.nuxProps.hideOnXout === true && this.state.showNux) {
        SimpleTooltipMessage.markMessageSeenByUser(this.props.nuxProps.type);
      }
      this.setState({
        showNux: false,
      });
    };

    #getRef = (): null | HTMLSpanElement => this.wrappedRef.current;

    render(): React.MixedElement {
      const {nuxProps, ...passProps} = this.props;
      return (
        <>
          <span className="uiContextualLayerParent" ref={this.wrappedRef}>
            <WrappedComponent {...passProps} />
          </span>
          {this.state.showNux ? (
            <AmbientTooltip
              alignment={nuxProps.alignment}
              children={nuxProps.children}
              contextRef={this.#getRef}
              customwidth={nuxProps.customWidth}
              onCloseButtonClick={this.#onNuxClose}
              position={nuxProps.position}
              shown={this.state.showNux}
              width={nuxProps.width}
            />
          ) : null}
        </>
      );
    }
  }
  return WithNux;
}
