'use client';

import {createContext, use} from 'react';

const ClientContext = createContext(null);

function ClientReadContext() {
  const value = use(ClientContext);
  return <p>{value}</p>;
}

export {ClientContext, ClientReadContext};
