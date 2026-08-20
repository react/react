import React from 'react';
import {createElement} from 'glamor/react'; // eslint-disable-line
/* @jsx createElement */

import {MultiGrid, AutoSizer} from 'react-virtualized';
import 'react-virtualized/styles.css';
import FileSaver from 'file-saver';

import {
  inject as injectErrorOverlay,
  uninject as uninjectErrorOverlay,
} from 'react-error-overlay/lib/overlay';

import attributes from './attributes';

const types = [
  {
    name: 'string',
    testValue: 'a string',
    testDisplayValue: "'a string'",
  },
  {
    name: 'empty string',
    testValue: '',
    testDisplayValue: "''",
  },
  {
    name: 'array with string',
    testValue: ['string'],
    testDisplayValue: "['string']",
  },
  {
    name: 'empty array',
    testValue: [],
    testDisplayValue: '[]',
  },
  {
    name: 'object',
    testValue: {
      toString() {
        return 'result of toString()';
      },
    },
    testDisplayValue: "{ toString() { return 'result of toString()'; } }",
  },
  {
    name: 'numeric string',
    testValue: '42',
    displayValue: "'42'",
  },
  {
    name: '-1',
    testValue: -1,
  },
  {
    name: '0',
    testValue: 0,
  },
  {
    name: 'integer',
    testValue: 1,
  },
  {
    name: 'NaN',
    testValue: NaN,
  },
  {
    name: 'float',
    testValue: 99.99,
  },
  {
    name: 'true',
    testValue: true,
  },
  {
    name: 'false',
    testValue: false,
  },
  {
    name: "string 'true'",
    testValue: 'true',
    displayValue: "'true'",
  },
  {
    name: "string 'false'",
    testValue: 'false',
    displayValue: "'false'",
  },
  {
    name: "string 'on'",
    testValue: 'on',
    displayValue: "'on'",
  },
  {
    name: "string 'off'",
    testValue: 'off',
    displayValue: "'off'",
  },
  {
    name: 'symbol',
    testValue: Symbol('foo'),
    testDisplayValue: "Symbol('foo')",
  },
  {
    name: 'function',
    testValue: function f() {},
  },
  {
    name: 'null',
    testValue: null,
  },
  {
    name: 'undefined',
    testValue: undefined,
  },
];

const ALPHABETICAL = 'alphabetical';
const REV_ALPHABETICAL = 'reverse_alphabetical';
const GROUPED_BY_ROW_PATTERN = 'grouped_by_row_pattern';

const ALL = 'all';
const COMPLETE = 'complete';
const INCOMPLETE = 'incomplete';

function getCanonicalizedValue(value) {
  switch (typeof value) {
    case 'undefined':
      return '<undefined>';
    case 'object':
      if (value === null) {
        return '<null>';
      }
      if ('baseVal' in value) {
        return getCanonicalizedValue(value.baseVal);
      }
      if (value instanceof SVGLength) {
        return '<SVGLength: ' + value.valueAsString + '>';
      }
      if (value instanceof SVGRect) {
        return (
          '<SVGRect: ' +
          [value.x, value.y, value.width, value.height].join(',') +
          '>'
        );
      }
      if (value instanceof SVGPreserveAspectRatio) {
        return (
          '<SVGPreserveAspectRatio: ' +
          value.align +
          '/' +
          value.meetOrSlice +
          '>'
        );
      }
      if (value instanceof SVGNumber) {
        return value.value;
      }
      if (value instanceof SVGMatrix) {
        return (
          '<SVGMatrix ' +
          value.a +
          ' ' +
          value.b +
          ' ' +
          value.c +
          ' ' +
          value.d +
          ' ' +
          value.e +
          ' ' +
          value.f +
          '>'
        );
      }
      if (value instanceof SVGTransform) {
        return (
          getCanonicalizedValue(value.matrix) +
          '/' +
          value.type +
          '/' +
          value.angle
        );
      }
      if (typeof value.length === 'number') {
        return (
          '[' +
          Array.from(value)
            .map(v => getCanonicalizedValue(v))
            .join(', ') +
          ']'
        );
      }
      let name = (value.constructor && value.constructor.name) || 'object';
      return '<' + name + '>';
    case 'function':
      return '<function>';
    case 'symbol':
      return '<symbol>';
    case 'number':
      return `<number: ${value}>`;
    case 'string':
      if (value === '') {
        return '<empty string>';
      }
      return '"' + value + '"';
    case 'boolean':
      return `<boolean: ${value}>`;
    default:
      throw new Error('Switch statement should be exhaustive.');
  }
}

let _didWarn = false;
function warn(str) {
  _didWarn = true;
}

/**
 * @param {import('react-dom/server')} serverRenderer
 */
async function renderToString(serverRenderer, element) {
  let didError = false;
  const stream = await serverRenderer.renderToReadableStream(element, {
    onError(error) {
      didError = true;
      console.error(error);
    },
  });
  await stream.allReady;

  if (didError) {
    throw new Error('The above error occurred while rendering to string.');
  }

  const response = new Response(stream);
  return response.text();
}

const UNKNOWN_HTML_TAGS = new Set(['keygen', 'time', 'command']);
async function getRenderedAttributeValue(
  react,
  renderer,
  serverRenderer,
  attribute,
  type
) {
  const originalConsoleError = console.error;
  console.error = warn;

  const containerTagName = attribute.containerTagName || 'div';
  const tagName = attribute.tagName || 'div';

  function createContainer() {
    if (containerTagName === 'svg') {
      return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    } else if (containerTagName === 'document') {
      return document.implementation.createHTMLDocument('');
    } else if (containerTagName === 'head') {
      return document.implementation.createHTMLDocument('').head;
    } else {
      return document.createElement(containerTagName);
    }
  }

  const read = attribute.read;
  let testValue = type.testValue;
  if (attribute.overrideStringValue !== undefined) {
    switch (type.name) {
      case 'string':
        testValue = attribute.overrideStringValue;
        break;
      case 'array with string':
        testValue = [attribute.overrideStringValue];
        break;
      default:
        break;
    }
  }
  let baseProps = {
    ...attribute.extraProps,
  };
  if (attribute.type) {
    baseProps.type = attribute.type;
  }
  const props = {
    ...baseProps,
    [attribute.name]: testValue,
  };

  let defaultValue;
  let canonicalDefaultValue;
  let result;
  let canonicalResult;
  let ssrResult;
  let canonicalSsrResult;
  let didWarn;
  let didError;
  let ssrDidWarn;
  let ssrDidError;

  _didWarn = false;
  try {
    let container = createContainer();
    renderer.flushSync(() => {
      renderer
        .createRoot(container)
        .render(react.createElement(tagName, baseProps));
    });
    defaultValue = read(container.lastChild);
    canonicalDefaultValue = getCanonicalizedValue(defaultValue);

    container = createContainer();

    renderer.flushSync(() => {
      renderer
        .createRoot(container)
        .render(react.createElement(tagName, props));
    });
    result = read(container.lastChild);
    canonicalResult = getCanonicalizedValue(result);
    didWarn = _didWarn;
    didError = false;
  } catch (error) {
    result = null;
    didWarn = _didWarn;
    didError = true;
  }

  _didWarn = false;
  let hasTagMismatch = false;
  let hasUnknownElement = false;
  try {
    let container;
    if (containerTagName === 'document') {
      const html = await renderToString(
        serverRenderer,
        react.createElement(tagName, props)
      );
      container = createContainer();
      container.innerHTML = html;
    } else if (containerTagName === 'head') {
      const html = await renderToString(
        serverRenderer,
        react.createElement(tagName, props)
      );
      container = createContainer();
      container.innerHTML = html;
    } else {
      const html = await renderToString(
        serverRenderer,
        react.createElement(
          containerTagName,
          null,
          react.createElement(tagName, props)
        )
      );
      const outerContainer = document.createElement('div');
      outerContainer.innerHTML = html;
      // Float may prepend `<link />`
      container = outerContainer.lastChild;
    }

    if (
      !container.lastChild ||
      container.lastChild.tagName.toLowerCase() !== tagName.toLowerCase()
    ) {
      hasTagMismatch = true;
    }

    if (
      container.lastChild instanceof HTMLUnknownElement &&
      !UNKNOWN_HTML_TAGS.has(container.lastChild.tagName.toLowerCase())
    ) {
      hasUnknownElement = true;
    }

    ssrResult = read(container.lastChild);
    canonicalSsrResult = getCanonicalizedValue(ssrResult);
    ssrDidWarn = _didWarn;
    ssrDidError = false;
  } catch (error) {
    ssrResult = null;
    ssrDidWarn = _didWarn;
    ssrDidError = true;
  }

  console.error = originalConsoleError;

  if (hasTagMismatch) {
    throw new Error('Tag mismatch. Expected: ' + tagName);
  }
  if (hasUnknownElement) {
    throw new Error('Unexpected unknown element: ' + tagName);
  }

  let ssrHasSameBehavior;
  let ssrHasSameBehaviorExceptWarnings;
  if (didError && ssrDidError) {
    ssrHasSameBehavior = true;
  } else if (!didError && !ssrDidError) {
    if (canonicalResult === canonicalSsrResult) {
      ssrHasSameBehaviorExceptWarnings = true;
      ssrHasSameBehavior = didWarn === ssrDidWarn;
    }
    ssrHasSameBehavior =
      didWarn === ssrDidWarn && canonicalResult === canonicalSsrResult;
  } else {
    ssrHasSameBehavior = false;
  }

  return {
    tagName,
    containerTagName,
    testValue,
    defaultValue,
    result,
    canonicalResult,
    canonicalDefaultValue,
    didWarn,
    didError,
    ssrResult,
    canonicalSsrResult,
    ssrDidWarn,
    ssrDidError,
    ssrHasSameBehavior,
    ssrHasSameBehaviorExceptWarnings,
  };
}

async function prepareState(initGlobals) {
  async function getRenderedAttributeValues(attribute, type) {
    const {
      ReactStable,
      ReactDOMStable,
      ReactDOMServerStable,
      ReactNext,
      ReactDOMNext,
      ReactDOMServerNext,
    } = initGlobals(attribute, type);
    const reactStableValue = await getRenderedAttributeValue(
      ReactStable,
      ReactDOMStable,
      ReactDOMServerStable,
      attribute,
      type
    );
    const reactNextValue = await getRenderedAttributeValue(
      ReactNext,
      ReactDOMNext,
      ReactDOMServerNext,
      attribute,
      type
    );

    let hasSameBehavior;
    if (reactStableValue.didError && reactNextValue.didError) {
      hasSameBehavior = true;
    } else if (!reactStableValue.didError && !reactNextValue.didError) {
      hasSameBehavior =
        reactStableValue.didWarn === reactNextValue.didWarn &&
        reactStableValue.canonicalResult === reactNextValue.canonicalResult &&
        reactStableValue.ssrHasSameBehavior ===
          reactNextValue.ssrHasSameBehavior;
    } else {
      hasSameBehavior = false;
    }

    return {
      reactStable: reactStableValue,
      reactNext: reactNextValue,
      hasSameBehavior,
    };
  }

  const table = new Map();
  const rowPatternHashes = new Map();

  // Disable error overlay while testing each attribute
  uninjectErrorOverlay();
  for (let attribute of attributes) {
    const results = new Map();
    let hasSameBehaviorForAll = true;
    let rowPatternHash = '';
    for (let type of types) {
      const result = await getRenderedAttributeValues(attribute, type);
      results.set(type.name, result);
      if (!result.hasSameBehavior) {
        hasSameBehaviorForAll = false;
      }
      rowPatternHash += [result.reactStable, result.reactNext]
        .map(res =>
          [
            res.canonicalResult,
            res.canonicalDefaultValue,
            res.didWarn,
            res.didError,
          ].join('||')
        )
        .join('||');
    }
    const row = {
      results,
      hasSameBehaviorForAll,
      rowPatternHash,
      // "Good enough" id that we can store in localStorage
      rowIdHash: `${attribute.name} ${attribute.tagName} ${attribute.overrideStringValue}`,
    };
    const rowGroup = rowPatternHashes.get(rowPatternHash) || new Set();
    rowGroup.add(row);
    rowPatternHashes.set(rowPatternHash, rowGroup);
    table.set(attribute, row);
  }

  // Renable error overlay
  injectErrorOverlay();

  return {
    table,
    rowPatternHashes,
  };
}

const successColor = 'white';
const warnColor = 'yellow';
const errorColor = 'red';

function RendererResult({
  result,
  canonicalResult,
  defaultValue,
  canonicalDefaultValue,
  didWarn,
  didError,
  ssrHasSameBehavior,
  ssrHasSameBehaviorExceptWarnings,
}) {
  let backgroundColor;
  if (didError) {
    backgroundColor = errorColor;
  } else if (didWarn) {
    backgroundColor = warnColor;
  } else if (canonicalResult !== canonicalDefaultValue) {
    backgroundColor = 'cyan';
  } else {
    backgroundColor = successColor;
  }

  let style = {
    display: 'flex',
    alignItems: 'center',
    position: 'absolute',
    height: '100%',
    width: '100%',
    backgroundColor,
  };

  if (!ssrHasSameBehavior) {
    const color = ssrHasSameBehaviorExceptWarnings ? 'gray' : 'magenta';
    style.border = `3px dotted ${color}`;
  }

  return <div css={style}>{canonicalResult}</div>;
}

function ResultPopover(props) {
  return (
    <pre
      css={{
        padding: '1em',
        minWidth: '25em',
      }}>
      {JSON.stringify(
        {
          reactStable: props.reactStable,
          reactNext: props.reactNext,
          hasSameBehavior: props.hasSameBehavior,
        },
        null,
        2
      )}
    </pre>
  );
}

class Result extends React.Component {
  state = {showInfo: false};
  onMouseEnter = () => {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(() => {
      this.setState({showInfo: true});
    }, 250);
  };
  onMouseLeave = () => {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.setState({showInfo: false});
  };

  componentWillUnmount() {
    if (this.timeout) {
      clearTimeout(this.interval);
    }
  }

  render() {
    const {reactStable, reactNext, hasSameBehavior} = this.props;
    const style = {
      position: 'absolute',
      width: '100%',
      height: '100%',
    };

    let highlight = null;
    let popover = null;
    if (this.state.showInfo) {
      highlight = (
        <div
          css={{
            position: 'absolute',
            height: '100%',
            width: '100%',
            border: '2px solid blue',
          }}
        />
      );

      popover = (
        <div
          css={{
            backgroundColor: 'white',
            border: '1px solid black',
            position: 'absolute',
            top: '100%',
            zIndex: 999,
          }}>
          <ResultPopover {...this.props} />
        </div>
      );
    }

    if (!hasSameBehavior) {
      style.border = '4px solid purple';
    }
    return (
      <div
        css={style}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}>
        <div css={{position: 'absolute', width: '50%', height: '100%'}}>
          <RendererResult {...reactStable} />
        </div>
        <div
          css={{
            position: 'absolute',
            width: '50%',
            left: '50%',
            height: '100%',
          }}>
          <RendererResult {...reactNext} />
        </div>
        {highlight}
        {popover}
      </div>
    );
  }
}

function ColumnHeader({children}) {
  return (
    <div
      css={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
      }}>
      {children}
    </div>
  );
}

function RowHeader({children, checked, onChange}) {
  return (
    <div
      css={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
      }}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      {children}
    </div>
  );
}

function CellContent(props) {
  const {
    columnIndex,
    rowIndex,
    attributesInSortedOrder,
    completedHashes,
    toggleAttribute,
    table,
  } = props;
  const attribute = attributesInSortedOrder[rowIndex - 1];
  const type = types[columnIndex - 1];

  if (columnIndex === 0) {
    if (rowIndex === 0) {
      return null;
    }
    const row = table.get(attribute);
    const rowPatternHash = row.rowPatternHash;
    return (
      <RowHeader
        checked={completedHashes.has(rowPatternHash)}
        onChange={() => toggleAttribute(rowPatternHash)}>
        {row.hasSameBehaviorForAll ? (
          attribute.name
        ) : (
          <b css={{color: 'purple'}}>{attribute.name}</b>
        )}
      </RowHeader>
    );
  }

  if (rowIndex === 0) {
    return <ColumnHeader>{type.name}</ColumnHeader>;
  }

  const row = table.get(attribute);
  const result = row.results.get(type.name);

  return <Result {...result} />;
}

function saveToLocalStorage(completedHashes) {
  const str = JSON.stringify([...completedHashes]);
  localStorage.setItem('completedHashes', str);
}

function restoreFromLocalStorage() {
  const str = localStorage.getItem('completedHashes');
  if (str) {
    const completedHashes = new Set(JSON.parse(str));
    return completedHashes;
  }
  return new Set();
}

const useFastMode = /[?&]fast\b/.test(window.location.href);

class App extends React.Component {
  state = {
    sortOrder: ALPHABETICAL,
    filter: ALL,
    completedHashes: restoreFromLocalStorage(),
    table: null,
    rowPatternHashes: null,
  };

  renderCell = ({key, ...props}) => {
    return (
      <div key={key} style={props.style}>
        <CellContent
          toggleAttribute={this.toggleAttribute}
          completedHashes={this.state.completedHashes}
          table={this.state.table}
          attributesInSortedOrder={this.attributes}
          {...props}
        />
      </div>
    );
  };

  onUpdateSort = e => {
    this.setState({sortOrder: e.target.value});
  };

  onUpdateFilter = e => {
    this.setState({filter: e.target.value});
  };

  toggleAttribute = rowPatternHash => {
    const completedHashes = new Set(this.state.completedHashes);
    if (completedHashes.has(rowPatternHash)) {
      completedHashes.delete(rowPatternHash);
    } else {
      completedHashes.add(rowPatternHash);
    }
    this.setState({completedHashes}, () => saveToLocalStorage(completedHashes));
  };

  async componentDidMount() {
    const sources = {
      ReactStable: 'https://unpkg.com/react@latest/umd/react.development.js',
      ReactDOMStable:
        'https://unpkg.com/react-dom@latest/umd/react-dom.development.js',
      ReactDOMServerStable:
        'https://unpkg.com/react-dom@latest/umd/react-dom-server.browser.development.js',
      ReactNext: '/react.development.js',
      ReactDOMNext: '/react-dom.development.js',
      ReactDOMServerNext: '/react-dom-server.browser.development.js',
    };
    const codePromises = Object.values(sources).map(src =>
      fetch(src).then(res => res.text())
    );
    const codesByIndex = await Promise.all(codePromises);

    const pool = [];
    function initGlobals(attribute, type) {
      if (useFastMode) {
        // Note: this is not giving correct results for warnings.
        // But it's much faster.
        if (pool[0]) {
          return pool[0].globals;
        }
      } else {
        document.title = `${attribute.name} (${type.name})`;
      }

      // Creating globals for every single test is too slow.
      // However caching them between runs won't work for the same attribute names
      // because warnings will be deduplicated. As a result, we only share globals
      // between different attribute names.
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].testedAttributes.has(attribute.name)) {
          pool[i].testedAttributes.add(attribute.name);
          return pool[i].globals;
        }
      }

      let globals = {};
      Object.keys(sources).forEach((name, i) => {
        eval.call(window, codesByIndex[i]); // eslint-disable-line
        globals[name] = window[name.replace(/Stable|Next/g, '')];
      });

      // Cache for future use (for different attributes).
      pool.push({
        globals,
        testedAttributes: new Set([attribute.name]),
      });

      return globals;
    }

    const {table, rowPatternHashes} = await prepareState(initGlobals);
    document.title = 'Ready';

    this.setState({
      table,
      rowPatternHashes,
    });
  }

  componentWillUpdate(nextProps, nextState) {
    if (
      nextState.sortOrder !== this.state.sortOrder ||
      nextState.filter !== this.state.filter ||
      nextState.completedHashes !== this.state.completedHashes ||
      nextState.table !== this.state.table
    ) {
      this.attributes = this.getAttributes(
        nextState.table,
        nextState.rowPatternHashes,
        nextState.sortOrder,
        nextState.filter,
        nextState.completedHashes
      );
      if (this.grid) {
        this.grid.forceUpdateGrids();
      }
    }
  }

  getAttributes(table, rowPatternHashes, sortOrder, filter, completedHashes) {
    // Filter
    let filteredAttributes;
    switch (filter) {
      case ALL:
        filteredAttributes = attributes.filter(() => true);
        break;
      case COMPLETE:
        filteredAttributes = attributes.filter(attribute => {
          const row = table.get(attribute);
          return completedHashes.has(row.rowPatternHash);
        });
        break;
      case INCOMPLETE:
        filteredAttributes = attributes.filter(attribute => {
          const row = table.get(attribute);
          return !completedHashes.has(row.rowPatternHash);
        });
        break;
      default:
        throw new Error('Switch statement should be exhaustive');
    }

    // Sort
    switch (sortOrder) {
      case ALPHABETICAL:
        return filteredAttributes.sort((attr1, attr2) =>
          attr1.name.toLowerCase() < attr2.name.toLowerCase() ? -1 : 1
        );
      case REV_ALPHABETICAL:
        return filteredAttributes.sort((attr1, attr2) =>
          attr1.name.toLowerCase() < attr2.name.toLowerCase() ? 1 : -1
        );
      case GROUPED_BY_ROW_PATTERN: {
        return filteredAttributes.sort((attr1, attr2) => {
          const row1 = table.get(attr1);
          const row2 = table.get(attr2);
          const patternGroup1 = rowPatternHashes.get(row1.rowPatternHash);
          const patternGroupSize1 = (patternGroup1 && patternGroup1.size) || 0;
          const patternGroup2 = rowPatternHashes.get(row2.rowPatternHash);
          const patternGroupSize2 = (patternGroup2 && patternGroup2.size) || 0;
          return patternGroupSize2 - patternGroupSize1;
        });
      }
      default:
        throw new Error('Switch statement should be exhaustive');
    }
  }

  handleSaveClick = e => {
    e.preventDefault();

    if (useFastMode) {
      alert(
        'Fast mode is not accurate. Please remove ?fast from the query string, and reload.'
      );
      return;
    }

    let log = '';
    for (let attribute of attributes) {
      log += `## \`${attribute.name}\` (on \`<${
        attribute.tagName || 'div'
      }>\` inside \`<${attribute.containerTagName || 'div'}>\`)\n`;
      log += '| Test Case | Flags | Result |\n';
      log += '| --- | --- | --- |\n';

      const attributeResults = this.state.table.get(attribute).results;
      for (let type of types) {
        const {
          didError,
          didWarn,
          canonicalResult,
          canonicalDefaultValue,
          ssrDidError,
          ssrHasSameBehavior,
          ssrHasSameBehaviorExceptWarnings,
        } = attributeResults.get(type.name).reactNext;

        let descriptions = [];
        if (canonicalResult === canonicalDefaultValue) {
          descriptions.push('initial');
        } else {
          descriptions.push('changed');
        }
        if (didError) {
          descriptions.push('error');
        }
        if (didWarn) {
          descriptions.push('warning');
        }
        if (ssrDidError) {
          descriptions.push('ssr error');
        }
        if (!ssrHasSameBehavior) {
          if (ssrHasSameBehaviorExceptWarnings) {
            descriptions.push('ssr warning');
          } else {
            descriptions.push('ssr mismatch');
          }
        }
        log +=
          `| \`${attribute.name}=(${type.name})\`` +
          `| (${descriptions.join(', ')})` +
          `| \`${canonicalResult || ''}\` |\n`;
      }
      log += '\n';
    }

    const blob = new Blob([log], {type: 'text/plain;charset=utf-8'});
    FileSaver.saveAs(blob, 'AttributeTableSnapshot.md');
  };

  render() {
    if (!this.state.table) {
      return (
        <div>
          <h1>Loading...</h1>
          {!useFastMode && (
            <h3>The progress is reported in the window title.</h3>
          )}
        </div>
      );
    }
    return (
      <div>
        <div>
          <select value={this.state.sortOrder} onChange={this.onUpdateSort}>
            <option value={ALPHABETICAL}>alphabetical</option>
            <option value={REV_ALPHABETICAL}>reverse alphabetical</option>
            <option value={GROUPED_BY_ROW_PATTERN}>
              grouped by row pattern :)
            </option>
          </select>
          <select value={this.state.filter} onChange={this.onUpdateFilter}>
            <option value={ALL}>all</option>
            <option value={INCOMPLETE}>incomplete</option>
            <option value={COMPLETE}>complete</option>
          </select>
          <button style={{marginLeft: '10px'}} onClick={this.handleSaveClick}>
            Save latest results to a file{' '}
            <span role="img" aria-label="Save">
              💾
            </span>
          </button>
        </div>
        <AutoSizer disableHeight={true}>
          {({width}) => (
            <MultiGrid
              ref={input => {
                this.grid = input;
              }}
              cellRenderer={this.renderCell}
              columnWidth={200}
              columnCount={1 + types.length}
              fixedColumnCount={1}
              enableFixedColumnScroll={true}
              enableFixedRowScroll={true}
              height={1200}
              rowHeight={40}
              rowCount={this.attributes.length + 1}
              fixedRowCount={1}
              width={width}
            />
          )}
        </AutoSizer>
      </div>
    );
  }
}

export default App;
