module.exports = {
  baseUrl: '.',
  name: 'input',
  out: 'output.js',
  optimize: 'none',
  paths: {
    react: '../../../../build/oss-experimental/react/umd/react.production.min',
    'react-dom':
      '../../../../build/oss-experimental/react-dom/umd/react-dom.production.min',
    schedule:
      '../../../../build/oss-experimental/scheduler/umd/schedule.development',
  },
};
