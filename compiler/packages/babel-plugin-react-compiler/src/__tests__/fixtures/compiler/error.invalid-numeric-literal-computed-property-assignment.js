// Computed property assignment with numeric literals should use
// precise_value() to avoid float precision loss from JSON parsing.

function Component({obj}) {
  obj[0] = 'first';
  obj[1] = 'second';
  return obj;
}
