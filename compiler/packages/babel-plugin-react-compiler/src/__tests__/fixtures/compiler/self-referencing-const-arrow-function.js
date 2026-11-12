function Component(props) {
  useEffect(() => {
    const pathMap = new Map();
    const collectPaths = obj => {
      if (obj != null && typeof obj === 'object') {
        if (Array.isArray(obj)) {
          obj.forEach(item => collectPaths(item));
        } else {
          Object.values(obj).forEach(value => collectPaths(value));
        }
      }
    };
    collectPaths(props.data);
  }, [props.data]);
  return <div />;
}
