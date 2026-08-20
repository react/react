function Component(props) {
  return props.post.feedback.comments?.edges?.map(render);
}
