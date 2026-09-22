import {testSerializationAction} from './action';
import {TestSerializationClient} from './client';
import {deserialize, serialize} from '../../../basic/rsc';

export function TestSerializationServer() {
  const original = <TestSerializationClient action={testSerializationAction} />;
  const serialized = serialize(original);
  const deserialized = deserialize<typeof original>(serialized);
  return <div>test-serialization:{deserialized}</div>;
}
