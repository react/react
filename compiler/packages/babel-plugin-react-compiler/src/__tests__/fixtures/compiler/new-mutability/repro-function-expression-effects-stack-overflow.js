function Component() {
  const x = {};
  const fn = () => {
    new Object()
      .build(x)
      .build({})
      .build({})
      .build({})
      .build({})
      .build({})
      .build({});
  };
  return <Stringify x={x} fn={fn} />;
}
