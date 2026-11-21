'use server';

export async function testAction() {
  console.log('[test-action-from-client]');
}

export async function testActionState(prev: number) {
  return prev + 1;
}

export async function testActionTemporaryReference(node: React.ReactNode) {
  return (
    <span>
      [server <span>{node}</span>]
    </span>
  );
}
