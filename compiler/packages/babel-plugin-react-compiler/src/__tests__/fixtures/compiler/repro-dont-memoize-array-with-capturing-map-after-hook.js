import {useEffect, useState} from 'react';
import {mutate} from 'shared-runtime';

function Component(props) {
  const x = [{...props.value}];
  useEffect(() => {}, []);
  const onClick = () => {
    console.log(x.length);
  };
  let y;
  return (
    <div onClick={onClick}>
      {x.map(item => {
        y = item;
        return <span key={item.id}>{item.text}</span>;
      })}
      {mutate(y)}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: {id: 0, text: 'Hello!'}}],
  isComponent: true,
};
