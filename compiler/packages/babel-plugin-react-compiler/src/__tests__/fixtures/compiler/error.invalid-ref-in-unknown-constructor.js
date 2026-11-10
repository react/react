// @validateNoRefAccessInRender

function Component({Observer}) {
  const ref = useRef(null);
  return new Observer(ref);
}
