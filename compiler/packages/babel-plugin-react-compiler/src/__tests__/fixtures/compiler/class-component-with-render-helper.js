// @expectNothingCompiled @compilationMode:"infer"
class Component {
  _renderMessage = () => {
    const Message = () => {
      const message = this.state.message;
      return <div>{message}</div>;
    };
    return <Message />;
  };

  render() {
    return this._renderMessage();
  }
}
