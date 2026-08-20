import Fixture from '../../Fixture';
import FixtureSet from '../../FixtureSet';
import TestCase from '../../TestCase';

const React = window.React;
const ReactDOM = window.ReactDOM;

const Suspense = React.Suspense;

let cache = new Set();

function AsyncStep({text, ms}) {
  if (!cache.has(text)) {
    throw new Promise(resolve =>
      setTimeout(() => {
        cache.add(text);
        resolve();
      }, ms)
    );
  }
  return null;
}

let suspendyTreeIdCounter = 0;
class SuspendyTreeChild extends React.Component {
  id = suspendyTreeIdCounter++;
  state = {
    step: 1,
    isHidden: false,
  };
  increment = () => this.setState(s => ({step: s.step + 1}));

  componentDidMount() {
    document.addEventListener('keydown', this.onKeydown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeydown);
  }

  onKeydown = event => {
    if (event.metaKey && event.key === 'Enter') {
      this.increment();
    }
  };

  render() {
    return (
      <>
        <Suspense fallback={<div>(display: none)</div>}>
          <div>
            <AsyncStep text={`${this.state.step} + ${this.id}`} ms={500} />
            {this.props.children}
          </div>
        </Suspense>
        <button onClick={this.increment}>Hide</button>
      </>
    );
  }
}

class SuspendyTree extends React.Component {
  parentContainer = React.createRef(null);
  container = React.createRef(null);
  componentDidMount() {
    this.setState({});
    document.addEventListener('keydown', this.onKeydown);
  }
  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeydown);
  }
  onKeydown = event => {
    if (event.metaKey && event.key === '/') {
      this.removeAndRestore();
    }
  };
  removeAndRestore = () => {
    const parentContainer = this.parentContainer.current;
    const container = this.container.current;
    parentContainer.removeChild(container);
    parentContainer.textContent = '(removed from DOM)';
    setTimeout(() => {
      parentContainer.textContent = '';
      parentContainer.appendChild(container);
    }, 500);
  };
  render() {
    return (
      <>
        <div ref={this.parentContainer}>
          <div ref={this.container} />
        </div>
        <div>
          {this.container.current !== null
            ? ReactDOM.createPortal(
                <>
                  <SuspendyTreeChild>{this.props.children}</SuspendyTreeChild>
                  <button onClick={this.removeAndRestore}>Remove</button>
                </>,
                this.container.current
              )
            : null}
        </div>
      </>
    );
  }
}

class TextInputFixtures extends React.Component {
  render() {
    return (
      <FixtureSet
        title="Suspense"
        description="Preserving the state of timed-out children">
        <p>
          Clicking "Hide" will hide the fixture context using{' '}
          <code>display: none</code> for 0.5 seconds, then restore. This is the
          built-in behavior for timed-out children. Each fixture tests whether
          the state of the DOM is preserved. Clicking "Remove" will remove the
          fixture content from the DOM for 0.5 seconds, then restore. This is{' '}
          <strong>not</strong> how timed-out children are hidden, but is
          included for comparison purposes.
        </p>
        <div className="footnote">
          As a shortcut, you can use Command + Enter (or Control + Enter on
          Windows, Linux) to "Hide" all the fixtures, or Command + / to "Remove"
          them.
        </div>
        <TestCase title="Text selection where entire range times out">
          <TestCase.Steps>
            <li>Use your cursor to select the text below.</li>
            <li>Click "Hide" or "Remove".</li>
          </TestCase.Steps>

          <TestCase.ExpectedResult>
            Text selection is preserved when hiding, but not when removing.
          </TestCase.ExpectedResult>

          <Fixture>
            <SuspendyTree>
              Select this entire sentence (and only this sentence).
            </SuspendyTree>
          </Fixture>
        </TestCase>
        <TestCase title="Text selection that extends outside timed-out subtree">
          <TestCase.Steps>
            <li>
              Use your cursor to select a range that includes both the text and
              the "Go" button.
            </li>
            <li>Click "Hide" or "Remove".</li>
          </TestCase.Steps>

          <TestCase.ExpectedResult>
            Text selection is preserved when hiding, but not when removing.
          </TestCase.ExpectedResult>

          <Fixture>
            <SuspendyTree>
              Select a range that includes both this sentence and the "Go"
              button.
            </SuspendyTree>
          </Fixture>
        </TestCase>
        <TestCase title="Focus">
          <TestCase.Steps>
            <li>
              Use your cursor to select a range that includes both the text and
              the "Go" button.
            </li>
            <li>
              Instead of clicking "Go", which switches focus, press Command +
              Enter (or Control + Enter on Windows, Linux).
            </li>
          </TestCase.Steps>

          <TestCase.ExpectedResult>
            The ideal behavior is that the focus would not be lost, but
            currently it is (both when hiding and removing).
          </TestCase.ExpectedResult>

          <Fixture>
            <SuspendyTree>
              <button>Focus me</button>
            </SuspendyTree>
          </Fixture>
        </TestCase>
        <TestCase title="Uncontrolled form input">
          <TestCase.Steps>
            <li>Type something ("Hello") into the text input.</li>
            <li>Click "Hide" or "Remove".</li>
          </TestCase.Steps>

          <TestCase.ExpectedResult>
            Input is preserved when hiding, but not when removing.
          </TestCase.ExpectedResult>

          <Fixture>
            <SuspendyTree>
              <input type="text" />
            </SuspendyTree>
          </Fixture>
        </TestCase>
        <TestCase title="Image flicker">
          <TestCase.Steps>
            <li>Click "Hide" or "Remove".</li>
          </TestCase.Steps>

          <TestCase.ExpectedResult>
            The image should reappear without flickering. The text should not
            reflow.
          </TestCase.ExpectedResult>

          <Fixture>
            <SuspendyTree>
              <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Atom.png" />
              React is cool
            </SuspendyTree>
          </Fixture>
        </TestCase>
        <TestCase title="Iframe">
          <TestCase.Steps>
            <li>
              The iframe shows a nested version of this fixtures app. Navigate
              to the "Text inputs" page.
            </li>
            <li>Select one of the checkboxes.</li>
            <li>Click "Hide" or "Remove".</li>
          </TestCase.Steps>

          <TestCase.ExpectedResult>
            When removing, the iframe is reloaded. When hiding, the iframe
            should still be on the "Text inputs" page. The checkbox should still
            be checked. (Unfortunately, scroll position is lost.)
          </TestCase.ExpectedResult>

          <Fixture>
            <SuspendyTree>
              <iframe width="500" height="300" src="/" />
            </SuspendyTree>
          </Fixture>
        </TestCase>
        <TestCase title="Video playback">
          <TestCase.Steps>
            <li>Start playing the video, or seek to a specific position.</li>
            <li>Click "Hide" or "Remove".</li>
          </TestCase.Steps>

          <TestCase.ExpectedResult>
            The playback position should stay the same. When hiding, the video
            plays in the background for the entire duration. When removing, the
            video stops playing, but the position is not lost.
          </TestCase.ExpectedResult>

          <Fixture>
            <SuspendyTree>
              <video controls>
                <source
                  src="http://techslides.com/demos/sample-videos/small.webm"
                  type="video/webm"
                />
                <source
                  src="http://techslides.com/demos/sample-videos/small.ogv"
                  type="video/ogg"
                />
                <source
                  src="http://techslides.com/demos/sample-videos/small.mp4"
                  type="video/mp4"
                />
                <source
                  src="http://techslides.com/demos/sample-videos/small.3gp"
                  type="video/3gp"
                />
              </video>
            </SuspendyTree>
          </Fixture>
        </TestCase>
        <TestCase title="Audio playback">
          <TestCase.Steps>
            <li>Start playing the audio, or seek to a specific position.</li>
            <li>Click "Hide" or "Remove".</li>
          </TestCase.Steps>

          <TestCase.ExpectedResult>
            The playback position should stay the same. When hiding, the audio
            plays in the background for the entire duration. When removing, the
            audio stops playing, but the position is not lost.
          </TestCase.ExpectedResult>
          <Fixture>
            <SuspendyTree>
              <audio controls={true}>
                <source src="https://upload.wikimedia.org/wikipedia/commons/e/ec/Mozart_K448.ogg" />
              </audio>
            </SuspendyTree>
          </Fixture>
        </TestCase>
        <TestCase title="Scroll position">
          <TestCase.Steps>
            <li>Scroll to a position in the list.</li>
            <li>Click "Hide" or "Remove".</li>
          </TestCase.Steps>

          <TestCase.ExpectedResult>
            Scroll position is preserved when hiding, but not when removing.
          </TestCase.ExpectedResult>
          <Fixture>
            <SuspendyTree>
              <div style={{height: 200, overflow: 'scroll'}}>
                {Array(20)
                  .fill()
                  .map((_, i) => (
                    <h2 key={i}>{i + 1}</h2>
                  ))}
              </div>
            </SuspendyTree>
          </Fixture>
        </TestCase>
      </FixtureSet>
    );
  }
}

export default TextInputFixtures;
