// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component({resourceKey, compact, enabled}) {
  const resource = useRef();
  const quota = useRef(null);
  const handle = resource;
  handle.current ??= {key: resourceKey, view: compact ? 'compact' : 'full'};
  quota['current'] ??= enabled ? 0 : 8;
  return <InspectResource resource={resource} quota={quota} />;
}

function InspectResource({resource, quota}) {
  'use no memo';
  return `${resource.current.key}/${resource.current.view}/${quota.current}`;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{resourceKey: 'first', compact: true, enabled: true}],
  sequentialRenders: [
    {resourceKey: 'first', compact: true, enabled: true},
    {resourceKey: 'second', compact: false, enabled: false},
  ],
};
