import {useState} from 'react';
const bar = () => ({data: null});

export const useFoot = () => {
  const [, setState] = useState(null);
  try {
    const {data} = bar();
    setState({
      data,
      error: null,
    });
  } catch (err) {
    setState(_prevState => ({
      loading: false,
      error: err,
    }));
  }
};
