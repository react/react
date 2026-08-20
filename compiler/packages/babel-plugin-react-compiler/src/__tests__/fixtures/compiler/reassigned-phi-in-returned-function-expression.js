function Component(props) {
  return () => {
    let str;
    if (arguments.length) {
      str = arguments[0];
    } else {
      str = props.str;
    }
    global.log(str);
  };
}
