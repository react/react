import {findDOMNode} from '../../../find-dom-node';

const React = window.React;

export class CodeEditor extends React.Component {
  shouldComponentUpdate() {
    return false;
  }

  componentDidMount() {
    this.textarea = findDOMNode(this);

    // Important: CodeMirror incorrectly lays out the editor
    // if it executes before CSS has loaded
    // https://github.com/graphql/graphiql/issues/33#issuecomment-318188555
    Promise.all([
      import('codemirror'),
      import('codemirror/mode/jsx/jsx'),
      import('codemirror/lib/codemirror.css'),
      import('./codemirror-paraiso-dark.css'),
    ]).then(([CodeMirror]) => this.install(CodeMirror));
  }

  install(CodeMirror) {
    if (!this.textarea) {
      return;
    }

    const {onChange} = this.props;

    this.editor = CodeMirror.fromTextArea(this.textarea, {
      mode: 'jsx',
      theme: 'paraiso-dark',
      lineNumbers: true,
    });

    this.editor.on('change', function (doc) {
      onChange(doc.getValue());
    });
  }

  componentWillUnmount() {
    if (this.editor) {
      this.editor.toTextArea();
    }
  }

  render() {
    return (
      <textarea
        defaultValue={this.props.code}
        autoComplete="off"
        hidden={true}
      />
    );
  }
}

/**
 * Prevent IE9 from raising an error on an unrecognized element:
 * See https://github.com/facebook/react/issues/13610
 */
const supportsDetails = !(
  document.createElement('details') instanceof HTMLUnknownElement
);

export class CodeError extends React.Component {
  render() {
    const {error, className} = this.props;

    if (!error) {
      return null;
    }

    if (supportsDetails) {
      const [summary, ...body] = error.message.split(/\n+/g);

      if (body.length >= 0) {
        return <div className={className}>{summary}</div>;
      }

      return (
        <details className={className}>
          <summary>{summary}</summary>
          {body.join('\n')}
        </details>
      );
    }

    return <div className={className}>{error.message}</div>;
  }
}
