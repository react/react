'use server';

let serverCounter = 0;

export async function getServerCounter() {
  return serverCounter;
}

export async function changeServerCounter(change: number) {
  serverCounter += change;
}

export async function resetServerCounter() {
  serverCounter = 0;
}
