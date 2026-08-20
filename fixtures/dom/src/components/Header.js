import {parse, stringify} from 'query-string';
import VersionPicker from './VersionPicker';

const React = window.React;

class Header extends React.Component {
  constructor(props, context) {
    super(props, context);
    const query = parse(window.location.search);
    const version = query.version || 'local';
    const production = query.production || false;
    const versions = [version];

    this.state = {version, versions, production};
  }
  handleVersionChange(version) {
    const query = parse(window.location.search);
    query.version = version;
    if (query.version === 'local') {
      delete query.version;
    }
    window.location.search = stringify(query);
  }
  handleProductionChange(event) {
    const query = parse(window.location.search);
    query.production = event.target.checked;
    if (!query.production) {
      delete query.production;
    }
    window.location.search = stringify(query);
  }
  handleFixtureChange(event) {
    window.location.pathname = event.target.value;
  }
  render() {
    return (
      <header className="header">
        <div className="header__inner">
          <span className="header__logo">
            <img
              src={process.env.PUBLIC_URL + '/react-logo.svg'}
              alt="React"
              width="20"
              height="20"
            />
            <a href="/">
              DOM Test Fixtures (v
              {React.version})
            </a>
          </span>

          <div className="header-controls">
            <input
              id="react_production"
              className="header__checkbox"
              type="checkbox"
              checked={this.state.production}
              onChange={this.handleProductionChange}
            />
            <label htmlFor="react_production" className="header__label">
              Production
            </label>
            <label htmlFor="example">
              <span className="sr-only">Select an example</span>
              <select
                value={window.location.pathname}
                onChange={this.handleFixtureChange}>
                <option value="/">Home</option>
                <option value="/hydration">Hydration</option>
                <option value="/range-inputs">Range Inputs</option>
                <option value="/text-inputs">Text Inputs</option>
                <option value="/number-inputs">Number Input</option>
                <option value="/password-inputs">Password Input</option>
                <option value="/email-inputs">Email Input</option>
                <option value="/selects">Selects</option>
                <option value="/textareas">Textareas</option>
                <option value="/progress">Progress</option>
                <option value="/input-change-events">
                  Input change events
                </option>
                <option value="/buttons">Buttons</option>
                <option value="/date-inputs">Date Inputs</option>
                <option value="/error-handling">Error Handling</option>
                <option value="/event-pooling">Event Pooling</option>
                <option value="/custom-elements">Custom Elements</option>
                <option value="/media-events">Media Events</option>
                <option value="/pointer-events">Pointer Events</option>
                <option value="/mouse-events">Mouse Events</option>
                <option value="/selection-events">Selection Events</option>
                <option value="/suspense">Suspense</option>
                <option value="/form-actions">Form Actions</option>
                <option value="/form-state">Form State</option>
                <option value="/fragment-refs">Fragment Refs</option>
              </select>
            </label>
            <label htmlFor="global_version">
              <span className="sr-only">Select a version to test</span>
              <VersionPicker
                id="global_version"
                name="global_version"
                version={this.state.version}
                onChange={this.handleVersionChange}
              />
            </label>
          </div>
        </div>
      </header>
    );
  }
}

export default Header;
