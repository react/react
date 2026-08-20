function Component(props) {
  switch (props.value) {
    case Global.Property: {
      return true;
    }
    default: {
      return false;
    }
  }
}
