function Component(props) {
  let x;
  try {
    throw [];
  } catch (e) {
    x.push(e);
  }
  return x;
}
