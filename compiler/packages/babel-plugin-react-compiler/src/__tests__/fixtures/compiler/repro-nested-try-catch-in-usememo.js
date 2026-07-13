// @compilationMode:"infer"
import {useMemo} from 'react';

function useFoo(text) {
  return useMemo(() => {
    try {
      let formattedText = '';
      try {
        formattedText = format(text);
      } catch {
        formattedText = text;
      }
      return formattedText || '';
    } catch (e) {
      return '';
    }
  }, [text]);
}

function format(text) {
  return text.toUpperCase();
}

function Foo({text}) {
  const result = useFoo(text);
  return <span>{result}</span>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{text: 'hello'}],
  sequentialRenders: [
    {text: 'hello'},
    {text: 'hello'},
    {text: 'world'},
    {text: ''},
  ],
};
