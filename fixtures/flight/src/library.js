export async function sdkMethod(input, init) {
  return fetch(input, init).then(async response => {
    await new Promise(resolve => {
      setTimeout(resolve, 10);
    });

    return response;
  });
}
