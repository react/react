'use server';

import {setServerState} from './ServerState.js';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function like() {
  // Test loading state
  await sleep(1000);
  setServerState('Liked!');
  return new Promise((resolve, reject) => resolve('Liked'));
}

export async function greet(formData) {
  const name = formData.get('name') || 'you';
  setServerState('Hi ' + name);
  const file = formData.get('file');
  if (file) {
    return `Ok, ${name}, here is ${file.name}:
      ${(await file.text()).toUpperCase()}
    `;
  }
  return 'Hi ' + name + '!';
}

export async function increment(n) {
  // Test loading state
  await sleep(1000);
  return n + 1;
}
