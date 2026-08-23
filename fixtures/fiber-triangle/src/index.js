import React, {memo, startTransition, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';

// Every second, `seconds` changes in a transition. That transition has to
// re-render every dot, and each SierpinskiTriangle spins for a while to make
// the render take many frames. Meanwhile the container is rescaled by a
// synchronous update on every animation frame, which interrupts the
// transition each time.
//
// The counter at the top is the number of SierpinskiTriangle renders in the
// last second. If the interrupted transition continued from where it left
// off, it's roughly the number of triangles. If each interruption made it
// start over, it's many times that, and the dots update late or never.

const dotStyle = {
  position: 'absolute',
  background: '#61dafb',
  font: 'normal 15px sans-serif',
  textAlign: 'center',
  cursor: 'pointer',
};

const containerStyle = {
  position: 'absolute',
  transformOrigin: '0 0',
  left: '50%',
  top: '50%',
  width: '10px',
  height: '10px',
  background: '#eee',
};

const targetSize = 25;

let triangleRenders = 0;

function Dot({x, y, size, text}) {
  const [hover, setHover] = useState(false);
  const s = size * 1.3;
  const style = {
    ...dotStyle,
    width: s + 'px',
    height: s + 'px',
    left: x + 'px',
    top: y + 'px',
    borderRadius: s / 2 + 'px',
    lineHeight: s + 'px',
    background: hover ? '#ff0' : dotStyle.background,
  };
  return (
    <div
      style={style}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}>
      {hover ? '*' + text + '*' : text}
    </div>
  );
}

const SierpinskiTriangle = memo(function SierpinskiTriangle({
  x,
  y,
  s,
  children,
}) {
  triangleRenders++;
  if (s <= targetSize) {
    return (
      <Dot
        x={x - targetSize / 2}
        y={y - targetSize / 2}
        size={targetSize}
        text={children}
      />
    );
  }
  // Artificially long execution time.
  const e = performance.now() + 0.8;
  while (performance.now() < e) {}
  s /= 2;
  return (
    <>
      <SierpinskiTriangle x={x} y={y - s / 2} s={s}>
        {children}
      </SierpinskiTriangle>
      <SierpinskiTriangle x={x - s} y={y + s / 2} s={s}>
        {children}
      </SierpinskiTriangle>
      <SierpinskiTriangle x={x + s} y={y + s / 2} s={s}>
        {children}
      </SierpinskiTriangle>
    </>
  );
});

function RenderCounter() {
  const [rendersPerSecond, setRendersPerSecond] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setRendersPerSecond(triangleRenders);
      triangleRenders = 0;
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <p style={{position: 'absolute', top: 0, left: 10, font: '15px monospace'}}>
      {rendersPerSecond} triangle renders in the last second
    </p>
  );
}

function App({elapsed}) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      startTransition(() => {
        setSeconds(s => (s % 10) + 1);
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const t = (elapsed / 1000) % 10;
  const scale = 1 + (t > 5 ? 10 - t : t) / 10;
  const transform = 'scaleX(' + scale / 2.1 + ') scaleY(0.7) translateZ(0.1px)';
  return (
    <>
      <RenderCounter />
      <div style={{...containerStyle, transform}}>
        <div>
          <SierpinskiTriangle x={0} y={0} s={1000}>
            {seconds}
          </SierpinskiTriangle>
        </div>
      </div>
    </>
  );
}

const root = createRoot(document.getElementById('root'));
const start = Date.now();
function update() {
  root.render(<App elapsed={Date.now() - start} />);
  requestAnimationFrame(update);
}
requestAnimationFrame(update);
