import {groupAndSortNodes} from 'react-devtools-shared/src/backend/views/TraceUpdates/canvas';

describe('Trace updates group and sort nodes', () => {
  test('should group nodes by position without changing order within group', () => {
    const nodeToData = new Map([
      [
        {id: 1},
        {
          rect: {left: 0, top: 0, width: 100, height: 100},
          color: '#80b393',
          displayName: 'Node1',
          count: 3,
        },
      ],
      [
        {id: 2},
        {
          rect: {left: 0, top: 0, width: 100, height: 100},
          color: '#63b19e',
          displayName: 'Node2',
          count: 2,
        },
      ],
    ]);

    const result = groupAndSortNodes(nodeToData);

    expect(result).toEqual([
      [
        {
          rect: {left: 0, top: 0, width: 100, height: 100},
          color: '#80b393',
          displayName: 'Node1',
          count: 3,
        },
        {
          rect: {left: 0, top: 0, width: 100, height: 100},
          color: '#63b19e',
          displayName: 'Node2',
          count: 2,
        },
      ],
    ]);
  });

  test('should sort groups by lowest count in each group', () => {
    const nodeToData = new Map([
      [
        {id: 1},
        {
          rect: {left: 0, top: 0, width: 100, height: 100},
          color: '#97b488',
          displayName: 'Group1',
          count: 4,
        },
      ],
      [
        {id: 2},
        {
          rect: {left: 100, top: 0, width: 100, height: 100},
          color: '#37afa9',
          displayName: 'Group2',
          count: 1,
        },
      ],
      [
        {id: 3},
        {
          rect: {left: 200, top: 0, width: 100, height: 100},
          color: '#63b19e',
          displayName: 'Group3',
          count: 2,
        },
      ],
    ]);

    const result = groupAndSortNodes(nodeToData);

    expect(result).toEqual([
      [
        {
          rect: {left: 100, top: 0, width: 100, height: 100},
          color: '#37afa9',
          displayName: 'Group2',
          count: 1,
        },
      ],
      [
        {
          rect: {left: 200, top: 0, width: 100, height: 100},
          color: '#63b19e',
          displayName: 'Group3',
          count: 2,
        },
      ],
      [
        {
          rect: {left: 0, top: 0, width: 100, height: 100},
          color: '#97b488',
          displayName: 'Group1',
          count: 4,
        },
      ],
    ]);
  });

  test('should maintain order within groups while sorting groups by lowest count', () => {
    const nodeToData = new Map([
      [
        {id: 1},
        {
          rect: {left: 0, top: 0, width: 50, height: 50},
          color: '#97b488',
          displayName: 'Pos1Node1',
          count: 4,
        },
      ],
      [
        {id: 2},
        {
          rect: {left: 0, top: 0, width: 60, height: 60},
          color: '#63b19e',
          displayName: 'Pos1Node2',
          count: 2,
        },
      ],
      [
        {id: 3},
        {
          rect: {left: 100, top: 0, width: 70, height: 70},
          color: '#80b393',
          displayName: 'Pos2Node1',
          count: 3,
        },
      ],
      [
        {id: 4},
        {
          rect: {left: 100, top: 0, width: 80, height: 80},
          color: '#37afa9',
          displayName: 'Pos2Node2',
          count: 1,
        },
      ],
    ]);

    const result = groupAndSortNodes(nodeToData);

    expect(result).toEqual([
      [
        {
          rect: {left: 100, top: 0, width: 70, height: 70},
          color: '#80b393',
          displayName: 'Pos2Node1',
          count: 3,
        },
        {
          rect: {left: 100, top: 0, width: 80, height: 80},
          color: '#37afa9',
          displayName: 'Pos2Node2',
          count: 1,
        },
      ],
      [
        {
          rect: {left: 0, top: 0, width: 50, height: 50},
          color: '#97b488',
          displayName: 'Pos1Node1',
          count: 4,
        },
        {
          rect: {left: 0, top: 0, width: 60, height: 60},
          color: '#63b19e',
          displayName: 'Pos1Node2',
          count: 2,
        },
      ],
    ]);
  });

  test('should handle multiple groups with same minimum count', () => {
    const nodeToData = new Map([
      [
        {id: 1},
        {
          rect: {left: 0, top: 0, width: 100, height: 100},
          color: '#37afa9',
          displayName: 'Group1Node1',
          count: 1,
        },
      ],
      [
        {id: 2},
        {
          rect: {left: 100, top: 0, width: 100, height: 100},
          color: '#37afa9',
          displayName: 'Group2Node1',
          count: 1,
        },
      ],
    ]);

    const result = groupAndSortNodes(nodeToData);

    expect(result).toEqual([
      [
        {
          rect: {left: 0, top: 0, width: 100, height: 100},
          color: '#37afa9',
          displayName: 'Group1Node1',
          count: 1,
        },
      ],
      [
        {
          rect: {left: 100, top: 0, width: 100, height: 100},
          color: '#37afa9',
          displayName: 'Group2Node1',
          count: 1,
        },
      ],
    ]);
  });

  test('should filter out nodes without rect property', () => {
    const nodeToData = new Map([
      [
        {id: 1},
        {
          rect: null,
          color: '#37afa9',
          displayName: 'NoRectNode',
          count: 1,
        },
      ],
      [
        {id: 2},
        {
          rect: undefined,
          color: '#63b19e',
          displayName: 'UndefinedRectNode',
          count: 2,
        },
      ],
      [
        {id: 3},
        {
          rect: {left: 0, top: 0, width: 100, height: 100},
          color: '#80b393',
          displayName: 'ValidNode',
          count: 3,
        },
      ],
    ]);

    const result = groupAndSortNodes(nodeToData);

    expect(result).toEqual([
      [
        {
          rect: {left: 0, top: 0, width: 100, height: 100},
          color: '#80b393',
          displayName: 'ValidNode',
          count: 3,
        },
      ],
    ]);
  });
});
