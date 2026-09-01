'use strict';

type DebugInfoConfig = {
  ignoreProps?: boolean,
  ignoreRscStreamInfo?: boolean,
  useFixedTime?: boolean,
  useV8Stack?: boolean,
};

function formatV8Stack(stack) {
  let v8StyleStack = '';
  if (stack) {
    for (let i = 0; i < stack.length; i++) {
      const [name] = stack[i];
      if (v8StyleStack !== '') {
        v8StyleStack += '\n';
      }
      v8StyleStack += '    in ' + name + ' (at **)';
    }
  }
  return v8StyleStack;
}

function normalizeStack(stack) {
  if (!stack) {
    return stack;
  }
  const copy = [];
  for (let i = 0; i < stack.length; i++) {
    const [name, file, line, col, enclosingLine, enclosingCol] = stack[i];
    copy.push([
      name,
      file.replace(__REACT_ROOT_PATH_TEST__, ''),
      line,
      col,
      enclosingLine,
      enclosingCol,
    ]);
  }
  return copy;
}

function normalizeIOInfo(config: DebugInfoConfig, ioInfo) {
  const {debugTask, debugStack, debugLocation, ...copy} = ioInfo;
  if (ioInfo.stack) {
    copy.stack = config.useV8Stack
      ? formatV8Stack(ioInfo.stack)
      : normalizeStack(ioInfo.stack);
  }
  if (ioInfo.owner) {
    copy.owner = normalizeDebugInfo(config, ioInfo.owner);
  }
  if (typeof ioInfo.start === 'number' && config.useFixedTime) {
    copy.start = 0;
  }
  if (typeof ioInfo.end === 'number' && config.useFixedTime) {
    copy.end = 0;
  }
  const promise = ioInfo.value;
  if (promise) {
    promise.then(); // init
    if (promise.status === 'fulfilled') {
      if (ioInfo.name === 'rsc stream') {
        copy.byteSize = 0;
        copy.value = {
          value: 'stream',
        };
      } else {
        copy.value = {
          value: promise.value,
        };
      }
    } else if (promise.status === 'rejected') {
      copy.value = {
        reason: promise.reason,
      };
    } else {
      copy.value = {
        status: promise.status,
      };
    }
  } else if ('value' in ioInfo) {
    // If value exists in ioInfo but is undefined (e.g., WeakRef was GC'd),
    // ensure we still include it in the normalized output for consistency
    copy.value = {
      value: undefined,
    };
  } else if (ioInfo.name && ioInfo.name !== 'rsc stream') {
    // For non-rsc-stream IO that doesn't have a value field, add a default.
    // This handles the case where the server doesn't send the field when WeakRef is GC'd.
    copy.value = {
      value: undefined,
    };
  }
  return copy;
}

function normalizeDebugInfo(config: DebugInfoConfig, original) {
  const {debugTask, debugStack, debugLocation, ...debugInfo} = original;
  if (original.owner) {
    debugInfo.owner = normalizeDebugInfo(config, original.owner);
  }
  if (original.awaited) {
    debugInfo.awaited = normalizeIOInfo(config, original.awaited);
  }
  if (debugInfo.props && config.ignoreProps) {
    debugInfo.props = {};
  }
  if (Array.isArray(debugInfo.stack)) {
    debugInfo.stack = config.useV8Stack
      ? formatV8Stack(debugInfo.stack)
      : normalizeStack(debugInfo.stack);
    return debugInfo;
  } else if (typeof debugInfo.time === 'number' && config.useFixedTime) {
    return {...debugInfo, time: 0};
  } else {
    return debugInfo;
  }
}

export function getDebugInfo(config: DebugInfoConfig, obj) {
  const debugInfo = obj._debugInfo;
  if (debugInfo) {
    const copy = [];
    for (let i = 0; i < debugInfo.length; i++) {
      if (
        debugInfo[i].awaited &&
        debugInfo[i].awaited.name === 'rsc stream' &&
        config.ignoreRscStreamInfo
      ) {
        // Ignore RSC stream I/O info.
      } else {
        copy.push(normalizeDebugInfo(config, debugInfo[i]));
      }
    }
    return copy;
  }
  return debugInfo;
}
