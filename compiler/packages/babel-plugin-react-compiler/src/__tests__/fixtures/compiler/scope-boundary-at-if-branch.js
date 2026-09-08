function Component(props) {
  const label = <span>Label</span>;
  if (props.type === 'link') {
    const uri = createURI(props.id);
    return (
      <a
        href={uri.toString()}
        onClick={e => {
          e.preventDefault();
          uri.navigate();
        }}>
        {label}
      </a>
    );
  } else {
    return <>{label}</>;
  }
}
