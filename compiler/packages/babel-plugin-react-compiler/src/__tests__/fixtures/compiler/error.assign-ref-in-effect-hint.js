// Fixture to test that we show a hint to name as `ref` or `-Ref` when attempting
// to assign .current inside an effect
function Component({foo}) {
  useEffect(() => {
    foo.current = true;
  }, [foo]);
}
