
## Input

```javascript
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

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR
function Component(t0) {
  const $ = _c(12);
  const { data } = t0;
  const geography = nullthrows(data.details);
  const section = geography.sections?.nodes[0];
  const geoCountry = geography?.country ?? geography?.stateCountry;
  const getTriggerType = () => {
    if (geoCountry != null) {
      return "COUNTRY";
    }

    if (geography?.region != null) {
      return "REGION";
    }

    return "GLOBAL";
  };

  const conditions = geography?.conditions?.nodes ?? [];
  const [name] = useState(section?.name);
  const [, setIsSaving] = useState(false);
  const triggerType = getTriggerType();

  const controls = geography?.controls?.nodes.map(_temp) ?? [];
  let t1;
  if (
    $[0] !== controls ||
    $[1] !== geography?.id ||
    $[2] !== name ||
    $[3] !== section?.id ||
    $[4] !== setIsSaving ||
    $[5] !== triggerType
  ) {
    t1 = () => {
      setIsSaving(true);
      mutate({
        geography_id: nullthrows(geography?.id),
        section_id: section?.id,
        name,
        triggerType,
        controls,
      });
    };
    $[0] = controls;
    $[1] = geography?.id;
    $[2] = name;
    $[3] = section?.id;
    $[4] = setIsSaving;
    $[5] = triggerType;
    $[6] = t1;
  } else {
    t1 = $[6];
  }
  const handleSubmit = t1;
  let t2;
  if (
    $[7] !== conditions ||
    $[8] !== geoCountry ||
    $[9] !== handleSubmit ||
    $[10] !== name
  ) {
    t2 = (
      <div onClick={handleSubmit}>
        {name}
        {geoCountry}
        {conditions}
      </div>
    );
    $[7] = conditions;
    $[8] = geoCountry;
    $[9] = handleSubmit;
    $[10] = name;
    $[11] = t2;
  } else {
    t2 = $[11];
  }
  return t2;
}
function _temp(c) {
  return { title: c.name ?? "", uniqueID: c.id ?? "" };
}

```
      
### Eval output
(kind: exception) Fixture not implemented