import FixtureSet from '../../FixtureSet';
import TestCase from '../../TestCase';

const React = window.React;
const ReactDOM = window.ReactDOM;
const ReactDOMClient = window.ReactDOMClient;

class ControlledSelect extends React.Component {
  constructor(props) {
    super(props);
    this.state = {value: 'bar'};
  }

  handleChange = event => {
    this.setState({value: event.target.value});
  };

  render() {
    return (
      <select value={this.state.value} onChange={this.handleChange}>
        <option value="foo">foo</option>
        <option value="bar">bar</option>
        <option value="baz">baz</option>
      </select>
    );
  }
}

class SelectFixture extends React.Component {
  state = {value: ''};
  _nestedDOMNode = null;
  _singleFormDOMNode = null;
  _multipleFormDOMNode = null;

  onChange = event => {
    this.setState({value: event.target.value});
  };

  resetSingleOptionForm = event => {
    event.preventDefault();
    this._singleFormDOMNode.reset();
  };

  resetMultipleOptionForm = event => {
    event.preventDefault();
    this._multipleFormDOMNode.reset();
  };

  componentDidMount() {
    this._renderNestedSelect();
  }

  componentDidUpdate() {
    this._renderNestedSelect();
  }

  _renderNestedSelect() {
    const element = (
      <select value={this.state.value} onChange={this.onChange}>
        <option value="">Select a color</option>
        <option value="red">Red</option>
        <option value="blue">Blue</option>
        <option value="green">Green</option>
      </select>
    );
    const container = this._nestedDOMNode;
    if (ReactDOMClient === undefined) {
      ReactDOM.render(element, container);
    } else {
      const root = ReactDOMClient.createRoot(container);
      // eslint-disable-next-line no-undef -- queueMicrotask is supported in modern browsers
      queueMicrotask(
        ReactDOM.flushSync.bind(null, root.render.bind(root, element))
      );
    }
  }

  render() {
    return (
      <FixtureSet title="Selects">
        <form className="field-group">
          <fieldset>
            <legend>Controlled</legend>
            <select value={this.state.value} onChange={this.onChange}>
              <option value="">Select a color</option>
              <option value="red">Red</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
            </select>
            <span className="hint">Value: {this.state.value}</span>
          </fieldset>
          <fieldset>
            <legend>Uncontrolled</legend>
            <select defaultValue="">
              <option value="">Select a color</option>
              <option value="red">Red</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
            </select>
          </fieldset>
          <fieldset>
            <legend>Controlled in nested subtree</legend>
            <div ref={node => (this._nestedDOMNode = node)} />
            <span className="hint">
              This should synchronize in both direction with the "Controlled".
            </span>
          </fieldset>
        </form>

        <TestCase title="A selected disabled option" relatedIssues="2803">
          <TestCase.Steps>
            <li>Open the select</li>
            <li>Select "1"</li>
            <li>Attempt to reselect "Please select an item"</li>
          </TestCase.Steps>

          <TestCase.ExpectedResult>
            The initial picked option should be "Please select an item", however
            it should not be a selectable option.
          </TestCase.ExpectedResult>

          <div className="test-fixture">
            <select defaultValue="">
              <option value="" disabled>
                Please select an item
              </option>
              <option>0</option>
              <option>1</option>
              <option>2</option>
            </select>
          </div>
        </TestCase>

        <TestCase title="An unselected disabled option" relatedIssues="2803">
          <TestCase.ExpectedResult>
            The initial picked option value should "0": the first non-disabled
            option.
          </TestCase.ExpectedResult>

          <div className="test-fixture">
            <select defaultValue="">
              <option disabled>Please select an item</option>
              <option>0</option>
              <option>1</option>
              <option>2</option>
            </select>
          </div>
        </TestCase>

        <TestCase title="A single select being reset">
          <TestCase.Steps>
            <li>Open the select</li>
            <li>Select "baz" or "foo"</li>
            <li>Click the "Reset" button</li>
          </TestCase.Steps>
          <TestCase.ExpectedResult>
            The select should be reset to the initial value, "bar"
          </TestCase.ExpectedResult>

          <div className="test-fixture">
            <form ref={n => (this._singleFormDOMNode = n)}>
              <select defaultValue="bar">
                <option value="foo">foo</option>
                <option value="bar">bar</option>
                <option value="baz">baz</option>
              </select>
              <button onClick={this.resetSingleOptionForm}>Reset</button>
            </form>
          </div>
        </TestCase>

        <TestCase title="A multiple select being reset">
          <TestCase.Steps>
            <li>Select any combination of options</li>
            <li>Click the "Reset" button</li>
          </TestCase.Steps>
          <TestCase.ExpectedResult>
            The select should be reset to the initial values "foo" and "baz"
          </TestCase.ExpectedResult>

          <div className="test-fixture">
            <form ref={n => (this._multipleFormDOMNode = n)}>
              <select multiple defaultValue={['foo', 'baz']}>
                <option value="foo">foo</option>
                <option value="bar">bar</option>
                <option value="baz">baz</option>
              </select>
              <button onClick={this.resetMultipleOptionForm}>Reset</button>
            </form>
          </div>
        </TestCase>

        <TestCase title="A multiple select being scrolled to first selected option">
          <TestCase.ExpectedResult>
            First selected option should be visible
          </TestCase.ExpectedResult>

          <div className="test-fixture">
            <form>
              <select multiple defaultValue={['tiger']}>
                <option value="gorilla">gorilla</option>
                <option value="giraffe">giraffe</option>
                <option value="monkey">monkey</option>
                <option value="lion">lion</option>
                <option value="mongoose">mongoose</option>
                <option value="tiger">tiger</option>
              </select>
            </form>
          </div>
        </TestCase>

        <TestCase
          title="An option which contains conditional render fails"
          relatedIssues="11911">
          <TestCase.Steps>
            <li>Select any option</li>
          </TestCase.Steps>
          <TestCase.ExpectedResult>
            Option should be set
          </TestCase.ExpectedResult>

          <div className="test-fixture">
            <select value={this.state.value} onChange={this.onChange}>
              <option value="red">
                red {this.state.value === 'red' && 'is chosen '} TextNode
              </option>
              <option value="blue">
                blue {this.state.value === 'blue' && 'is chosen '} TextNode
              </option>
              <option value="green">
                green {this.state.value === 'green' && 'is chosen '} TextNode
              </option>
            </select>
          </div>
        </TestCase>

        <TestCase
          title="A select with the size attribute should not set first option as selected"
          relatedIssues="14239"
          introducedIn="16.0.0">
          <TestCase.ExpectedResult>
            No options should be selected.
          </TestCase.ExpectedResult>

          <div className="test-fixture">
            <select size="3">
              <option>0</option>
              <option>1</option>
              <option>2</option>
            </select>
          </div>

          <p className="footnote">
            <b>Notes:</b> This happens if <code>size</code> is assigned after
            options are selected. The select element picks the first item by
            default, then it is expanded to show more options when{' '}
            <code>size</code> is assigned, preserving the default selection.
          </p>
          <p className="footnote">
            This was introduced in React 16.0.0 when options were added before
            select attribute assignment.
          </p>
        </TestCase>

        <TestCase
          title="A controlled select should keep its value on form reset"
          relatedIssues="30580"
          introducedIn="?">
          <TestCase.ExpectedResult>
            No options should be selected.
          </TestCase.ExpectedResult>

          <div className="test-fixture">
            <form>
              <ControlledSelect />
              <input type="reset" />
            </form>
          </div>

          <p className="footnote">
            <b>Notes:</b> <code>form.reset()</code> resets each associated form
            element to its default value. For HTMLInputElement that's the value
            attribute. For HTMLSELECTElement it's option with defaultSelected
            set to true.
          </p>
          <p className="footnote">
            Bug became more pressing when React introduced automatic form reset.
          </p>
        </TestCase>
      </FixtureSet>
    );
  }
}

export default SelectFixture;
