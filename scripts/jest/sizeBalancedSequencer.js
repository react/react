'use strict';

const Sequencer = require('@jest/test-sequencer').default;
const fs = require('fs');

class SizeBalancedSequencer extends Sequencer {
  shard(tests, {shardIndex, shardCount}) {
    const shards = Array.from({length: shardCount}, () => ({
      tests: [],
      size: 0,
    }));
    const sorted = [...tests].sort(
      (a, b) => fs.statSync(b.path).size - fs.statSync(a.path).size
    );

    for (let i = 0; i < sorted.length; i++) {
      const test = sorted[i];
      const size = fs.statSync(test.path).size;
      const smallest = shards.reduce((min, s) => (s.size < min.size ? s : min));
      smallest.tests.push(test);
      smallest.size += size;
    }

    return shards[shardIndex - 1].tests;
  }
}

module.exports = SizeBalancedSequencer;
