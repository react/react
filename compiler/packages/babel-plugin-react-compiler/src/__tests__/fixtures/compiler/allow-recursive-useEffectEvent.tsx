import {useEffect, useEffectEvent, useState} from 'react';

function TimerBasedComponent(props) {
  const repeatEvent = useEffectEvent(() => {
    props.onRepeat();
    setTimeout(() => {
      repeatEvent();
    }, 60);
  });

  const [down, setDown] = useState(false);
  useEffect(() => {
    if (down) {
      repeatEvent();
    }
  }, [down]);

  return <button onClick={() => setDown(!down)} />;
}
