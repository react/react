import cn from 'classnames';
import semver from 'semver';
import PropTypes from 'prop-types';
import IssueList from './IssueList';
import {parse} from 'query-string';
import {semverString} from './propTypes';

const React = window.React;

const propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.node.isRequired,
  resolvedIn: semverString,
  introducedIn: semverString,
  resolvedBy: PropTypes.string,
};

class TestCase extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      complete: false,
    };
  }

  handleChange = e => {
    this.setState({
      complete: e.target.checked,
    });
  };

  render() {
    const {
      title,
      description,
      introducedIn,
      resolvedIn,
      resolvedBy,
      affectedBrowsers,
      relatedIssues,
      children,
    } = this.props;

    let {complete} = this.state;

    const {version} = parse(window.location.search);
    const isTestFixed =
      !version || !resolvedIn || semver.gte(version, resolvedIn);

    complete = !isTestFixed || complete;

    return (
      <section className={cn('test-case', complete && 'test-case--complete')}>
        <h2 className="test-case__title type-subheading">
          <label>
            <input
              className="test-case__title__check"
              type="checkbox"
              checked={complete}
              onChange={this.handleChange}
            />{' '}
            {title}
          </label>
        </h2>

        <dl className="test-case__details">
          {introducedIn && <dt>First broken in: </dt>}
          {introducedIn && (
            <dd>
              <a href={'https://github.com/react/react/tag/v' + introducedIn}>
                <code>{introducedIn}</code>
              </a>
            </dd>
          )}

          {resolvedIn && <dt>First supported in: </dt>}
          {resolvedIn && (
            <dd>
              <a href={'https://github.com/react/react/tag/v' + resolvedIn}>
                <code>{resolvedIn}</code>
              </a>
            </dd>
          )}

          {resolvedBy && <dt>Fixed by: </dt>}
          {resolvedBy && (
            <dd>
              <a
                href={
                  'https://github.com/react/react/pull/' + resolvedBy.slice(1)
                }>
                <code>{resolvedBy}</code>
              </a>
            </dd>
          )}

          {affectedBrowsers && <dt>Affected browsers: </dt>}
          {affectedBrowsers && <dd>{affectedBrowsers}</dd>}

          {relatedIssues && <dt>Related Issues: </dt>}
          {relatedIssues && (
            <dd>
              <IssueList issues={relatedIssues} />
            </dd>
          )}
        </dl>

        <p className="test-case__desc">{description}</p>

        <div className="test-case__body">
          {!isTestFixed && (
            <p className="test-case__invalid-version">
              <strong>Note:</strong> This test case was fixed in a later version
              of React. This test is not expected to pass for the selected
              version, and that's ok!
            </p>
          )}

          {children}
        </div>
      </section>
    );
  }
}

TestCase.propTypes = propTypes;

TestCase.Steps = class extends React.Component {
  render() {
    const {children} = this.props;
    return (
      <div>
        <h3>Steps to reproduce:</h3>
        <ol>{children}</ol>
      </div>
    );
  }
};

TestCase.ExpectedResult = class extends React.Component {
  render() {
    const {children} = this.props;
    return (
      <div>
        <h3>Expected Result:</h3>
        <p>{children}</p>
      </div>
    );
  }
};
export default TestCase;
