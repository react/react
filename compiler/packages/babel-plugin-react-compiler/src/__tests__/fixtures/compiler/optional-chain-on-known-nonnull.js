// @enablePropagateDepsInHIR
function Component({data}) {
  const geography = nullthrows(data.details);
  const section = geography.sections?.nodes[0];
  const geoCountry = geography?.country ?? geography?.stateCountry;
  const getTriggerType = () => {
    if (geoCountry != null) {
      return 'COUNTRY';
    }
    if (geography?.region != null) {
      return 'REGION';
    }
    return 'GLOBAL';
  };
  const conditions = geography?.conditions?.nodes ?? [];
  const [name, setName] = useState(section?.name);
  const [isSaving, setIsSaving] = useState(false);
  const triggerType = getTriggerType();

  const controls =
    geography?.controls?.nodes.map(c => ({
      title: c.name ?? '',
      uniqueID: c.id ?? '',
    })) ?? [];

  const handleSubmit = () => {
    setIsSaving(true);
    mutate({
      geography_id: nullthrows(geography?.id),
      section_id: section?.id,
      name,
      triggerType,
      controls,
    });
  };

  return (
    <div onClick={handleSubmit}>
      {name}
      {geoCountry}
      {conditions}
    </div>
  );
}
