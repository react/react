function Component(props) {
  const start = performance.now();
  const now = Date.now();
  const time = performance.now() - start;
  return (
    <div>
      rendering took {time} at {now}
    </div>
  );
}
