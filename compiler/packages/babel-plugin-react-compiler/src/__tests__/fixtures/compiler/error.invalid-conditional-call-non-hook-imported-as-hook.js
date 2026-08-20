import {makeArray as useArray} from 'other';

function Component(props) {
  let data;
  if (props.cond) {
    data = useArray();
  }
  return data;
}
