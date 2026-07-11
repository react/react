/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Point} from './view-base';
import type {
  FlamechartStackFrame,
  NativeEvent,
  NetworkMeasure,
  ReactComponentMeasure,
  ReactEventInfo,
  ReactMeasure,
  ReactMeasureType,
  SchedulingEvent,
  Snapshot,
  SuspenseEvent,
  ThrownError,
  TimelineData,
  UserTimingMark,
} from './types';

import * as React from 'react';
import {
  formatDuration,
  formatTimestamp,
  trimString,
  getSchedulingEventLabel,
} from './utils/formatting';
import {getBatchRange} from './utils/getBatchRange';
import useSmartTooltip from './utils/useSmartTooltip';
import styles from './EventTooltip.css';

const MAX_TOOLTIP_TEXT_LENGTH = 60;

type Props = {
  canvasRef: {current: HTMLCanvasElement | null},
  data: TimelineData,
  height: number,
  hoveredEvent: ReactEventInfo | null,
  origin: Point,
  width: number,
};

function getReactMeasureLabel(type: ReactMeasureType): string | null {
  switch (type) {
    case 'commit':
      return 'react commit';
    case 'render-idle':
      return 'react idle';
    case 'render':
      return 'react render';
    case 'layout-effects':
      return 'react layout effects';
    case 'passive-effects':
      return 'react passive effects';
    default:
      return null;
  }
}

export default function EventTooltip({
  canvasRef,
  data,
  height,
  hoveredEvent,
  origin,
  width,
}: Props): React.Node {
  const ref = useSmartTooltip({
    canvasRef,
    mouseX: origin.x,
    mouseY: origin.y,
  });

  if (hoveredEvent === null) {
    return null;
  }

  const {
    componentMeasure,
    flamechartStackFrame,
    measure,
    nativeEvent,
    networkMeasure,
    schedulingEvent,
    snapshot,
    suspenseEvent,
    thrownError,
    userTimingMark,
  } = hoveredEvent;

  let content = null;
  if (componentMeasure !== null) {
    content = (
      <TooltipReactComponentMeasure componentMeasure={componentMeasure} />
    );
  } else if (nativeEvent !== null) {
    content = <TooltipNativeEvent nativeEvent={nativeEvent} />;
  } else if (networkMeasure !== null) {
    content = <TooltipNetworkMeasure networkMeasure={networkMeasure} />;
  } else if (schedulingEvent !== null) {
    content = (
      <TooltipSchedulingEvent data={data} schedulingEvent={schedulingEvent} />
    );
  } else if (snapshot !== null) {
    content = (
      <TooltipSnapshot height={height} snapshot={snapshot} width={width} />
    );
  } else if (suspenseEvent !== null) {
    content = <TooltipSuspenseEvent suspenseEvent={suspenseEvent} />;
  } else if (measure !== null) {
    content = <TooltipReactMeasure data={data} measure={measure} />;
  } else if (flamechartStackFrame !== null) {
    content = <TooltipFlamechartNode stackFrame={flamechartStackFrame} />;
  } else if (userTimingMark !== null) {
    content = <TooltipUserTimingMark mark={userTimingMark} />;
  } else if (thrownError !== null) {
    content = <TooltipThrownError thrownError={thrownError} />;
  }

  if (content !== null) {
    return (
      <div className={styles.Tooltip} ref={ref}>
        {content}
      </div>
    );
  } else {
    return null;
  }
}

const TooltipReactComponentMeasure = ({
  componentMeasure,
}: {
  componentMeasure: ReactComponentMeasure,
}) => {
  const {componentName, duration, timestamp, type, warning} = componentMeasure;

  let label = componentName;
  switch (type) {
    case 'render':
      label += ' rendered';
      break;
    case 'layout-effect-mount':
      label += ' mounted layout effect';
      break;
    case 'layout-effect-unmount':
      label += ' unmounted layout effect';
      break;
    case 'passive-effect-mount':
      label += ' mounted passive effect';
      break;
    case 'passive-effect-unmount':
      label += ' unmounted passive effect';
      break;
  }

  return (
    <>
      <div className={styles.TooltipSection}>
        {trimString(label, 768)}
        <div className={styles.Divider} />
        <div className={styles.DetailsGrid}>
          <div className={styles.DetailsGridLabel}>Timestamp:</div>
          <div>{formatTimestamp(timestamp)}</div>
          <div className={styles.DetailsGridLabel}>Duration:</div>
          <div>{formatDuration(duration)}</div>
        </div>
      </div>
      {warning !== null && (
        <div className={styles.TooltipWarningSection}>
          <div className={styles.WarningText}>{warning}</div>
        </div>
      )}
    </>
  );
};

const TooltipFlamechartNode = ({
  stackFrame,
}: {
  stackFrame: FlamechartStackFrame,
}) => {
  const {name, timestamp, duration, locationLine, locationColumn} = stackFrame;
  return (
    <div className={styles.TooltipSection}>
      <span className={styles.FlamechartStackFrameName}>{name}</span>
      <div className={styles.DetailsGrid}>
        <div className={styles.DetailsGridLabel}>Timestamp:</div>
        <div>{formatTimestamp(timestamp)}</div>
        <div className={styles.DetailsGridLabel}>Duration:</div>
        <div>{formatDuration(duration)}</div>
        {(locationLine !== undefined || locationColumn !== undefined) && (
          <>
            <div className={styles.DetailsGridLabel}>Location:</div>
            <div>
              line {locationLine}, column {locationColumn}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const TooltipNativeEvent = ({nativeEvent}: {nativeEvent: NativeEvent}) => {
  const {duration, timestamp, type, warning} = nativeEvent;

  return (
    <>
      <div className={styles.TooltipSection}>
        <span className={styles.NativeEventName}>{trimString(type, 768)}</span>
        event
        <div className={styles.Divider} />
        <div className={styles.DetailsGrid}>
          <div className={styles.DetailsGridLabel}>Timestamp:</div>
          <div>{formatTimestamp(timestamp)}</div>
          <div className={styles.DetailsGridLabel}>Duration:</div>
          <div>{formatDuration(duration)}</div>
        </div>
      </div>
      {warning !== null && (
        <div className={styles.TooltipWarningSection}>
          <div className={styles.WarningText}>{warning}</div>
        </div>
      )}
    </>
  );
};

const TooltipNetworkMeasure = ({
  networkMeasure,
}: {
  networkMeasure: NetworkMeasure,
}) => {
  const {
    finishTimestamp,
    lastReceivedDataTimestamp,
    priority,
    sendRequestTimestamp,
    url,
  } = networkMeasure;

  let urlToDisplay = url;
  if (urlToDisplay.length > MAX_TOOLTIP_TEXT_LENGTH) {
    const half = Math.floor(MAX_TOOLTIP_TEXT_LENGTH / 2);
    urlToDisplay = url.slice(0, half) + '…' + url.slice(url.length - half);
  }

  const timestampBegin = sendRequestTimestamp;
  const timestampEnd = finishTimestamp || lastReceivedDataTimestamp;
  const duration =
    timestampEnd > 0
      ? formatDuration(finishTimestamp - timestampBegin)
      : '(incomplete)';

  return (
    <div className={styles.SingleLineTextSection}>
      {duration} <span className={styles.DimText}>{priority}</span>{' '}
      {urlToDisplay}
    </div>
  );
};

const TooltipSchedulingEvent = ({
  data,
  schedulingEvent,
}: {
  data: TimelineData,
  schedulingEvent: SchedulingEvent,
}) => {
  const label = getSchedulingEventLabel(schedulingEvent);
  if (!label) {
    if (__DEV__) {
      console.warn(
        'Unexpected schedulingEvent type "%s"',
        schedulingEvent.type,
      );
    }
    return null;
  }

  let laneLabels = null;
  let lanes = null;
  switch (schedulingEvent.type) {
    case 'schedule-render':
    case 'schedule-state-update':
    case 'schedule-force-update':
      lanes = schedulingEvent.lanes;
      laneLabels = lanes.map(
        lane => data.laneToLabelMap.get(lane) as any as string,
      );
      break;
  }

  const {componentName, timestamp, warning} = schedulingEvent;

  return (
    <>
      <div className={styles.TooltipSection}>
        {componentName && (
          <span className={styles.ComponentName}>
            {trimString(componentName, 100)}
          </span>
        )}
        {label}
        <div className={styles.Divider} />
        <div className={styles.DetailsGrid}>
          {laneLabels !== null && lanes !== null && (
            <>
              <div className={styles.DetailsGridLabel}>Lanes:</div>
              <div>
                {laneLabels.join(', ')} ({lanes.join(', ')})
              </div>
            </>
          )}
          <div className={styles.DetailsGridLabel}>Timestamp:</div>
          <div>{formatTimestamp(timestamp)}</div>
        </div>
      </div>
      {warning !== null && (
        <div className={styles.TooltipWarningSection}>
          <div className={styles.WarningText}>{warning}</div>
        </div>
      )}
    </>
  );
};

const TooltipSnapshot = ({
  height,
  snapshot,
  width,
}: {
  height: number,
  snapshot: Snapshot,
  width: number,
}) => {
  const aspectRatio = snapshot.width / snapshot.height;

  // Zoomed in view should not be any bigger than the DevTools viewport.
  let safeWidth = snapshot.width;
  let safeHeight = snapshot.height;
  if (safeWidth > width) {
    safeWidth = width;
    safeHeight = safeWidth / aspectRatio;
  }
  if (safeHeight > height) {
    safeHeight = height;
    safeWidth = safeHeight * aspectRatio;
  }

  return (
    <img
      className={styles.Image}
      src={snapshot.imageSource}
      style={{height: safeHeight, width: safeWidth}}
    />
  );
};

const TooltipSuspenseEvent = ({
  suspenseEvent,
}: {
  suspenseEvent: SuspenseEvent,
}) => {
  const {
    componentName,
    duration,
    phase,
    promiseName,
    resolution,
    timestamp,
    warning,
  } = suspenseEvent;

  let label = 'suspended';
  if (phase !== null) {
    label += ` during ${phase}`;
  }

  return (
    <>
      <div className={styles.TooltipSection}>
        {componentName && (
          <span className={styles.ComponentName}>
            {trimString(componentName, 100)}
          </span>
        )}
        {label}
        <div className={styles.Divider} />
        <div className={styles.DetailsGrid}>
          {promiseName !== null && (
            <>
              <div className={styles.DetailsGridLabel}>Resource:</div>
              <div className={styles.DetailsGridLongValue}>{promiseName}</div>
            </>
          )}
          <div className={styles.DetailsGridLabel}>Status:</div>
          <div>{resolution}</div>
          <div className={styles.DetailsGridLabel}>Timestamp:</div>
          <div>{formatTimestamp(timestamp)}</div>
          {duration !== null && (
            <>
              <div className={styles.DetailsGridLabel}>Duration:</div>
              <div>{formatDuration(duration)}</div>
            </>
          )}
        </div>
      </div>
      {warning !== null && (
        <div className={styles.TooltipWarningSection}>
          <div className={styles.WarningText}>{warning}</div>
        </div>
      )}
    </>
  );
};

const TooltipReactMeasure = ({
  data,
  measure,
}: {
  data: TimelineData,
  measure: ReactMeasure,
}) => {
  const label = getReactMeasureLabel(measure.type);
  if (!label) {
    if (__DEV__) {
      console.warn('Unexpected measure type "%s"', measure.type);
    }
    return null;
  }

  const {batchUID, duration, timestamp, lanes} = measure;
  const [startTime, stopTime] = getBatchRange(batchUID, data);

  const laneLabels = lanes.map(
    lane => data.laneToLabelMap.get(lane) as any as string,
  );

  return (
    <div className={styles.TooltipSection}>
      <span className={styles.ReactMeasureLabel}>{label}</span>
      <div className={styles.Divider} />
      <div className={styles.DetailsGrid}>
        <div className={styles.DetailsGridLabel}>Timestamp:</div>
        <div>{formatTimestamp(timestamp)}</div>
        {measure.type !== 'render-idle' && (
          <>
            <div className={styles.DetailsGridLabel}>Duration:</div>
            <div>{formatDuration(duration)}</div>
          </>
        )}
        <div className={styles.DetailsGridLabel}>Batch duration:</div>
        <div>{formatDuration(stopTime - startTime)}</div>
        <div className={styles.DetailsGridLabel}>
          Lane{lanes.length === 1 ? '' : 's'}:
        </div>
        <div>
          {laneLabels.length > 0
            ? `${laneLabels.join(', ')} (${lanes.join(', ')})`
            : lanes.join(', ')}
        </div>
      </div>
    </div>
  );
};

const TooltipUserTimingMark = ({mark}: {mark: UserTimingMark}) => {
  const {name, timestamp} = mark;
  return (
    <div className={styles.TooltipSection}>
      <span className={styles.UserTimingLabel}>{name}</span>
      <div className={styles.Divider} />
      <div className={styles.DetailsGrid}>
        <div className={styles.DetailsGridLabel}>Timestamp:</div>
        <div>{formatTimestamp(timestamp)}</div>
      </div>
    </div>
  );
};

const TooltipThrownError = ({thrownError}: {thrownError: ThrownError}) => {
  const {componentName, message, phase, timestamp} = thrownError;
  const label = `threw an error during ${phase}`;
  return (
    <div className={styles.TooltipSection}>
      {componentName && (
        <span className={styles.ComponentName}>
          {trimString(componentName, 100)}
        </span>
      )}
      <span className={styles.UserTimingLabel}>{label}</span>
      <div className={styles.Divider} />
      <div className={styles.DetailsGrid}>
        <div className={styles.DetailsGridLabel}>Timestamp:</div>
        <div>{formatTimestamp(timestamp)}</div>
        {message !== '' && (
          <>
            <div className={styles.DetailsGridLabel}>Error:</div>
            <div>{message}</div>
          </>
        )}
      </div>
    </div>
  );
};
