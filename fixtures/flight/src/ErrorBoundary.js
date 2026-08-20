'use client';

import * as React from 'react';

export default class ErrorBoundary extends React.Component {
  state = {error: null};
  static getDerivedStateFromError(error) {
    return {error};
  }
  render() {
    if (this.state.error) {
      return <div>Caught an error: {this.state.error.message}</div>;
    }
    return this.props.children;
  }
}
