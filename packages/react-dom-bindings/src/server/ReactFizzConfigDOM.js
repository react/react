/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  ReactNodeList,
  ReactCustomFormAction,
  Thenable,
} from 'shared/ReactTypes';
import type {
  CrossOriginEnum,
  PreloadImplOptions,
  PreloadModuleImplOptions,
  PreinitStyleOptions,
  PreinitScriptOptions,
  PreinitModuleScriptOptions,
  ImportMap,
} from 'react-dom/src/shared/ReactDOMTypes';

import {
  checkHtmlStringCoercion,
  checkCSSPropertyStringCoercion,
  checkAttributeStringCoercion,
  checkOptionStringCoercion,
} from 'shared/CheckStringCoercion';

import {Children} from 'react';

import {
  enableFizzExternalRuntime,
  enableSrcObject,
  enableFizzBlockingRender,
  enableViewTransition,
  enableViewTransitionParentEnterExit,
} from 'shared/ReactFeatureFlags';

import type {
  Destination,
  Chunk,
  PrecomputedChunk,
} from 'react-server/src/ReactServerStreamConfig';

import type {FormStatus} from '../shared/ReactDOMFormActions';

import {
  writeChunk,
  writeChunkAndReturn,
  stringToChunk,
  stringToPrecomputedChunk,
  readAsDataURL,
} from 'react-server/src/ReactServerStreamConfig';
import {
  resolveRequest,
  getResumableState,
  getRenderState,
  flushResources,
} from 'react-server/src/ReactFizzServer';

import isAttributeNameSafe from '../shared/isAttributeNameSafe';
import isUnitlessNumber from '../shared/isUnitlessNumber';
import getAttributeAlias from '../shared/getAttributeAlias';

import {checkControlledValueProps} from '../shared/ReactControlledValuePropTypes';
import {validateProperties as validateARIAProperties} from '../shared/ReactDOMInvalidARIAHook';
import {validateProperties as validateInputProperties} from '../shared/ReactDOMNullInputValuePropHook';
import {validateProperties as validateUnknownProperties} from '../shared/ReactDOMUnknownPropertyHook';
import warnValidStyle from '../shared/warnValidStyle';
import {getCrossOriginString} from '../shared/crossOriginStrings';

import escapeTextForBrowser from './escapeTextForBrowser';
import hyphenateStyleName from '../shared/hyphenateStyleName';
import hasOwnProperty from 'shared/hasOwnProperty';
import sanitizeURL from '../shared/sanitizeURL';
import isArray from 'shared/isArray';

import {
  clientRenderBoundary as clientRenderFunction,
  completeBoundary as completeBoundaryFunction,
  completeBoundaryUpgradeToViewTransitions as upgradeToViewTransitionsInstruction,
  completeBoundaryWithStyles as styleInsertionFunction,
  completeSegment as completeSegmentFunction,
  formReplaying as formReplayingRuntime,
  markShellTime,
} from './fizz-instruction-set/ReactDOMFizzInstructionSetInlineCodeStrings';

import {getValueDescriptorExpectingObjectForWarning} from '../shared/ReactDOMResourceValidation';

import {NotPending} from '../shared/ReactDOMFormActions';

import ReactDOMSharedInternals from 'shared/ReactDOMSharedInternals';

const previousDispatcher =
  ReactDOMSharedInternals.d; /* ReactDOMCurrentDispatcher */
ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */ = {
  f /* flushSyncWork */: previousDispatcher.f /* flushSyncWork */,
  r /* requestFormReset */: previousDispatcher.r /* requestFormReset */,
  D /* prefetchDNS */: prefetchDNS,
  C /* preconnect */: preconnect,
  L /* preload */: preload,
  m /* preloadModule */: preloadModule,
  X /* preinitScript */: preinitScript,
  S /* preinitStyle */: preinitStyle,
  M /* preinitModuleScript */: preinitModuleScript,
};

// We make every property of the descriptor optional because it is not a contract that
// the headers provided by onHeaders has any particular header types.
export type HeadersDescriptor = {
  Link?: string,
};

// Used to distinguish these contexts from ones used in other renderers.
// E.g. this can be used to distinguish legacy renderers from this modern one.
export const isPrimaryRenderer = true;

export const supportsClientAPIs = true;

export type StreamingFormat = 0 | 1;
const ScriptStreamingFormat: StreamingFormat = 0;
const DataStreamingFormat: StreamingFormat = 1;

export type InstructionState = number;
const NothingSent /*                      */ = 0b000000000;
const SentCompleteSegmentFunction /*      */ = 0b000000001;
const SentCompleteBoundaryFunction /*     */ = 0b000000010;
const SentClientRenderFunction /*         */ = 0b000000100;
const SentStyleInsertionFunction /*       */ = 0b000001000;
const SentFormReplayingRuntime /*         */ = 0b000010000;
const SentCompletedShellId /*             */ = 0b000100000;
const SentMarkShellTime /*                */ = 0b001000000;
const NeedUpgradeToViewTransitions /*     */ = 0b010000000;
const SentUpgradeToViewTransitions /*     */ = 0b100000000;

type NonceOption =
  | string
  | {
      script?: string,
      style?: string,
    };

// Per request, global state that is not contextual to the rendering subtree.
// This cannot be resumed and therefore should only contain things that are
// temporary working state or are never used in the prerender pass.
export type RenderState = {
  // These can be recreated from resumable state.
  placeholderPrefix: PrecomputedChunk,
  segmentPrefix: PrecomputedChunk,
  boundaryPrefix: PrecomputedChunk,

  // inline script streaming format, unused if using external runtime / data
  startInlineScript: PrecomputedChunk,

  startInlineStyle: PrecomputedChunk,

  // the preamble must always flush before resuming, so all these chunks must
  // be null or empty when resuming.

  // preamble chunks
  preamble: PreambleState,

  // external runtime script chunks
  externalRuntimeScript: null | ExternalRuntimeScript,
  bootstrapChunks: Array<Chunk | PrecomputedChunk>,
  importMapChunks: Array<Chunk | PrecomputedChunk>,

  // Hoistable chunks
  charsetChunks: Array<Chunk | PrecomputedChunk>,
  viewportChunks: Array<Chunk | PrecomputedChunk>,
  hoistableChunks: Array<Chunk | PrecomputedChunk>,

  // Headers queues for Resources that can flush early
  onHeaders: void | ((headers: HeadersDescriptor) => void),
  headers: null | {
    preconnects: string,
    fontPreloads: string,
    highImagePreloads: string,
    remainingCapacity: number,
  },
  resets: {
    // corresponds to ResumableState.unknownResources["font"]
    font: {
      [href: string]: Preloaded,
    },
    // the rest correspond to ResumableState[<...>Resources]
    dns: {[key: string]: Exists},
    connect: {
      default: {[key: string]: Exists},
      anonymous: {[key: string]: Exists},
      credentials: {[key: string]: Exists},
    },
    image: {
      [key: string]: Preloaded,
    },
    style: {
      [key: string]: Exists | Preloaded | PreloadedWithCredentials,
    },
  },

  // Flushing queues for Resource dependencies
  preconnects: Set<Resource>,
  fontPreloads: Set<Resource>,
  highImagePreloads: Set<Resource>,
  // usedImagePreloads: Set<PreloadResource>,
  styles: Map<string, StyleQueue>,
  bootstrapScripts: Set<Resource>,
  scripts: Set<Resource>,
  bulkPreloads: Set<Resource>,

  // Temporarily keeps track of key to preload resources before shell flushes.
  preloads: {
    images: Map<string, Resource>,
    stylesheets: Map<string, Resource>,
    scripts: Map<string, Resource>,
    moduleScripts: Map<string, Resource>,
  },

  nonce: {
    script: string | void,
    style: string | void,
  },

  // Module-global-like reference for flushing/hoisting state of style resources
  // We need to track whether the current request has flushed any style resources
  // without sending an instruction to hoist them. we do that here
  stylesToHoist: boolean,

  // We allow the legacy renderer to extend this object.

  ...
};

type Exists = null;
type Preloaded = [];
// Credentials here are things that affect whether a browser will make a request
// as well as things that affect which connection the browser will use for that request.
// We want these to be aligned across preloads and resources because otherwise the preload
// will be wasted.
// We investigated whether referrerPolicy should be included here but from experimentation
// it seems that browsers do not treat this as part of the http cache key and does not affect
// which connection is used.
type PreloadedWithCredentials = [
  /* crossOrigin */ ?CrossOriginEnum,
  /* integrity */ ?string,
];

const EXISTS: Exists = null;
// This constant is to mark preloads that have no unique credentials
// to convey. It should never be checked by identity and we should not
// assume Preload values in ResumableState equal this value because they
// will have come from some parsed input.
const PRELOAD_NO_CREDS: Preloaded = [];
if (__DEV__) {
  Object.freeze(PRELOAD_NO_CREDS);
}

// Per response, global state that is not contextual to the rendering subtree.
// This is resumable and therefore should be serializable.
export type ResumableState = {
  idPrefix: string,
  nextFormID: number,
  streamingFormat: StreamingFormat,

  // We carry the bootstrap initializers in resumable state in case we postpone in the shell
  // of a prerender. On resume we will reinitialize the bootstrap scripts if necessary.
  // If we end up flushing the bootstrap scripts we void these on the resumable state
  bootstrapScriptContent?: string | void,
  bootstrapScripts?: $ReadOnlyArray<string | BootstrapScriptDescriptor> | void,
  bootstrapModules?: $ReadOnlyArray<string | BootstrapScriptDescriptor> | void,

  // state for script streaming format, unused if using external runtime / data
  instructions: InstructionState,

  // postamble state
  hasBody: boolean,
  hasHtml: boolean,

  // Resources - Request local cache
  unknownResources: {
    [asType: string]: {
      [href: string]: Preloaded,
    },
  },
  dnsResources: {[key: string]: Exists},
  connectResources: {
    default: {[key: string]: Exists},
    anonymous: {[key: string]: Exists},
    credentials: {[key: string]: Exists},
  },
  imageResources: {
    [key: string]: Preloaded,
  },
  styleResources: {
    [key: string]: Exists | Preloaded | PreloadedWithCredentials,
  },
  scriptResources: {
    [key: string]: Exists | Preloaded | PreloadedWithCredentials,
  },
  moduleUnknownResources: {
    [asType: string]: {
      [href: string]: Preloaded,
    },
  },
  moduleScriptResources: {
    [key: string]: Exists | Preloaded | PreloadedWithCredentials,
  },
};

let currentlyFlushingRenderState: RenderState | null = null;

const dataElementQuotedEnd = stringToPrecomputedChunk('"></template>');

const startInlineScript = stringToPrecomputedChunk('<script');
const endInlineScript = stringToPrecomputedChunk('</script>');

const startScriptSrc = stringToPrecomputedChunk('<script src="');
const startModuleSrc = stringToPrecomputedChunk('<script type="module" src="');
const scriptNonce = stringToPrecomputedChunk(' nonce="');
const scriptIntegirty = stringToPrecomputedChunk(' integrity="');
const scriptCrossOrigin = stringToPrecomputedChunk(' crossorigin="');
const endAsyncScript = stringToPrecomputedChunk(' async=""></script>');

const startInlineStyle = stringToPrecomputedChunk('<style');

/**
 * This escaping function is designed to work with with inline scripts where the entire
 * contents are escaped. Because we know we are escaping the entire script we can avoid for instance
 * escaping html comment string sequences that are valid javascript as well because
 * if there are no subsequent <script sequences the html parser will never enter
 * script data double escaped state (see: https://www.w3.org/TR/html53/syntax.html#script-data-double-escaped-state)
 *
 * While untrusted script content should be made safe before using this api it will
 * ensure that the script cannot be early terminated or never terminated state
 */
function escapeEntireInlineScriptContent(scriptText: string) {
  if (__DEV__) {
    checkHtmlStringCoercion(scriptText);
  }
  return ('' + scriptText).replace(scriptRegex, scriptReplacer);
}
const scriptRegex = /(<\/|<)(s)(cript)/gi;
const scriptReplacer = (
  match: string,
  prefix: string,
  s: string,
  suffix: string,
) => `${prefix}${s === 's' ? '\\u0073' : '\\u0053'}${suffix}`;

export type BootstrapScriptDescriptor = {
  src: string,
  integrity?: string,
  crossOrigin?: string,
};
export type ExternalRuntimeScript = {
  src: string,
  chunks: Array<Chunk | PrecomputedChunk>,
};

const importMapScriptStart = stringToPrecomputedChunk(
  '<script type="importmap">',
);
const importMapScriptEnd = stringToPrecomputedChunk('</script>');

// Since we store headers as strings we deal with their length in utf16 code units
// rather than visual characters or the utf8 encoding that is used for most binary
// serialization. Some common HTTP servers only allow for headers to be 4kB in length.
// We choose a default length that is likely to be well under this already limited length however
// pathological cases may still cause the utf-8 encoding of the headers to approach this limit.
// It should also be noted that this maximum is a soft maximum. we have not reached the limit we will
// allow one more header to be captured which means in practice if the limit is approached it will be exceeded
const DEFAULT_HEADERS_CAPACITY_IN_UTF16_CODE_UNITS = 2000;

let didWarnForNewBooleanPropsWithEmptyValue: {[string]: boolean};
if (__DEV__) {
  didWarnForNewBooleanPropsWithEmptyValue = {};
}

// Allows us to keep track of what we've already written so we can refer back to it.
// if passed externalRuntimeConfig and the enableFizzExternalRuntime feature flag
// is set, the server will send instructions via data attributes (instead of inline scripts)
export function createRenderState(
  resumableState: ResumableState,
  nonce:
    | string
    | {
        script?: string,
        style?: string,
      }
    | void,
  externalRuntimeConfig: string | BootstrapScriptDescriptor | void,
  importMap: ImportMap | void,
  onHeaders: void | ((headers: HeadersDescriptor) => void),
  maxHeadersLength: void | number,
): RenderState {
  const nonceScript = typeof nonce === 'string' ? nonce : nonce && nonce.script;
  const inlineScriptWithNonce =
    nonceScript === undefined
      ? startInlineScript
      : stringToPrecomputedChunk(
          '<script nonce="' + escapeTextForBrowser(nonceScript) + '"',
        );
  const nonceStyle =
    typeof nonce === 'string' ? undefined : nonce && nonce.style;
  const inlineStyleWithNonce =
    nonceStyle === undefined
      ? startInlineStyle
      : stringToPrecomputedChunk(
          '<style nonce="' + escapeTextForBrowser(nonceStyle) + '"',
        );
  const idPrefix = resumableState.idPrefix;

  const bootstrapChunks: Array<Chunk | PrecomputedChunk> = [];
  let externalRuntimeScript: null | ExternalRuntimeScript = null;
  const {bootstrapScriptContent, bootstrapScripts, bootstrapModules} =
    resumableState;
  if (bootstrapScriptContent !== undefined) {
    bootstrapChunks.push(inlineScriptWithNonce);
    pushCompletedShellIdAttribute(bootstrapChunks, resumableState);
    bootstrapChunks.push(
      endOfStartTag,
      stringToChunk(escapeEntireInlineScriptContent(bootstrapScriptContent)),
      endInlineScript,
    );
  }
  if (enableFizzExternalRuntime) {
    if (externalRuntimeConfig !== undefined) {
      if (typeof externalRuntimeConfig === 'string') {
        externalRuntimeScript = {
          src: externalRuntimeConfig,
          chunks: [],
        };
        pushScriptImpl(externalRuntimeScript.chunks, {
          src: externalRuntimeConfig,
          async: true,
          integrity: undefined,
          nonce: nonceScript,
        });
      } else {
        externalRuntimeScript = {
          src: externalRuntimeConfig.src,
          chunks: [],
        };
        pushScriptImpl(externalRuntimeScript.chunks, {
          src: externalRuntimeConfig.src,
          async: true,
          integrity: externalRuntimeConfig.integrity,
          nonce: nonceScript,
        });
      }
    }
  }

  const importMapChunks: Array<Chunk | PrecomputedChunk> = [];
  if (importMap !== undefined) {
    const map = importMap;
    importMapChunks.push(importMapScriptStart);
    importMapChunks.push(
      stringToChunk(escapeEntireInlineScriptContent(JSON.stringify(map))),
    );
    importMapChunks.push(importMapScriptEnd);
  }
  if (__DEV__) {
    if (onHeaders && typeof maxHeadersLength === 'number') {
      if (maxHeadersLength <= 0) {
        console.error(
          'React expected a positive non-zero `maxHeadersLength` option but found %s instead. When using the `onHeaders` option you may supply an optional `maxHeadersLength` option as well however, when setting this value to zero or less no headers will be captured.',
          maxHeadersLength === 0 ? 'zero' : maxHeadersLength,
        );
      }
    }
  }
  const headers = onHeaders
    ? {
        preconnects: '',
        fontPreloads: '',
        highImagePreloads: '',
        remainingCapacity:
          // We seed the remainingCapacity with 2 extra bytes because when we decrement the capacity
          // we always assume we are inserting an interstitial ", " however the first header does not actually
          // consume these two extra bytes.
          2 +
          (typeof maxHeadersLength === 'number'
            ? maxHeadersLength
            : DEFAULT_HEADERS_CAPACITY_IN_UTF16_CODE_UNITS),
      }
    : null;
  const renderState: RenderState = {
    placeholderPrefix: stringToPrecomputedChunk(idPrefix + 'P:'),
    segmentPrefix: stringToPrecomputedChunk(idPrefix + 'S:'),
    boundaryPrefix: stringToPrecomputedChunk(idPrefix + 'B:'),
    startInlineScript: inlineScriptWithNonce,
    startInlineStyle: inlineStyleWithNonce,
    preamble: createPreambleState(),

    externalRuntimeScript: externalRuntimeScript,
    bootstrapChunks: bootstrapChunks,
    importMapChunks,

    onHeaders,
    headers,
    resets: {
      font: {},
      dns: {},
      connect: {
        default: {},
        anonymous: {},
        credentials: {},
      },
      image: {},
      style: {},
    },

    charsetChunks: [],
    viewportChunks: [],
    hoistableChunks: [],

    // cleared on flush
    preconnects: new Set(),
    fontPreloads: new Set(),
    highImagePreloads: new Set(),
    // usedImagePreloads: new Set(),
    styles: new Map(),
    bootstrapScripts: new Set(),
    scripts: new Set(),
    bulkPreloads: new Set(),

    preloads: {
      images: new Map(),
      stylesheets: new Map(),
      scripts: new Map(),
      moduleScripts: new Map(),
    },

    nonce: {
      script: nonceScript,
      style: nonceStyle,
    },
    // like a module global for currently rendering boundary
    hoistableState: null,
    stylesToHoist: false,
  };

  if (bootstrapScripts !== undefined) {
    for (let i = 0; i < bootstrapScripts.length; i++) {
      const scriptConfig = bootstrapScripts[i];
      let src, crossOrigin, integrity;
      const props: PreloadAsProps = {
        rel: 'preload',
        as: 'script',
        fetchPriority: 'low',
        nonce,
      } as any;
      if (typeof scriptConfig === 'string') {
        props.href = src = scriptConfig;
      } else {
        props.href = src = scriptConfig.src;
        props.integrity = integrity =
          typeof scriptConfig.integrity === 'string'
            ? scriptConfig.integrity
            : undefined;
        props.crossOrigin = crossOrigin =
          typeof scriptConfig === 'string' || scriptConfig.crossOrigin == null
            ? undefined
            : scriptConfig.crossOrigin === 'use-credentials'
              ? 'use-credentials'
              : '';
      }

      preloadBootstrapScriptOrModule(resumableState, renderState, src, props);

      bootstrapChunks.push(
        startScriptSrc,
        stringToChunk(escapeTextForBrowser(src)),
        attributeEnd,
      );
      if (nonceScript) {
        bootstrapChunks.push(
          scriptNonce,
          stringToChunk(escapeTextForBrowser(nonceScript)),
          attributeEnd,
        );
      }
      if (typeof integrity === 'string') {
        bootstrapChunks.push(
          scriptIntegirty,
          stringToChunk(escapeTextForBrowser(integrity)),
          attributeEnd,
        );
      }
      if (typeof crossOrigin === 'string') {
        bootstrapChunks.push(
          scriptCrossOrigin,
          stringToChunk(escapeTextForBrowser(crossOrigin)),
          attributeEnd,
        );
      }
      pushCompletedShellIdAttribute(bootstrapChunks, resumableState);
      bootstrapChunks.push(endAsyncScript);
    }
  }
  if (bootstrapModules !== undefined) {
    for (let i = 0; i < bootstrapModules.length; i++) {
      const scriptConfig = bootstrapModules[i];
      let src, crossOrigin, integrity;
      const props: PreloadModuleProps = {
        rel: 'modulepreload',
        fetchPriority: 'low',
        nonce: nonceScript,
      } as any;
      if (typeof scriptConfig === 'string') {
        props.href = src = scriptConfig;
      } else {
        props.href = src = scriptConfig.src;
        props.integrity = integrity =
          typeof scriptConfig.integrity === 'string'
            ? scriptConfig.integrity
            : undefined;
        props.crossOrigin = crossOrigin =
          typeof scriptConfig === 'string' || scriptConfig.crossOrigin == null
            ? undefined
            : scriptConfig.crossOrigin === 'use-credentials'
              ? 'use-credentials'
              : '';
      }

      preloadBootstrapScriptOrModule(resumableState, renderState, src, props);

      bootstrapChunks.push(
        startModuleSrc,
        stringToChunk(escapeTextForBrowser(src)),
        attributeEnd,
      );
      if (nonceScript) {
        bootstrapChunks.push(
          scriptNonce,
          stringToChunk(escapeTextForBrowser(nonceScript)),
          attributeEnd,
        );
      }
      if (typeof integrity === 'string') {
        bootstrapChunks.push(
          scriptIntegirty,
          stringToChunk(escapeTextForBrowser(integrity)),
          attributeEnd,
        );
      }
      if (typeof crossOrigin === 'string') {
        bootstrapChunks.push(
          scriptCrossOrigin,
          stringToChunk(escapeTextForBrowser(crossOrigin)),
          attributeEnd,
        );
      }
      pushCompletedShellIdAttribute(bootstrapChunks, resumableState);
      bootstrapChunks.push(endAsyncScript);
    }
  }

  return renderState;
}

export function resumeRenderState(
  resumableState: ResumableState,
  nonce: NonceOption | void,
): RenderState {
  return createRenderState(
    resumableState,
    nonce,
    undefined,
    undefined,
    undefined,
    undefined,
  );
}

export function createResumableState(
  identifierPrefix: string | void,
  externalRuntimeConfig: string | BootstrapScriptDescriptor | void,
  bootstrapScriptContent: string | void,
  bootstrapScripts: $ReadOnlyArray<string | BootstrapScriptDescriptor> | void,
  bootstrapModules: $ReadOnlyArray<string | BootstrapScriptDescriptor> | void,
): ResumableState {
  const idPrefix = identifierPrefix === undefined ? '' : identifierPrefix;

  let streamingFormat = ScriptStreamingFormat;
  if (enableFizzExternalRuntime) {
    if (externalRuntimeConfig !== undefined) {
      streamingFormat = DataStreamingFormat;
    }
  }
  return {
    idPrefix: idPrefix,
    nextFormID: 0,
    streamingFormat,
    bootstrapScriptContent,
    bootstrapScripts,
    bootstrapModules,
    instructions: NothingSent,
    hasBody: false,
    hasHtml: false,

    // @TODO add bootstrap script to implicit preloads

    // persistent
    unknownResources: {},
    dnsResources: {},
    connectResources: {
      default: {},
      anonymous: {},
      credentials: {},
    },
    imageResources: {},
    styleResources: {},
    scriptResources: {},
    moduleUnknownResources: {},
    moduleScriptResources: {},
  };
}

export function resetResumableState(
  resumableState: ResumableState,
  renderState: RenderState,
): void {
  // Resets the resumable state based on what didn't manage to fully flush in the render state.
  // This currently assumes nothing was flushed.
  resumableState.nextFormID = 0;
  resumableState.hasBody = false;
  resumableState.hasHtml = false;
  resumableState.unknownResources = {
    font: renderState.resets.font,
  };
  resumableState.dnsResources = renderState.resets.dns;
  resumableState.connectResources = renderState.resets.connect;
  resumableState.imageResources = renderState.resets.image;
  resumableState.styleResources = renderState.resets.style;
  resumableState.scriptResources = {};
  resumableState.moduleUnknownResources = {};
  resumableState.moduleScriptResources = {};
  resumableState.instructions = NothingSent; // Nothing was flushed so no instructions could've flushed.
}

export function completeResumableState(resumableState: ResumableState): void {
  // This function is called when we have completed a prerender and there is a shell.
  resumableState.bootstrapScriptContent = undefined;
  resumableState.bootstrapScripts = undefined;
  resumableState.bootstrapModules = undefined;
}

export type PreambleState = {
  htmlChunks: null | Array<Chunk | PrecomputedChunk>,
  headChunks: null | Array<Chunk | PrecomputedChunk>,
  bodyChunks: null | Array<Chunk | PrecomputedChunk>,
};
export function createPreambleState(): PreambleState {
  return {
    htmlChunks: null,
    headChunks: null,
    bodyChunks: null,
  };
}

// Constants for the insertion mode we're currently writing in. We don't encode all HTML5 insertion
// modes. We only include the variants as they matter for the sake of our purposes.
// We don't actually provide the namespace therefore we use constants instead of the string.
export const ROOT_HTML_MODE = 0; // Used for the root most element tag.
// We have a less than HTML_HTML_MODE check elsewhere. If you add more cases here, make sure it
// still makes sense
const HTML_HTML_MODE = 1; // Used for the <html> if it is at the top level.
const HTML_MODE = 2;
const HTML_HEAD_MODE = 3;
const SVG_MODE = 4;
const MATHML_MODE = 5;
const HTML_TABLE_MODE = 6;
const HTML_TABLE_BODY_MODE = 7;
const HTML_TABLE_ROW_MODE = 8;
const HTML_COLGROUP_MODE = 9;
// We have a greater than HTML_TABLE_MODE check elsewhere. If you add more cases here, make sure it
// still makes sense

type InsertionMode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const NO_SCOPE = /*         */ 0b0000000;
const NOSCRIPT_SCOPE = /*   */ 0b0000001;
const PICTURE_SCOPE = /*    */ 0b0000010;
const FALLBACK_SCOPE = /*   */ 0b0000100;
const EXIT_SCOPE = /*       */ 0b0001000; // A direct Instance below a Suspense fallback is the only thing that can "exit"
const ENTER_SCOPE = /*      */ 0b0010000; // A direct Instance below Suspense content is the only thing that can "enter"
const UPDATE_SCOPE = /*     */ 0b0100000; // Inside a scope that applies "update" ViewTransitions if anything mutates here.
const APPEARING_SCOPE = /*  */ 0b1000000; // Below Suspense content subtree which might appear in an "enter" animation or "shared" animation.
const PARENT_EXIT_SCOPE = /* */ 0b10000000; // Below a ViewTransition that is exiting.
const PARENT_ENTER_SCOPE = /* */ 0b100000000; // Below a ViewTransition that is entering.

// Everything not listed here are tracked for the whole subtree as opposed to just
// until the next Instance.
const SUBTREE_SCOPE = ~(ENTER_SCOPE | EXIT_SCOPE);

type ViewTransitionContext = {
  update: 'none' | 'auto' | string,
  enter: 'none' | 'auto' | string,
  exit: 'none' | 'auto' | string,
  share: 'none' | 'auto' | string,
  parentEnter: 'none' | 'auto' | string,
  parentExit: 'none' | 'auto' | string,
  name: 'auto' | string,
  autoName: string, // a name that can be used if an explicit one is not defined.
  nameIdx: number, // keeps track of how many duplicates of this name we've emitted.
};

// Lets us keep track of contextual state and pick it back up after suspending.
export type FormatContext = {
  insertionMode: InsertionMode, // root/svg/html/mathml/table
  selectedValue: null | string | Array<string>, // the selected value(s) inside a <select>, or null outside <select>
  tagScope: number,
  viewTransition: null | ViewTransitionContext, // tracks if we're inside a ViewTransition outside the first DOM node
};

function createFormatContext(
  insertionMode: InsertionMode,
  selectedValue: null | string | Array<string>,
  tagScope: number,
  viewTransition: null | ViewTransitionContext,
): FormatContext {
  return {
    insertionMode,
    selectedValue,
    tagScope,
    viewTransition,
  };
}

export function canHavePreamble(formatContext: FormatContext): boolean {
  return formatContext.insertionMode < HTML_MODE;
}

export function createRootFormatContext(namespaceURI?: string): FormatContext {
  const insertionMode =
    namespaceURI === 'http://www.w3.org/2000/svg'
      ? SVG_MODE
      : namespaceURI === 'http://www.w3.org/1998/Math/MathML'
        ? MATHML_MODE
        : ROOT_HTML_MODE;
  return createFormatContext(insertionMode, null, NO_SCOPE, null);
}

export function getChildFormatContext(
  parentContext: FormatContext,
  type: string,
  props: Object,
): FormatContext {
  const subtreeScope = parentContext.tagScope & SUBTREE_SCOPE;
  switch (type) {
    case 'noscript':
      return createFormatContext(
        HTML_MODE,
        null,
        subtreeScope | NOSCRIPT_SCOPE,
        null,
      );
    case 'select':
      return createFormatContext(
        HTML_MODE,
        props.value != null ? props.value : props.defaultValue,
        subtreeScope,
        null,
      );
    case 'svg':
      return createFormatContext(SVG_MODE, null, subtreeScope, null);
    case 'picture':
      return createFormatContext(
        HTML_MODE,
        null,
        subtreeScope | PICTURE_SCOPE,
        null,
      );
    case 'math':
      return createFormatContext(MATHML_MODE, null, subtreeScope, null);
    case 'foreignObject':
      return createFormatContext(HTML_MODE, null, subtreeScope, null);
    // Table parents are special in that their children can only be created at all if they're
    // wrapped in a table parent. So we need to encode that we're entering this mode.
    case 'table':
      return createFormatContext(HTML_TABLE_MODE, null, subtreeScope, null);
    case 'thead':
    case 'tbody':
    case 'tfoot':
      return createFormatContext(
        HTML_TABLE_BODY_MODE,
        null,
        subtreeScope,
        null,
      );
    case 'colgroup':
      return createFormatContext(HTML_COLGROUP_MODE, null, subtreeScope, null);
    case 'tr':
      return createFormatContext(HTML_TABLE_ROW_MODE, null, subtreeScope, null);
    case 'head':
      if (parentContext.insertionMode < HTML_MODE) {
        // We are either at the root or inside the <html> tag and can enter
        // the <head> scope
        return createFormatContext(HTML_HEAD_MODE, null, subtreeScope, null);
      }
      break;
    case 'html':
      if (parentContext.insertionMode === ROOT_HTML_MODE) {
        return createFormatContext(HTML_HTML_MODE, null, subtreeScope, null);
      }
      break;
  }
  if (parentContext.insertionMode >= HTML_TABLE_MODE) {
    // Whatever tag this was, it wasn't a table parent or other special parent, so we must have
    // entered plain HTML again.
    return createFormatContext(HTML_MODE, null, subtreeScope, null);
  }
  if (parentContext.insertionMode < HTML_MODE) {
    return createFormatContext(HTML_MODE, null, subtreeScope, null);
  }
  if (enableViewTransition) {
    if (parentContext.viewTransition !== null) {
      // If we're inside a view transition, regardless what element we were in, it consumes
      // the view transition context.
      return createFormatContext(
        parentContext.insertionMode,
        parentContext.selectedValue,
        subtreeScope,
        null,
      );
    }
  }
  if (parentContext.tagScope !== subtreeScope) {
    return createFormatContext(
      parentContext.insertionMode,
      parentContext.selectedValue,
      subtreeScope,
      null,
    );
  }
  return parentContext;
}

function getSuspenseViewTransition(
  parentViewTransition: null | ViewTransitionContext,
): null | ViewTransitionContext {
  if (parentViewTransition === null) {
    return null;
  }
  // If a ViewTransition wraps a Suspense boundary it applies to the children Instances
  // in both the fallback and the content.
  // Since we only have a representation of ViewTransitions on the Instances themselves
  // we cannot model the parent ViewTransition activating "enter", "exit" or "share"
  // since those would be ambiguous with the Suspense boundary changing states and
  // affecting the same Instances.
  // We also can't model an "update" when that update is fallback nodes swapping for
  // content nodes. However, we can model is as a "share" from the fallback nodes to
  // the content nodes using the same name. We just have to assign the same name that
  // we would've used (the parent ViewTransition name or auto-assign one).
  const viewTransition: ViewTransitionContext = {
    update: parentViewTransition.update, // For deep updates.
    enter: 'none',
    exit: 'none',
    share: parentViewTransition.update, // For exit or enter of reveals.
    parentEnter: 'none',
    parentExit: 'none',
    name: parentViewTransition.autoName,
    autoName: parentViewTransition.autoName,
    // TOOD: If we have more than just this Suspense boundary as a child of the ViewTransition
    // then the parent needs to isolate the names so that they don't conflict.
    nameIdx: 0,
  };
  return viewTransition;
}

export function getSuspenseFallbackFormatContext(
  resumableState: ResumableState,
  parentContext: FormatContext,
): FormatContext {
  if (parentContext.tagScope & UPDATE_SCOPE) {
    // If we're rendering a Suspense in fallback mode and that is inside a ViewTransition,
    // which hasn't disabled updates, then revealing it might animate the parent so we need
    // the ViewTransition instructions.
    resumableState.instructions |= NeedUpgradeToViewTransitions;
  }
  return createFormatContext(
    parentContext.insertionMode,
    parentContext.selectedValue,
    parentContext.tagScope | FALLBACK_SCOPE | EXIT_SCOPE,
    getSuspenseViewTransition(parentContext.viewTransition),
  );
}

export function getSuspenseContentFormatContext(
  resumableState: ResumableState,
  parentContext: FormatContext,
): FormatContext {
  const viewTransition = getSuspenseViewTransition(
    parentContext.viewTransition,
  );
  let subtreeScope = parentContext.tagScope | ENTER_SCOPE;
  if (viewTransition !== null && viewTransition.share !== 'none') {
    // If we have a ViewTransition wrapping Suspense then the appearing animation
    // will be applied just like an "enter" below. Mark it as animating.
    subtreeScope |= APPEARING_SCOPE;
  }
  return createFormatContext(
    parentContext.insertionMode,
    parentContext.selectedValue,
    subtreeScope,
    viewTransition,
  );
}

export function getViewTransitionFormatContext(
  resumableState: ResumableState,
  parentContext: FormatContext,
  update: ?string,
  enter: ?string,
  exit: ?string,
  share: ?string,
  parentEnter: ?string,
  parentExit: ?string,
  hasParentEnterHandler: boolean,
  hasParentExitHandler: boolean,
  name: ?string,
  autoName: string, // name or an autogenerated unique name
): FormatContext {
  // We're entering a <ViewTransition>. Normalize props.
  if (update == null) {
    update = 'auto';
  }
  if (enter == null) {
    enter = 'auto';
  }
  if (exit == null) {
    exit = 'auto';
  }
  if (name == null) {
    const parentViewTransition = parentContext.viewTransition;
    if (parentViewTransition !== null) {
      // If we have multiple nested ViewTransition and the parent has a "share"
      // but the child doesn't, then the parent ViewTransition can still activate
      // a share scenario so we reuse the name and share from the parent.
      name = parentViewTransition.name;
      share = parentViewTransition.share;
    } else {
      name = 'auto';
      share = 'none'; // share is only relevant if there's an explicit name
    }
  } else {
    if (share == null) {
      share = 'auto';
    }
    if (parentContext.tagScope & FALLBACK_SCOPE) {
      // If we have an explicit name and share is not disabled, and we're inside
      // a fallback, then that fallback might pair with content and so we might need
      // the ViewTransition instructions to animate between them.
      resumableState.instructions |= NeedUpgradeToViewTransitions;
    }
  }
  if (!(parentContext.tagScope & EXIT_SCOPE)) {
    exit = 'none'; // exit is only relevant for the first ViewTransition inside fallback
  } else {
    resumableState.instructions |= NeedUpgradeToViewTransitions;
  }
  if (!(parentContext.tagScope & ENTER_SCOPE)) {
    enter = 'none'; // enter is only relevant for the first ViewTransition inside content
  } else {
    resumableState.instructions |= NeedUpgradeToViewTransitions;
  }
  let resolvedParentEnter = 'none';
  let resolvedParentExit = 'none';
  if (enableViewTransitionParentEnterExit) {
    if (
      parentEnter != null &&
      (parentContext.tagScope & PARENT_ENTER_SCOPE) !== 0
    ) {
      resolvedParentEnter = parentEnter;
    }
    if (
      parentExit != null &&
      (parentContext.tagScope & PARENT_EXIT_SCOPE) !== 0
    ) {
      resolvedParentExit = parentExit;
    }
  }
  const viewTransition: ViewTransitionContext = {
    update,
    enter,
    exit,
    share,
    parentEnter: resolvedParentEnter,
    parentExit: resolvedParentExit,
    name,
    autoName,
    nameIdx: 0,
  };
  let subtreeScope = parentContext.tagScope & SUBTREE_SCOPE;
  if (update !== 'none') {
    subtreeScope |= UPDATE_SCOPE;
  } else {
    subtreeScope &= ~UPDATE_SCOPE;
  }
  if (enter !== 'none') {
    subtreeScope |= APPEARING_SCOPE;
  }
  if (enableViewTransitionParentEnterExit) {
    // Parent enter relay: a ViewTransition that is itself entering starts a relay
    // for its subtree. A nested ViewTransition continues that relay as long as it
    // opts in with a parentEnter prop that doesn't resolve to "none", or with an
    // onParentEnter handler. A missing parentEnter (with no handler) or an
    // explicit "none" stops the relay so descendants below it don't participate.
    // This mirrors commitParentEnterViewTransitions.
    if (enter !== 'none') {
      subtreeScope |= PARENT_ENTER_SCOPE;
    } else if (
      (parentContext.tagScope & PARENT_ENTER_SCOPE) !== 0 &&
      (parentEnter === 'none' ||
        (parentEnter === undefined && !hasParentEnterHandler))
    ) {
      subtreeScope &= ~PARENT_ENTER_SCOPE;
    }
    // Parent exit relay: mirror of the enter relay above.
    if (exit !== 'none') {
      subtreeScope |= PARENT_EXIT_SCOPE;
    } else if (
      (parentContext.tagScope & PARENT_EXIT_SCOPE) !== 0 &&
      (parentExit === 'none' ||
        (parentExit === undefined && !hasParentExitHandler))
    ) {
      subtreeScope &= ~PARENT_EXIT_SCOPE;
    }
  }
  return createFormatContext(
    parentContext.insertionMode,
    parentContext.selectedValue,
    subtreeScope,
    viewTransition,
  );
}

export function isPreambleContext(formatContext: FormatContext): boolean {
  return formatContext.insertionMode === HTML_HEAD_MODE;
}

export function makeId(
  resumableState: ResumableState,
  treeId: string,
  localId: number,
): string {
  const idPrefix = resumableState.idPrefix;

  let id = '_' + idPrefix + 'R_' + treeId;

  // Unless this is the first id at this level, append a number at the end
  // that represents the position of this useId hook among all the useId
  // hooks for this fiber.
  if (localId > 0) {
    id += 'H' + localId.toString(32);
  }

  return id + '_';
}

function encodeHTMLTextNode(text: string): string {
  return escapeTextForBrowser(text);
}

const textSeparator = stringToPrecomputedChunk('<!-- -->');

export function pushTextInstance(
  target: Array<Chunk | PrecomputedChunk>,
  text: string,
  renderState: RenderState,
  textEmbedded: boolean,
): boolean {
  if (text === '') {
    // Empty text doesn't have a DOM node representation and the hydration is aware of this.
    return textEmbedded;
  }
  if (textEmbedded) {
    target.push(textSeparator);
  }
  target.push(stringToChunk(encodeHTMLTextNode(text)));
  return true;
}

// Called when Fizz is done with a Segment. Currently the only purpose is to conditionally
// emit a text separator when we don't know for sure it is safe to omit
export function pushSegmentFinale(
  target: Array<Chunk | PrecomputedChunk>,
  renderState: RenderState,
  lastPushedText: boolean,
  textEmbedded: boolean,
): void {
  if (lastPushedText && textEmbedded) {
    target.push(textSeparator);
  }
}

function pushViewTransitionAttributes(
  target: Array<Chunk | PrecomputedChunk>,
  formatContext: FormatContext,
): void {
  if (!enableViewTransition) {
    return;
  }
  const viewTransition = formatContext.viewTransition;
  if (viewTransition === null) {
    return;
  }
  if (viewTransition.name !== 'auto') {
    pushStringAttribute(
      target,
      'vt-name',
      viewTransition.nameIdx === 0
        ? viewTransition.name
        : viewTransition.name + '_' + viewTransition.nameIdx,
    );
    // Increment the index in case we have multiple children to the same ViewTransition.
    // Because this is a side-effect in render, we should ideally call pushViewTransitionAttributes
    // after we've suspended (like forms do), so that we don't increment each attempt.
    // TODO: Make this deterministic.
    viewTransition.nameIdx++;
  }
  pushStringAttribute(target, 'vt-update', viewTransition.update);
  if (viewTransition.enter !== 'none') {
    pushStringAttribute(target, 'vt-enter', viewTransition.enter);
  }
  if (viewTransition.exit !== 'none') {
    pushStringAttribute(target, 'vt-exit', viewTransition.exit);
  }
  if (viewTransition.share !== 'none') {
    pushStringAttribute(target, 'vt-share', viewTransition.share);
  }
  if (
    enableViewTransitionParentEnterExit &&
    viewTransition.parentEnter !== 'none'
  ) {
    pushStringAttribute(target, 'vt-parent-enter', viewTransition.parentEnter);
  }
  if (
    enableViewTransitionParentEnterExit &&
    viewTransition.parentExit !== 'none'
  ) {
    pushStringAttribute(target, 'vt-parent-exit', viewTransition.parentExit);
  }
}

const styleNameCache: Map<string, PrecomputedChunk> = new Map();
function processStyleName(styleName: string): PrecomputedChunk {
  const chunk = styleNameCache.get(styleName);
  if (chunk !== undefined) {
    return chunk;
  }
  const result = stringToPrecomputedChunk(
    escapeTextForBrowser(hyphenateStyleName(styleName)),
  );
  styleNameCache.set(styleName, result);
  return result;
}

const styleAttributeStart = stringToPrecomputedChunk(' style="');
const styleAssign = stringToPrecomputedChunk(':');
const styleSeparator = stringToPrecomputedChunk(';');

function pushStyleAttribute(
  target: Array<Chunk | PrecomputedChunk>,
  style: Object,
): void {
  if (typeof style !== 'object') {
    throw new Error(
      'The `style` prop expects a mapping from style properties to values, ' +
        "not a string. For example, style={{marginRight: spacing + 'em'}} when " +
        'using JSX.',
    );
  }

  let isFirst = true;
  for (const styleName in style) {
    if (!hasOwnProperty.call(style, styleName)) {
      continue;
    }
    // If you provide unsafe user data here they can inject arbitrary CSS
    // which may be problematic (I couldn't repro this):
    // https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet
    // http://www.thespanner.co.uk/2007/11/26/ultimate-xss-css-injection/
    // This is not an XSS hole but instead a potential CSS injection issue
    // which has lead to a greater discussion about how we're going to
    // trust URLs moving forward. See #2115901
    const styleValue = style[styleName];
    if (
      styleValue == null ||
      typeof styleValue === 'boolean' ||
      styleValue === ''
    ) {
      // TODO: We used to set empty string as a style with an empty value. Does that ever make sense?
      continue;
    }

    let nameChunk;
    let valueChunk;
    const isCustomProperty = styleName.indexOf('--') === 0;
    if (isCustomProperty) {
      nameChunk = stringToChunk(escapeTextForBrowser(styleName));
      if (__DEV__) {
        checkCSSPropertyStringCoercion(styleValue, styleName);
      }
      valueChunk = stringToChunk(
        escapeTextForBrowser(('' + styleValue).trim()),
      );
    } else {
      if (__DEV__) {
        warnValidStyle(styleName, styleValue);
      }

      nameChunk = processStyleName(styleName);
      if (typeof styleValue === 'number') {
        if (styleValue !== 0 && !isUnitlessNumber(styleName)) {
          valueChunk = stringToChunk(styleValue + 'px'); // Presumes implicit 'px' suffix for unitless numbers
        } else {
          valueChunk = stringToChunk('' + styleValue);
        }
      } else {
        if (__DEV__) {
          checkCSSPropertyStringCoercion(styleValue, styleName);
        }
        valueChunk = stringToChunk(
          escapeTextForBrowser(('' + styleValue).trim()),
        );
      }
    }
    if (isFirst) {
      isFirst = false;
      // If it's first, we don't need any separators prefixed.
      target.push(styleAttributeStart, nameChunk, styleAssign, valueChunk);
    } else {
      target.push(styleSeparator, nameChunk, styleAssign, valueChunk);
    }
  }
  if (!isFirst) {
    target.push(attributeEnd);
  }
}

const attributeSeparator = stringToPrecomputedChunk(' ');
const attributeAssign = stringToPrecomputedChunk('="');
const attributeEnd = stringToPrecomputedChunk('"');
const attributeEmptyString = stringToPrecomputedChunk('=""');

function pushBooleanAttribute(
  target: Array<Chunk | PrecomputedChunk>,
  name: string,
  value: string | boolean | number | Function | Object, // not null or undefined
): void {
  if (value && typeof value !== 'function' && typeof value !== 'symbol') {
    target.push(attributeSeparator, stringToChunk(name), attributeEmptyString);
  }
}

function pushStringAttribute(
  target: Array<Chunk | PrecomputedChunk>,
  name: string,
  value: string | boolean | number | Function | Object, // not null or undefined
): void {
  if (
    typeof value !== 'function' &&
    typeof value !== 'symbol' &&
    typeof value !== 'boolean'
  ) {
    target.push(
      attributeSeparator,
      stringToChunk(name),
      attributeAssign,
      stringToChunk(escapeTextForBrowser(value)),
      attributeEnd,
    );
  }
}

function makeFormFieldPrefix(resumableState: ResumableState): string {
  // TODO: Make this deterministic.
  const id = resumableState.nextFormID++;
  return resumableState.idPrefix + id;
}

// Since this will likely be repeated a lot in the HTML, we use a more concise message
// than on the client and hopefully it's googleable.
const actionJavaScriptURL = stringToPrecomputedChunk(
  escapeTextForBrowser(
    // eslint-disable-next-line no-script-url
    "javascript:throw new Error('React form unexpectedly submitted.')",
  ),
);

const startHiddenInputChunk = stringToPrecomputedChunk('<input type="hidden"');

function pushAdditionalFormField(
  this: Array<Chunk | PrecomputedChunk>,
  value: string | File,
  key: string,
): void {
  const target: Array<Chunk | PrecomputedChunk> = this;
  target.push(startHiddenInputChunk);
  validateAdditionalFormField(value, key);
  pushStringAttribute(target, 'name', key);
  pushStringAttribute(target, 'value', value);
  target.push(endOfStartTagSelfClosing);
}

function pushAdditionalFormFields(
  target: Array<Chunk | PrecomputedChunk>,
  formData: void | null | FormData,
) {
  if (formData != null) {
    // $FlowFixMe[prop-missing]: FormData has forEach.
    formData.forEach(pushAdditionalFormField, target);
  }
}

function validateAdditionalFormField(value: string | File, key: string): void {
  if (typeof value !== 'string') {
    throw new Error(
      'File/Blob fields are not yet supported in progressive forms. ' +
        'Will fallback to client hydration.',
    );
  }
}

function validateAdditionalFormFields(formData: void | null | FormData) {
  if (formData != null) {
    // $FlowFixMe[prop-missing]: FormData has forEach.
    formData.forEach(validateAdditionalFormField);
  }
  return formData;
}

function getCustomFormFields(
  resumableState: ResumableState,
  formAction: any,
): null | ReactCustomFormAction {
  const customAction = formAction.$$FORM_ACTION;
  if (typeof customAction === 'function') {
    const prefix = makeFormFieldPrefix(resumableState);
    try {
      const customFields = formAction.$$FORM_ACTION(prefix);
      if (customFields) {
        validateAdditionalFormFields(customFields.data);
      }
      return customFields;
    } catch (x) {
      if (typeof x === 'object' && x !== null && typeof x.then === 'function') {
        // Rethrow suspense.
        throw x;
      }
      // If we fail to encode the form action for progressive enhancement for some reason,
      // fallback to trying replaying on the client instead of failing the page. It might
      // work there.
      if (__DEV__) {
        // TODO: Should this be some kind of recoverable error?
        console.error(
          'Failed to serialize an action for progressive enhancement:\n%s',
          x,
        );
      }
    }
  }
  return null;
}

function pushFormActionAttribute(
  target: Array<Chunk | PrecomputedChunk>,
  resumableState: ResumableState,
  renderState: RenderState,
  formAction: any,
  formEncType: any,
  formMethod: any,
  formTarget: any,
  name: any,
): void | null | FormData {
  let formData = null;
  if (typeof formAction === 'function') {
    // Function form actions cannot control the form properties
    if (__DEV__) {
      if (name !== null && !didWarnFormActionName) {
        didWarnFormActionName = true;
        console.error(
          'Cannot specify a "name" prop for a button that specifies a function as a formAction. ' +
            'React needs it to encode which action should be invoked. It will get overridden.',
        );
      }
      if (
        (formEncType !== null || formMethod !== null) &&
        !didWarnFormActionMethod
      ) {
        didWarnFormActionMethod = true;
        console.error(
          'Cannot specify a formEncType or formMethod for a button that specifies a ' +
            'function as a formAction. React provides those automatically. They will get overridden.',
        );
      }
      if (formTarget !== null && !didWarnFormActionTarget) {
        didWarnFormActionTarget = true;
        console.error(
          'Cannot specify a formTarget for a button that specifies a function as a formAction. ' +
            'The function will always be executed in the same window.',
        );
      }
    }
    const customFields = getCustomFormFields(resumableState, formAction);
    if (customFields !== null) {
      // This action has a custom progressive enhancement form that can submit the form
      // back to the server if it's invoked before hydration. Such as a Server Action.
      name = customFields.name;
      formAction = customFields.action || '';
      formEncType = customFields.encType;
      formMethod = customFields.method;
      formTarget = customFields.target;
      formData = customFields.data;
    } else {
      // Set a javascript URL that doesn't do anything. We don't expect this to be invoked
      // because we'll preventDefault in the Fizz runtime, but it can happen if a form is
      // manually submitted or if someone calls stopPropagation before React gets the event.
      // If CSP is used to block javascript: URLs that's fine too. It just won't show this
      // error message but the URL will be logged.
      target.push(
        attributeSeparator,
        stringToChunk('formAction'),
        attributeAssign,
        actionJavaScriptURL,
        attributeEnd,
      );
      name = null;
      formAction = null;
      formEncType = null;
      formMethod = null;
      formTarget = null;
      injectFormReplayingRuntime(resumableState, renderState);
    }
  }
  if (name != null) {
    pushAttribute(target, 'name', name);
  }
  if (formAction != null) {
    pushAttribute(target, 'formAction', formAction);
  }
  if (formEncType != null) {
    pushAttribute(target, 'formEncType', formEncType);
  }
  if (formMethod != null) {
    pushAttribute(target, 'formMethod', formMethod);
  }
  if (formTarget != null) {
    pushAttribute(target, 'formTarget', formTarget);
  }
  return formData;
}

let blobCache: null | WeakMap<Blob, Thenable<string>> = null;

function pushSrcObjectAttribute(
  target: Array<Chunk | PrecomputedChunk>,
  blob: Blob,
): void {
  // Throwing a Promise style suspense read of the Blob content.
  if (blobCache === null) {
    blobCache = new WeakMap();
  }
  const suspenseCache: WeakMap<Blob, Thenable<string>> = blobCache;
  let thenable = suspenseCache.get(blob);
  if (thenable === undefined) {
    thenable = readAsDataURL(blob) as any as Thenable<string>;
    thenable.then(
      result => {
        (thenable as any).status = 'fulfilled';
        (thenable as any).value = result;
      },
      error => {
        (thenable as any).status = 'rejected';
        (thenable as any).reason = error;
      },
    );
    suspenseCache.set(blob, thenable);
  }
  if (thenable.status === 'rejected') {
    throw thenable.reason;
  } else if (thenable.status !== 'fulfilled') {
    throw thenable;
  }
  const url = thenable.value;
  target.push(
    attributeSeparator,
    stringToChunk('src'),
    attributeAssign,
    stringToChunk(escapeTextForBrowser(url)),
    attributeEnd,
  );
}

function pushAttribute(
  target: Array<Chunk | PrecomputedChunk>,
  name: string,
  value: string | boolean | number | Function | Object, // not null or undefined
): void {
  switch (name) {
    // These are very common props and therefore are in the beginning of the switch.
    // TODO: aria-label is a very common prop but allows booleans so is not like the others
    // but should ideally go in this list too.
    case 'className': {
      pushStringAttribute(target, 'class', value);
      break;
    }
    case 'tabIndex': {
      pushStringAttribute(target, 'tabindex', value);
      break;
    }
    case 'dir':
    case 'role':
    case 'viewBox':
    case 'width':
    case 'height': {
      pushStringAttribute(target, name, value);
      break;
    }
    case 'style': {
      pushStyleAttribute(target, value);
      return;
    }
    case 'src': {
      // $FlowFixMe[invalid-compare]
      if (enableSrcObject && typeof value === 'object' && value !== null) {
        if (typeof Blob === 'function' && value instanceof Blob) {
          pushSrcObjectAttribute(target, value);
          return;
        }
      }
      // Fallthrough to general urls
    }
    case 'href': {
      if (value === '') {
        if (__DEV__) {
          if (name === 'src') {
            console.error(
              'An empty string ("") was passed to the %s attribute. ' +
                'This may cause the browser to download the whole page again over the network. ' +
                'To fix this, either do not render the element at all ' +
                'or pass null to %s instead of an empty string.',
              name,
              name,
            );
          } else {
            console.error(
              'An empty string ("") was passed to the %s attribute. ' +
                'To fix this, either do not render the element at all ' +
                'or pass null to %s instead of an empty string.',
              name,
              name,
            );
          }
        }
        return;
      }
    }
    // Fall through to the last case which shouldn't remove empty strings.
    case 'action':
    case 'formAction': {
      // TODO: Consider only special casing these for each tag.
      if (
        value == null ||
        typeof value === 'function' ||
        typeof value === 'symbol' ||
        typeof value === 'boolean'
      ) {
        return;
      }
      if (__DEV__) {
        checkAttributeStringCoercion(value, name);
      }
      const sanitizedValue = sanitizeURL('' + value);
      target.push(
        attributeSeparator,
        stringToChunk(name),
        attributeAssign,
        stringToChunk(escapeTextForBrowser(sanitizedValue)),
        attributeEnd,
      );
      return;
    }
    case 'defaultValue':
    case 'defaultChecked': // These shouldn't be set as attributes on generic HTML elements.
    case 'innerHTML': // Must use dangerouslySetInnerHTML instead.
    case 'suppressContentEditableWarning':
    case 'suppressHydrationWarning':
    case 'ref':
      // Ignored. These are built-in to React on the client.
      return;
    case 'autoFocus':
    case 'multiple':
    case 'muted': {
      pushBooleanAttribute(target, name.toLowerCase(), value);
      return;
    }
    case 'xlinkHref': {
      if (
        typeof value === 'function' ||
        typeof value === 'symbol' ||
        typeof value === 'boolean'
      ) {
        return;
      }
      if (__DEV__) {
        checkAttributeStringCoercion(value, name);
      }
      const sanitizedValue = sanitizeURL('' + value);
      target.push(
        attributeSeparator,
        stringToChunk('xlink:href'),
        attributeAssign,
        stringToChunk(escapeTextForBrowser(sanitizedValue)),
        attributeEnd,
      );
      return;
    }
    case 'contentEditable':
    case 'spellCheck':
    case 'draggable':
    case 'value':
    case 'autoReverse':
    case 'externalResourcesRequired':
    case 'focusable':
    case 'preserveAlpha': {
      // Booleanish String
      // These are "enumerated" attributes that accept "true" and "false".
      // In React, we let users pass `true` and `false` even though technically
      // these aren't boolean attributes (they are coerced to strings).
      if (typeof value !== 'function' && typeof value !== 'symbol') {
        target.push(
          attributeSeparator,
          stringToChunk(name),
          attributeAssign,
          stringToChunk(escapeTextForBrowser(value)),
          attributeEnd,
        );
      }
      return;
    }
    case 'inert': {
      if (__DEV__) {
        if (value === '' && !didWarnForNewBooleanPropsWithEmptyValue[name]) {
          didWarnForNewBooleanPropsWithEmptyValue[name] = true;
          console.error(
            'Received an empty string for a boolean attribute `%s`. ' +
              'This will treat the attribute as if it were false. ' +
              'Either pass `false` to silence this warning, or ' +
              'pass `true` if you used an empty string in earlier versions of React to indicate this attribute is true.',
            name,
          );
        }
      }
    }
    // Fallthrough for boolean props that don't have a warning for empty strings.
    case 'allowFullScreen':
    case 'async':
    case 'autoPlay':
    case 'controls':
    case 'credentialless':
    case 'default':
    case 'defer':
    case 'disabled':
    case 'disablePictureInPicture':
    case 'disableRemotePlayback':
    case 'formNoValidate':
    case 'hidden':
    case 'loop':
    case 'noModule':
    case 'noValidate':
    case 'open':
    case 'playsInline':
    case 'readOnly':
    case 'required':
    case 'reversed':
    case 'scoped':
    case 'seamless':
    case 'itemScope': {
      // Boolean
      if (value && typeof value !== 'function' && typeof value !== 'symbol') {
        target.push(
          attributeSeparator,
          stringToChunk(name),
          attributeEmptyString,
        );
      }
      return;
    }
    case 'capture':
    case 'download': {
      // Overloaded Boolean
      if (value === true) {
        target.push(
          attributeSeparator,
          stringToChunk(name),
          attributeEmptyString,
        );
      } else if (value === false) {
        // Ignored
      } else if (typeof value !== 'function' && typeof value !== 'symbol') {
        target.push(
          attributeSeparator,
          stringToChunk(name),
          attributeAssign,
          stringToChunk(escapeTextForBrowser(value)),
          attributeEnd,
        );
      }
      return;
    }
    case 'cols':
    case 'rows':
    case 'size':
    case 'span': {
      // These are HTML attributes that must be positive numbers.
      if (
        typeof value !== 'function' &&
        typeof value !== 'symbol' &&
        !isNaN(value) &&
        (value as any) >= 1
      ) {
        target.push(
          attributeSeparator,
          stringToChunk(name),
          attributeAssign,
          stringToChunk(escapeTextForBrowser(value)),
          attributeEnd,
        );
      }
      return;
    }
    case 'rowSpan':
    case 'start': {
      // These are HTML attributes that must be numbers.
      if (
        typeof value !== 'function' &&
        typeof value !== 'symbol' &&
        !isNaN(value)
      ) {
        target.push(
          attributeSeparator,
          stringToChunk(name),
          attributeAssign,
          stringToChunk(escapeTextForBrowser(value)),
          attributeEnd,
        );
      }
      return;
    }
    case 'xlinkActuate':
      pushStringAttribute(target, 'xlink:actuate', value);
      return;
    case 'xlinkArcrole':
      pushStringAttribute(target, 'xlink:arcrole', value);
      return;
    case 'xlinkRole':
      pushStringAttribute(target, 'xlink:role', value);
      return;
    case 'xlinkShow':
      pushStringAttribute(target, 'xlink:show', value);
      return;
    case 'xlinkTitle':
      pushStringAttribute(target, 'xlink:title', value);
      return;
    case 'xlinkType':
      pushStringAttribute(target, 'xlink:type', value);
      return;
    case 'xmlBase':
      pushStringAttribute(target, 'xml:base', value);
      return;
    case 'xmlLang':
      pushStringAttribute(target, 'xml:lang', value);
      return;
    case 'xmlSpace':
      pushStringAttribute(target, 'xml:space', value);
      return;
    default:
      if (
        // shouldIgnoreAttribute
        // We have already filtered out null/undefined and reserved words.
        name.length > 2 &&
        (name[0] === 'o' || name[0] === 'O') &&
        (name[1] === 'n' || name[1] === 'N')
      ) {
        return;
      }

      const attributeName = getAttributeAlias(name);
      if (isAttributeNameSafe(attributeName)) {
        // shouldRemoveAttribute
        switch (typeof value) {
          case 'function':
          case 'symbol':
            return;
          case 'boolean': {
            const prefix = attributeName.toLowerCase().slice(0, 5);
            if (prefix !== 'data-' && prefix !== 'aria-') {
              return;
            }
          }
        }
        target.push(
          attributeSeparator,
          stringToChunk(attributeName),
          attributeAssign,
          stringToChunk(escapeTextForBrowser(value)),
          attributeEnd,
        );
      }
  }
}

const endOfStartTag = stringToPrecomputedChunk('>');
const endOfStartTagSelfClosing = stringToPrecomputedChunk('/>');

function pushInnerHTML(
  target: Array<Chunk | PrecomputedChunk>,
  innerHTML: any,
  children: any,
) {
  if (innerHTML != null) {
    if (children != null) {
      throw new Error(
        'Can only set one of `children` or `props.dangerouslySetInnerHTML`.',
      );
    }

    if (typeof innerHTML !== 'object' || !('__html' in innerHTML)) {
      throw new Error(
        '`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. ' +
          'Please visit https://react.dev/link/dangerously-set-inner-html ' +
          'for more information.',
      );
    }

    const html = innerHTML.__html;
    if (html !== null && html !== undefined) {
      if (__DEV__) {
        checkHtmlStringCoercion(html);
      }
      target.push(stringToChunk('' + html));
    }
  }
}

// TODO: Move these to RenderState so that we warn for every request.
// It would help debugging in stateful servers (e.g. service worker).
let didWarnDefaultInputValue = false;
let didWarnDefaultChecked = false;
let didWarnDefaultSelectValue = false;
let didWarnDefaultTextareaValue = false;
let didWarnInvalidOptionChildren = false;
let didWarnInvalidOptionInnerHTML = false;
let didWarnSelectedSetOnOption = false;
let didWarnFormActionType = false;
let didWarnFormActionName = false;
let didWarnFormActionTarget = false;
let didWarnFormActionMethod = false;

function checkSelectProp(props: any, propName: string) {
  if (__DEV__) {
    const value = props[propName];
    if (value != null) {
      const array = isArray(value);
      if (props.multiple && !array) {
        console.error(
          'The `%s` prop supplied to <select> must be an array if ' +
            '`multiple` is true.',
          propName,
        );
      } else if (!props.multiple && array) {
        console.error(
          'The `%s` prop supplied to <select> must be a scalar ' +
            'value if `multiple` is false.',
          propName,
        );
      }
    }
  }
}

function pushStartAnchor(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  formatContext: FormatContext,
): ReactNodeList {
  target.push(startChunkForTag('a'));

  let children = null;
  let innerHTML = null;
  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
          children = propValue;
          break;
        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;
        case 'href':
          if (propValue === '') {
            // Empty `href` is special on anchors so we're short-circuiting here.
            // On other tags it should trigger a warning
            pushStringAttribute(target, 'href', '');
          } else {
            pushAttribute(target, propKey, propValue);
          }
          break;
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  pushViewTransitionAttributes(target, formatContext);

  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, children);
  if (typeof children === 'string') {
    // Special case children as a string to avoid the unnecessary comment.
    // TODO: Remove this special case after the general optimization is in place.
    target.push(stringToChunk(encodeHTMLTextNode(children)));
    return null;
  }
  return children;
}

function pushStartObject(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  formatContext: FormatContext,
): ReactNodeList {
  target.push(startChunkForTag('object'));

  let children = null;
  let innerHTML = null;
  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
          children = propValue;
          break;
        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;
        case 'data': {
          if (__DEV__) {
            checkAttributeStringCoercion(propValue, 'data');
          }
          const sanitizedValue = sanitizeURL('' + propValue);
          if (sanitizedValue === '') {
            if (__DEV__) {
              console.error(
                'An empty string ("") was passed to the %s attribute. ' +
                  'To fix this, either do not render the element at all ' +
                  'or pass null to %s instead of an empty string.',
                propKey,
                propKey,
              );
            }
            break;
          }
          target.push(
            attributeSeparator,
            stringToChunk('data'),
            attributeAssign,
            stringToChunk(escapeTextForBrowser(sanitizedValue)),
            attributeEnd,
          );
          break;
        }
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  pushViewTransitionAttributes(target, formatContext);

  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, children);
  if (typeof children === 'string') {
    // Special case children as a string to avoid the unnecessary comment.
    // TODO: Remove this special case after the general optimization is in place.
    target.push(stringToChunk(encodeHTMLTextNode(children)));
    return null;
  }
  return children;
}

function pushStartSelect(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  formatContext: FormatContext,
): ReactNodeList {
  if (__DEV__) {
    checkControlledValueProps('select', props);

    checkSelectProp(props, 'value');
    checkSelectProp(props, 'defaultValue');

    if (
      props.value !== undefined &&
      props.defaultValue !== undefined &&
      !didWarnDefaultSelectValue
    ) {
      console.error(
        'Select elements must be either controlled or uncontrolled ' +
          '(specify either the value prop, or the defaultValue prop, but not ' +
          'both). Decide between using a controlled or uncontrolled select ' +
          'element and remove one of these props. More info: ' +
          'https://react.dev/link/controlled-components',
      );
      didWarnDefaultSelectValue = true;
    }
  }

  target.push(startChunkForTag('select'));

  let children = null;
  let innerHTML = null;
  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
          children = propValue;
          break;
        case 'dangerouslySetInnerHTML':
          // TODO: This doesn't really make sense for select since it can't use the controlled
          // value in the innerHTML.
          innerHTML = propValue;
          break;
        case 'defaultValue':
        case 'value':
          // These are set on the Context instead and applied to the nested options.
          break;
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  pushViewTransitionAttributes(target, formatContext);

  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, children);
  return children;
}

function flattenOptionChildren(children: mixed): string {
  let content = '';
  // Flatten children and warn if they aren't strings or numbers;
  // invalid types are ignored.
  Children.forEach(children as any, function (child) {
    if (child == null) {
      return;
    }
    content += child as any;
    if (__DEV__) {
      if (
        !didWarnInvalidOptionChildren &&
        typeof child !== 'string' &&
        typeof child !== 'number' &&
        typeof child !== 'bigint'
      ) {
        didWarnInvalidOptionChildren = true;
        console.error(
          'Cannot infer the option value of complex children. ' +
            'Pass a `value` prop or use a plain string as children to <option>.',
        );
      }
    }
  });
  return content;
}

const selectedMarkerAttribute = stringToPrecomputedChunk(' selected=""');

function pushStartOption(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  formatContext: FormatContext,
): ReactNodeList {
  const selectedValue = formatContext.selectedValue;

  target.push(startChunkForTag('option'));

  let children = null;
  let value = null;
  let selected = null;
  let innerHTML = null;
  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
          children = propValue;
          break;
        case 'selected':
          // ignore
          selected = propValue;
          if (__DEV__) {
            // TODO: Remove support for `selected` in <option>.
            if (!didWarnSelectedSetOnOption) {
              console.error(
                'Use the `defaultValue` or `value` props on <select> instead of ' +
                  'setting `selected` on <option>.',
              );
              didWarnSelectedSetOnOption = true;
            }
          }
          break;
        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;
        case 'value':
          value = propValue;
        // We intentionally fallthrough to also set the attribute on the node.
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  if (selectedValue != null) {
    let stringValue;
    if (value !== null) {
      if (__DEV__) {
        checkAttributeStringCoercion(value, 'value');
      }
      stringValue = '' + value;
    } else {
      if (__DEV__) {
        if (innerHTML !== null) {
          if (!didWarnInvalidOptionInnerHTML) {
            didWarnInvalidOptionInnerHTML = true;
            console.error(
              'Pass a `value` prop if you set dangerouslyInnerHTML so React knows ' +
                'which value should be selected.',
            );
          }
        }
      }
      stringValue = flattenOptionChildren(children);
    }
    if (isArray(selectedValue)) {
      // multiple
      for (let i = 0; i < selectedValue.length; i++) {
        if (__DEV__) {
          checkAttributeStringCoercion(selectedValue[i], 'value');
        }
        const v = '' + selectedValue[i];
        if (v === stringValue) {
          target.push(selectedMarkerAttribute);
          break;
        }
      }
    } else {
      if (__DEV__) {
        checkAttributeStringCoercion(selectedValue, 'select.value');
      }
      if ('' + selectedValue === stringValue) {
        target.push(selectedMarkerAttribute);
      }
    }
  } else if (selected) {
    target.push(selectedMarkerAttribute);
  }

  // Options never participate as ViewTransitions.
  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, children);
  return children;
}

const formReplayingRuntimeScript =
  stringToPrecomputedChunk(formReplayingRuntime);

function injectFormReplayingRuntime(
  resumableState: ResumableState,
  renderState: RenderState,
): void {
  // If we haven't sent it yet, inject the runtime that tracks submitted JS actions
  // for later replaying by Fiber. If we use an external runtime, we don't need
  // to emit anything. It's always used.
  if (
    (resumableState.instructions & SentFormReplayingRuntime) === NothingSent &&
    (!enableFizzExternalRuntime || !renderState.externalRuntimeScript)
  ) {
    resumableState.instructions |= SentFormReplayingRuntime;
    const preamble = renderState.preamble;
    const bootstrapChunks = renderState.bootstrapChunks;
    if (
      (preamble.htmlChunks || preamble.headChunks) &&
      bootstrapChunks.length === 0
    ) {
      // If we rendered the whole document, then we emitted a rel="expect" that needs a
      // matching target. If we haven't emitted that yet, we need to include it in this
      // script tag.
      bootstrapChunks.push(renderState.startInlineScript);
      pushCompletedShellIdAttribute(bootstrapChunks, resumableState);
      bootstrapChunks.push(
        endOfStartTag,
        formReplayingRuntimeScript,
        endInlineScript,
      );
    } else {
      // Otherwise we added to the beginning of the scripts. This will mean that it
      // appears before the shell ID unfortunately.
      bootstrapChunks.unshift(
        renderState.startInlineScript,
        endOfStartTag,
        formReplayingRuntimeScript,
        endInlineScript,
      );
    }
  }
}

const formStateMarkerIsMatching = stringToPrecomputedChunk('<!--F!-->');
const formStateMarkerIsNotMatching = stringToPrecomputedChunk('<!--F-->');

export function pushFormStateMarkerIsMatching(
  target: Array<Chunk | PrecomputedChunk>,
) {
  target.push(formStateMarkerIsMatching);
}

export function pushFormStateMarkerIsNotMatching(
  target: Array<Chunk | PrecomputedChunk>,
) {
  target.push(formStateMarkerIsNotMatching);
}

function pushStartForm(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  resumableState: ResumableState,
  renderState: RenderState,
  formatContext: FormatContext,
): ReactNodeList {
  target.push(startChunkForTag('form'));

  let children = null;
  let innerHTML = null;
  let formAction = null;
  let formEncType = null;
  let formMethod = null;
  let formTarget = null;

  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
          children = propValue;
          break;
        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;
        case 'action':
          formAction = propValue;
          break;
        case 'encType':
          formEncType = propValue;
          break;
        case 'method':
          formMethod = propValue;
          break;
        case 'target':
          formTarget = propValue;
          break;
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  let formData = null;
  let formActionName = null;
  if (typeof formAction === 'function') {
    // Function form actions cannot control the form properties
    if (__DEV__) {
      if (
        (formEncType !== null || formMethod !== null) &&
        !didWarnFormActionMethod
      ) {
        didWarnFormActionMethod = true;
        console.error(
          'Cannot specify a encType or method for a form that specifies a ' +
            'function as the action. React provides those automatically. ' +
            'They will get overridden.',
        );
      }
      if (formTarget !== null && !didWarnFormActionTarget) {
        didWarnFormActionTarget = true;
        console.error(
          'Cannot specify a target for a form that specifies a function as the action. ' +
            'The function will always be executed in the same window.',
        );
      }
    }
    const customFields = getCustomFormFields(resumableState, formAction);
    if (customFields !== null) {
      // This action has a custom progressive enhancement form that can submit the form
      // back to the server if it's invoked before hydration. Such as a Server Action.
      formAction = customFields.action || '';
      formEncType = customFields.encType;
      formMethod = customFields.method;
      formTarget = customFields.target;
      formData = customFields.data;
      formActionName = customFields.name;
    } else {
      // Set a javascript URL that doesn't do anything. We don't expect this to be invoked
      // because we'll preventDefault in the Fizz runtime, but it can happen if a form is
      // manually submitted or if someone calls stopPropagation before React gets the event.
      // If CSP is used to block javascript: URLs that's fine too. It just won't show this
      // error message but the URL will be logged.
      target.push(
        attributeSeparator,
        stringToChunk('action'),
        attributeAssign,
        actionJavaScriptURL,
        attributeEnd,
      );
      formAction = null;
      formEncType = null;
      formMethod = null;
      formTarget = null;
      injectFormReplayingRuntime(resumableState, renderState);
    }
  }
  if (formAction != null) {
    pushAttribute(target, 'action', formAction);
  }
  if (formEncType != null) {
    pushAttribute(target, 'encType', formEncType);
  }
  if (formMethod != null) {
    pushAttribute(target, 'method', formMethod);
  }
  if (formTarget != null) {
    pushAttribute(target, 'target', formTarget);
  }

  pushViewTransitionAttributes(target, formatContext);

  target.push(endOfStartTag);

  if (formActionName !== null) {
    target.push(startHiddenInputChunk);
    pushStringAttribute(target, 'name', formActionName);
    target.push(endOfStartTagSelfClosing);
    pushAdditionalFormFields(target, formData);
  }

  pushInnerHTML(target, innerHTML, children);
  if (typeof children === 'string') {
    // Special case children as a string to avoid the unnecessary comment.
    // TODO: Remove this special case after the general optimization is in place.
    target.push(stringToChunk(encodeHTMLTextNode(children)));
    return null;
  }
  return children;
}

function pushInput(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  resumableState: ResumableState,
  renderState: RenderState,
  formatContext: FormatContext,
): ReactNodeList {
  if (__DEV__) {
    checkControlledValueProps('input', props);
  }

  target.push(startChunkForTag('input'));

  let name = null;
  let formAction = null;
  let formEncType = null;
  let formMethod = null;
  let formTarget = null;
  let value = null;
  let defaultValue = null;
  let checked = null;
  let defaultChecked = null;

  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
        case 'dangerouslySetInnerHTML':
          throw new Error(
            `${'input'} is a self-closing tag and must neither have \`children\` nor ` +
              'use `dangerouslySetInnerHTML`.',
          );
        case 'name':
          name = propValue;
          break;
        case 'formAction':
          formAction = propValue;
          break;
        case 'formEncType':
          formEncType = propValue;
          break;
        case 'formMethod':
          formMethod = propValue;
          break;
        case 'formTarget':
          formTarget = propValue;
          break;
        case 'defaultChecked':
          defaultChecked = propValue;
          break;
        case 'defaultValue':
          defaultValue = propValue;
          break;
        case 'checked':
          checked = propValue;
          break;
        case 'value':
          value = propValue;
          break;
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  if (__DEV__) {
    if (
      formAction !== null &&
      props.type !== 'image' &&
      props.type !== 'submit' &&
      !didWarnFormActionType
    ) {
      didWarnFormActionType = true;
      console.error(
        'An input can only specify a formAction along with type="submit" or type="image".',
      );
    }
  }

  const formData = pushFormActionAttribute(
    target,
    resumableState,
    renderState,
    formAction,
    formEncType,
    formMethod,
    formTarget,
    name,
  );

  if (__DEV__) {
    if (checked !== null && defaultChecked !== null && !didWarnDefaultChecked) {
      console.error(
        '%s contains an input of type %s with both checked and defaultChecked props. ' +
          'Input elements must be either controlled or uncontrolled ' +
          '(specify either the checked prop, or the defaultChecked prop, but not ' +
          'both). Decide between using a controlled or uncontrolled input ' +
          'element and remove one of these props. More info: ' +
          'https://react.dev/link/controlled-components',
        'A component',
        props.type,
      );
      didWarnDefaultChecked = true;
    }
    if (value !== null && defaultValue !== null && !didWarnDefaultInputValue) {
      console.error(
        '%s contains an input of type %s with both value and defaultValue props. ' +
          'Input elements must be either controlled or uncontrolled ' +
          '(specify either the value prop, or the defaultValue prop, but not ' +
          'both). Decide between using a controlled or uncontrolled input ' +
          'element and remove one of these props. More info: ' +
          'https://react.dev/link/controlled-components',
        'A component',
        props.type,
      );
      didWarnDefaultInputValue = true;
    }
  }

  if (checked !== null) {
    pushBooleanAttribute(target, 'checked', checked);
  } else if (defaultChecked !== null) {
    pushBooleanAttribute(target, 'checked', defaultChecked);
  }
  if (value !== null) {
    pushAttribute(target, 'value', value);
  } else if (defaultValue !== null) {
    pushAttribute(target, 'value', defaultValue);
  }

  pushViewTransitionAttributes(target, formatContext);

  target.push(endOfStartTagSelfClosing);

  // We place any additional hidden form fields after the input.
  pushAdditionalFormFields(target, formData);

  return null;
}

function pushStartButton(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  resumableState: ResumableState,
  renderState: RenderState,
  formatContext: FormatContext,
): ReactNodeList {
  target.push(startChunkForTag('button'));

  let children = null;
  let innerHTML = null;
  let name = null;
  let formAction = null;
  let formEncType = null;
  let formMethod = null;
  let formTarget = null;

  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
          children = propValue;
          break;
        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;
        case 'name':
          name = propValue;
          break;
        case 'formAction':
          formAction = propValue;
          break;
        case 'formEncType':
          formEncType = propValue;
          break;
        case 'formMethod':
          formMethod = propValue;
          break;
        case 'formTarget':
          formTarget = propValue;
          break;
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  if (__DEV__) {
    if (
      formAction !== null &&
      props.type != null &&
      props.type !== 'submit' &&
      !didWarnFormActionType
    ) {
      didWarnFormActionType = true;
      console.error(
        'A button can only specify a formAction along with type="submit" or no type.',
      );
    }
  }

  const formData = pushFormActionAttribute(
    target,
    resumableState,
    renderState,
    formAction,
    formEncType,
    formMethod,
    formTarget,
    name,
  );

  pushViewTransitionAttributes(target, formatContext);

  target.push(endOfStartTag);

  // We place any additional hidden form fields we need to include inside the button itself.
  pushAdditionalFormFields(target, formData);

  pushInnerHTML(target, innerHTML, children);
  if (typeof children === 'string') {
    // Special case children as a string to avoid the unnecessary comment.
    // TODO: Remove this special case after the general optimization is in place.
    target.push(stringToChunk(encodeHTMLTextNode(children)));
    return null;
  }

  return children;
}

function pushStartTextArea(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  formatContext: FormatContext,
): ReactNodeList {
  if (__DEV__) {
    checkControlledValueProps('textarea', props);
    if (
      props.value !== undefined &&
      props.defaultValue !== undefined &&
      !didWarnDefaultTextareaValue
    ) {
      console.error(
        'Textarea elements must be either controlled or uncontrolled ' +
          '(specify either the value prop, or the defaultValue prop, but not ' +
          'both). Decide between using a controlled or uncontrolled textarea ' +
          'and remove one of these props. More info: ' +
          'https://react.dev/link/controlled-components',
      );
      didWarnDefaultTextareaValue = true;
    }
  }

  target.push(startChunkForTag('textarea'));

  let value = null;
  let defaultValue = null;
  let children = null;
  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
          children = propValue;
          break;
        case 'value':
          value = propValue;
          break;
        case 'defaultValue':
          defaultValue = propValue;
          break;
        case 'dangerouslySetInnerHTML':
          throw new Error(
            '`dangerouslySetInnerHTML` does not make sense on <textarea>.',
          );
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }
  if (value === null && defaultValue !== null) {
    value = defaultValue;
  }

  pushViewTransitionAttributes(target, formatContext);

  target.push(endOfStartTag);

  // TODO (yungsters): Remove support for children content in <textarea>.
  if (children != null) {
    if (__DEV__) {
      console.error(
        'Use the `defaultValue` or `value` props instead of setting ' +
          'children on <textarea>.',
      );
    }

    if (value != null) {
      throw new Error(
        'If you supply `defaultValue` on a <textarea>, do not pass children.',
      );
    }

    if (isArray(children)) {
      if (children.length > 1) {
        throw new Error('<textarea> can only have at most one child.');
      }

      // TODO: remove the coercion and the DEV check below because it will
      // always be overwritten by the coercion several lines below it. #22309
      if (__DEV__) {
        checkHtmlStringCoercion(children[0]);
      }
      value = '' + children[0];
    }
    if (__DEV__) {
      checkHtmlStringCoercion(children);
    }
    value = '' + children;
  }

  if (typeof value === 'string' && value[0] === '\n') {
    // text/html ignores the first character in these tags if it's a newline
    // Prefer to break application/xml over text/html (for now) by adding
    // a newline specifically to get eaten by the parser. (Alternately for
    // textareas, replacing "^\n" with "\r\n" doesn't get eaten, and the first
    // \r is normalized out by HTMLTextAreaElement#value.)
    // See: <http://www.w3.org/TR/html-polyglot/#newlines-in-textarea-and-pre>
    // See: <http://www.w3.org/TR/html5/syntax.html#element-restrictions>
    // See: <http://www.w3.org/TR/html5/syntax.html#newlines>
    // See: Parsing of "textarea" "listing" and "pre" elements
    //  from <http://www.w3.org/TR/html5/syntax.html#parsing-main-inbody>
    target.push(leadingNewline);
  }

  // ToString and push directly instead of recurse over children.
  // We don't really support complex children in the value anyway.
  // This also currently avoids a trailing comment node which breaks textarea.
  if (value !== null) {
    if (__DEV__) {
      checkAttributeStringCoercion(value, 'value');
    }
    target.push(stringToChunk(encodeHTMLTextNode('' + value)));
  }

  return null;
}

function pushMeta(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  renderState: RenderState,
  textEmbedded: boolean,
  formatContext: FormatContext,
): null {
  const noscriptTagInScope = formatContext.tagScope & NOSCRIPT_SCOPE;
  const isFallback = formatContext.tagScope & FALLBACK_SCOPE;
  if (
    formatContext.insertionMode === SVG_MODE ||
    noscriptTagInScope ||
    props.itemProp != null
  ) {
    return pushSelfClosing(target, props, 'meta', formatContext);
  } else {
    if (textEmbedded) {
      // This link follows text but we aren't writing a tag. while not as efficient as possible we need
      // to be safe and assume text will follow by inserting a textSeparator
      target.push(textSeparator);
    }

    if (isFallback) {
      // Hoistable Elements for fallbacks are simply omitted. we don't want to emit them early
      // because they are likely superseded by primary content and we want to avoid needing to clean
      // them up when the primary content is ready. They are never hydrated on the client anyway because
      // boundaries in fallback are awaited or client render, in either case there is never hydration
      return null;
    } else if (typeof props.charSet === 'string') {
      // "charset" Should really be config and not picked up from tags however since this is
      // the only way to embed the tag today we flush it on a special queue on the Request so it
      // can go before everything else. Like viewport this means that the tag will escape it's
      // parent container.
      return pushSelfClosing(
        renderState.charsetChunks,
        props,
        'meta',
        formatContext,
      );
    } else if (props.name === 'viewport') {
      // "viewport" is flushed on the Request so it can go earlier that Float resources that
      // might be affected by it. This means it can escape the boundary it is rendered within.
      // This is a pragmatic solution to viewport being incredibly sensitive to document order
      // without requiring all hoistables to be flushed too early.
      return pushSelfClosing(
        renderState.viewportChunks,
        props,
        'meta',
        formatContext,
      );
    } else {
      return pushSelfClosing(
        renderState.hoistableChunks,
        props,
        'meta',
        formatContext,
      );
    }
  }
}

function pushLink(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  resumableState: ResumableState,
  renderState: RenderState,
  hoistableState: null | HoistableState,
  textEmbedded: boolean,
  formatContext: FormatContext,
): null {
  const noscriptTagInScope = formatContext.tagScope & NOSCRIPT_SCOPE;
  const isFallback = formatContext.tagScope & FALLBACK_SCOPE;
  const rel = props.rel;
  const href = props.href;
  const precedence = props.precedence;
  if (
    formatContext.insertionMode === SVG_MODE ||
    noscriptTagInScope ||
    props.itemProp != null ||
    typeof rel !== 'string' ||
    typeof href !== 'string' ||
    href === ''
  ) {
    if (__DEV__) {
      if (rel === 'stylesheet' && typeof props.precedence === 'string') {
        if (typeof href !== 'string' || !href) {
          console.error(
            'React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and expected the `href` prop to be a non-empty string but ecountered %s instead. If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` prop ensure there is a non-empty string `href` prop as well, otherwise remove the `precedence` prop.',
            getValueDescriptorExpectingObjectForWarning(href),
          );
        }
      }
    }
    pushLinkImpl(target, props);
    return null;
  }

  if (props.rel === 'stylesheet') {
    // This <link> may hoistable as a Stylesheet Resource, otherwise it will emit in place
    const key = getResourceKey(href);
    if (
      typeof precedence !== 'string' ||
      props.disabled != null ||
      props.onLoad ||
      props.onError
    ) {
      // This stylesheet is either not opted into Resource semantics or has conflicting properties which
      // disqualify it for such. We can still create a preload resource to help it load faster on the
      // client
      if (__DEV__) {
        if (typeof precedence === 'string') {
          if (props.disabled != null) {
            console.error(
              'React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and a `disabled` prop. The presence of the `disabled` prop indicates an intent to manage the stylesheet active state from your from your Component code and React will not hoist or deduplicate this stylesheet. If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` prop remove the `disabled` prop, otherwise remove the `precedence` prop.',
            );
          } else if (props.onLoad || props.onError) {
            const propDescription =
              props.onLoad && props.onError
                ? '`onLoad` and `onError` props'
                : props.onLoad
                  ? '`onLoad` prop'
                  : '`onError` prop';
            console.error(
              'React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and %s. The presence of loading and error handlers indicates an intent to manage the stylesheet loading state from your from your Component code and React will not hoist or deduplicate this stylesheet. If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` prop remove the %s, otherwise remove the `precedence` prop.',
              propDescription,
              propDescription,
            );
          }
        }
      }
      return pushLinkImpl(target, props);
    } else {
      // This stylesheet refers to a Resource and we create a new one if necessary
      let styleQueue = renderState.styles.get(precedence);
      const hasKey = resumableState.styleResources.hasOwnProperty(key);
      const resourceState = hasKey
        ? resumableState.styleResources[key]
        : undefined;
      if (resourceState !== EXISTS) {
        // We are going to create this resource now so it is marked as Exists
        resumableState.styleResources[key] = EXISTS;

        // If this is the first time we've encountered this precedence we need
        // to create a StyleQueue
        if (!styleQueue) {
          styleQueue = {
            precedence: stringToChunk(escapeTextForBrowser(precedence)),
            rules: [] as Array<Chunk | PrecomputedChunk>,
            hrefs: [] as Array<Chunk | PrecomputedChunk>,
            sheets: new Map() as Map<string, StylesheetResource>,
          };
          renderState.styles.set(precedence, styleQueue);
        }

        const resource: StylesheetResource = {
          state: PENDING,
          props: stylesheetPropsFromRawProps(props),
        };

        if (resourceState) {
          // When resourceState is truthy it is a Preload state. We cast it for clarity
          const preloadState: Preloaded | PreloadedWithCredentials =
            resourceState;
          if (preloadState.length === 2) {
            adoptPreloadCredentials(resource.props, preloadState);
          }

          const preloadResource = renderState.preloads.stylesheets.get(key);
          if (preloadResource && preloadResource.length > 0) {
            // The Preload for this resource was created in this render pass and has not flushed yet so
            // we need to clear it to avoid it flushing.
            preloadResource.length = 0;
          } else {
            // Either the preload resource from this render already flushed in this render pass
            // or the preload flushed in a prior pass (prerender). In either case we need to mark
            // this resource as already having been preloaded.
            resource.state = PRELOADED;
          }
        } else {
          // We don't need to check whether a preloadResource exists in the renderState
          // because if it did exist then the resourceState would also exist and we would
          // have hit the primary if condition above.
        }

        // We add the newly created resource to our StyleQueue and if necessary
        // track the resource with the currently rendering boundary
        styleQueue.sheets.set(key, resource);
        if (hoistableState) {
          hoistableState.stylesheets.add(resource);
        }
      } else {
        // We need to track whether this boundary should wait on this resource or not.
        // Typically this resource should always exist since we either had it or just created
        // it. However, it's possible when you resume that the style has already been emitted
        // and then it wouldn't be recreated in the RenderState and there's no need to track
        // it again since we should've hoisted it to the shell already.
        if (styleQueue) {
          const resource = styleQueue.sheets.get(key);
          if (resource) {
            if (hoistableState) {
              hoistableState.stylesheets.add(resource);
            }
          }
        }
      }
      if (textEmbedded) {
        // This link follows text but we aren't writing a tag. while not as efficient as possible we need
        // to be safe and assume text will follow by inserting a textSeparator
        target.push(textSeparator);
      }
      return null;
    }
  } else if (props.onLoad || props.onError) {
    // When using load handlers we cannot hoist and need to emit links in place
    return pushLinkImpl(target, props);
  } else {
    // We can hoist this link so we may need to emit a text separator.
    // @TODO refactor text separators so we don't have to defensively add
    // them when we don't end up emitting a tag as a result of pushStartInstance
    if (textEmbedded) {
      // This link follows text but we aren't writing a tag. while not as efficient as possible we need
      // to be safe and assume text will follow by inserting a textSeparator
      target.push(textSeparator);
    }

    if (isFallback) {
      // Hoistable Elements for fallbacks are simply omitted. we don't want to emit them early
      // because they are likely superseded by primary content and we want to avoid needing to clean
      // them up when the primary content is ready. They are never hydrated on the client anyway because
      // boundaries in fallback are awaited or client render, in either case there is never hydration
      return null;
    } else {
      return pushLinkImpl(renderState.hoistableChunks, props);
    }
  }
}

function pushLinkImpl(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
): null {
  target.push(startChunkForTag('link'));

  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
        case 'dangerouslySetInnerHTML':
          throw new Error(
            `${'link'} is a self-closing tag and must neither have \`children\` nor ` +
              'use `dangerouslySetInnerHTML`.',
          );
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  // Link never participate as a ViewTransition

  target.push(endOfStartTagSelfClosing);
  return null;
}

function pushStyle(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  resumableState: ResumableState,
  renderState: RenderState,
  hoistableState: null | HoistableState,
  textEmbedded: boolean,
  formatContext: FormatContext,
): ReactNodeList {
  const noscriptTagInScope = formatContext.tagScope & NOSCRIPT_SCOPE;
  if (__DEV__) {
    if (hasOwnProperty.call(props, 'children')) {
      const children = props.children;

      const child = Array.isArray(children)
        ? children.length < 2
          ? children[0]
          : null
        : children;

      if (
        typeof child === 'function' ||
        typeof child === 'symbol' ||
        Array.isArray(child)
      ) {
        const childType =
          typeof child === 'function'
            ? 'a Function'
            : typeof child === 'symbol'
              ? 'a Symbol'
              : 'an Array';
        console.error(
          'React expect children of <style> tags to be a string, number, or object with a `toString` method but found %s instead. ' +
            'In browsers style Elements can only have `Text` Nodes as children.',
          childType,
        );
      }
    }
  }
  const precedence = props.precedence;
  const href = props.href;
  const nonce = props.nonce;

  if (
    formatContext.insertionMode === SVG_MODE ||
    noscriptTagInScope ||
    props.itemProp != null ||
    typeof precedence !== 'string' ||
    typeof href !== 'string' ||
    href === ''
  ) {
    // This style tag is not able to be turned into a Style Resource
    return pushStyleImpl(target, props);
  }

  if (__DEV__) {
    if (href.includes(' ')) {
      console.error(
        'React expected the `href` prop for a <style> tag opting into hoisting semantics using the `precedence` prop to not have any spaces but ecountered spaces instead. using spaces in this prop will cause hydration of this style to fail on the client. The href for the <style> where this ocurred is "%s".',
        href,
      );
    }
  }

  const key = getResourceKey(href);
  let styleQueue = renderState.styles.get(precedence);
  const hasKey = resumableState.styleResources.hasOwnProperty(key);
  const resourceState = hasKey ? resumableState.styleResources[key] : undefined;
  if (resourceState !== EXISTS) {
    // We are going to create this resource now so it is marked as Exists
    resumableState.styleResources[key] = EXISTS;

    if (__DEV__) {
      if (resourceState) {
        console.error(
          'React encountered a hoistable style tag for the same href as a preload: "%s". When using a style tag to inline styles you should not also preload it as a stylsheet.',
          href,
        );
      }
    }

    if (!styleQueue) {
      // This is the first time we've encountered this precedence we need
      // to create a StyleQueue.
      styleQueue = {
        precedence: stringToChunk(escapeTextForBrowser(precedence)),
        rules: [] as Array<Chunk | PrecomputedChunk>,
        hrefs: [] as Array<Chunk | PrecomputedChunk>,
        sheets: new Map() as Map<string, StylesheetResource>,
      };
      renderState.styles.set(precedence, styleQueue);
    }

    const nonceStyle = renderState.nonce.style;
    if (!nonceStyle || nonceStyle === nonce) {
      if (__DEV__) {
        if (!nonceStyle && nonce) {
          console.error(
            'React encountered a style tag with `precedence` "%s" and `nonce` "%s". When React manages style rules using `precedence` it will only include a nonce attributes if you also provide the same style nonce value as a render option.',
            precedence,
            nonce,
          );
        }
      }
      styleQueue.hrefs.push(stringToChunk(escapeTextForBrowser(href)));
      pushStyleContents(styleQueue.rules, props);
    } else if (__DEV__) {
      console.error(
        'React encountered a style tag with `precedence` "%s" and `nonce` "%s". When React manages style rules using `precedence` it will only include rules if the nonce matches the style nonce "%s" that was included with this render.',
        precedence,
        nonce,
        nonceStyle,
      );
    }
  }
  if (styleQueue) {
    // We need to track whether this boundary should wait on this resource or not.
    // Typically this resource should always exist since we either had it or just created
    // it. However, it's possible when you resume that the style has already been emitted
    // and then it wouldn't be recreated in the RenderState and there's no need to track
    // it again since we should've hoisted it to the shell already.
    if (hoistableState) {
      hoistableState.styles.add(styleQueue);
    }
  }

  if (textEmbedded) {
    // This link follows text but we aren't writing a tag. while not as efficient as possible we need
    // to be safe and assume text will follow by inserting a textSeparator
    target.push(textSeparator);
  }
}

/**
 * This escaping function is designed to work with style tag textContent only.
 *
 * While untrusted style content should be made safe before using this api it will
 * ensure that the style cannot be early terminated or never terminated state
 */
function escapeStyleTextContent(styleText: string) {
  if (__DEV__) {
    checkHtmlStringCoercion(styleText);
  }
  return ('' + styleText).replace(styleRegex, styleReplacer);
}
const styleRegex = /(<\/|<)(s)(tyle)/gi;
const styleReplacer = (
  match: string,
  prefix: string,
  s: string,
  suffix: string,
) => `${prefix}${s === 's' ? '\\73 ' : '\\53 '}${suffix}`;

function pushStyleImpl(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
): ReactNodeList {
  target.push(startChunkForTag('style'));

  let children = null;
  let innerHTML = null;
  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
          children = propValue;
          break;
        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  // Style never participate as a ViewTransition.
  target.push(endOfStartTag);

  const child = Array.isArray(children)
    ? children.length < 2
      ? children[0]
      : null
    : children;
  if (
    typeof child !== 'function' &&
    typeof child !== 'symbol' &&
    child !== null &&
    child !== undefined
  ) {
    target.push(stringToChunk(escapeStyleTextContent(child)));
  }
  pushInnerHTML(target, innerHTML, children);
  target.push(endChunkForTag('style'));
  return null;
}

function pushStyleContents(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
): void {
  let children = null;
  let innerHTML = null;
  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
          children = propValue;
          break;
        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;
      }
    }
  }

  const child = Array.isArray(children)
    ? children.length < 2
      ? children[0]
      : null
    : children;
  if (
    typeof child !== 'function' &&
    typeof child !== 'symbol' &&
    child !== null &&
    child !== undefined
  ) {
    target.push(stringToChunk(escapeStyleTextContent(child)));
  }
  pushInnerHTML(target, innerHTML, children);
  return;
}

function pushImg(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  resumableState: ResumableState,
  renderState: RenderState,
  hoistableState: null | HoistableState,
  formatContext: FormatContext,
): null {
  const pictureOrNoScriptTagInScope =
    formatContext.tagScope & (PICTURE_SCOPE | NOSCRIPT_SCOPE);
  const {src, srcSet} = props;
  if (
    props.loading !== 'lazy' &&
    (src || srcSet) &&
    (typeof src === 'string' || src == null) &&
    (typeof srcSet === 'string' || srcSet == null) &&
    props.fetchPriority !== 'low' &&
    !pictureOrNoScriptTagInScope &&
    // We exclude data URIs in src and srcSet since these should not be preloaded
    !(
      typeof src === 'string' &&
      src[4] === ':' &&
      (src[0] === 'd' || src[0] === 'D') &&
      (src[1] === 'a' || src[1] === 'A') &&
      (src[2] === 't' || src[2] === 'T') &&
      (src[3] === 'a' || src[3] === 'A')
    ) &&
    !(
      typeof srcSet === 'string' &&
      srcSet[4] === ':' &&
      (srcSet[0] === 'd' || srcSet[0] === 'D') &&
      (srcSet[1] === 'a' || srcSet[1] === 'A') &&
      (srcSet[2] === 't' || srcSet[2] === 'T') &&
      (srcSet[3] === 'a' || srcSet[3] === 'A')
    )
  ) {
    // We have a suspensey image and ought to preload it to optimize the loading of display blocking
    // resumableState.

    if (hoistableState !== null) {
      // Mark this boundary's state as having suspensey images.
      // Only do that if we have a ViewTransition that might trigger a parent Suspense boundary
      // to animate its appearing. Since that's the only case we'd actually apply suspensey images
      // for SSR reveals.
      const isInSuspenseWithEnterViewTransition =
        formatContext.tagScope & APPEARING_SCOPE;
      if (isInSuspenseWithEnterViewTransition) {
        hoistableState.suspenseyImages = true;
      }
    }

    const sizes = typeof props.sizes === 'string' ? props.sizes : undefined;
    const key = getImageResourceKey(src, srcSet, sizes);

    const promotablePreloads = renderState.preloads.images;

    let resource = promotablePreloads.get(key);
    if (resource) {
      // We consider whether this preload can be promoted to higher priority flushing queue.
      // The only time a resource will exist here is if it was created during this render
      // and was not already in the high priority queue.
      if (
        props.fetchPriority === 'high' ||
        renderState.highImagePreloads.size < 10
      ) {
        // Delete the resource from the map since we are promoting it and don't want to
        // reenter this branch in a second pass for duplicate img hrefs.
        promotablePreloads.delete(key);

        // $FlowFixMe[incompatible-type] - Flow should understand that this is a Resource if the condition was true
        renderState.highImagePreloads.add(resource);
      }
    } else if (!resumableState.imageResources.hasOwnProperty(key)) {
      // We must construct a new preload resource
      resumableState.imageResources[key] = PRELOAD_NO_CREDS;
      const crossOrigin = getCrossOriginString(props.crossOrigin);

      const headers = renderState.headers;
      let header;
      if (
        headers &&
        headers.remainingCapacity > 0 &&
        // browsers today don't support preloading responsive images from link headers so we bail out
        // if the img has srcset defined
        typeof props.srcSet !== 'string' &&
        // this is a hueristic similar to capping element preloads to 10 unless explicitly
        // fetchPriority="high". We use length here which means it will fit fewer images when
        // the urls are long and more when short. arguably byte size is a better hueristic because
        // it directly translates to how much we send down before content is actually seen.
        // We could unify the counts and also make it so the total is tracked regardless of
        // flushing output but since the headers are likely to be go earlier than content
        // they don't really conflict so for now I've kept them separate
        (props.fetchPriority === 'high' ||
          headers.highImagePreloads.length < 500) &&
        // We manually construct the options for the preload only from strings. We don't want to pollute
        // the params list with arbitrary props and if we copied everything over as it we might get
        // coercion errors. We have checks for this in Dev but it seems safer to just only accept values
        // that are strings
        ((header = getPreloadAsHeader(src, 'image', {
          imageSrcSet: props.srcSet,
          imageSizes: props.sizes,
          crossOrigin,
          integrity: props.integrity,
          nonce: props.nonce,
          type: props.type,
          fetchPriority: props.fetchPriority,
          referrerPolicy: props.referrerPolicy,
        })),
        // We always consume the header length since once we find one header that doesn't fit
        // we assume all the rest won't as well. This is to avoid getting into a situation
        // where we have a very small remaining capacity but no headers will ever fit and we end
        // up constantly trying to see if the next resource might make it. In the future we can
        // make this behavior different between render and prerender since in the latter case
        // we are less sensitive to the current requests runtime per and more sensitive to maximizing
        // headers.
        (headers.remainingCapacity -= header.length + 2) >= 0)
      ) {
        // If we postpone in the shell we will still emit this preload so we track
        // it to make sure we don't reset it.
        renderState.resets.image[key] = PRELOAD_NO_CREDS;
        if (headers.highImagePreloads) {
          headers.highImagePreloads += ', ';
        }
        // $FlowFixMe[unsafe-addition]: we assign header during the if condition
        headers.highImagePreloads += header;
      } else {
        resource = [];
        pushLinkImpl(resource, {
          rel: 'preload',
          as: 'image',
          // There is a bug in Safari where imageSrcSet is not respected on preload links
          // so we omit the href here if we have imageSrcSet b/c safari will load the wrong image.
          // This harms older browers that do not support imageSrcSet by making their preloads not work
          // but this population is shrinking fast and is already small so we accept this tradeoff.
          href: srcSet ? undefined : src,
          imageSrcSet: srcSet,
          imageSizes: sizes,
          crossOrigin: crossOrigin,
          integrity: props.integrity,
          type: props.type,
          fetchPriority: props.fetchPriority,
          referrerPolicy: props.referrerPolicy,
        } as PreloadProps);
        if (
          props.fetchPriority === 'high' ||
          renderState.highImagePreloads.size < 10
        ) {
          renderState.highImagePreloads.add(resource);
        } else {
          renderState.bulkPreloads.add(resource);
          // We can bump the priority up if the same img is rendered later
          // with fetchPriority="high"
          promotablePreloads.set(key, resource);
        }
      }
    }
  }
  return pushSelfClosing(target, props, 'img', formatContext);
}

function pushSelfClosing(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  tag: string,
  formatContext: FormatContext,
): null {
  target.push(startChunkForTag(tag));

  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
        case 'dangerouslySetInnerHTML':
          throw new Error(
            `${tag} is a self-closing tag and must neither have \`children\` nor ` +
              'use `dangerouslySetInnerHTML`.',
          );
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  pushViewTransitionAttributes(target, formatContext);

  target.push(endOfStartTagSelfClosing);
  return null;
}

function pushStartMenuItem(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  formatContext: FormatContext,
): ReactNodeList {
  target.push(startChunkForTag('menuitem'));

  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
        case 'dangerouslySetInnerHTML':
          throw new Error(
            'menuitems cannot have `children` nor `dangerouslySetInnerHTML`.',
          );
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  pushViewTransitionAttributes(target, formatContext);

  target.push(endOfStartTag);
  return null;
}

function pushTitle(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  renderState: RenderState,
  formatContext: FormatContext,
): ReactNodeList {
  const noscriptTagInScope = formatContext.tagScope & NOSCRIPT_SCOPE;
  const isFallback = formatContext.tagScope & FALLBACK_SCOPE;
  if (__DEV__) {
    if (hasOwnProperty.call(props, 'children')) {
      const children = props.children;

      const child = Array.isArray(children)
        ? children.length < 2
          ? children[0]
          : null
        : children;

      if (Array.isArray(children) && children.length > 1) {
        console.error(
          'React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an Array with length %s instead.' +
            ' Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert `children` of <title> tags to a single string value' +
            ' which is why Arrays of length greater than 1 are not supported. When using JSX it can be common to combine text nodes and value nodes.' +
            ' For example: <title>hello {nameOfUser}</title>. While not immediately apparent, `children` in this case is an Array with length 2. If your `children` prop' +
            ' is using this form try rewriting it using a template string: <title>{`hello ${nameOfUser}`}</title>.',
          children.length,
        );
      } else if (typeof child === 'function' || typeof child === 'symbol') {
        const childType =
          typeof child === 'function' ? 'a Function' : 'a Symbol';
        console.error(
          'React expect children of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found %s instead.' +
            ' Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert children of <title>' +
            ' tags to a single string value.',
          childType,
        );
        // $FlowFixMe[invalid-compare]
        // $FlowFixMe[constant-condition]
      } else if (child && child.toString === {}.toString) {
        if (child.$$typeof != null) {
          console.error(
            'React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an object that appears to be' +
              ' a React element which never implements a suitable `toString` method. Browsers treat all child Nodes of <title> tags as Text content and React expects to' +
              ' be able to convert children of <title> tags to a single string value which is why rendering React elements is not supported. If the `children` of <title> is' +
              ' a React Component try moving the <title> tag into that component. If the `children` of <title> is some HTML markup change it to be Text only to be valid HTML.',
          );
        } else {
          console.error(
            'React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an object that does not implement' +
              ' a suitable `toString` method. Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert children of <title> tags' +
              ' to a single string value. Using the default `toString` method available on every object is almost certainly an error. Consider whether the `children` of this <title>' +
              ' is an object in error and change it to a string or number value if so. Otherwise implement a `toString` method that React can use to produce a valid <title>.',
          );
        }
      }
    }
  }

  if (
    formatContext.insertionMode !== SVG_MODE &&
    !noscriptTagInScope &&
    props.itemProp == null
  ) {
    if (isFallback) {
      // Hoistable Elements for fallbacks are simply omitted. we don't want to emit them early
      // because they are likely superseded by primary content and we want to avoid needing to clean
      // them up when the primary content is ready. They are never hydrated on the client anyway because
      // boundaries in fallback are awaited or client render, in either case there is never hydration
      return null;
    } else {
      pushTitleImpl(renderState.hoistableChunks, props);
    }
  } else {
    return pushTitleImpl(target, props);
  }
}

function pushTitleImpl(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
): null {
  target.push(startChunkForTag('title'));

  let children = null;
  let innerHTML = null;
  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
          children = propValue;
          break;
        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }
  // Title never participate as a ViewTransition
  target.push(endOfStartTag);

  const child = Array.isArray(children)
    ? children.length < 2
      ? children[0]
      : null
    : children;
  if (
    typeof child !== 'function' &&
    typeof child !== 'symbol' &&
    child !== null &&
    child !== undefined
  ) {
    // eslint-disable-next-line react-internal/safe-string-coercion
    target.push(stringToChunk(escapeTextForBrowser('' + child)));
  }
  pushInnerHTML(target, innerHTML, children);
  target.push(endChunkForTag('title'));
  return null;
}

// These are used by the client if we clear a boundary and we find these, then we
// also clear the singleton as well.
const headPreambleContributionChunk = stringToPrecomputedChunk('<!--head-->');
const bodyPreambleContributionChunk = stringToPrecomputedChunk('<!--body-->');
const htmlPreambleContributionChunk = stringToPrecomputedChunk('<!--html-->');

function pushStartHead(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  renderState: RenderState,
  preambleState: null | PreambleState,
  formatContext: FormatContext,
): ReactNodeList {
  if (formatContext.insertionMode < HTML_MODE) {
    // This <head> is the Document.head and should be part of the preamble
    const preamble = preambleState || renderState.preamble;

    if (preamble.headChunks) {
      throw new Error(`The ${'`<head>`'} tag may only be rendered once.`);
    }

    // Insert a marker in the body where the contribution to the head was in case we need to clear it.
    if (preambleState !== null) {
      target.push(headPreambleContributionChunk);
    }

    preamble.headChunks = [];
    return pushStartSingletonElement(
      preamble.headChunks,
      props,
      'head',
      formatContext,
    );
  } else {
    // This <head> is deep and is likely just an error. we emit it inline though.
    // Validation should warn that this tag is the wrong spot.
    return pushStartGenericElement(target, props, 'head', formatContext);
  }
}

function pushStartBody(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  renderState: RenderState,
  preambleState: null | PreambleState,
  formatContext: FormatContext,
): ReactNodeList {
  if (formatContext.insertionMode < HTML_MODE) {
    // This <body> is the Document.body
    const preamble = preambleState || renderState.preamble;

    if (preamble.bodyChunks) {
      throw new Error(`The ${'`<body>`'} tag may only be rendered once.`);
    }

    // Insert a marker in the body where the contribution to the body tag was in case we need to clear it.
    if (preambleState !== null) {
      target.push(bodyPreambleContributionChunk);
    }

    preamble.bodyChunks = [];
    return pushStartSingletonElement(
      preamble.bodyChunks,
      props,
      'body',
      formatContext,
    );
  } else {
    // This <head> is deep and is likely just an error. we emit it inline though.
    // Validation should warn that this tag is the wrong spot.
    return pushStartGenericElement(target, props, 'body', formatContext);
  }
}

function pushStartHtml(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  renderState: RenderState,
  preambleState: null | PreambleState,
  formatContext: FormatContext,
): ReactNodeList {
  if (formatContext.insertionMode === ROOT_HTML_MODE) {
    // This <html> is the Document.documentElement
    const preamble = preambleState || renderState.preamble;

    if (preamble.htmlChunks) {
      throw new Error(`The ${'`<html>`'} tag may only be rendered once.`);
    }

    // Insert a marker in the body where the contribution to the head was in case we need to clear it.
    if (preambleState !== null) {
      target.push(htmlPreambleContributionChunk);
    }

    preamble.htmlChunks = [DOCTYPE];
    return pushStartSingletonElement(
      preamble.htmlChunks,
      props,
      'html',
      formatContext,
    );
  } else {
    // This <html> is deep and is likely just an error. we emit it inline though.
    // Validation should warn that this tag is the wrong spot.
    return pushStartGenericElement(target, props, 'html', formatContext);
  }
}

function pushScript(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  resumableState: ResumableState,
  renderState: RenderState,
  textEmbedded: boolean,
  formatContext: FormatContext,
): null {
  const noscriptTagInScope = formatContext.tagScope & NOSCRIPT_SCOPE;
  const asyncProp = props.async;
  if (
    typeof props.src !== 'string' ||
    !props.src ||
    !(
      asyncProp &&
      typeof asyncProp !== 'function' &&
      typeof asyncProp !== 'symbol'
    ) ||
    props.onLoad ||
    props.onError ||
    formatContext.insertionMode === SVG_MODE ||
    noscriptTagInScope ||
    props.itemProp != null
  ) {
    // This script will not be a resource, we bailout early and emit it in place.
    return pushScriptImpl(target, props);
  }

  const src = props.src;
  const key = getResourceKey(src);
  // We can make this <script> into a ScriptResource

  let resources, preloads;
  if (props.type === 'module') {
    resources = resumableState.moduleScriptResources;
    preloads = renderState.preloads.moduleScripts;
  } else {
    resources = resumableState.scriptResources;
    preloads = renderState.preloads.scripts;
  }

  const hasKey = resources.hasOwnProperty(key);
  const resourceState = hasKey ? resources[key] : undefined;
  if (resourceState !== EXISTS) {
    // We are going to create this resource now so it is marked as Exists
    resources[key] = EXISTS;

    let scriptProps = props;
    if (resourceState) {
      // When resourceState is truthy it is a Preload state. We cast it for clarity
      const preloadState: Preloaded | PreloadedWithCredentials = resourceState;
      if (preloadState.length === 2) {
        scriptProps = {...props};
        adoptPreloadCredentials(scriptProps, preloadState);
      }

      const preloadResource = preloads.get(key);
      if (preloadResource) {
        // the preload resource exists was created in this render. Now that we have
        // a script resource which will emit earlier than a preload would if it
        // hasn't already flushed we prevent it from flushing by zeroing the length
        preloadResource.length = 0;
      }
    }

    const resource: Resource = [];
    // Add to the script flushing queue
    renderState.scripts.add(resource);
    // encode the tag as Chunks
    pushScriptImpl(resource, scriptProps);
  }

  if (textEmbedded) {
    // This script follows text but we aren't writing a tag. while not as efficient as possible we need
    // to be safe and assume text will follow by inserting a textSeparator
    target.push(textSeparator);
  }
  return null;
}

function pushScriptImpl(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
): null {
  target.push(startChunkForTag('script'));

  let children = null;
  let innerHTML = null;
  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
          children = propValue;
          break;
        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }
  // Scripts never participate as a ViewTransition
  target.push(endOfStartTag);

  if (__DEV__) {
    if (children != null && typeof children !== 'string') {
      const descriptiveStatement =
        typeof children === 'number'
          ? 'a number for children'
          : Array.isArray(children)
            ? 'an array for children'
            : 'something unexpected for children';
      console.error(
        'A script element was rendered with %s. If script element has children it must be a single string.' +
          ' Consider using dangerouslySetInnerHTML or passing a plain string as children.',
        descriptiveStatement,
      );
    }
  }

  pushInnerHTML(target, innerHTML, children);
  if (typeof children === 'string') {
    target.push(stringToChunk(escapeEntireInlineScriptContent(children)));
  }
  target.push(endChunkForTag('script'));
  return null;
}

// This is a fork of pushStartGenericElement because we don't ever want to do
// the children as string optimization on that path when rendering singletons.
// When we eliminate that special path we can delete this fork and unify it again
function pushStartSingletonElement(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  tag: string,
  formatContext: FormatContext,
): ReactNodeList {
  target.push(startChunkForTag(tag));

  let children = null;
  let innerHTML = null;
  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
          children = propValue;
          break;
        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  pushViewTransitionAttributes(target, formatContext);

  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, children);
  return children;
}

function pushStartGenericElement(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  tag: string,
  formatContext: FormatContext,
): ReactNodeList {
  target.push(startChunkForTag(tag));

  let children = null;
  let innerHTML = null;
  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
          children = propValue;
          break;
        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  pushViewTransitionAttributes(target, formatContext);

  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, children);
  if (typeof children === 'string') {
    // Special case children as a string to avoid the unnecessary comment.
    // TODO: Remove this special case after the general optimization is in place.
    target.push(stringToChunk(encodeHTMLTextNode(children)));
    return null;
  }
  return children;
}

function pushStartCustomElement(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  tag: string,
  formatContext: FormatContext,
): ReactNodeList {
  target.push(startChunkForTag(tag));

  let children = null;
  let innerHTML = null;
  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      let propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      let attributeName = propKey;
      switch (propKey) {
        case 'children':
          children = propValue;
          break;
        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;
        case 'style':
          pushStyleAttribute(target, propValue);
          break;
        case 'suppressContentEditableWarning':
        case 'suppressHydrationWarning':
        case 'ref':
          // Ignored. These are built-in to React on the client.
          break;
        case 'className':
          // className gets rendered as class on the client, so it should be
          // rendered as class on the server.
          attributeName = 'class';
        // intentional fallthrough
        default:
          if (
            isAttributeNameSafe(propKey) &&
            typeof propValue !== 'function' &&
            typeof propValue !== 'symbol'
          ) {
            // $FlowFixMe[invalid-compare]
            if (propValue === false) {
              continue;
              // $FlowFixMe[invalid-compare]
            } else if (propValue === true) {
              propValue = '';
            } else if (typeof propValue === 'object') {
              continue;
            }
            target.push(
              attributeSeparator,
              stringToChunk(attributeName),
              attributeAssign,
              stringToChunk(escapeTextForBrowser(propValue)),
              attributeEnd,
            );
          }
          break;
      }
    }
  }

  // TODO: ViewTransition attributes get observed by the Custom Element which is a bit sketchy.
  pushViewTransitionAttributes(target, formatContext);

  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, children);
  return children;
}

const leadingNewline = stringToPrecomputedChunk('\n');

function pushStartPreformattedElement(
  target: Array<Chunk | PrecomputedChunk>,
  props: Object,
  tag: string,
  formatContext: FormatContext,
): ReactNodeList {
  target.push(startChunkForTag(tag));

  let children = null;
  let innerHTML = null;
  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'children':
          children = propValue;
          break;
        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;
        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  pushViewTransitionAttributes(target, formatContext);

  target.push(endOfStartTag);

  // text/html ignores the first character in these tags if it's a newline
  // Prefer to break application/xml over text/html (for now) by adding
  // a newline specifically to get eaten by the parser. (Alternately for
  // textareas, replacing "^\n" with "\r\n" doesn't get eaten, and the first
  // \r is normalized out by HTMLTextAreaElement#value.)
  // See: <http://www.w3.org/TR/html-polyglot/#newlines-in-textarea-and-pre>
  // See: <http://www.w3.org/TR/html5/syntax.html#element-restrictions>
  // See: <http://www.w3.org/TR/html5/syntax.html#newlines>
  // See: Parsing of "textarea" "listing" and "pre" elements
  //  from <http://www.w3.org/TR/html5/syntax.html#parsing-main-inbody>
  // TODO: This doesn't deal with the case where the child is an array
  // or component that returns a string.
  if (innerHTML != null) {
    if (children != null) {
      throw new Error(
        'Can only set one of `children` or `props.dangerouslySetInnerHTML`.',
      );
    }

    if (typeof innerHTML !== 'object' || !('__html' in innerHTML)) {
      throw new Error(
        '`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. ' +
          'Please visit https://react.dev/link/dangerously-set-inner-html ' +
          'for more information.',
      );
    }

    const html = innerHTML.__html;
    if (html !== null && html !== undefined) {
      if (typeof html === 'string' && html.length > 0 && html[0] === '\n') {
        target.push(leadingNewline, stringToChunk(html));
      } else {
        if (__DEV__) {
          checkHtmlStringCoercion(html);
        }
        target.push(stringToChunk('' + html));
      }
    }
  }
  if (typeof children === 'string' && children[0] === '\n') {
    target.push(leadingNewline);
  }
  return children;
}

// We accept any tag to be rendered but since this gets injected into arbitrary
// HTML, we want to make sure that it's a safe tag.
// http://www.w3.org/TR/REC-xml/#NT-Name
const VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/; // Simplified subset
const validatedTagCache = new Map<string, PrecomputedChunk>();
function startChunkForTag(tag: string): PrecomputedChunk {
  let tagStartChunk = validatedTagCache.get(tag);
  if (tagStartChunk === undefined) {
    if (!VALID_TAG_REGEX.test(tag)) {
      throw new Error(`Invalid tag: ${tag}`);
    }

    tagStartChunk = stringToPrecomputedChunk('<' + tag);
    validatedTagCache.set(tag, tagStartChunk);
  }
  return tagStartChunk;
}

export const doctypeChunk: PrecomputedChunk =
  stringToPrecomputedChunk('<!DOCTYPE html>');

import {doctypeChunk as DOCTYPE} from 'react-server/src/ReactFizzConfig';

export function pushStartInstance(
  target: Array<Chunk | PrecomputedChunk>,
  type: string,
  props: Object,
  resumableState: ResumableState,
  renderState: RenderState,
  preambleState: null | PreambleState,
  hoistableState: null | HoistableState,
  formatContext: FormatContext,
  textEmbedded: boolean,
): ReactNodeList {
  if (__DEV__) {
    validateARIAProperties(type, props);
    validateInputProperties(type, props);
    validateUnknownProperties(type, props, null);

    if (
      !props.suppressContentEditableWarning &&
      props.contentEditable &&
      props.children != null
    ) {
      console.error(
        'A component is `contentEditable` and contains `children` managed by ' +
          'React. It is now your responsibility to guarantee that none of ' +
          'those nodes are unexpectedly modified or duplicated. This is ' +
          'probably not intentional.',
      );
    }

    if (
      formatContext.insertionMode !== SVG_MODE &&
      formatContext.insertionMode !== MATHML_MODE
    ) {
      if (type.indexOf('-') === -1 && type.toLowerCase() !== type) {
        console.error(
          '<%s /> is using incorrect casing. ' +
            'Use PascalCase for React components, ' +
            'or lowercase for HTML elements.',
          type,
        );
      }
    }
  }

  switch (type) {
    case 'div':
    case 'span':
    case 'svg':
    case 'path':
      // Fast track very common tags
      break;
    case 'a':
      return pushStartAnchor(target, props, formatContext);
    case 'g':
    case 'p':
    case 'li':
      // Fast track very common tags
      break;
    // Special tags
    case 'select':
      return pushStartSelect(target, props, formatContext);
    case 'option':
      return pushStartOption(target, props, formatContext);
    case 'textarea':
      return pushStartTextArea(target, props, formatContext);
    case 'input':
      return pushInput(
        target,
        props,
        resumableState,
        renderState,
        formatContext,
      );
    case 'button':
      return pushStartButton(
        target,
        props,
        resumableState,
        renderState,
        formatContext,
      );
    case 'form':
      return pushStartForm(
        target,
        props,
        resumableState,
        renderState,
        formatContext,
      );
    case 'menuitem':
      return pushStartMenuItem(target, props, formatContext);
    case 'object':
      return pushStartObject(target, props, formatContext);
    case 'title':
      return pushTitle(target, props, renderState, formatContext);
    case 'link':
      return pushLink(
        target,
        props,
        resumableState,
        renderState,
        hoistableState,
        textEmbedded,
        formatContext,
      );
    case 'script':
      return pushScript(
        target,
        props,
        resumableState,
        renderState,
        textEmbedded,
        formatContext,
      );
    case 'style':
      return pushStyle(
        target,
        props,
        resumableState,
        renderState,
        hoistableState,
        textEmbedded,
        formatContext,
      );
    case 'meta':
      return pushMeta(target, props, renderState, textEmbedded, formatContext);
    // Newline eating tags
    case 'listing':
    case 'pre': {
      return pushStartPreformattedElement(target, props, type, formatContext);
    }
    case 'img': {
      return pushImg(
        target,
        props,
        resumableState,
        renderState,
        hoistableState,
        formatContext,
      );
    }
    // Omitted close tags
    case 'base':
    case 'area':
    case 'br':
    case 'col':
    case 'embed':
    case 'hr':
    case 'keygen':
    case 'param':
    case 'source':
    case 'track':
    case 'wbr': {
      return pushSelfClosing(target, props, type, formatContext);
    }
    // These are reserved SVG and MathML elements, that are never custom elements.
    // https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements-core-concepts
    case 'annotation-xml':
    case 'color-profile':
    case 'font-face':
    case 'font-face-src':
    case 'font-face-uri':
    case 'font-face-format':
    case 'font-face-name':
    case 'missing-glyph': {
      break;
    }
    // Preamble start tags
    case 'head':
      return pushStartHead(
        target,
        props,
        renderState,
        preambleState,
        formatContext,
      );
    case 'body':
      return pushStartBody(
        target,
        props,
        renderState,
        preambleState,
        formatContext,
      );
    case 'html': {
      return pushStartHtml(
        target,
        props,
        renderState,
        preambleState,
        formatContext,
      );
    }
    default: {
      if (type.indexOf('-') !== -1) {
        // Custom element
        return pushStartCustomElement(target, props, type, formatContext);
      }
    }
  }
  // Generic element
  return pushStartGenericElement(target, props, type, formatContext);
}

const endTagCache = new Map<string, PrecomputedChunk>();
function endChunkForTag(tag: string): PrecomputedChunk {
  let chunk = endTagCache.get(tag);
  if (chunk === undefined) {
    chunk = stringToPrecomputedChunk('</' + tag + '>');
    endTagCache.set(tag, chunk);
  }
  return chunk;
}

export function pushEndInstance(
  target: Array<Chunk | PrecomputedChunk>,
  type: string,
  props: Object,
  resumableState: ResumableState,
  formatContext: FormatContext,
): void {
  switch (type) {
    // We expect title and script tags to always be pushed in a unit and never
    // return children. when we end up pushing the end tag we want to ensure
    // there is no extra closing tag pushed
    case 'title':
    case 'style':
    case 'script':
    // Omitted close tags
    // TODO: Instead of repeating this switch we could try to pass a flag from above.
    // That would require returning a tuple. Which might be ok if it gets inlined.
    // fallthrough
    case 'area':
    case 'base':
    case 'br':
    case 'col':
    case 'embed':
    case 'hr':
    case 'img':
    case 'input':
    case 'keygen':
    case 'link':
    case 'meta':
    case 'param':
    case 'source':
    case 'track':
    case 'wbr': {
      // No close tag needed.
      return;
    }
    // Postamble end tags
    // When float is enabled we omit the end tags for body and html when
    // they represent the Document.body and Document.documentElement Nodes.
    // This is so we can withhold them until the postamble when we know
    // we won't emit any more tags
    case 'body': {
      if (formatContext.insertionMode <= HTML_HTML_MODE) {
        resumableState.hasBody = true;
        return;
      }
      break;
    }
    case 'html':
      if (formatContext.insertionMode === ROOT_HTML_MODE) {
        resumableState.hasHtml = true;
        return;
      }
      break;
    case 'head':
      if (formatContext.insertionMode <= HTML_HTML_MODE) {
        return;
      }
      break;
  }
  target.push(endChunkForTag(type));
}

export function hoistPreambleState(
  renderState: RenderState,
  preambleState: PreambleState,
) {
  const rootPreamble = renderState.preamble;
  if (rootPreamble.htmlChunks === null && preambleState.htmlChunks) {
    rootPreamble.htmlChunks = preambleState.htmlChunks;
  }
  if (rootPreamble.headChunks === null && preambleState.headChunks) {
    rootPreamble.headChunks = preambleState.headChunks;
  }
  if (rootPreamble.bodyChunks === null && preambleState.bodyChunks) {
    rootPreamble.bodyChunks = preambleState.bodyChunks;
  }
}

export function isPreambleReady(
  renderState: RenderState,
  // This means there are unfinished Suspense boundaries which could contain
  // a preamble. In the case of DOM we constrain valid programs to only having
  // one instance of each singleton so we can determine the preamble is ready
  // as long as we have chunks for each of these tags.
  hasPendingPreambles: boolean,
): boolean {
  const preamble = renderState.preamble;
  return (
    // There are no remaining boundaries which might contain a preamble so
    // the preamble is as complete as it is going to get
    hasPendingPreambles === false ||
    // we have a head and body tag. we don't need to wait for any more
    // because it would be invalid to render additional copies of these tags
    !!(preamble.headChunks && preamble.bodyChunks)
  );
}

function writeBootstrap(
  destination: Destination,
  renderState: RenderState,
): boolean {
  const bootstrapChunks = renderState.bootstrapChunks;
  let i = 0;
  for (; i < bootstrapChunks.length - 1; i++) {
    writeChunk(destination, bootstrapChunks[i]);
  }
  if (i < bootstrapChunks.length) {
    const lastChunk = bootstrapChunks[i];
    bootstrapChunks.length = 0;
    return writeChunkAndReturn(destination, lastChunk);
  }
  return true;
}

const shellTimeRuntimeScript = stringToPrecomputedChunk(markShellTime);

function writeShellTimeInstruction(
  destination: Destination,
  resumableState: ResumableState,
  renderState: RenderState,
): boolean {
  if (
    enableFizzExternalRuntime &&
    resumableState.streamingFormat !== ScriptStreamingFormat
  ) {
    // External runtime always tracks the shell time in the runtime.
    return true;
  }
  if ((resumableState.instructions & SentMarkShellTime) !== NothingSent) {
    // We already sent this instruction.
    return true;
  }
  resumableState.instructions |= SentMarkShellTime;
  writeChunk(destination, renderState.startInlineScript);
  writeCompletedShellIdAttribute(destination, resumableState);
  writeChunk(destination, endOfStartTag);
  writeChunk(destination, shellTimeRuntimeScript);
  return writeChunkAndReturn(destination, endInlineScript);
}

export function writeCompletedRoot(
  destination: Destination,
  resumableState: ResumableState,
  renderState: RenderState,
  isComplete: boolean,
): boolean {
  if (!isComplete) {
    // If we're not already fully complete, we might complete another boundary. If so,
    // we need to track the paint time of the shell so we know how much to throttle the reveal.
    writeShellTimeInstruction(destination, resumableState, renderState);
  }
  if (enableFizzBlockingRender) {
    const preamble = renderState.preamble;
    if (preamble.htmlChunks || preamble.headChunks) {
      // If we rendered the whole document, then we emitted a rel="expect" that needs a
      // matching target. Normally we use one of the bootstrap scripts for this but if
      // there are none, then we need to emit a tag to complete the shell.
      if (
        (resumableState.instructions & SentCompletedShellId) ===
        NothingSent
      ) {
        writeChunk(destination, startChunkForTag('template'));
        writeCompletedShellIdAttribute(destination, resumableState);
        writeChunk(destination, endOfStartTag);
        writeChunk(destination, endChunkForTag('template'));
      }
    }
  }
  return writeBootstrap(destination, renderState);
}

// Structural Nodes

// A placeholder is a node inside a hidden partial tree that can be filled in later, but before
// display. It's never visible to users. We use the template tag because it can be used in every
// type of parent. <script> tags also work in every other tag except <colgroup>.
const placeholder1 = stringToPrecomputedChunk('<template id="');
const placeholder2 = stringToPrecomputedChunk('"></template>');
export function writePlaceholder(
  destination: Destination,
  renderState: RenderState,
  id: number,
): boolean {
  writeChunk(destination, placeholder1);
  writeChunk(destination, renderState.placeholderPrefix);
  const formattedID = stringToChunk(id.toString(16));
  writeChunk(destination, formattedID);
  return writeChunkAndReturn(destination, placeholder2);
}

// Activity boundaries are encoded as comments.
const startActivityBoundary = stringToPrecomputedChunk('<!--&-->');
const endActivityBoundary = stringToPrecomputedChunk('<!--/&-->');

export function pushStartActivityBoundary(
  target: Array<Chunk | PrecomputedChunk>,
  renderState: RenderState,
): void {
  target.push(startActivityBoundary);
}

export function pushEndActivityBoundary(
  target: Array<Chunk | PrecomputedChunk>,
  renderState: RenderState,
): void {
  target.push(endActivityBoundary);
}

// Suspense boundaries are encoded as comments.
const startCompletedSuspenseBoundary = stringToPrecomputedChunk('<!--$-->');
const startPendingSuspenseBoundary1 = stringToPrecomputedChunk(
  '<!--$?--><template id="',
);
const startPendingSuspenseBoundary2 = stringToPrecomputedChunk('"></template>');
const startClientRenderedSuspenseBoundary =
  stringToPrecomputedChunk('<!--$!-->');
const endSuspenseBoundary = stringToPrecomputedChunk('<!--/$-->');

const clientRenderedSuspenseBoundaryError1 =
  stringToPrecomputedChunk('<template');
const clientRenderedSuspenseBoundaryErrorAttrInterstitial =
  stringToPrecomputedChunk('"');
const clientRenderedSuspenseBoundaryError1A =
  stringToPrecomputedChunk(' data-dgst="');
const clientRenderedSuspenseBoundaryError1B =
  stringToPrecomputedChunk(' data-msg="');
const clientRenderedSuspenseBoundaryError1C =
  stringToPrecomputedChunk(' data-stck="');
const clientRenderedSuspenseBoundaryError1D =
  stringToPrecomputedChunk(' data-cstck="');
const clientRenderedSuspenseBoundaryError2 =
  stringToPrecomputedChunk('></template>');

export function writeStartCompletedSuspenseBoundary(
  destination: Destination,
  renderState: RenderState,
): boolean {
  return writeChunkAndReturn(destination, startCompletedSuspenseBoundary);
}
export function writeStartPendingSuspenseBoundary(
  destination: Destination,
  renderState: RenderState,
  id: number,
): boolean {
  writeChunk(destination, startPendingSuspenseBoundary1);

  // $FlowFixMe[invalid-compare]
  if (id === null) {
    throw new Error(
      'An ID must have been assigned before we can complete the boundary.',
    );
  }

  writeChunk(destination, renderState.boundaryPrefix);
  writeChunk(destination, stringToChunk(id.toString(16)));
  return writeChunkAndReturn(destination, startPendingSuspenseBoundary2);
}
export function writeStartClientRenderedSuspenseBoundary(
  destination: Destination,
  renderState: RenderState,
  errorDigest: ?string,
  errorMessage: ?string,
  errorStack: ?string,
  errorComponentStack: ?string,
): boolean {
  let result;
  result = writeChunkAndReturn(
    destination,
    startClientRenderedSuspenseBoundary,
  );
  writeChunk(destination, clientRenderedSuspenseBoundaryError1);
  if (errorDigest) {
    writeChunk(destination, clientRenderedSuspenseBoundaryError1A);
    writeChunk(destination, stringToChunk(escapeTextForBrowser(errorDigest)));
    writeChunk(
      destination,
      clientRenderedSuspenseBoundaryErrorAttrInterstitial,
    );
  }
  if (__DEV__) {
    if (errorMessage) {
      writeChunk(destination, clientRenderedSuspenseBoundaryError1B);
      writeChunk(
        destination,
        stringToChunk(escapeTextForBrowser(errorMessage)),
      );
      writeChunk(
        destination,
        clientRenderedSuspenseBoundaryErrorAttrInterstitial,
      );
    }
    if (errorStack) {
      writeChunk(destination, clientRenderedSuspenseBoundaryError1C);
      writeChunk(destination, stringToChunk(escapeTextForBrowser(errorStack)));
      writeChunk(
        destination,
        clientRenderedSuspenseBoundaryErrorAttrInterstitial,
      );
    }
    if (errorComponentStack) {
      writeChunk(destination, clientRenderedSuspenseBoundaryError1D);
      writeChunk(
        destination,
        stringToChunk(escapeTextForBrowser(errorComponentStack)),
      );
      writeChunk(
        destination,
        clientRenderedSuspenseBoundaryErrorAttrInterstitial,
      );
    }
  }
  result = writeChunkAndReturn(
    destination,
    clientRenderedSuspenseBoundaryError2,
  );
  return result;
}
export function writeEndCompletedSuspenseBoundary(
  destination: Destination,
  renderState: RenderState,
): boolean {
  return writeChunkAndReturn(destination, endSuspenseBoundary);
}
export function writeEndPendingSuspenseBoundary(
  destination: Destination,
  renderState: RenderState,
): boolean {
  return writeChunkAndReturn(destination, endSuspenseBoundary);
}
export function writeEndClientRenderedSuspenseBoundary(
  destination: Destination,
  renderState: RenderState,
): boolean {
  return writeChunkAndReturn(destination, endSuspenseBoundary);
}

const startSegmentHTML = stringToPrecomputedChunk('<div hidden id="');
const startSegmentHTML2 = stringToPrecomputedChunk('">');
const endSegmentHTML = stringToPrecomputedChunk('</div>');

const startSegmentSVG = stringToPrecomputedChunk(
  '<svg aria-hidden="true" style="display:none" id="',
);
const startSegmentSVG2 = stringToPrecomputedChunk('">');
const endSegmentSVG = stringToPrecomputedChunk('</svg>');

const startSegmentMathML = stringToPrecomputedChunk(
  '<math aria-hidden="true" style="display:none" id="',
);
const startSegmentMathML2 = stringToPrecomputedChunk('">');
const endSegmentMathML = stringToPrecomputedChunk('</math>');

const startSegmentTable = stringToPrecomputedChunk('<table hidden id="');
const startSegmentTable2 = stringToPrecomputedChunk('">');
const endSegmentTable = stringToPrecomputedChunk('</table>');

const startSegmentTableBody = stringToPrecomputedChunk(
  '<table hidden><tbody id="',
);
const startSegmentTableBody2 = stringToPrecomputedChunk('">');
const endSegmentTableBody = stringToPrecomputedChunk('</tbody></table>');

const startSegmentTableRow = stringToPrecomputedChunk('<table hidden><tr id="');
const startSegmentTableRow2 = stringToPrecomputedChunk('">');
const endSegmentTableRow = stringToPrecomputedChunk('</tr></table>');

const startSegmentColGroup = stringToPrecomputedChunk(
  '<table hidden><colgroup id="',
);
const startSegmentColGroup2 = stringToPrecomputedChunk('">');
const endSegmentColGroup = stringToPrecomputedChunk('</colgroup></table>');

export function writeStartSegment(
  destination: Destination,
  renderState: RenderState,
  formatContext: FormatContext,
  id: number,
): boolean {
  switch (formatContext.insertionMode) {
    case ROOT_HTML_MODE:
    case HTML_HTML_MODE:
    case HTML_HEAD_MODE:
    case HTML_MODE: {
      writeChunk(destination, startSegmentHTML);
      writeChunk(destination, renderState.segmentPrefix);
      writeChunk(destination, stringToChunk(id.toString(16)));
      return writeChunkAndReturn(destination, startSegmentHTML2);
    }
    case SVG_MODE: {
      writeChunk(destination, startSegmentSVG);
      writeChunk(destination, renderState.segmentPrefix);
      writeChunk(destination, stringToChunk(id.toString(16)));
      return writeChunkAndReturn(destination, startSegmentSVG2);
    }
    case MATHML_MODE: {
      writeChunk(destination, startSegmentMathML);
      writeChunk(destination, renderState.segmentPrefix);
      writeChunk(destination, stringToChunk(id.toString(16)));
      return writeChunkAndReturn(destination, startSegmentMathML2);
    }
    case HTML_TABLE_MODE: {
      writeChunk(destination, startSegmentTable);
      writeChunk(destination, renderState.segmentPrefix);
      writeChunk(destination, stringToChunk(id.toString(16)));
      return writeChunkAndReturn(destination, startSegmentTable2);
    }
    // TODO: For the rest of these, there will be extra wrapper nodes that never
    // get deleted from the document. We need to delete the table too as part
    // of the injected scripts. They are invisible though so it's not too terrible
    // and it's kind of an edge case to suspend in a table. Totally supported though.
    case HTML_TABLE_BODY_MODE: {
      writeChunk(destination, startSegmentTableBody);
      writeChunk(destination, renderState.segmentPrefix);
      writeChunk(destination, stringToChunk(id.toString(16)));
      return writeChunkAndReturn(destination, startSegmentTableBody2);
    }
    case HTML_TABLE_ROW_MODE: {
      writeChunk(destination, startSegmentTableRow);
      writeChunk(destination, renderState.segmentPrefix);
      writeChunk(destination, stringToChunk(id.toString(16)));
      return writeChunkAndReturn(destination, startSegmentTableRow2);
    }
    case HTML_COLGROUP_MODE: {
      writeChunk(destination, startSegmentColGroup);
      writeChunk(destination, renderState.segmentPrefix);
      writeChunk(destination, stringToChunk(id.toString(16)));
      return writeChunkAndReturn(destination, startSegmentColGroup2);
    }
    default: {
      throw new Error('Unknown insertion mode. This is a bug in React.');
    }
  }
}
export function writeEndSegment(
  destination: Destination,
  formatContext: FormatContext,
): boolean {
  switch (formatContext.insertionMode) {
    case ROOT_HTML_MODE:
    case HTML_HTML_MODE:
    case HTML_HEAD_MODE:
    case HTML_MODE: {
      return writeChunkAndReturn(destination, endSegmentHTML);
    }
    case SVG_MODE: {
      return writeChunkAndReturn(destination, endSegmentSVG);
    }
    case MATHML_MODE: {
      return writeChunkAndReturn(destination, endSegmentMathML);
    }
    case HTML_TABLE_MODE: {
      return writeChunkAndReturn(destination, endSegmentTable);
    }
    case HTML_TABLE_BODY_MODE: {
      return writeChunkAndReturn(destination, endSegmentTableBody);
    }
    case HTML_TABLE_ROW_MODE: {
      return writeChunkAndReturn(destination, endSegmentTableRow);
    }
    case HTML_COLGROUP_MODE: {
      return writeChunkAndReturn(destination, endSegmentColGroup);
    }
    default: {
      throw new Error('Unknown insertion mode. This is a bug in React.');
    }
  }
}

const completeSegmentScript1Full = stringToPrecomputedChunk(
  completeSegmentFunction + '$RS("',
);
const completeSegmentScript1Partial = stringToPrecomputedChunk('$RS("');
const completeSegmentScript2 = stringToPrecomputedChunk('","');
const completeSegmentScriptEnd = stringToPrecomputedChunk('")</script>');

const completeSegmentData1 = stringToPrecomputedChunk(
  '<template data-rsi="" data-sid="',
);
const completeSegmentData2 = stringToPrecomputedChunk('" data-pid="');
const completeSegmentDataEnd = dataElementQuotedEnd;

export function writeCompletedSegmentInstruction(
  destination: Destination,
  resumableState: ResumableState,
  renderState: RenderState,
  contentSegmentID: number,
): boolean {
  const scriptFormat =
    !enableFizzExternalRuntime ||
    resumableState.streamingFormat === ScriptStreamingFormat;
  if (scriptFormat) {
    writeChunk(destination, renderState.startInlineScript);
    writeChunk(destination, endOfStartTag);
    if (
      (resumableState.instructions & SentCompleteSegmentFunction) ===
      NothingSent
    ) {
      // The first time we write this, we'll need to include the full implementation.
      resumableState.instructions |= SentCompleteSegmentFunction;
      writeChunk(destination, completeSegmentScript1Full);
    } else {
      // Future calls can just reuse the same function.
      writeChunk(destination, completeSegmentScript1Partial);
    }
  } else {
    writeChunk(destination, completeSegmentData1);
  }

  // Write function arguments, which are string literals
  writeChunk(destination, renderState.segmentPrefix);
  const formattedID = stringToChunk(contentSegmentID.toString(16));
  writeChunk(destination, formattedID);
  if (scriptFormat) {
    writeChunk(destination, completeSegmentScript2);
  } else {
    writeChunk(destination, completeSegmentData2);
  }
  writeChunk(destination, renderState.placeholderPrefix);
  writeChunk(destination, formattedID);

  if (scriptFormat) {
    return writeChunkAndReturn(destination, completeSegmentScriptEnd);
  } else {
    return writeChunkAndReturn(destination, completeSegmentDataEnd);
  }
}

const completeBoundaryScriptFunctionOnly = stringToPrecomputedChunk(
  completeBoundaryFunction,
);
const completeBoundaryUpgradeToViewTransitionsInstruction = stringToChunk(
  upgradeToViewTransitionsInstruction,
);
const completeBoundaryScript1Partial = stringToPrecomputedChunk('$RC("');

const completeBoundaryWithStylesScript1FullPartial = stringToPrecomputedChunk(
  styleInsertionFunction + '$RR("',
);

const completeBoundaryWithStylesScript1Partial =
  stringToPrecomputedChunk('$RR("');
const completeBoundaryScript2 = stringToPrecomputedChunk('","');
const completeBoundaryScript3a = stringToPrecomputedChunk('",');
const completeBoundaryScript3b = stringToPrecomputedChunk('"');
const completeBoundaryScriptEnd = stringToPrecomputedChunk(')</script>');

const completeBoundaryData1 = stringToPrecomputedChunk(
  '<template data-rci="" data-bid="',
);
const completeBoundaryWithStylesData1 = stringToPrecomputedChunk(
  '<template data-rri="" data-bid="',
);
const completeBoundaryData2 = stringToPrecomputedChunk('" data-sid="');
const completeBoundaryData3a = stringToPrecomputedChunk('" data-sty="');
const completeBoundaryDataEnd = dataElementQuotedEnd;

export function writeCompletedBoundaryInstruction(
  destination: Destination,
  resumableState: ResumableState,
  renderState: RenderState,
  id: number,
  hoistableState: HoistableState,
): boolean {
  const requiresStyleInsertion = renderState.stylesToHoist;
  const requiresViewTransitions =
    enableViewTransition &&
    (resumableState.instructions & NeedUpgradeToViewTransitions) !==
      NothingSent;
  // If necessary stylesheets will be flushed with this instruction.
  // Any style tags not yet hoisted in the Document will also be hoisted.
  // We reset this state since after this instruction executes all styles
  // up to this point will have been hoisted
  renderState.stylesToHoist = false;
  const scriptFormat =
    !enableFizzExternalRuntime ||
    resumableState.streamingFormat === ScriptStreamingFormat;
  if (scriptFormat) {
    writeChunk(destination, renderState.startInlineScript);
    writeChunk(destination, endOfStartTag);
    if (requiresStyleInsertion) {
      if (
        (resumableState.instructions & SentClientRenderFunction) ===
        NothingSent
      ) {
        // The completeBoundaryWithStyles function depends on the client render function.
        resumableState.instructions |= SentClientRenderFunction;
        writeChunk(destination, clientRenderScriptFunctionOnly);
      }
      if (
        (resumableState.instructions & SentCompleteBoundaryFunction) ===
        NothingSent
      ) {
        // The completeBoundaryWithStyles function depends on the complete boundary function.
        resumableState.instructions |= SentCompleteBoundaryFunction;
        writeChunk(destination, completeBoundaryScriptFunctionOnly);
      }
      if (
        requiresViewTransitions &&
        (resumableState.instructions & SentUpgradeToViewTransitions) ===
          NothingSent
      ) {
        resumableState.instructions |= SentUpgradeToViewTransitions;
        writeChunk(
          destination,
          completeBoundaryUpgradeToViewTransitionsInstruction,
        );
      }
      if (
        (resumableState.instructions & SentStyleInsertionFunction) ===
        NothingSent
      ) {
        resumableState.instructions |= SentStyleInsertionFunction;
        writeChunk(destination, completeBoundaryWithStylesScript1FullPartial);
      } else {
        writeChunk(destination, completeBoundaryWithStylesScript1Partial);
      }
    } else {
      if (
        (resumableState.instructions & SentCompleteBoundaryFunction) ===
        NothingSent
      ) {
        resumableState.instructions |= SentCompleteBoundaryFunction;
        writeChunk(destination, completeBoundaryScriptFunctionOnly);
      }
      if (
        requiresViewTransitions &&
        (resumableState.instructions & SentUpgradeToViewTransitions) ===
          NothingSent
      ) {
        resumableState.instructions |= SentUpgradeToViewTransitions;
        writeChunk(
          destination,
          completeBoundaryUpgradeToViewTransitionsInstruction,
        );
      }
      writeChunk(destination, completeBoundaryScript1Partial);
    }
  } else {
    if (requiresStyleInsertion) {
      writeChunk(destination, completeBoundaryWithStylesData1);
    } else {
      writeChunk(destination, completeBoundaryData1);
    }
  }

  const idChunk = stringToChunk(id.toString(16));

  writeChunk(destination, renderState.boundaryPrefix);
  writeChunk(destination, idChunk);

  // Write function arguments, which are string and array literals
  if (scriptFormat) {
    writeChunk(destination, completeBoundaryScript2);
  } else {
    writeChunk(destination, completeBoundaryData2);
  }
  writeChunk(destination, renderState.segmentPrefix);
  writeChunk(destination, idChunk);
  if (requiresStyleInsertion) {
    // Script and data writers must format this differently:
    //  - script writer emits an array literal, whose string elements are
    //    escaped for javascript  e.g. ["A", "B"]
    //  - data writer emits a string literal, which is escaped as html
    //    e.g. [&#34;A&#34;, &#34;B&#34;]
    if (scriptFormat) {
      writeChunk(destination, completeBoundaryScript3a);
      // hoistableState encodes an array literal
      writeStyleResourceDependenciesInJS(destination, hoistableState);
    } else {
      writeChunk(destination, completeBoundaryData3a);
      writeStyleResourceDependenciesInAttr(destination, hoistableState);
    }
  } else {
    if (scriptFormat) {
      writeChunk(destination, completeBoundaryScript3b);
    }
  }
  let writeMore;
  if (scriptFormat) {
    writeMore = writeChunkAndReturn(destination, completeBoundaryScriptEnd);
  } else {
    writeMore = writeChunkAndReturn(destination, completeBoundaryDataEnd);
  }
  return writeBootstrap(destination, renderState) && writeMore;
}

const clientRenderScriptFunctionOnly =
  stringToPrecomputedChunk(clientRenderFunction);

const clientRenderScript1Full = stringToPrecomputedChunk(
  clientRenderFunction + ';$RX("',
);
const clientRenderScript1Partial = stringToPrecomputedChunk('$RX("');
const clientRenderScript1A = stringToPrecomputedChunk('"');
const clientRenderErrorScriptArgInterstitial = stringToPrecomputedChunk(',');
const clientRenderScriptEnd = stringToPrecomputedChunk(')</script>');

const clientRenderData1 = stringToPrecomputedChunk(
  '<template data-rxi="" data-bid="',
);
const clientRenderData2 = stringToPrecomputedChunk('" data-dgst="');
const clientRenderData3 = stringToPrecomputedChunk('" data-msg="');
const clientRenderData4 = stringToPrecomputedChunk('" data-stck="');
const clientRenderData5 = stringToPrecomputedChunk('" data-cstck="');
const clientRenderDataEnd = dataElementQuotedEnd;

export function writeClientRenderBoundaryInstruction(
  destination: Destination,
  resumableState: ResumableState,
  renderState: RenderState,
  id: number,
  errorDigest: ?string,
  errorMessage: ?string,
  errorStack: ?string,
  errorComponentStack: ?string,
): boolean {
  const scriptFormat =
    !enableFizzExternalRuntime ||
    resumableState.streamingFormat === ScriptStreamingFormat;
  if (scriptFormat) {
    writeChunk(destination, renderState.startInlineScript);
    writeChunk(destination, endOfStartTag);
    if (
      (resumableState.instructions & SentClientRenderFunction) ===
      NothingSent
    ) {
      // The first time we write this, we'll need to include the full implementation.
      resumableState.instructions |= SentClientRenderFunction;
      writeChunk(destination, clientRenderScript1Full);
    } else {
      // Future calls can just reuse the same function.
      writeChunk(destination, clientRenderScript1Partial);
    }
  } else {
    // <template data-rxi="" data-bid="
    writeChunk(destination, clientRenderData1);
  }

  writeChunk(destination, renderState.boundaryPrefix);
  writeChunk(destination, stringToChunk(id.toString(16)));
  if (scriptFormat) {
    // " needs to be inserted for scripts, since ArgInterstitual does not contain
    // leading or trailing quotes
    writeChunk(destination, clientRenderScript1A);
  }

  if (errorDigest || errorMessage || errorStack || errorComponentStack) {
    if (scriptFormat) {
      // ,"JSONString"
      writeChunk(destination, clientRenderErrorScriptArgInterstitial);
      writeChunk(
        destination,
        stringToChunk(escapeJSStringsForInstructionScripts(errorDigest || '')),
      );
    } else {
      // " data-dgst="HTMLString
      writeChunk(destination, clientRenderData2);
      writeChunk(
        destination,
        stringToChunk(escapeTextForBrowser(errorDigest || '')),
      );
    }
  }
  if (errorMessage || errorStack || errorComponentStack) {
    if (scriptFormat) {
      // ,"JSONString"
      writeChunk(destination, clientRenderErrorScriptArgInterstitial);
      writeChunk(
        destination,
        stringToChunk(escapeJSStringsForInstructionScripts(errorMessage || '')),
      );
    } else {
      // " data-msg="HTMLString
      writeChunk(destination, clientRenderData3);
      writeChunk(
        destination,
        stringToChunk(escapeTextForBrowser(errorMessage || '')),
      );
    }
  }
  if (errorStack || errorComponentStack) {
    // ,"JSONString"
    if (scriptFormat) {
      writeChunk(destination, clientRenderErrorScriptArgInterstitial);
      writeChunk(
        destination,
        stringToChunk(escapeJSStringsForInstructionScripts(errorStack || '')),
      );
    } else {
      // " data-stck="HTMLString
      writeChunk(destination, clientRenderData4);
      writeChunk(
        destination,
        stringToChunk(escapeTextForBrowser(errorStack || '')),
      );
    }
  }
  if (errorComponentStack) {
    // ,"JSONString"
    if (scriptFormat) {
      writeChunk(destination, clientRenderErrorScriptArgInterstitial);
      writeChunk(
        destination,
        stringToChunk(
          escapeJSStringsForInstructionScripts(errorComponentStack),
        ),
      );
    } else {
      // " data-cstck="HTMLString
      writeChunk(destination, clientRenderData5);
      writeChunk(
        destination,
        stringToChunk(escapeTextForBrowser(errorComponentStack)),
      );
    }
  }

  if (scriptFormat) {
    // ></script>
    return writeChunkAndReturn(destination, clientRenderScriptEnd);
  } else {
    // "></template>
    return writeChunkAndReturn(destination, clientRenderDataEnd);
  }
}

const regexForJSStringsInInstructionScripts = /[<\u2028\u2029]/g;
function escapeJSStringsForInstructionScripts(input: string): string {
  const escaped = JSON.stringify(input);
  return escaped.replace(regexForJSStringsInInstructionScripts, match => {
    switch (match) {
      // santizing breaking out of strings and script tags
      case '<':
        return '\\u003c';
      case '\u2028':
        return '\\u2028';
      case '\u2029':
        return '\\u2029';
      default: {
        // eslint-disable-next-line react-internal/prod-error-codes
        throw new Error(
          'escapeJSStringsForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React',
        );
      }
    }
  });
}

const regexForJSStringsInScripts = /[&><\u2028\u2029]/g;
function escapeJSObjectForInstructionScripts(input: Object): string {
  const escaped = JSON.stringify(input);
  return escaped.replace(regexForJSStringsInScripts, match => {
    switch (match) {
      // santizing breaking out of strings and script tags
      case '&':
        return '\\u0026';
      case '>':
        return '\\u003e';
      case '<':
        return '\\u003c';
      case '\u2028':
        return '\\u2028';
      case '\u2029':
        return '\\u2029';
      default: {
        // eslint-disable-next-line react-internal/prod-error-codes
        throw new Error(
          'escapeJSObjectForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React',
        );
      }
    }
  });
}

const lateStyleTagResourceOpen1 = stringToPrecomputedChunk(
  ' media="not all" data-precedence="',
);
const lateStyleTagResourceOpen2 = stringToPrecomputedChunk('" data-href="');
const lateStyleTagResourceOpen3 = stringToPrecomputedChunk('">');
const lateStyleTagTemplateClose = stringToPrecomputedChunk('</style>');

// Tracks whether the boundary currently flushing is flushign style tags or has any
// stylesheet dependencies not flushed in the Preamble.
let currentlyRenderingBoundaryHasStylesToHoist = false;

// Acts as a return value for the forEach execution of style tag flushing.
let destinationHasCapacity = true;

function flushStyleTagsLateForBoundary(
  this: Destination,
  styleQueue: StyleQueue,
) {
  const rules = styleQueue.rules;
  const hrefs = styleQueue.hrefs;
  if (__DEV__) {
    if (rules.length > 0 && hrefs.length === 0) {
      console.error(
        'React expected to have at least one href for an a hoistable style but found none. This is a bug in React.',
      );
    }
  }
  let i = 0;
  if (hrefs.length) {
    writeChunk(
      this,
      (currentlyFlushingRenderState as any as RenderState).startInlineStyle,
    );
    writeChunk(this, lateStyleTagResourceOpen1);
    writeChunk(this, styleQueue.precedence);
    writeChunk(this, lateStyleTagResourceOpen2);
    for (; i < hrefs.length - 1; i++) {
      writeChunk(this, hrefs[i]);
      writeChunk(this, spaceSeparator);
    }
    writeChunk(this, hrefs[i]);
    writeChunk(this, lateStyleTagResourceOpen3);
    for (i = 0; i < rules.length; i++) {
      writeChunk(this, rules[i]);
    }
    destinationHasCapacity = writeChunkAndReturn(
      this,
      lateStyleTagTemplateClose,
    );

    // We wrote style tags for this boundary and we may need to emit a script
    // to hoist them.
    currentlyRenderingBoundaryHasStylesToHoist = true;

    // style resources can flush continuously since more rules may be written into
    // them with new hrefs. Instead of marking it flushed, we simply reset the chunks
    // and hrefs
    rules.length = 0;
    hrefs.length = 0;
  }
}

function hasStylesToHoist(stylesheet: StylesheetResource): boolean {
  // We need to reveal boundaries with styles whenever a stylesheet it depends on is either
  // not flushed or flushed after the preamble (shell).
  if (stylesheet.state !== PREAMBLE) {
    currentlyRenderingBoundaryHasStylesToHoist = true;
    return true;
  }
  return false;
}

export function writeHoistablesForBoundary(
  destination: Destination,
  hoistableState: HoistableState,
  renderState: RenderState,
): boolean {
  // Reset these on each invocation, they are only safe to read in this function
  currentlyRenderingBoundaryHasStylesToHoist = false;
  destinationHasCapacity = true;

  // Flush style tags for each precedence this boundary depends on
  currentlyFlushingRenderState = renderState;
  hoistableState.styles.forEach(flushStyleTagsLateForBoundary, destination);
  currentlyFlushingRenderState = null;

  // Determine if this boundary has stylesheets that need to be awaited upon completion
  hoistableState.stylesheets.forEach(hasStylesToHoist);

  // We don't actually want to flush any hoistables until the boundary is complete so we omit
  // any further writing here. This is because unlike Resources, Hoistable Elements act more like
  // regular elements, each rendered element has a unique representation in the DOM. We don't want
  // these elements to appear in the DOM early, before the boundary has actually completed

  if (currentlyRenderingBoundaryHasStylesToHoist) {
    renderState.stylesToHoist = true;
  }
  return destinationHasCapacity;
}

function flushResource(this: Destination, resource: Resource) {
  for (let i = 0; i < resource.length; i++) {
    writeChunk(this, resource[i]);
  }
  resource.length = 0;
}

const stylesheetFlushingQueue: Array<Chunk | PrecomputedChunk> = [];

function flushStyleInPreamble(
  this: Destination,
  stylesheet: StylesheetResource,
  key: string,
  map: Map<string, StylesheetResource>,
) {
  // We still need to encode stylesheet chunks
  // because unlike most Hoistables and Resources we do not eagerly encode
  // them during render. This is because if we flush late we have to send a
  // different encoding and we don't want to encode multiple times
  pushLinkImpl(stylesheetFlushingQueue, stylesheet.props);
  for (let i = 0; i < stylesheetFlushingQueue.length; i++) {
    writeChunk(this, stylesheetFlushingQueue[i]);
  }
  stylesheetFlushingQueue.length = 0;
  stylesheet.state = PREAMBLE;
}

const styleTagResourceOpen1 = stringToPrecomputedChunk(' data-precedence="');
const styleTagResourceOpen2 = stringToPrecomputedChunk('" data-href="');
const spaceSeparator = stringToPrecomputedChunk(' ');
const styleTagResourceOpen3 = stringToPrecomputedChunk('">');

const styleTagResourceClose = stringToPrecomputedChunk('</style>');

function flushStylesInPreamble(
  this: Destination,
  styleQueue: StyleQueue,
  precedence: string,
) {
  const hasStylesheets = styleQueue.sheets.size > 0;
  styleQueue.sheets.forEach(flushStyleInPreamble, this);
  styleQueue.sheets.clear();

  const rules = styleQueue.rules;
  const hrefs = styleQueue.hrefs;
  // If we don't emit any stylesheets at this precedence we still need to maintain the precedence
  // order so even if there are no rules for style tags at this precedence we emit an empty style
  // tag with the data-precedence attribute
  if (!hasStylesheets || hrefs.length) {
    writeChunk(
      this,
      (currentlyFlushingRenderState as any as RenderState).startInlineStyle,
    );
    writeChunk(this, styleTagResourceOpen1);
    writeChunk(this, styleQueue.precedence);
    let i = 0;
    if (hrefs.length) {
      writeChunk(this, styleTagResourceOpen2);
      for (; i < hrefs.length - 1; i++) {
        writeChunk(this, hrefs[i]);
        writeChunk(this, spaceSeparator);
      }
      writeChunk(this, hrefs[i]);
    }
    writeChunk(this, styleTagResourceOpen3);
    for (i = 0; i < rules.length; i++) {
      writeChunk(this, rules[i]);
    }
    writeChunk(this, styleTagResourceClose);

    // style resources can flush continuously since more rules may be written into
    // them with new hrefs. Instead of marking it flushed, we simply reset the chunks
    // and hrefs
    rules.length = 0;
    hrefs.length = 0;
  }
}

function preloadLateStyle(this: Destination, stylesheet: StylesheetResource) {
  if (stylesheet.state === PENDING) {
    stylesheet.state = PRELOADED;
    const preloadProps = preloadAsStylePropsFromProps(
      stylesheet.props.href,
      stylesheet.props,
    );
    pushLinkImpl(stylesheetFlushingQueue, preloadProps);
    for (let i = 0; i < stylesheetFlushingQueue.length; i++) {
      writeChunk(this, stylesheetFlushingQueue[i]);
    }
    stylesheetFlushingQueue.length = 0;
  }
}

function preloadLateStyles(this: Destination, styleQueue: StyleQueue) {
  styleQueue.sheets.forEach(preloadLateStyle, this);
  styleQueue.sheets.clear();
}

const blockingRenderChunkStart = stringToPrecomputedChunk(
  '<link rel="expect" href="#',
);
const blockingRenderChunkEnd = stringToPrecomputedChunk(
  '" blocking="render"/>',
);

function writeBlockingRenderInstruction(
  destination: Destination,
  resumableState: ResumableState,
  renderState: RenderState,
): void {
  if (enableFizzBlockingRender) {
    const idPrefix = resumableState.idPrefix;
    const shellId = '_' + idPrefix + 'R_';
    writeChunk(destination, blockingRenderChunkStart);
    writeChunk(destination, stringToChunk(escapeTextForBrowser(shellId)));
    writeChunk(destination, blockingRenderChunkEnd);
  }
}

const completedShellIdAttributeStart = stringToPrecomputedChunk(' id="');

function writeCompletedShellIdAttribute(
  destination: Destination,
  resumableState: ResumableState,
): void {
  if ((resumableState.instructions & SentCompletedShellId) !== NothingSent) {
    return;
  }
  resumableState.instructions |= SentCompletedShellId;
  const idPrefix = resumableState.idPrefix;
  const shellId = '_' + idPrefix + 'R_';
  writeChunk(destination, completedShellIdAttributeStart);
  writeChunk(destination, stringToChunk(escapeTextForBrowser(shellId)));
  writeChunk(destination, attributeEnd);
}

function pushCompletedShellIdAttribute(
  target: Array<Chunk | PrecomputedChunk>,
  resumableState: ResumableState,
): void {
  if ((resumableState.instructions & SentCompletedShellId) !== NothingSent) {
    return;
  }
  resumableState.instructions |= SentCompletedShellId;
  const idPrefix = resumableState.idPrefix;
  const shellId = '_' + idPrefix + 'R_';
  target.push(
    completedShellIdAttributeStart,
    stringToChunk(escapeTextForBrowser(shellId)),
    attributeEnd,
  );
}

// We don't bother reporting backpressure at the moment because we expect to
// flush the entire preamble in a single pass. This probably should be modified
// in the future to be backpressure sensitive but that requires a larger refactor
// of the flushing code in Fizz.
export function writePreambleStart(
  destination: Destination,
  resumableState: ResumableState,
  renderState: RenderState,
  skipBlockingShell: boolean,
): void {
  // This function must be called exactly once on every request
  if (enableFizzExternalRuntime && renderState.externalRuntimeScript) {
    // If the root segment is incomplete due to suspended tasks
    // (e.g. willFlushAllSegments = false) and we are using data
    // streaming format, ensure the external runtime is sent.
    // (User code could choose to send this even earlier by calling
    //  preinit(...), if they know they will suspend).
    const {src, chunks} = renderState.externalRuntimeScript;
    internalPreinitScript(resumableState, renderState, src, chunks);
  }

  const preamble = renderState.preamble;

  const htmlChunks = preamble.htmlChunks;
  const headChunks = preamble.headChunks;

  let i = 0;

  // Emit open tags before Hoistables and Resources
  if (htmlChunks) {
    // We have an <html> to emit as part of the preamble
    for (i = 0; i < htmlChunks.length; i++) {
      writeChunk(destination, htmlChunks[i]);
    }
    if (headChunks) {
      for (i = 0; i < headChunks.length; i++) {
        writeChunk(destination, headChunks[i]);
      }
    } else {
      // We did not render a head but we emitted an <html> so we emit one now
      writeChunk(destination, startChunkForTag('head'));
      writeChunk(destination, endOfStartTag);
    }
  } else if (headChunks) {
    // We do not have an <html> but we do have a <head>
    for (i = 0; i < headChunks.length; i++) {
      writeChunk(destination, headChunks[i]);
    }
  }

  // Emit high priority Hoistables
  const charsetChunks = renderState.charsetChunks;
  for (i = 0; i < charsetChunks.length; i++) {
    writeChunk(destination, charsetChunks[i]);
  }
  charsetChunks.length = 0;

  // emit preconnect resources
  renderState.preconnects.forEach(flushResource, destination);
  renderState.preconnects.clear();

  const viewportChunks = renderState.viewportChunks;
  for (i = 0; i < viewportChunks.length; i++) {
    writeChunk(destination, viewportChunks[i]);
  }
  viewportChunks.length = 0;

  renderState.fontPreloads.forEach(flushResource, destination);
  renderState.fontPreloads.clear();

  renderState.highImagePreloads.forEach(flushResource, destination);
  renderState.highImagePreloads.clear();

  // Flush unblocked stylesheets by precedence
  currentlyFlushingRenderState = renderState;
  renderState.styles.forEach(flushStylesInPreamble, destination);
  currentlyFlushingRenderState = null;

  const importMapChunks = renderState.importMapChunks;
  for (i = 0; i < importMapChunks.length; i++) {
    writeChunk(destination, importMapChunks[i]);
  }
  importMapChunks.length = 0;

  renderState.bootstrapScripts.forEach(flushResource, destination);

  renderState.scripts.forEach(flushResource, destination);
  renderState.scripts.clear();

  renderState.bulkPreloads.forEach(flushResource, destination);
  renderState.bulkPreloads.clear();

  if ((htmlChunks || headChunks) && !skipBlockingShell) {
    // If we have any html or head chunks we know that we're rendering a full document.
    // A full document should block display until the full shell has downloaded.
    // Therefore we insert a render blocking instruction referring to the last body
    // element that's considered part of the shell. We do this after the important loads
    // have already been emitted so we don't do anything to delay them but early so that
    // the browser doesn't risk painting too early.
    writeBlockingRenderInstruction(destination, resumableState, renderState);
  } else {
    // We don't need to add the shell id so mark it as if sent.
    // Currently it might still be sent if it was already added to a bootstrap script.
    resumableState.instructions |= SentCompletedShellId;
  }

  // Write embedding hoistableChunks
  const hoistableChunks = renderState.hoistableChunks;
  for (i = 0; i < hoistableChunks.length; i++) {
    writeChunk(destination, hoistableChunks[i]);
  }
  hoistableChunks.length = 0;
}

// We don't bother reporting backpressure at the moment because we expect to
// flush the entire preamble in a single pass. This probably should be modified
// in the future to be backpressure sensitive but that requires a larger refactor
// of the flushing code in Fizz.
export function writePreambleEnd(
  destination: Destination,
  renderState: RenderState,
): void {
  const preamble = renderState.preamble;
  const htmlChunks = preamble.htmlChunks;
  const headChunks = preamble.headChunks;
  if (htmlChunks || headChunks) {
    // we have an <html> but we inserted an implicit <head> tag. We need
    // to close it since the main content won't have it
    writeChunk(destination, endChunkForTag('head'));
  }

  const bodyChunks = preamble.bodyChunks;
  if (bodyChunks) {
    for (let i = 0; i < bodyChunks.length; i++) {
      writeChunk(destination, bodyChunks[i]);
    }
  }
}

// We don't bother reporting backpressure at the moment because we expect to
// flush the entire preamble in a single pass. This probably should be modified
// in the future to be backpressure sensitive but that requires a larger refactor
// of the flushing code in Fizz.
export function writeHoistables(
  destination: Destination,
  resumableState: ResumableState,
  renderState: RenderState,
): void {
  let i = 0;

  // Emit high priority Hoistables

  // We omit charsetChunks because we have already sent the shell and if it wasn't
  // already sent it is too late now.

  const viewportChunks = renderState.viewportChunks;
  for (i = 0; i < viewportChunks.length; i++) {
    writeChunk(destination, viewportChunks[i]);
  }
  viewportChunks.length = 0;

  renderState.preconnects.forEach(flushResource, destination);
  renderState.preconnects.clear();

  renderState.fontPreloads.forEach(flushResource, destination);
  renderState.fontPreloads.clear();

  renderState.highImagePreloads.forEach(flushResource, destination);
  renderState.highImagePreloads.clear();

  // Preload any stylesheets. these will emit in a render instruction that follows this
  // but we want to kick off preloading as soon as possible
  renderState.styles.forEach(preloadLateStyles, destination);

  // We only hoist importmaps that are configured through createResponse and that will
  // always flush in the preamble. Generally we don't expect people to render them as
  // tags when using React but if you do they are going to be treated like regular inline
  // scripts and flush after other hoistables which is problematic

  // bootstrap scripts should flush above script priority but these can only flush in the preamble
  // so we elide the code here for performance

  renderState.scripts.forEach(flushResource, destination);
  renderState.scripts.clear();

  renderState.bulkPreloads.forEach(flushResource, destination);
  renderState.bulkPreloads.clear();

  // Write embedding hoistableChunks
  const hoistableChunks = renderState.hoistableChunks;
  for (i = 0; i < hoistableChunks.length; i++) {
    writeChunk(destination, hoistableChunks[i]);
  }
  hoistableChunks.length = 0;
}

export function writePostamble(
  destination: Destination,
  resumableState: ResumableState,
): void {
  if (resumableState.hasBody) {
    writeChunk(destination, endChunkForTag('body'));
  }
  if (resumableState.hasHtml) {
    writeChunk(destination, endChunkForTag('html'));
  }
}

const arrayFirstOpenBracket = stringToPrecomputedChunk('[');
const arraySubsequentOpenBracket = stringToPrecomputedChunk(',[');
const arrayInterstitial = stringToPrecomputedChunk(',');
const arrayCloseBracket = stringToPrecomputedChunk(']');

// This function writes a 2D array of strings to be embedded in javascript.
// E.g.
//  [["JS_escaped_string1", "JS_escaped_string2"]]
function writeStyleResourceDependenciesInJS(
  destination: Destination,
  hoistableState: HoistableState,
): void {
  writeChunk(destination, arrayFirstOpenBracket);

  let nextArrayOpenBrackChunk = arrayFirstOpenBracket;
  hoistableState.stylesheets.forEach(resource => {
    if (resource.state === PREAMBLE) {
      // We can elide this dependency because it was flushed in the shell and
      // should be ready before content is shown on the client
    } else if (resource.state === LATE) {
      // We only need to emit the href because this resource flushed in an earlier
      // boundary already which encoded the attributes necessary to construct
      // the resource instance on the client.
      writeChunk(destination, nextArrayOpenBrackChunk);
      writeStyleResourceDependencyHrefOnlyInJS(
        destination,
        resource.props.href,
      );
      writeChunk(destination, arrayCloseBracket);
      nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
    } else {
      // We need to emit the whole resource for insertion on the client
      writeChunk(destination, nextArrayOpenBrackChunk);
      writeStyleResourceDependencyInJS(
        destination,
        resource.props.href,
        resource.props['data-precedence'],
        resource.props,
      );
      writeChunk(destination, arrayCloseBracket);
      nextArrayOpenBrackChunk = arraySubsequentOpenBracket;

      resource.state = LATE;
    }
  });
  writeChunk(destination, arrayCloseBracket);
}

/* Helper functions */
function writeStyleResourceDependencyHrefOnlyInJS(
  destination: Destination,
  href: string,
) {
  // We should actually enforce this earlier when the resource is created but for
  // now we make sure we are actually dealing with a string here.
  if (__DEV__) {
    checkAttributeStringCoercion(href, 'href');
  }
  const coercedHref = '' + (href as any);
  writeChunk(
    destination,
    stringToChunk(escapeJSObjectForInstructionScripts(coercedHref)),
  );
}

function writeStyleResourceDependencyInJS(
  destination: Destination,
  href: mixed,
  precedence: mixed,
  props: Object,
) {
  // eslint-disable-next-line react-internal/safe-string-coercion
  const coercedHref = sanitizeURL('' + (href as any));
  writeChunk(
    destination,
    stringToChunk(escapeJSObjectForInstructionScripts(coercedHref)),
  );

  if (__DEV__) {
    checkAttributeStringCoercion(precedence, 'precedence');
  }
  const coercedPrecedence = '' + (precedence as any);
  writeChunk(destination, arrayInterstitial);
  writeChunk(
    destination,
    stringToChunk(escapeJSObjectForInstructionScripts(coercedPrecedence)),
  );

  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'href':
        case 'rel':
        case 'precedence':
        case 'data-precedence': {
          break;
        }
        case 'children':
        case 'dangerouslySetInnerHTML':
          throw new Error(
            `${'link'} is a self-closing tag and must neither have \`children\` nor ` +
              'use `dangerouslySetInnerHTML`.',
          );
        default:
          writeStyleResourceAttributeInJS(destination, propKey, propValue);
          break;
      }
    }
  }
  return null;
}

function writeStyleResourceAttributeInJS(
  destination: Destination,
  name: string,
  value: string | boolean | number | Function | Object, // not null or undefined
): void {
  let attributeName = name.toLowerCase();
  let attributeValue;
  switch (typeof value) {
    case 'function':
    case 'symbol':
      return;
  }

  switch (name) {
    // Reserved names
    case 'innerHTML':
    case 'dangerouslySetInnerHTML':
    case 'suppressContentEditableWarning':
    case 'suppressHydrationWarning':
    case 'style':
    case 'ref':
      // Ignored
      return;

    // Attribute renames
    case 'className': {
      attributeName = 'class';
      if (__DEV__) {
        checkAttributeStringCoercion(value, attributeName);
      }
      attributeValue = '' + (value as any);
      break;
    }
    // Booleans
    case 'hidden': {
      if (value === false) {
        return;
      }
      attributeValue = '';
      break;
    }
    // Santized URLs
    case 'src':
    case 'href': {
      value = sanitizeURL(value);
      if (__DEV__) {
        checkAttributeStringCoercion(value, attributeName);
      }
      attributeValue = '' + (value as any);
      break;
    }
    default: {
      if (
        // unrecognized event handlers are not SSR'd and we (apparently)
        // use on* as hueristic for these handler props
        name.length > 2 &&
        (name[0] === 'o' || name[0] === 'O') &&
        (name[1] === 'n' || name[1] === 'N')
      ) {
        return;
      }
      if (!isAttributeNameSafe(name)) {
        return;
      }
      if (__DEV__) {
        checkAttributeStringCoercion(value, attributeName);
      }
      attributeValue = '' + (value as any);
    }
  }
  writeChunk(destination, arrayInterstitial);
  writeChunk(
    destination,
    stringToChunk(escapeJSObjectForInstructionScripts(attributeName)),
  );
  writeChunk(destination, arrayInterstitial);
  writeChunk(
    destination,
    stringToChunk(escapeJSObjectForInstructionScripts(attributeValue)),
  );
}

// This function writes a 2D array of strings to be embedded in an attribute
// value and read with JSON.parse in ReactDOMServerExternalRuntime.js
// E.g.
//  [[&quot;JSON_escaped_string1&quot;, &quot;JSON_escaped_string2&quot;]]
function writeStyleResourceDependenciesInAttr(
  destination: Destination,
  hoistableState: HoistableState,
): void {
  writeChunk(destination, arrayFirstOpenBracket);

  let nextArrayOpenBrackChunk = arrayFirstOpenBracket;
  hoistableState.stylesheets.forEach(resource => {
    if (resource.state === PREAMBLE) {
      // We can elide this dependency because it was flushed in the shell and
      // should be ready before content is shown on the client
    } else if (resource.state === LATE) {
      // We only need to emit the href because this resource flushed in an earlier
      // boundary already which encoded the attributes necessary to construct
      // the resource instance on the client.
      writeChunk(destination, nextArrayOpenBrackChunk);
      writeStyleResourceDependencyHrefOnlyInAttr(
        destination,
        resource.props.href,
      );
      writeChunk(destination, arrayCloseBracket);
      nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
    } else {
      // We need to emit the whole resource for insertion on the client
      writeChunk(destination, nextArrayOpenBrackChunk);
      writeStyleResourceDependencyInAttr(
        destination,
        resource.props.href,
        resource.props['data-precedence'],
        resource.props,
      );
      writeChunk(destination, arrayCloseBracket);
      nextArrayOpenBrackChunk = arraySubsequentOpenBracket;

      resource.state = LATE;
    }
  });
  writeChunk(destination, arrayCloseBracket);
}

/* Helper functions */
function writeStyleResourceDependencyHrefOnlyInAttr(
  destination: Destination,
  href: string,
) {
  // We should actually enforce this earlier when the resource is created but for
  // now we make sure we are actually dealing with a string here.
  if (__DEV__) {
    checkAttributeStringCoercion(href, 'href');
  }
  const coercedHref = '' + (href as any);
  writeChunk(
    destination,
    stringToChunk(escapeTextForBrowser(JSON.stringify(coercedHref))),
  );
}

function writeStyleResourceDependencyInAttr(
  destination: Destination,
  href: mixed,
  precedence: mixed,
  props: Object,
) {
  // eslint-disable-next-line react-internal/safe-string-coercion
  const coercedHref = sanitizeURL('' + (href as any));
  writeChunk(
    destination,
    stringToChunk(escapeTextForBrowser(JSON.stringify(coercedHref))),
  );

  if (__DEV__) {
    checkAttributeStringCoercion(precedence, 'precedence');
  }
  const coercedPrecedence = '' + (precedence as any);
  writeChunk(destination, arrayInterstitial);
  writeChunk(
    destination,
    stringToChunk(escapeTextForBrowser(JSON.stringify(coercedPrecedence))),
  );

  for (const propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      const propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      switch (propKey) {
        case 'href':
        case 'rel':
        case 'precedence':
        case 'data-precedence': {
          break;
        }
        case 'children':
        case 'dangerouslySetInnerHTML':
          throw new Error(
            `${'link'} is a self-closing tag and must neither have \`children\` nor ` +
              'use `dangerouslySetInnerHTML`.',
          );
        default:
          writeStyleResourceAttributeInAttr(destination, propKey, propValue);
          break;
      }
    }
  }
  return null;
}

function writeStyleResourceAttributeInAttr(
  destination: Destination,
  name: string,
  value: string | boolean | number | Function | Object, // not null or undefined
): void {
  let attributeName = name.toLowerCase();
  let attributeValue;
  switch (typeof value) {
    case 'function':
    case 'symbol':
      return;
  }

  switch (name) {
    // Reserved names
    case 'innerHTML':
    case 'dangerouslySetInnerHTML':
    case 'suppressContentEditableWarning':
    case 'suppressHydrationWarning':
    case 'style':
    case 'ref':
      // Ignored
      return;

    // Attribute renames
    case 'className': {
      attributeName = 'class';
      if (__DEV__) {
        checkAttributeStringCoercion(value, attributeName);
      }
      attributeValue = '' + (value as any);
      break;
    }

    // Booleans
    case 'hidden': {
      if (value === false) {
        return;
      }
      attributeValue = '';
      break;
    }

    // Santized URLs
    case 'src':
    case 'href': {
      value = sanitizeURL(value);
      if (__DEV__) {
        checkAttributeStringCoercion(value, attributeName);
      }
      attributeValue = '' + (value as any);
      break;
    }
    default: {
      if (
        // unrecognized event handlers are not SSR'd and we (apparently)
        // use on* as hueristic for these handler props
        name.length > 2 &&
        (name[0] === 'o' || name[0] === 'O') &&
        (name[1] === 'n' || name[1] === 'N')
      ) {
        return;
      }
      if (!isAttributeNameSafe(name)) {
        return;
      }
      if (__DEV__) {
        checkAttributeStringCoercion(value, attributeName);
      }
      attributeValue = '' + (value as any);
    }
  }
  writeChunk(destination, arrayInterstitial);
  writeChunk(
    destination,
    stringToChunk(escapeTextForBrowser(JSON.stringify(attributeName))),
  );
  writeChunk(destination, arrayInterstitial);
  writeChunk(
    destination,
    stringToChunk(escapeTextForBrowser(JSON.stringify(attributeValue))),
  );
}

/**
 * Resources
 */

type StylesheetState = 0 | 1 | 2 | 3;
const PENDING: StylesheetState = 0;
const PRELOADED: StylesheetState = 1;
const PREAMBLE: StylesheetState = 2;
const LATE: StylesheetState = 3;

type PreconnectProps = {
  rel: 'preconnect' | 'dns-prefetch',
  href: string,
  [string]: mixed,
};

type PreloadAsProps = {
  rel: 'preload',
  as: string,
  href: ?string,
  [string]: ?string,
};
type PreloadModuleProps = {
  rel: 'modulepreload',
  href: ?string,
  [string]: ?string,
};
type PreloadProps = PreloadAsProps | PreloadModuleProps;

type ScriptProps = {
  async: true,
  src: string,
  crossOrigin?: ?CrossOriginEnum,
  [string]: mixed,
};
type ModuleScriptProps = {
  async: true,
  src: string,
  type: 'module',
  crossOrigin?: ?CrossOriginEnum,
  [string]: mixed,
};

export type Resource = Array<Chunk | PrecomputedChunk>;

type StylesheetProps = {
  rel: 'stylesheet',
  href: string,
  'data-precedence': string,
  crossOrigin?: ?CrossOriginEnum,
  integrity?: ?string,
  nonce?: ?string,
  type?: ?string,
  fetchPriority?: ?string,
  referrerPolicy?: ?string,
  media?: ?string,
  [string]: mixed,
};
type StylesheetResource = {
  props: StylesheetProps,
  state: StylesheetState,
};

export type HoistableState = {
  styles: Set<StyleQueue>,
  stylesheets: Set<StylesheetResource>,
  suspenseyImages: boolean,
};

export type StyleQueue = {
  precedence: Chunk | PrecomputedChunk,
  rules: Array<Chunk | PrecomputedChunk>,
  hrefs: Array<Chunk | PrecomputedChunk>,
  sheets: Map<string, StylesheetResource>,
};

export function createHoistableState(): HoistableState {
  return {
    styles: new Set(),
    stylesheets: new Set(),
    suspenseyImages: false,
  };
}

function getResourceKey(href: string): string {
  return href;
}

function getImageResourceKey(
  href: string,
  imageSrcSet?: ?string,
  imageSizes?: ?string,
): string {
  if (imageSrcSet) {
    return imageSrcSet + '\n' + (imageSizes || '');
  }
  return href;
}

function prefetchDNS(href: string) {
  const request = resolveRequest();
  if (!request) {
    // In async contexts we can sometimes resolve resources from AsyncLocalStorage. If we can't we can also
    // possibly get them from the stack if we are not in an async context. Since we were not able to resolve
    // the resources for this call in either case we opt to do nothing. We can consider making this a warning
    // but there may be times where calling a function outside of render is intentional (i.e. to warm up data
    // fetching) and we don't want to warn in those cases.
    previousDispatcher.D(/* prefetchDNS */ href);
    return;
  }
  const resumableState = getResumableState(request);
  const renderState = getRenderState(request);

  if (typeof href === 'string' && href) {
    const key = getResourceKey(href);
    if (!resumableState.dnsResources.hasOwnProperty(key)) {
      resumableState.dnsResources[key] = EXISTS;

      const headers = renderState.headers;
      let header;
      if (
        headers &&
        headers.remainingCapacity > 0 &&
        // Compute the header since we might be able to fit it in the max length
        ((header = getPrefetchDNSAsHeader(href)),
        // We always consume the header length since once we find one header that doesn't fit
        // we assume all the rest won't as well. This is to avoid getting into a situation
        // where we have a very small remaining capacity but no headers will ever fit and we end
        // up constantly trying to see if the next resource might make it. In the future we can
        // make this behavior different between render and prerender since in the latter case
        // we are less sensitive to the current requests runtime per and more sensitive to maximizing
        // headers.
        (headers.remainingCapacity -= header.length + 2) >= 0)
      ) {
        // Store this as resettable in case we are prerendering and postpone in the Shell
        renderState.resets.dns[key] = EXISTS;
        if (headers.preconnects) {
          headers.preconnects += ', ';
        }
        // $FlowFixMe[unsafe-addition]: we assign header during the if condition
        headers.preconnects += header;
      } else {
        // Encode as element
        const resource: Resource = [];
        pushLinkImpl(resource, {href, rel: 'dns-prefetch'} as PreconnectProps);
        renderState.preconnects.add(resource);
      }
    }
    flushResources(request);
  }
}

function preconnect(href: string, crossOrigin: ?CrossOriginEnum) {
  const request = resolveRequest();
  if (!request) {
    // In async contexts we can sometimes resolve resources from AsyncLocalStorage. If we can't we can also
    // possibly get them from the stack if we are not in an async context. Since we were not able to resolve
    // the resources for this call in either case we opt to do nothing. We can consider making this a warning
    // but there may be times where calling a function outside of render is intentional (i.e. to warm up data
    // fetching) and we don't want to warn in those cases.
    previousDispatcher.C(/* preconnect */ href, crossOrigin);
    return;
  }
  const resumableState = getResumableState(request);
  const renderState = getRenderState(request);

  if (typeof href === 'string' && href) {
    const bucket =
      crossOrigin === 'use-credentials'
        ? 'credentials'
        : typeof crossOrigin === 'string'
          ? 'anonymous'
          : 'default';
    const key = getResourceKey(href);
    if (!resumableState.connectResources[bucket].hasOwnProperty(key)) {
      resumableState.connectResources[bucket][key] = EXISTS;

      const headers = renderState.headers;
      let header;
      if (
        headers &&
        headers.remainingCapacity > 0 &&
        // Compute the header since we might be able to fit it in the max length
        ((header = getPreconnectAsHeader(href, crossOrigin)),
        // We always consume the header length since once we find one header that doesn't fit
        // we assume all the rest won't as well. This is to avoid getting into a situation
        // where we have a very small remaining capacity but no headers will ever fit and we end
        // up constantly trying to see if the next resource might make it. In the future we can
        // make this behavior different between render and prerender since in the latter case
        // we are less sensitive to the current requests runtime per and more sensitive to maximizing
        // headers.
        (headers.remainingCapacity -= header.length + 2) >= 0)
      ) {
        // Store this in resettableState in case we are prerending and postpone in the Shell
        renderState.resets.connect[bucket][key] = EXISTS;
        if (headers.preconnects) {
          headers.preconnects += ', ';
        }
        // $FlowFixMe[unsafe-addition]: we assign header during the if condition
        headers.preconnects += header;
      } else {
        const resource: Resource = [];
        pushLinkImpl(resource, {
          rel: 'preconnect',
          href,
          crossOrigin,
        } as PreconnectProps);
        renderState.preconnects.add(resource);
      }
    }
    flushResources(request);
  }
}

function preload(href: string, as: string, options?: ?PreloadImplOptions) {
  const request = resolveRequest();
  if (!request) {
    // In async contexts we can sometimes resolve resources from AsyncLocalStorage. If we can't we can also
    // possibly get them from the stack if we are not in an async context. Since we were not able to resolve
    // the resources for this call in either case we opt to do nothing. We can consider making this a warning
    // but there may be times where calling a function outside of render is intentional (i.e. to warm up data
    // fetching) and we don't want to warn in those cases.
    previousDispatcher.L(/* preload */ href, as, options);
    return;
  }
  const resumableState = getResumableState(request);
  const renderState = getRenderState(request);
  if (as && href) {
    switch (as) {
      case 'image': {
        let imageSrcSet, imageSizes, fetchPriority;
        if (options) {
          imageSrcSet = options.imageSrcSet;
          imageSizes = options.imageSizes;
          fetchPriority = options.fetchPriority;
        }
        const key = getImageResourceKey(href, imageSrcSet, imageSizes);
        if (resumableState.imageResources.hasOwnProperty(key)) {
          // we can return if we already have this resource
          return;
        }
        resumableState.imageResources[key] = PRELOAD_NO_CREDS;

        const headers = renderState.headers;
        let header: string;
        if (
          headers &&
          headers.remainingCapacity > 0 &&
          // browsers today don't support preloading responsive images from link headers so we bail out
          // if the img has srcset defined
          typeof imageSrcSet !== 'string' &&
          // We only include high priority images in the link header
          fetchPriority === 'high' &&
          // Compute the header since we might be able to fit it in the max length
          ((header = getPreloadAsHeader(href, as, options)),
          // We always consume the header length since once we find one header that doesn't fit
          // we assume all the rest won't as well. This is to avoid getting into a situation
          // where we have a very small remaining capacity but no headers will ever fit and we end
          // up constantly trying to see if the next resource might make it. In the future we can
          // make this behavior different between render and prerender since in the latter case
          // we are less sensitive to the current requests runtime per and more sensitive to maximizing
          // headers.
          (headers.remainingCapacity -= header.length + 2) >= 0)
        ) {
          // If we postpone in the shell we will still emit a preload as a header so we
          // track this to make sure we don't reset it.
          renderState.resets.image[key] = PRELOAD_NO_CREDS;
          if (headers.highImagePreloads) {
            headers.highImagePreloads += ', ';
          }
          // $FlowFixMe[unsafe-addition]: we assign header during the if condition
          headers.highImagePreloads += header;
        } else {
          // If we don't have headers to write to we have to encode as elements to flush in the head
          // When we have imageSrcSet the browser probably cannot load the right version from headers
          // (this should be verified by testing). For now we assume these need to go in the head
          // as elements even if headers are available.
          const resource = [] as Resource;
          pushLinkImpl(
            resource,
            Object.assign(
              {
                rel: 'preload',
                // There is a bug in Safari where imageSrcSet is not respected on preload links
                // so we omit the href here if we have imageSrcSet b/c safari will load the wrong image.
                // This harms older browers that do not support imageSrcSet by making their preloads not work
                // but this population is shrinking fast and is already small so we accept this tradeoff.
                href: imageSrcSet ? undefined : href,
                as,
              } as PreloadAsProps,
              options,
            ),
          );
          if (fetchPriority === 'high') {
            renderState.highImagePreloads.add(resource);
          } else {
            renderState.bulkPreloads.add(resource);
            // Stash the resource in case we need to promote it to higher priority
            // when an img tag is rendered
            renderState.preloads.images.set(key, resource);
          }
        }
        break;
      }
      case 'style': {
        const key = getResourceKey(href);
        if (resumableState.styleResources.hasOwnProperty(key)) {
          // we can return if we already have this resource
          return;
        }
        const resource = [] as Resource;
        pushLinkImpl(
          resource,
          Object.assign({rel: 'preload', href, as} as PreloadAsProps, options),
        );
        resumableState.styleResources[key] =
          options &&
          (typeof options.crossOrigin === 'string' ||
            typeof options.integrity === 'string')
            ? [options.crossOrigin, options.integrity]
            : PRELOAD_NO_CREDS;
        renderState.preloads.stylesheets.set(key, resource);
        renderState.bulkPreloads.add(resource);
        break;
      }
      case 'script': {
        const key = getResourceKey(href);
        if (resumableState.scriptResources.hasOwnProperty(key)) {
          // we can return if we already have this resource
          return;
        }
        const resource = [] as Resource;
        renderState.preloads.scripts.set(key, resource);
        renderState.bulkPreloads.add(resource);
        pushLinkImpl(
          resource,
          Object.assign({rel: 'preload', href, as} as PreloadAsProps, options),
        );
        resumableState.scriptResources[key] =
          options &&
          (typeof options.crossOrigin === 'string' ||
            typeof options.integrity === 'string')
            ? [options.crossOrigin, options.integrity]
            : PRELOAD_NO_CREDS;
        break;
      }
      default: {
        const key = getResourceKey(href);
        const hasAsType = resumableState.unknownResources.hasOwnProperty(as);
        let resources;
        if (hasAsType) {
          resources = resumableState.unknownResources[as];
          if (resources.hasOwnProperty(key)) {
            // we can return if we already have this resource
            return;
          }
        } else {
          resources = {} as ResumableState['unknownResources']['asType'];
          resumableState.unknownResources[as] = resources;
        }
        resources[key] = PRELOAD_NO_CREDS;

        const headers = renderState.headers;
        let header;
        if (
          headers &&
          headers.remainingCapacity > 0 &&
          as === 'font' &&
          // We compute the header here because we might be able to fit it in the max length
          ((header = getPreloadAsHeader(href, as, options)),
          // We always consume the header length since once we find one header that doesn't fit
          // we assume all the rest won't as well. This is to avoid getting into a situation
          // where we have a very small remaining capacity but no headers will ever fit and we end
          // up constantly trying to see if the next resource might make it. In the future we can
          // make this behavior different between render and prerender since in the latter case
          // we are less sensitive to the current requests runtime per and more sensitive to maximizing
          // headers.
          (headers.remainingCapacity -= header.length + 2) >= 0)
        ) {
          // If we postpone in the shell we will still emit this preload so we
          // track it here to prevent it from being reset.
          renderState.resets.font[key] = PRELOAD_NO_CREDS;
          if (headers.fontPreloads) {
            headers.fontPreloads += ', ';
          }
          // $FlowFixMe[unsafe-addition]: we assign header during the if condition
          headers.fontPreloads += header;
        } else {
          // We either don't have headers or we are preloading something that does
          // not warrant elevated priority so we encode as an element.
          const resource = [] as Resource;
          const props = Object.assign(
            {
              rel: 'preload',
              href,
              as,
            } as PreloadAsProps,
            options,
          );
          pushLinkImpl(resource, props);
          switch (as) {
            case 'font':
              renderState.fontPreloads.add(resource);
              break;
            // intentional fall through
            default:
              renderState.bulkPreloads.add(resource);
          }
        }
      }
    }
    // If we got this far we created a new resource
    flushResources(request);
  }
}

function preloadModule(
  href: string,
  options?: ?PreloadModuleImplOptions,
): void {
  const request = resolveRequest();
  if (!request) {
    // In async contexts we can sometimes resolve resources from AsyncLocalStorage. If we can't we can also
    // possibly get them from the stack if we are not in an async context. Since we were not able to resolve
    // the resources for this call in either case we opt to do nothing. We can consider making this a warning
    // but there may be times where calling a function outside of render is intentional (i.e. to warm up data
    // fetching) and we don't want to warn in those cases.
    previousDispatcher.m(/* preloadModule */ href, options);
    return;
  }
  const resumableState = getResumableState(request);
  const renderState = getRenderState(request);
  if (href) {
    const key = getResourceKey(href);
    const as =
      options && typeof options.as === 'string' ? options.as : 'script';

    let resource;
    switch (as) {
      case 'script': {
        if (resumableState.moduleScriptResources.hasOwnProperty(key)) {
          // we can return if we already have this resource
          return;
        }
        resource = [] as Resource;
        resumableState.moduleScriptResources[key] =
          options &&
          (typeof options.crossOrigin === 'string' ||
            typeof options.integrity === 'string')
            ? [options.crossOrigin, options.integrity]
            : PRELOAD_NO_CREDS;
        renderState.preloads.moduleScripts.set(key, resource);
        break;
      }
      default: {
        const hasAsType =
          resumableState.moduleUnknownResources.hasOwnProperty(as);
        let resources;
        if (hasAsType) {
          resources = resumableState.moduleUnknownResources[as];
          if (resources.hasOwnProperty(key)) {
            // we can return if we already have this resource
            return;
          }
        } else {
          resources = {} as ResumableState['moduleUnknownResources']['asType'];
          resumableState.moduleUnknownResources[as] = resources;
        }
        resource = [] as Resource;
        resources[key] = PRELOAD_NO_CREDS;
      }
    }

    pushLinkImpl(
      resource,
      Object.assign(
        {
          rel: 'modulepreload',
          href,
        } as PreloadModuleProps,
        options,
      ),
    );
    renderState.bulkPreloads.add(resource);
    // If we got this far we created a new resource
    flushResources(request);
  }
}

function preinitStyle(
  href: string,
  precedence: ?string,
  options?: ?PreinitStyleOptions,
): void {
  const request = resolveRequest();
  if (!request) {
    // In async contexts we can sometimes resolve resources from AsyncLocalStorage. If we can't we can also
    // possibly get them from the stack if we are not in an async context. Since we were not able to resolve
    // the resources for this call in either case we opt to do nothing. We can consider making this a warning
    // but there may be times where calling a function outside of render is intentional (i.e. to warm up data
    // fetching) and we don't want to warn in those cases.
    previousDispatcher.S(/* preinitStyle */ href, precedence, options);
    return;
  }
  const resumableState = getResumableState(request);
  const renderState = getRenderState(request);
  if (href) {
    precedence = precedence || 'default';
    const key = getResourceKey(href);

    let styleQueue = renderState.styles.get(precedence);
    const hasKey = resumableState.styleResources.hasOwnProperty(key);
    const resourceState = hasKey
      ? resumableState.styleResources[key]
      : undefined;
    if (resourceState !== EXISTS) {
      // We are going to create this resource now so it is marked as Exists
      resumableState.styleResources[key] = EXISTS;

      // If this is the first time we've encountered this precedence we need
      // to create a StyleQueue
      if (!styleQueue) {
        styleQueue = {
          precedence: stringToChunk(escapeTextForBrowser(precedence)),
          rules: [] as Array<Chunk | PrecomputedChunk>,
          hrefs: [] as Array<Chunk | PrecomputedChunk>,
          sheets: new Map() as Map<string, StylesheetResource>,
        };
        renderState.styles.set(precedence, styleQueue);
      }

      const resource = {
        state: PENDING,
        props: Object.assign(
          {
            rel: 'stylesheet',
            href,
            'data-precedence': precedence,
          } as StylesheetProps,
          options,
        ),
      };

      if (resourceState) {
        // When resourceState is truthy it is a Preload state. We cast it for clarity
        const preloadState: Preloaded | PreloadedWithCredentials =
          resourceState;
        if (preloadState.length === 2) {
          adoptPreloadCredentials(resource.props, preloadState);
        }

        const preloadResource = renderState.preloads.stylesheets.get(key);
        if (preloadResource && preloadResource.length > 0) {
          // The Preload for this resource was created in this render pass and has not flushed yet so
          // we need to clear it to avoid it flushing.
          preloadResource.length = 0;
        } else {
          // Either the preload resource from this render already flushed in this render pass
          // or the preload flushed in a prior pass (prerender). In either case we need to mark
          // this resource as already having been preloaded.
          resource.state = PRELOADED;
        }
      } else {
        // We don't need to check whether a preloadResource exists in the renderState
        // because if it did exist then the resourceState would also exist and we would
        // have hit the primary if condition above.
      }

      // We add the newly created resource to our StyleQueue and if necessary
      // track the resource with the currently rendering boundary
      styleQueue.sheets.set(key, resource);

      // Notify the request that there are resources to flush even if no work is currently happening
      flushResources(request);
    }
  }
}

function preinitScript(src: string, options?: ?PreinitScriptOptions): void {
  const request = resolveRequest();
  if (!request) {
    // In async contexts we can sometimes resolve resources from AsyncLocalStorage. If we can't we can also
    // possibly get them from the stack if we are not in an async context. Since we were not able to resolve
    // the resources for this call in either case we opt to do nothing. We can consider making this a warning
    // but there may be times where calling a function outside of render is intentional (i.e. to warm up data
    // fetching) and we don't want to warn in those cases.
    previousDispatcher.X(/* preinitScript */ src, options);
    return;
  }
  const resumableState = getResumableState(request);
  const renderState = getRenderState(request);
  if (src) {
    const key = getResourceKey(src);

    const hasKey = resumableState.scriptResources.hasOwnProperty(key);
    const resourceState = hasKey
      ? resumableState.scriptResources[key]
      : undefined;
    if (resourceState !== EXISTS) {
      // We are going to create this resource now so it is marked as Exists
      resumableState.scriptResources[key] = EXISTS;

      const props: ScriptProps = Object.assign(
        {
          src,
          async: true,
        } as ScriptProps,
        options,
      );
      if (resourceState) {
        // When resourceState is truthy it is a Preload state. We cast it for clarity
        const preloadState: Preloaded | PreloadedWithCredentials =
          resourceState;
        if (preloadState.length === 2) {
          adoptPreloadCredentials(props, preloadState);
        }

        const preloadResource = renderState.preloads.scripts.get(key);
        if (preloadResource) {
          // the preload resource exists was created in this render. Now that we have
          // a script resource which will emit earlier than a preload would if it
          // hasn't already flushed we prevent it from flushing by zeroing the length
          preloadResource.length = 0;
        }
      }

      const resource: Resource = [];
      // Add to the script flushing queue
      renderState.scripts.add(resource);
      // encode the tag as Chunks
      pushScriptImpl(resource, props);
      // Notify the request that there are resources to flush even if no work is currently happening
      flushResources(request);
    }
    return;
  }
}

function preinitModuleScript(
  src: string,
  options?: ?PreinitModuleScriptOptions,
): void {
  const request = resolveRequest();
  if (!request) {
    // In async contexts we can sometimes resolve resources from AsyncLocalStorage. If we can't we can also
    // possibly get them from the stack if we are not in an async context. Since we were not able to resolve
    // the resources for this call in either case we opt to do nothing. We can consider making this a warning
    // but there may be times where calling a function outside of render is intentional (i.e. to warm up data
    // fetching) and we don't want to warn in those cases.
    previousDispatcher.M(/* preinitModuleScript */ src, options);
    return;
  }
  const resumableState = getResumableState(request);
  const renderState = getRenderState(request);
  if (src) {
    const key = getResourceKey(src);
    const hasKey = resumableState.moduleScriptResources.hasOwnProperty(key);
    const resourceState = hasKey
      ? resumableState.moduleScriptResources[key]
      : undefined;
    if (resourceState !== EXISTS) {
      // We are going to create this resource now so it is marked as Exists
      resumableState.moduleScriptResources[key] = EXISTS;

      const props = Object.assign(
        {
          src,
          type: 'module',
          async: true,
        } as ModuleScriptProps,
        options,
      );
      if (resourceState) {
        // When resourceState is truthy it is a Preload state. We cast it for clarity
        const preloadState: Preloaded | PreloadedWithCredentials =
          resourceState;
        if (preloadState.length === 2) {
          adoptPreloadCredentials(props, preloadState);
        }

        const preloadResource = renderState.preloads.moduleScripts.get(key);
        if (preloadResource) {
          // the preload resource exists was created in this render. Now that we have
          // a script resource which will emit earlier than a preload would if it
          // hasn't already flushed we prevent it from flushing by zeroing the length
          preloadResource.length = 0;
        }
      }

      const resource: Resource = [];
      // Add to the script flushing queue
      renderState.scripts.add(resource);
      // encode the tag as Chunks
      pushScriptImpl(resource, props);
      // Notify the request that there are resources to flush even if no work is currently happening
      flushResources(request);
    }
    return;
  }
}

// This function is only safe to call at Request start time since it assumes
// that each module has not already been preloaded. If we find a need to preload
// scripts at any other point in time we will need to check whether the preload
// already exists and not assume it
function preloadBootstrapScriptOrModule(
  resumableState: ResumableState,
  renderState: RenderState,
  href: string,
  props: PreloadProps,
): void {
  const key = getResourceKey(href);

  if (__DEV__) {
    if (
      resumableState.scriptResources.hasOwnProperty(key) ||
      resumableState.moduleScriptResources.hasOwnProperty(key)
    ) {
      // This is coded as a React error because it should be impossible for a userspace preload to preempt this call
      // If a userspace preload can preempt it then this assumption is broken and we need to reconsider this strategy
      // rather than instruct the user to not preload their bootstrap scripts themselves
      console.error(
        'Internal React Error: React expected bootstrap script or module with src "%s" to not have been preloaded already. please file an issue',
        href,
      );
    }
  }

  // The href used for bootstrap scripts and bootstrap modules should never be
  // used to preinit the resource. If a script can be preinited then it shouldn't
  // be a bootstrap script/module and if it is a bootstrap script/module then it
  // must not be safe to emit early. To avoid possibly allowing for preinits of
  // bootstrap scripts/modules we occlude these keys.
  resumableState.scriptResources[key] = EXISTS;
  resumableState.moduleScriptResources[key] = EXISTS;

  const resource: Resource = [];
  pushLinkImpl(resource, props);
  renderState.bootstrapScripts.add(resource);
}

function internalPreinitScript(
  resumableState: ResumableState,
  renderState: RenderState,
  src: string,
  chunks: Array<Chunk | PrecomputedChunk>,
): void {
  const key = getResourceKey(src);
  if (!resumableState.scriptResources.hasOwnProperty(key)) {
    const resource: Resource = chunks;
    resumableState.scriptResources[key] = EXISTS;
    renderState.scripts.add(resource);
  }
  return;
}

function preloadAsStylePropsFromProps(href: string, props: any): PreloadProps {
  return {
    rel: 'preload',
    as: 'style',
    href: href,
    crossOrigin: props.crossOrigin,
    fetchPriority: props.fetchPriority,
    integrity: props.integrity,
    media: props.media,
    hrefLang: props.hrefLang,
    referrerPolicy: props.referrerPolicy,
  };
}

function stylesheetPropsFromRawProps(rawProps: any): StylesheetProps {
  return {
    ...rawProps,
    'data-precedence': rawProps.precedence,
    precedence: null,
  };
}

function adoptPreloadCredentials(
  target: StylesheetProps | ScriptProps | ModuleScriptProps,
  preloadState: PreloadedWithCredentials,
): void {
  if (target.crossOrigin == null) target.crossOrigin = preloadState[0];
  if (target.integrity == null) target.integrity = preloadState[1];
}

function getPrefetchDNSAsHeader(href: string): string {
  const escapedHref = escapeHrefForLinkHeaderURLContext(href);
  return `<${escapedHref}>; rel=dns-prefetch`;
}

function getPreconnectAsHeader(
  href: string,
  crossOrigin?: ?CrossOriginEnum,
): string {
  const escapedHref = escapeHrefForLinkHeaderURLContext(href);
  let value = `<${escapedHref}>; rel=preconnect`;
  if (typeof crossOrigin === 'string') {
    const escapedCrossOrigin = escapeStringForLinkHeaderQuotedParamValueContext(
      crossOrigin,
      'crossOrigin',
    );
    value += `; crossorigin="${escapedCrossOrigin}"`;
  }
  return value;
}

function getPreloadAsHeader(
  href: string,
  as: string,
  params: ?PreloadImplOptions,
): string {
  const escapedHref = escapeHrefForLinkHeaderURLContext(href);
  const escapedAs = escapeStringForLinkHeaderQuotedParamValueContext(as, 'as');
  let value = `<${escapedHref}>; rel=preload; as="${escapedAs}"`;
  for (const paramName in params) {
    if (hasOwnProperty.call(params, paramName)) {
      // $FlowFixMe[invalid-computed-prop]
      const paramValue = params[paramName];
      if (typeof paramValue === 'string') {
        value += `; ${paramName.toLowerCase()}="${escapeStringForLinkHeaderQuotedParamValueContext(
          paramValue,
          paramName,
        )}"`;
      }
    }
  }
  return value;
}

function getStylesheetPreloadAsHeader(stylesheet: StylesheetResource): string {
  const props = stylesheet.props;
  const preloadOptions: PreloadImplOptions = {
    crossOrigin: props.crossOrigin,
    integrity: props.integrity,
    nonce: props.nonce,
    type: props.type,
    fetchPriority: props.fetchPriority,
    referrerPolicy: props.referrerPolicy,
    media: props.media,
  };
  return getPreloadAsHeader(props.href, 'style', preloadOptions);
}

// This escaping function is only safe to use for href values being written into
// a "Link" header in between `<` and `>` characters. The primary concern with the href is
// to escape the bounding characters as well as new lines. This is unsafe to use in any other
// context
const regexForHrefInLinkHeaderURLContext = /[<>\r\n]/g;
function escapeHrefForLinkHeaderURLContext(hrefInput: string): string {
  if (__DEV__) {
    checkAttributeStringCoercion(hrefInput, 'href');
  }
  const coercedHref = '' + hrefInput;
  return coercedHref.replace(
    regexForHrefInLinkHeaderURLContext,
    escapeHrefForLinkHeaderURLContextReplacer,
  );
}
function escapeHrefForLinkHeaderURLContextReplacer(match: string): string {
  switch (match) {
    case '<':
      return '%3C';
    case '>':
      return '%3E';
    case '\n':
      return '%0A';
    case '\r':
      return '%0D';
    default: {
      // eslint-disable-next-line react-internal/prod-error-codes
      throw new Error(
        'escapeLinkHrefForHeaderContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React',
      );
    }
  }
}

// This escaping function is only safe to use for quoted param values in an HTTP header.
// It is unsafe to use for any value not inside quote marks in parater value position.
const regexForLinkHeaderQuotedParamValueContext = /["';,\r\n]/g;
function escapeStringForLinkHeaderQuotedParamValueContext(
  value: string,
  name: string,
): string {
  if (__DEV__) {
    checkOptionStringCoercion(value, name);
  }
  const coerced = '' + value;
  return coerced.replace(
    regexForLinkHeaderQuotedParamValueContext,
    escapeStringForLinkHeaderQuotedParamValueContextReplacer,
  );
}
function escapeStringForLinkHeaderQuotedParamValueContextReplacer(
  match: string,
): string {
  switch (match) {
    case '"':
      return '%22';
    case "'":
      return '%27';
    case ';':
      return '%3B';
    case ',':
      return '%2C';
    case '\n':
      return '%0A';
    case '\r':
      return '%0D';
    default: {
      // eslint-disable-next-line react-internal/prod-error-codes
      throw new Error(
        'escapeStringForLinkHeaderQuotedParamValueContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React',
      );
    }
  }
}

function hoistStyleQueueDependency(
  this: HoistableState,
  styleQueue: StyleQueue,
) {
  this.styles.add(styleQueue);
}

function hoistStylesheetDependency(
  this: HoistableState,
  stylesheet: StylesheetResource,
) {
  this.stylesheets.add(stylesheet);
}

export function hoistHoistables(
  parentState: HoistableState,
  childState: HoistableState,
): void {
  childState.styles.forEach(hoistStyleQueueDependency, parentState);
  childState.stylesheets.forEach(hoistStylesheetDependency, parentState);
  if (childState.suspenseyImages) {
    // If the child has suspensey images, the parent now does too if it's inlined.
    // Similarly, if a SuspenseList row has a suspensey image then effectively
    // the next row should be blocked on it as well since the next row can't show
    // earlier. In practice, since the child will be outlined this transferring
    // may never matter but is conceptually correct.
    parentState.suspenseyImages = true;
  }
}

export function hasSuspenseyContent(
  hoistableState: HoistableState,
  flushingInShell: boolean,
): boolean {
  if (flushingInShell) {
    // When flushing the shell, stylesheets with precedence are already emitted
    // in the <head> which blocks paint. There's no benefit to outlining for CSS
    // alone during the shell flush. However, suspensey images (for ViewTransition
    // animation reveals) should still trigger outlining even during the shell.
    return hoistableState.suspenseyImages;
  }
  return hoistableState.stylesheets.size > 0 || hoistableState.suspenseyImages;
}

// This function is called at various times depending on whether we are rendering
// or prerendering. In this implementation we only actually emit headers once and
// subsequent calls are ignored. We track whether the request has a completed shell
// to determine whether we will follow headers with a flush including stylesheets.
// In the context of prerrender we don't have a completed shell when the request finishes
// with a postpone in the shell. In the context of a render we don't have a completed shell
// if this is called before the shell finishes rendering which usually will happen anytime
// anything suspends in the shell.
export function emitEarlyPreloads(
  renderState: RenderState,
  resumableState: ResumableState,
  shellComplete: boolean,
): void {
  const onHeaders = renderState.onHeaders;
  if (onHeaders) {
    const headers = renderState.headers;
    if (headers) {
      // Even if onHeaders throws we don't want to call this again so
      // we drop the headers state from this point onwards.
      renderState.headers = null;

      let linkHeader = headers.preconnects;
      if (headers.fontPreloads) {
        if (linkHeader) {
          linkHeader += ', ';
        }
        linkHeader += headers.fontPreloads;
      }
      if (headers.highImagePreloads) {
        if (linkHeader) {
          linkHeader += ', ';
        }
        linkHeader += headers.highImagePreloads;
      }

      if (!shellComplete) {
        // We use raw iterators because we want to be able to halt iteration
        // We could refactor renderState to store these dually in arrays to
        // make this more efficient at the cost of additional memory and
        // write overhead. However this code only runs once per request so
        // for now I consider this sufficient.
        const queueIter = renderState.styles.values();
        outer: for (
          let queueStep = queueIter.next();
          headers.remainingCapacity > 0 && !queueStep.done;
          queueStep = queueIter.next()
        ) {
          const sheets = queueStep.value.sheets;
          const sheetIter = sheets.values();
          for (
            let sheetStep = sheetIter.next();
            headers.remainingCapacity > 0 && !sheetStep.done;
            sheetStep = sheetIter.next()
          ) {
            const sheet = sheetStep.value;
            const props = sheet.props;
            const key = getResourceKey(props.href);

            const header = getStylesheetPreloadAsHeader(sheet);
            // We mutate the capacity b/c we don't want to keep checking if later headers will fit.
            // This means that a particularly long header might close out the header queue where later
            // headers could still fit. We could in the future alter the behavior here based on prerender vs render
            // since during prerender we aren't as concerned with pure runtime performance.
            if ((headers.remainingCapacity -= header.length + 2) >= 0) {
              renderState.resets.style[key] = PRELOAD_NO_CREDS;
              if (linkHeader) {
                linkHeader += ', ';
              }
              linkHeader += header;

              // We already track that the resource exists in resumableState however
              // if the resumableState resets because we postponed in the shell
              // which is what is happening in this branch if we are prerendering
              // then we will end up resetting the resumableState. When it resets we
              // want to record the fact that this stylesheet was already preloaded
              renderState.resets.style[key] =
                typeof props.crossOrigin === 'string' ||
                typeof props.integrity === 'string'
                  ? [props.crossOrigin, props.integrity]
                  : PRELOAD_NO_CREDS;
            } else {
              break outer;
            }
          }
        }
      }
      if (linkHeader) {
        onHeaders({
          Link: linkHeader,
        });
      } else {
        // We still call this with no headers because a user may be using it as a signal that
        // it React will not provide any headers
        onHeaders({});
      }
      return;
    }
  }
}

export type TransitionStatus = FormStatus;
export const NotPendingTransition: TransitionStatus = NotPending;
