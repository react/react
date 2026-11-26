import {useState} from 'react';

function createFormatter(locale) {
  return items => `${locale}:${items.length}`;
}

function useQuery() {
  return {data: {name: 'Ada'}};
}

const EMPTY = [];

function DefaultLiteral({items = [], locale}) {
  const [count] = useState(0);
  const formatter = createFormatter(locale);
  return (
    <div>
      {formatter(items)}
      {count}
    </div>
  );
}

function DefaultHoisted({items = EMPTY, locale}) {
  const [count] = useState(0);
  const formatter = createFormatter(locale);
  return (
    <div>
      {formatter(items)}
      {count}
    </div>
  );
}

function NoDefault({items, locale}) {
  const [count] = useState(0);
  const formatter = createFormatter(locale);
  return (
    <div>
      {formatter(items)}
      {count}
    </div>
  );
}

function HookDefault(props) {
  const {
    data: {user} = {},
  } = useQuery();
  const [count] = useState(0);
  const formatter = createFormatter(props.locale);
  return (
    <div>
      {formatter(user)}
      {count}
    </div>
  );
}

function ObjectArgDefault({items = [], count}) {
  const [ignored] = useState(0);
  return <div>{format({items, count: count + ignored})}</div>;
}

function format(value) {
  return value.items.length + value.count;
}

export const FIXTURE_ENTRYPOINT = {
  fn: DefaultLiteral,
  params: [{items: ['a'], locale: 'en'}],
};
