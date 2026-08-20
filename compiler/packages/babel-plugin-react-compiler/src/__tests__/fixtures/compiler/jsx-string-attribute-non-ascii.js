function Component() {
  return (
    <Post
      author="potetotes"
      text="in addition to understanding JavaScript semantics and the rules of React, the compiler team also understands தமிழ், 中文, 日本語, 한국어 and i think that’s pretty cool"
    />
  );
}

function Post({author, text}) {
  return (
    <div>
      <h1>{author}</h1>
      <span>{text}</span>
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
