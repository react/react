/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import Icon from '../Icon';
import {searchGitHubIssuesURL} from './githubAPI';
import styles from './shared.css';

const LABELS = [
  'Component: Developer Tools',
  'Type: Bug',
  'Status: Unconfirmed',
];

// This must match the filename in ".github/ISSUE_TEMPLATE/"
const TEMPLATE = 'devtools_bug_report.yml';

type Props = {
  callStack: string | null,
  componentStack: string | null,
  errorMessage: string | null,
};

export default function ReportNewIssue({
  callStack,
  componentStack,
  errorMessage,
}: Props): React.Node {
  let bugURL = process.env.GITHUB_URL;
  if (!bugURL) {
    return null;
  }

  const gitHubAPISearch =
    errorMessage !== null ? searchGitHubIssuesURL(errorMessage) : '(none)';

  const title = `[DevTools Bug] ${errorMessage || ''}`;

  const parameters = [
    `template=${TEMPLATE}`,
    `labels=${encodeURIComponent(LABELS.join(','))}`,
    `title=${encodeURIComponent(title)}`,
    `automated_package=${process.env.DEVTOOLS_PACKAGE || ''}`,
    `automated_version=${process.env.DEVTOOLS_VERSION || ''}`,
    `automated_error_message=${encodeURIComponent(errorMessage || '')}`,
    `automated_call_stack=${encodeURIComponent(callStack || '')}`,
    `automated_component_stack=${encodeURIComponent(componentStack || '')}`,
    `automated_github_query_string=${gitHubAPISearch}`,
  ];

  bugURL += `/issues/new?${parameters.join('&')}`;

  return (
    <div className={styles.GitHubLinkRow}>
      <Icon className={styles.ReportIcon} type="bug" />
      <a
        className={styles.ReportLink}
        href={bugURL}
        rel="noopener noreferrer"
        target="_blank">
        Report this issue
      </a>
      <div className={styles.ReproSteps}>
        (Please include steps on how to reproduce it and the components used.)
      </div>
    </div>
  );
}
