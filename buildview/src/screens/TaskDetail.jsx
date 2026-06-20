import React, {useState} from 'react';
import {useDbVersion} from '../lib/useDb.js';
import {
  readFileAsDataURL,
  imageTooLarge,
  MAX_IMAGE_BYTES,
} from '../lib/file.js';
import {
  setTaskStatus,
  addPhoto,
  raiseIssue,
  resolveIssue,
} from '../domain/entities.js';
import {
  getTask,
  getRoomLabel,
  getPhotos,
  getIssues,
  getUserName,
  getProjectIdForTask,
  getMembershipsForProject,
  getProject,
  getUser,
} from '../domain/queries.js';
import {
  canViewTask,
  canEditTaskStatus,
  canUploadPhoto,
  canRaiseIssue,
  canResolveIssue,
} from '../domain/permissions.js';
import {
  TASK_STATUS_LIST,
  TASK_STATUS_LABEL,
  ISSUE_STATUS,
  ACCESS_LEVEL,
} from '../domain/constants.js';
import {
  Button,
  Card,
  SectionTitle,
  StatusBadge,
  IssueBadge,
  Field,
  TextInput,
  TextArea,
  Select,
} from '../components/ui.jsx';

// Screen 9 + 10: Task detail (shared). Instructions, status, photos, issues.
// Every action is gated by the section-3 permission checks.
export default function TaskDetail({nav, params}) {
  useDbVersion();
  const user = nav.user;
  const task = getTask(params.taskId);

  if (!task) {
    return (
      <Card className="p-6 text-center text-zinc-600">Task not found.</Card>
    );
  }
  // Hard permission guard: a worker can never open a task outside their access.
  if (!canViewTask(user, task)) {
    return (
      <Card className="border-l-4 border-hazard p-6">
        <p className="font-semibold text-hazard">
          You do not have access to this task.
        </p>
      </Card>
    );
  }

  const photos = getPhotos(task.id);
  const issues = getIssues(task.id);
  const openIssues = issues.filter(i => i.status === ISSUE_STATUS.OPEN);
  const mayEditStatus = canEditTaskStatus(user, task);
  const mayUpload = canUploadPhoto(user, task);
  const mayRaise = canRaiseIssue(user, task);
  const mayResolve = canResolveIssue(user);

  return (
    <div className="space-y-5">
      {/* Task header */}
      <Card className="overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 bg-zinc-50 p-4">
          <div>
            <h1 className="text-xl font-black tracking-tight text-steel">
              {task.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {getRoomLabel(task.roomId)}
            </p>
          </div>
          <StatusBadge status={task.status} />
        </div>
        <dl className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          <Meta label="Trade">
            <span className="inline-block rounded bg-steel px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
              {task.trade}
            </span>
          </Meta>
          <Meta label="Assigned to">{assignedNames(task)}</Meta>
          <div className="sm:col-span-2">
            <Meta label="Instructions">
              {task.instructions || (
                <span className="text-zinc-400">(none)</span>
              )}
            </Meta>
          </div>
        </dl>
      </Card>

      {/* Status */}
      <section>
        <SectionTitle>Status</SectionTitle>
        <Card className="p-4">
          {mayEditStatus ? (
            <div className="flex flex-wrap gap-2">
              {TASK_STATUS_LIST.map(s => (
                <Button
                  key={s}
                  variant={s === task.status ? 'primary' : 'secondary'}
                  disabled={s === task.status}
                  onClick={() => setTaskStatus(task.id, s)}>
                  {TASK_STATUS_LABEL[s]}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 italic">
              You can&apos;t change this task&apos;s status.
            </p>
          )}
        </Card>
      </section>

      {/* Photos */}
      <section>
        <SectionTitle count={photos.length}>Photos</SectionTitle>
        <Card className="space-y-4 p-4">
          {photos.length === 0 ? (
            <p className="text-sm text-zinc-500">No photos yet.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map(p => (
                <li
                  key={p.id}
                  className="overflow-hidden rounded-md border border-zinc-200">
                  {p.imageData && (
                    <img
                      src={p.imageData}
                      alt={p.caption || 'photo'}
                      className="aspect-square w-full object-cover"
                    />
                  )}
                  <div className="p-2 text-xs">
                    <div className="font-medium text-zinc-800">
                      {p.caption || (
                        <span className="text-zinc-400">(no caption)</span>
                      )}
                    </div>
                    <div className="text-zinc-500">
                      {getUserName(p.uploadedByUserId)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {mayUpload && <PhotoForm taskId={task.id} userId={user.id} />}
        </Card>
      </section>

      {/* Issues */}
      <section>
        <SectionTitle count={openIssues.length}>Open issues</SectionTitle>
        <Card className="space-y-4 p-4">
          <IssueList issues={issues} mayResolve={mayResolve} />
          {mayRaise && <RaiseIssueForm task={task} userId={user.id} />}
        </Card>
      </section>
    </div>
  );
}

function Meta({label, children}) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-zinc-800">{children}</dd>
    </div>
  );
}

function assignedNames(task) {
  if (task.assignedWorkerIds.length === 0) return '(none)';
  return task.assignedWorkerIds.map(getUserName).join(', ');
}

function PhotoForm({taskId, userId}) {
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    if (imageTooLarge(file)) {
      setError(
        `Image is too large (max ${MAX_IMAGE_BYTES / (1024 * 1024)} MB).`
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      const imageData = await readFileAsDataURL(file);
      addPhoto({taskId, uploadedByUserId: userId, imageData, caption});
      setCaption('');
      setFile(null);
      e.target.reset();
    } catch (err) {
      setError(err.message || 'Could not save the photo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 border-t border-dashed border-zinc-300 pt-4">
      <Field label="Add a photo">
        <input
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files[0] || null)}
          className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-steel file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-steel-light"
        />
      </Field>
      <Field label="Caption">
        <TextInput
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Optional"
        />
      </Field>
      <Button type="submit" disabled={busy || !file}>
        {busy ? 'Uploading…' : 'Upload photo'}
      </Button>
      {error && <p className="text-sm font-medium text-hazard">{error}</p>}
    </form>
  );
}

function IssueList({issues, mayResolve}) {
  if (issues.length === 0) {
    return <p className="text-sm text-zinc-500">No issues raised.</p>;
  }
  return (
    <ul className="space-y-3">
      {issues.map(i => (
        <li
          key={i.id}
          className={`rounded-md border-l-4 p-3 ${
            i.status === ISSUE_STATUS.OPEN
              ? 'border-hazard bg-red-50'
              : 'border-zinc-300 bg-zinc-50'
          }`}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-zinc-800">{i.description}</p>
            <IssueBadge status={i.status} />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Raised by {getUserName(i.raisedByUserId)} · responsible:{' '}
            {i.responsibleUserId ? getUserName(i.responsibleUserId) : '(none)'}
          </p>
          {i.imageData && (
            <img
              src={i.imageData}
              alt="issue"
              className="mt-2 w-40 rounded-md border border-zinc-200"
            />
          )}
          {mayResolve && i.status === ISSUE_STATUS.OPEN && (
            <div className="mt-2">
              <Button variant="secondary" onClick={() => resolveIssue(i.id)}>
                Mark resolved
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function RaiseIssueForm({task, userId}) {
  const [description, setDescription] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Responsible person options: members of the task's project + the foreman.
  const projectId = getProjectIdForTask(task.id);
  const project = projectId ? getProject(projectId) : null;
  const memberUserIds = projectId
    ? getMembershipsForProject(projectId)
        .filter(m => m.accessLevel === ACCESS_LEVEL.GRANTED)
        .map(m => m.userId)
    : [];
  const candidateIds = [
    ...new Set(
      [project && project.createdByUserId, ...memberUserIds].filter(Boolean)
    ),
  ];

  async function submit(e) {
    e.preventDefault();
    if (!description.trim()) return;
    if (imageTooLarge(file)) {
      setError(
        `Image is too large (max ${MAX_IMAGE_BYTES / (1024 * 1024)} MB).`
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      const imageData = file ? await readFileAsDataURL(file) : null;
      raiseIssue({
        taskId: task.id,
        raisedByUserId: userId,
        description: description.trim(),
        imageData,
        responsibleUserId: responsibleUserId || null,
      });
      setDescription('');
      setResponsibleUserId('');
      setFile(null);
    } catch (err) {
      setError(err.message || 'Could not save the issue.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 border-t border-dashed border-zinc-300 pt-4">
      <h3 className="font-bold text-steel">Raise an issue</h3>
      <Field label="Description">
        <TextArea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe the problem"
        />
      </Field>
      <Field label="Responsible">
        <Select
          value={responsibleUserId}
          onChange={e => setResponsibleUserId(e.target.value)}>
          <option value="">(unassigned)</option>
          {candidateIds.map(id => {
            const u = getUser(id);
            return (
              <option key={id} value={id}>
                {u ? u.name : id}
              </option>
            );
          })}
        </Select>
      </Field>
      <Field label="Photo (optional)">
        <input
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files[0] || null)}
          className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-steel file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-steel-light"
        />
      </Field>
      <Button type="submit" variant="danger" disabled={busy}>
        {busy ? 'Saving…' : 'Raise issue'}
      </Button>
      {error && <p className="text-sm font-medium text-hazard">{error}</p>}
    </form>
  );
}
