export const Badge = ({variant = "primary", ...rest}) => {
  const className = `badge badge-${variant}`;
  return <div className={className} {...rest} />;
};

export const FIXTURE_ENTRYPOINT = {
  fn: Badge,
  params: [{variant: undefined, title: "Hello"}],
  isComponent: true,
};
