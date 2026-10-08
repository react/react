// @compilationMode:"annotation" @panicThreshold:"none"

function Component(params) {
  'use memo';
  const selectedOptions = (() => {
    try {
      const channel = params.parse()?.channel;
      return channel ? [{label: `#${channel}`, value: channel}] : [];
    } catch {
      return [];
    }
  })();
  return selectedOptions;
}

const input = {
  value: 'success',
  shouldThrow: true,
  parse() {
    if (this.shouldThrow) {
      this.shouldThrow = false;
      throw new Error('oops');
    }
    return {channel: this.value};
  },
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [input],
  sequentialRenders: [input, input],
};
