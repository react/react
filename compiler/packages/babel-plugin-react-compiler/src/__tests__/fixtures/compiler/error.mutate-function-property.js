export function ViewModeSelector(props) {
  const renderIcon = () => <AcceptIcon />;
  renderIcon.displayName = 'AcceptIcon';

  return <Dropdown checkableIndicator={{children: renderIcon}} />;
}
