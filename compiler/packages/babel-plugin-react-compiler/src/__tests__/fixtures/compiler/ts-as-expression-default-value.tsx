type Status = 'pending' | 'success' | 'error';

const StatusIndicator = ({status}: {status: Status}) => {
  return <div className={`status-${status}`}>Status: {status}</div>;
};

const Component = ({status = 'pending' as Status}) => {
  return <StatusIndicator status={status} />;
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{status: 'success'}],
};
