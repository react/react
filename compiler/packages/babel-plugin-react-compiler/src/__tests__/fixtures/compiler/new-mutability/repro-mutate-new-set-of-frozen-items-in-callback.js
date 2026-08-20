// @enableNewMutationAliasingModel:true

export const App = () => {
  const [selected, setSelected] = useState(new Set<string>());
  const onSelectedChange = (value: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(value)) {
      // This should not count as a mutation of `selected`
      newSelected.delete(value);
    } else {
      // This should not count as a mutation of `selected`
      newSelected.add(value);
    }
    setSelected(newSelected);
  };

  return <Stringify selected={selected} onSelectedChange={onSelectedChange} />;
};
