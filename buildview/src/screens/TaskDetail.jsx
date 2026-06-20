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

// Screen 9 + 10: Task detail (shared). Instructions, status, photos, issues.
// Every action is gated by the section-3 permission checks.
export default function TaskDetail({nav, params}) {
  useDbVersion();
  const user = nav.user;
  const task = getTask(params.taskId);

  if (!task) return <p>Task not found.</p>;
  // Hard permission guard: a worker can never open a task outside their access.
  if (!canViewTask(user, task)) {
    return <p>You do not have access to this task.</p>;
  }

  const photos = getPhotos(task.id);
  const issues = getIssues(task.id);
  const mayEditStatus = canEditTaskStatus(user, task);
  const mayUpload = canUploadPhoto(user, task);
  const mayRaise = canRaiseIssue(user, task);
  const mayResolve = canResolveIssue(user);

  return (
    <div>
      <h1>{task.title}</h1>
      <p>Room: {getRoomLabel(task.roomId)}</p>
      <p>Trade: {task.trade}</p>
      <p>Instructions: {task.instructions || '(none)'}</p>
      <p>Assigned: {assignedNames(task)}</p>

      <h2>Status</h2>
      <p>Current: {TASK_STATUS_LABEL[task.status]}</p>
      {mayEditStatus ? (
        <div>
          {TASK_STATUS_LIST.map(s => (
            <button
              key={s}
              disabled={s === task.status}
              onClick={() => setTaskStatus(task.id, s)}>
              Set {TASK_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      ) : (
        <p>
          <em>You can't change this task's status.</em>
        </p>
      )}

      <h2>Photos ({photos.length})</h2>
      {photos.length === 0 ? (
        <p>No photos yet.</p>
      ) : (
        <ul>
          {photos.map(p => (
            <li key={p.id}>
              <div>
                {p.caption || '(no caption)'} — by {getUserName(p.uploadedByUserId)}
              </div>
              {p.imageData && (
                <img src={p.imageData} alt={p.caption || 'photo'} width="160" />
              )}
            </li>
          ))}
        </ul>
      )}
      {mayUpload && <PhotoForm taskId={task.id} userId={user.id} />}

      <h2>Issues ({issues.length})</h2>
      <IssueList issues={issues} mayResolve={mayResolve} />
      {mayRaise && (
        <RaiseIssueForm task={task} userId={user.id} />
      )}
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
    <form onSubmit={submit}>
      <div>
        <label>
          Photo:{' '}
          <input
            type="file"
            accept="image/*"
            onChange={e => setFile(e.target.files[0] || null)}
          />
        </label>
      </div>
      <div>
        <label>
          Caption:{' '}
          <input value={caption} onChange={e => setCaption(e.target.value)} />
        </label>
      </div>
      <button type="submit" disabled={busy || !file}>
        {busy ? 'Uploading…' : 'Upload photo'}
      </button>
      {error && <p>{error}</p>}
    </form>
  );
}

function IssueList({issues, mayResolve}) {
  if (issues.length === 0) return <p>No issues.</p>;
  return (
    <ul>
      {issues.map(i => (
        <li key={i.id}>
          <div>
            [{i.status}] {i.description}
          </div>
          <div>
            Raised by {getUserName(i.raisedByUserId)} — responsible:{' '}
            {i.responsibleUserId ? getUserName(i.responsibleUserId) : '(none)'}
          </div>
          {i.imageData && (
            <img src={i.imageData} alt="issue" width="160" />
          )}
          {mayResolve && i.status === ISSUE_STATUS.OPEN && (
            <button onClick={() => resolveIssue(i.id)}>Resolve</button>
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
    <form onSubmit={submit}>
      <h3>Raise an issue</h3>
      <div>
        <label>
          Description:{' '}
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          Responsible:{' '}
          <select
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
          </select>
        </label>
      </div>
      <div>
        <label>
          Optional photo:{' '}
          <input
            type="file"
            accept="image/*"
            onChange={e => setFile(e.target.files[0] || null)}
          />
        </label>
      </div>
      <button type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Raise issue'}
      </button>
      {error && <p>{error}</p>}
    </form>
  );
}
