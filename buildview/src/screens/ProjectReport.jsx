import React from 'react';
import {useDbVersion} from '../lib/useDb.js';
import {getProject, getRoomLabel, getUserName, getTask} from '../domain/queries.js';
import {
  getProjectProgress,
  getBlockedRooms,
  getOpenIssuesForProject,
  getRecentPhotos,
} from '../domain/status.js';
import {Card, PageTitle, SectionTitle} from '../components/ui.jsx';

// Feature 5: Project Report / Investor View — read-only transparency snapshot.
export default function ProjectReport({params}) {
  useDbVersion();
  const project = getProject(params.projectId);
  if (!project) {
    return <Card className="p-6 text-center text-zinc-600">Project not found.</Card>;
  }

  const progress = getProjectProgress(project.id);
  const blocked = getBlockedRooms(project.id);
  const openIssues = getOpenIssuesForProject(project.id);
  const photos = getRecentPhotos(project.id, 6);

  const summary = buildSummary(progress, blocked.length, openIssues.length);

  return (
    <div className="space-y-5">
      <PageTitle subtitle={`${project.name} · ${project.address || 'site report'}`}>
        Project report
      </PageTitle>

      {/* Headline summary */}
      <Card className="border-l-4 border-brand p-4">
        <p className="text-zinc-800">{summary}</p>
      </Card>

      {/* Progress */}
      <Card className="p-4">
        <div className="flex items-end justify-between">
          <span className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
            Overall progress
          </span>
          <span className="text-3xl font-black text-steel">
            {progress.percent}%
          </span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-go"
            style={{width: `${progress.percent}%`}}
          />
        </div>
      </Card>

      {/* Task breakdown */}
      <section>
        <SectionTitle>Tasks</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Done" value={progress.done} accent="text-go" />
          <Stat label="In progress" value={progress.inProgress} accent="text-progress" />
          <Stat label="To do" value={progress.todo} accent="text-zinc-700" />
        </div>
      </section>

      {/* Risk: blocked rooms + open issues */}
      <section>
        <SectionTitle>Site status</SectionTitle>
        <div className="space-y-3">
          <Card className="p-4">
            <div className="text-sm font-semibold text-steel">
              Blocked rooms: {blocked.length}
            </div>
            {blocked.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-sm text-zinc-600">
                {blocked.map(({room}) => (
                  <li key={room.id}>{getRoomLabel(room.id)}</li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-4">
            <div className="text-sm font-semibold text-steel">
              Open issues: {openIssues.length}
            </div>
            {openIssues.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-sm text-zinc-600">
                {openIssues.map(i => {
                  const task = getTask(i.taskId);
                  return (
                    <li key={i.id}>
                      {i.description}
                      {task ? ` — ${getRoomLabel(task.roomId)}` : ''}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </section>

      {/* Recent photos */}
      <section>
        <SectionTitle count={photos.length}>Recent photos</SectionTitle>
        {photos.length === 0 ? (
          <Card className="p-4 text-sm text-zinc-500">No photos yet.</Card>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {photos.map(p => (
              <Card key={p.id} className="overflow-hidden">
                {p.imageData && (
                  <img
                    src={p.imageData}
                    alt={p.caption || 'photo'}
                    className="aspect-square w-full object-cover"
                  />
                )}
                <div className="p-2 text-xs">
                  <div className="font-medium text-zinc-800">
                    {p.caption || '(no caption)'}
                  </div>
                  <div className="text-zinc-500">
                    {getUserName(p.uploadedByUserId)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({label, value, accent}) {
  return (
    <Card className="p-3 text-center">
      <div className={`text-3xl font-black ${accent}`}>{value}</div>
      <div className="mt-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        {label}
      </div>
    </Card>
  );
}

function buildSummary(progress, blockedCount, openIssueCount) {
  if (progress.total === 0) {
    return 'No tasks have been added to this project yet.';
  }
  const parts = [`The site is ${progress.percent}% complete`];
  parts.push(
    `${progress.done} of ${progress.total} tasks done, ${progress.inProgress} in progress`
  );
  if (blockedCount > 0) {
    parts.push(`${blockedCount} room${blockedCount === 1 ? '' : 's'} blocked`);
  }
  if (openIssueCount > 0) {
    parts.push(
      `${openIssueCount} open issue${openIssueCount === 1 ? '' : 's'} need attention`
    );
  } else {
    parts.push('no open issues');
  }
  return parts.join('; ') + '.';
}
