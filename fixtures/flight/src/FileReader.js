export default async function FileReader() {
  // This debug string is below the threshold for debug string length, so its
  // value is sent to the client as the awaited value.
  await new Promise(resolve => {
    setTimeout(() => resolve('o'.repeat(1000000)), 1);
  });

  // This debug string is above the threshold for debug string length, so the
  // client receives a placeholder as the awaited value instead of the actual
  // string.
  await new Promise(resolve => {
    setTimeout(() => resolve('x'.repeat(1000001)), 1);
  });

  return <p>FileReader</p>;
}
