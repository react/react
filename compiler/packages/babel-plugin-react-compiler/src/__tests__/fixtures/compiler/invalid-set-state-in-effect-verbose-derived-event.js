// @validateNoSetStateInEffects @enableVerboseNoSetStateInEffect
import {useState, useEffect} from 'react';

function VideoPlayer({isPlaying}) {
  const [wasPlaying, setWasPlaying] = useState(isPlaying);
  useEffect(() => {
    if (isPlaying !== wasPlaying) {
      setWasPlaying(isPlaying);
      console.log('Play state changed!');
    }
  }, [isPlaying, wasPlaying]);
  return <video />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: VideoPlayer,
  params: [{isPlaying: true}],
};
