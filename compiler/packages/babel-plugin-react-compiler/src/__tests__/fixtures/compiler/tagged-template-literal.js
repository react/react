function component() {
  let t = graphql`
    fragment F on T {
      id
    }
  `;

  return t;
}
