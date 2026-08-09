/** @flow */

import * as React from 'react';
import {useRef} from 'react';

import styles from './Tooltip.css';
import typeof {SyntheticMouseEvent} from 'react-dom-bindings/src/events/SyntheticEvent';

const initialTooltipState = {height: 0, mouseX: 0, mouseY: 0, width: 0};

export default function Tooltip({
  children,
  className,
  label,
  style,
}: any): React.Node {
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);

  // update the position of the tooltip based on current mouse position
  const updateTooltipPosition = (event: SyntheticMouseEvent) => {
    const element = tooltipRef.current;
    if (element != null) {
      // first find the mouse position
      const mousePosition = getMousePosition(containerRef.current, event);
      // use the mouse position to find the position of tooltip
      const {left, top} = getTooltipPosition(element, mousePosition);
      // update tooltip position
      element.style.left = left;
      element.style.top = top;
    }
  };

  const onMouseMove = (event: SyntheticMouseEvent) => {
    updateTooltipPosition(event);
  };

  const tooltipClassName = label === null ? styles.hidden : '';

  return (
    <div
      className={styles.Container}
      onMouseMove={onMouseMove}
      ref={containerRef}>
      <div
        className={`${styles.Tooltip} ${tooltipClassName} ${className || ''}`}
        ref={tooltipRef}
        style={style}>
        {label}
      </div>
      {children}
    </div>
  );
}

const TOOLTIP_OFFSET = 5;

// Method used to find the position of the tooltip based on current mouse position
function getTooltipPosition(
  element: empty,
  mousePosition: {
    height: number,
    mouseX: number,
    mouseY: number,
    width: number,
  },
): {left: string, top: string} {
  const {height, mouseX, mouseY, width} = mousePosition;
  let top: number | string = 0;
  let left: number | string = 0;

  if (mouseY + TOOLTIP_OFFSET + element.offsetHeight >= height) {
    if (mouseY - TOOLTIP_OFFSET - element.offsetHeight > 0) {
      top = `${mouseY - element.offsetHeight - TOOLTIP_OFFSET}px`;
    } else {
      top = '0px';
    }
  } else {
    top = `${mouseY + TOOLTIP_OFFSET}px`;
  }

  if (mouseX + TOOLTIP_OFFSET + element.offsetWidth >= width) {
    if (mouseX - TOOLTIP_OFFSET - element.offsetWidth > 0) {
      left = `${mouseX - element.offsetWidth - TOOLTIP_OFFSET}px`;
    } else {
      left = '0px';
    }
  } else {
    left = `${mouseX + TOOLTIP_OFFSET * 2}px`;
  }

  return {left, top};
}

// method used to find the current mouse position inside the container
function getMousePosition(
  relativeContainer: null,
  mouseEvent: SyntheticMouseEvent,
) {
  if (relativeContainer !== null) {
    // Position within the nearest position:relative container.
    let targetContainer = relativeContainer;
    while (targetContainer.parentElement != null) {
      // $FlowFixMe[invalid-compare]
      if (targetContainer.style.position === 'relative') {
        break;
      } else {
        targetContainer = targetContainer.parentElement;
      }
    }

    const {height, left, top, width} =
      targetContainer.getBoundingClientRect() as {
        height: number,
        left: number,
        top: number,
        width: number,
      };

    const mouseX = mouseEvent.clientX - left;
    const mouseY = mouseEvent.clientY - top;

    return {height, mouseX, mouseY, width};
  } else {
    return initialTooltipState;
  }
}
