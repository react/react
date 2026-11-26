// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component({status}) {
  const request = useRef(null);
  const response = useRef(null);
  const pending = request;
  pending.current ?? (response['current'] = {status});
  return response;
}
