let pending = 'value';

function Component() {
  const handleClick = () => {
    const copy = pending;
    pending = null;
    console.log(copy);
  };
  return <button onClick={handleClick}>Click</button>;
}
