import React from 'react';
import {useDbVersion} from '../lib/useDb.js';
import {getProject, getDashboard, getRoomLabel} from '../domain/queries.js';
import {TASK_STATUS, TASK_STATUS_LABEL} from '../domain/constants.js';

// Screen 6: Foreman dashboard. Counts by status, open issues, flagged tasks.
// All numbers derive from getDashboard(), so they always match the data.
export default function ForemanDashboard({nav, params}) {
  useDbVersion();
  const project = getProject(params.projectId);
  if (!project) return <p>Project not found.</p>;

  const dash = getDashboard(project.id);

  return (
    <div>
      <h1>Dashboard — {project.name}</h1>

      <h2>Tasks by status</h2>
      <ul>
        <li>Total: {dash.totalTasks}</li>
        <li>
          {TASK_STATUS_LABEL[TASK_STATUS.TODO]}:{' '}
          {dash.byStatus[TASK_STATUS.TODO]}
        </li>
        <li>
          {TASK_STATUS_LABEL[TASK_STATUS.IN_PROGRESS]}:{' '}
          {dash.byStatus[TASK_STATUS.IN_PROGRESS]}
        </li>
        <li>
          {TASK_STATUS_LABEL[TASK_STATUS.DONE]}:{' '}
          {dash.byStatus[TASK_STATUS.DONE]}
        </li>
      </ul>

      <h2>Issues</h2>
      <ul>
        <li>Open: {dash.openIssueCount}</li>
        <li>Resolved: {dash.resolvedIssueCount}</li>
      </ul>

      <h2>Flagged tasks (have open issues): {dash.flaggedTasks.length}</h2>
      {dash.flaggedTasks.length === 0 ? (
        <p>No flagged tasks.</p>
      ) : (
        <ul>
          {dash.flaggedTasks.map(t => (
            <li key={t.id}>
              <strong>{t.title}</strong> — {getRoomLabel(t.roomId)} — status:{' '}
              {TASK_STATUS_LABEL[t.status]}{' '}
              <button onClick={() => nav.go('task', {taskId: t.id})}>
                Open task
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
