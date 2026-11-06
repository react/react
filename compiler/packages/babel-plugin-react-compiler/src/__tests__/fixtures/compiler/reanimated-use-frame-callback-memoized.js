// @enableCustomTypeDefinitionForReanimated
import {useCallback} from 'react';
import {useFrameCallback} from 'react-native-reanimated';

/**
 * useFrameCallback registers its callback in an effect keyed on the
 * callback's identity, so the callback must stay memoized: a new function on
 * every render re-registers it and restarts `timeSinceFirstFrame`.
 * https://github.com/react/react/issues/37790
 */
function useGlowClock(time) {
  const onFrame = useCallback(
    frameInfo => {
      time.set(frameInfo.timeSinceFirstFrame);
    },
    [time]
  );
  useFrameCallback(onFrame);
}
