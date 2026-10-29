const React = window.React;

function csv(string) {
  return string.split(/\s*,\s*/);
}

export default function IssueList({issues}) {
  if (!issues) {
    return null;
  }

  if (typeof issues === 'string') {
    issues = csv(issues);
  }

  let links = issues.reduce((memo, issue, i) => {
    return memo.concat(
      i > 0 && i < issues.length ? ', ' : null,
      <a href={'https://github.com/react/react/issues/' + issue} key={issue}>
        {issue}
      </a>
    );
  }, []);

  return <span>{links}</span>;
}
