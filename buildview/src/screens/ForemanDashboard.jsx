import React from 'react';
import {useDbVersion} from '../lib/useDb.js';
import {getProject, getDashboard, getRoomLabel} from '../domain/queries.js';
import {TASK_STATUS, TASK_STATUS_LABEL} from '../domain/constants.js';
import {
  Button,
  Card,
  PageTitle,
  SectionTitle,
  StatusBadge,
} from '../components/ui.jsx';

// Screen 6: Foreman dashboard. Counts by status, open issues, flagged tasks.
// All numbers derive from getDashboard(), so they always match the data.
export default function ForemanDashboard({nav, params}) {
  useDbVersion();
  const project = getProject(params.projectId);
  if (!project) {
    return <Card className="p-6 text-center text-zinc-600">Project not found.</Card>;
  }

  const dash = getDashboard(project.id);

  return (
    <div className="space-y-5">
      <PageTitle subtitle={project.name}>Dashboard</PageTitle>

      <section>
        <SectionTitle>Tasks by status</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total" value={dash.totalTasks} />
          <Stat
            label={TASK_STATUS_LABEL[TASK_STATUS.TODO]}
            value={dash.byStatus[TASK_STATUS.TODO]}
            accent="bg-zinc-400"
          />
          <Stat
            label={TASK_STATUS_LABEL[TASK_STATUS.IN_PROGRESS]}
            value={dash.byStatus[TASK_STATUS.IN_PROGRESS]}
            accent="bg-progress"
          />
          <Stat
            label={TASK_STATUS_LABEL[TASK_STATUS.DONE]}
            value={dash.byStatus[TASK_STATUS.DONE]}
            accent="bg-go"
          />
        </div>
      </section>

      <section>
        <SectionTitle>Issues</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Open" value={dash.openIssueCount} accent="bg-hazard" />
          <Stat label="Resolved" value={dash.resolvedIssueCount} />
        </div>
      </section>

      <section>
        <SectionTitle count={dash.flaggedTasks.length}>
          Flagged tasks
        </SectionTitle>
        {dash.flaggedTasks.length === 0 ? (
          <Card className="p-4 text-sm text-zinc-500">
            No flagged tasks — nothing has open issues.
          </Card>
        ) : (
          <ul className="space-y-3">
            {dash.flaggedTasks.map(t => (
              <Card key={t.id} className="border-l-4 border-hazard p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-steel">{t.title}</h3>
                    <p className="text-xs text-zinc-500">
                      {getRoomLabel(t.roomId)}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mt-3">
                  <Button onClick={() => nav.go('task', {taskId: t.id})}>
                    Open task
                  </Button>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({label, value, accent}) {
  return (
    <Card className="overflow-hidden">
      <div className={`h-1.5 ${accent || 'bg-steel'}`} />
      <div className="p-3 text-center">
        <div className="text-3xl font-black text-steel">{value}</div>
        <div className="mt-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          {label}
        </div>
      </div>
    </Card>
  );
}
