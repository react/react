import {useState, useEffect} from 'react';
import {invoke, Stringify} from 'shared-runtime';

function Content() {
  const [announcement, setAnnouncement] = useState('');
  const [users, setUsers] = useState([{name: 'John Doe'}, {name: 'Jane Doe'}]);

  // This was originally passed down as an onClick, but React Compiler's test
  // evaluator doesn't yet support events outside of React
  useEffect(() => {
    if (users.length === 2) {
      let removedUserName = '';
      setUsers(prevUsers => {
        const newUsers = [...prevUsers];
        removedUserName = newUsers.at(-1).name;
        newUsers.pop();
        return newUsers;
      });

      setAnnouncement(`Removed user (${removedUserName})`);
    }
  }, [users]);

  return <Stringify users={users} announcement={announcement} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Content,
  params: [{}],
  sequentialRenders: [{}, {}],
};
