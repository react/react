module.exports = {
  baseUrl: '.',
  name: 'input',
  out: 'output.js',
  optimize: 'none',
  paths: {
    react: '../../../../build/oss-experimental/react/umd/react.development',
    'react-dom':
      '../../../../build/oss-experimental/react-dom/umd/react-dom.development',
    schedule:
      '../../../../build/oss-experimental/scheduler/umd/schedule.development',
  },
};
