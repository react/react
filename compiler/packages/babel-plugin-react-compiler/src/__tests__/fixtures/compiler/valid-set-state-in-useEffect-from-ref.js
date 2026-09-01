// @validateNoSetStateInEffects @outputMode:"lint"
import {useState, useRef, useEffect} from 'react';

function Tooltip() {
  const ref = useRef(null);
  const [tooltipHeight, setTooltipHeight] = useState(0);

  useEffect(() => {
    const {height} = ref.current.getBoundingClientRect();
    setTooltipHeight(height);
  }, []);

  return tooltipHeight;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Tooltip,
  params: [],
};
