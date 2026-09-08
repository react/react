
## Input

```javascript
// Round 3: PromoteUsedTemporaries divergence
// TS promotes temporary to named "#t142" / "t9"
// Rust leaves name as null
// Frontier: PromoteUsedTemporaries pass
// Source: AutoEmbedPlugin.prod.js, JoinedActionPopover.react.js
// NOTE: This file is minified prod code - the minimizer couldn't reduce further
'use strict';
var e = require('LexicalLink'),
  t = require('LexicalComposerContext'),
  n = require('LexicalNodeMenuPlugin'),
  o = require('LexicalUtils'),
  i = require('Lexical'),
  r = require('react'),
  s = require('react');
const l = i.createCommand('INSERT_EMBED_COMMAND');
class u extends n.MenuOption {
  title;
  onSelect;
  constructor(e, t) {
    super(e), (this.title = e), (this.onSelect = t.onSelect.bind(this));
  }
}
(exports.AutoEmbedOption = u),
  (exports.INSERT_EMBED_COMMAND = l),
  (exports.LexicalAutoEmbedPlugin = function ({
    embedConfigs: u,
    onOpenEmbedModalForConfig: a,
    getMenuOptions: c,
    menuRenderFn: d,
    menuCommandPriority: m = i.COMMAND_PRIORITY_LOW,
  }) {
    const [p] = t.useLexicalComposerContext(),
      [C, L] = r.useState(null),
      [f, M] = r.useState(null),
      g = r.useCallback(() => {
        L(null), M(null);
      }, []),
      E = r.useCallback(
        async t => {
          const n = p.getEditorState().read(function () {
            const n = i.$getNodeByKey(t);
            if (e.$isLinkNode(n)) return n.getURL();
          });
          if (void 0 !== n)
            for (const e of u) {
              null != (await Promise.resolve(e.parseUrl(n))) && (M(e), L(t));
            }
        },
        [p, u]
      );
    r.useEffect(
      () =>
        o.mergeRegister(
          ...[e.LinkNode, e.AutoLinkNode].map(e =>
            p.registerMutationListener(
              e,
              (...e) =>
                ((e, {updateTags: t, dirtyLeaves: n}) => {
                  for (const [o, r] of e)
                    'created' === r && t.has(i.PASTE_TAG) && n.size <= 3
                      ? E(o)
                      : o === C && g();
                })(...e),
              {skipInitialization: !0}
            )
          )
        ),
      [E, p, u, C, g]
    ),
      r.useEffect(
        () =>
          p.registerCommand(
            l,
            e => {
              const t = u.find(({type: t}) => t === e);
              return !!t && (a(t), !0);
            },
            i.COMMAND_PRIORITY_EDITOR
          ),
        [p, u, a]
      );
    const x = r.useCallback(
        async function () {
          if (null != f && null != C) {
            const t = p.getEditorState().read(() => {
              const t = i.$getNodeByKey(C);
              return e.$isLinkNode(t) ? t : null;
            });
            if (e.$isLinkNode(t)) {
              const e = await Promise.resolve(f.parseUrl(t.__url));
              null != e &&
                p.update(() => {
                  i.$getSelection() || t.selectEnd(),
                    f.insertNode(p, e),
                    t.isAttached() && t.remove();
                });
            }
          }
        },
        [f, p, C]
      ),
      N = r.useMemo(
        () => (null != f && null != C ? c(f, x, g) : []),
        [f, x, c, C, g]
      ),
      A = r.useCallback(
        (e, t, n) => {
          p.update(() => {
            e.onSelect(t), n();
          });
        },
        [p]
      );
    return null != C
      ? s.jsx(n.LexicalNodeMenuPlugin, {
          nodeKey: C,
          onClose: g,
          onSelectOption: A,
          options: N,
          menuRenderFn: d,
          commandPriority: m,
        })
      : null;
  }),
  (exports.URL_MATCHER =
    /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/);

```

## Code

```javascript
// Round 3: PromoteUsedTemporaries divergence
// TS promotes temporary to named "#t142" / "t9"
// Rust leaves name as null
// Frontier: PromoteUsedTemporaries pass
// Source: AutoEmbedPlugin.prod.js, JoinedActionPopover.react.js
// NOTE: This file is minified prod code - the minimizer couldn't reduce further
"use strict";
import { c as _c } from "react/compiler-runtime";
var e = require("LexicalLink"),
  t = require("LexicalComposerContext"),
  n = require("LexicalNodeMenuPlugin"),
  o = require("LexicalUtils"),
  i = require("Lexical"),
  r = require("react"),
  s = require("react");
const l = i.createCommand("INSERT_EMBED_COMMAND");
class u extends n.MenuOption {
  title;
  onSelect;
  constructor(e, t) {
    super(e), (this.title = e), (this.onSelect = t.onSelect.bind(this));
  }
}
(exports.AutoEmbedOption = u),
  (exports.INSERT_EMBED_COMMAND = l),
  (exports.LexicalAutoEmbedPlugin = function (t0) {
    const $ = _c(43);
    const {
      embedConfigs: u,
      onOpenEmbedModalForConfig: a,
      getMenuOptions: c,
      menuRenderFn: d,
      menuCommandPriority: t1,
    } = t0;
    const m = t1 === undefined ? i.COMMAND_PRIORITY_LOW : t1;
    const [t2] = t.useLexicalComposerContext();
    const p = t2;
    const [C, t3] = r.useState(null);
    const L = t3;
    const [f, t4] = r.useState(null);
    const M = t4;
    let t5;
    if ($[0] !== L || $[1] !== M) {
      t5 = () => {
        L(null), M(null);
      };
      $[0] = L;
      $[1] = M;
      $[2] = t5;
    } else {
      t5 = $[2];
    }
    let t6;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
      t6 = [];
      $[3] = t6;
    } else {
      t6 = $[3];
    }
    const g = r.useCallback(t5, t6);
    let t7;
    if ($[4] !== L || $[5] !== M || $[6] !== p || $[7] !== u) {
      t7 = async (t$0) => {
        const n_0 = p.getEditorState().read(function () {
          const n$0 = i.$getNodeByKey(t$0);
          if (e.$isLinkNode(n$0)) {
            return n$0.getURL();
          }
        });
        if (void 0 !== n_0) {
          for (const e$0 of u) {
            null != (await Promise.resolve(e$0.parseUrl(n_0))) &&
              (M(e$0), L(t$0));
          }
        }
      };
      $[4] = L;
      $[5] = M;
      $[6] = p;
      $[7] = u;
      $[8] = t7;
    } else {
      t7 = $[8];
    }
    let t8;
    if ($[9] !== p || $[10] !== u) {
      t8 = [p, u];
      $[9] = p;
      $[10] = u;
      $[11] = t8;
    } else {
      t8 = $[11];
    }
    const E = r.useCallback(t7, t8);
    r.useEffect(
      () =>
        o.mergeRegister(
          ...[e.LinkNode, e.AutoLinkNode].map((e_0) =>
            p.registerMutationListener(
              e_0,
              (...t9) => {
                const e_1 = t9;
                return ((e_2, t10) => {
                  const { updateTags: t_0, dirtyLeaves: n_1 } = t10;
                  for (const [o$0, r$0] of e_2) {
                    "created" === r$0 && t_0.has(i.PASTE_TAG) && n_1.size <= 3
                      ? E(o$0)
                      : o$0 === C && g();
                  }
                })(...e_1);
              },
              { skipInitialization: true },
            ),
          ),
        ),
      [E, p, u, C, g],
    ),
      r.useEffect(
        () =>
          p.registerCommand(
            l,
            (e_3) => {
              const t_2 = u.find((t11) => {
                const { type: t_1 } = t11;
                return t_1 === e_3;
              });
              return !!t_2 && (a(t_2), true);
            },

            i.COMMAND_PRIORITY_EDITOR,
          ),
        [p, u, a],
      );
    let t12;
    if ($[12] !== C || $[13] !== f || $[14] !== p) {
      t12 = async function () {
        if (null != f && null != C) {
          const t_4 = p.getEditorState().read(() => {
            const t_3 = i.$getNodeByKey(C);
            return e.$isLinkNode(t_3) ? t_3 : null;
          });
          if (e.$isLinkNode(t_4)) {
            const e_4 = await Promise.resolve(f.parseUrl(t_4.__url));
            null != e_4 &&
              p.update(() => {
                i.$getSelection() || t_4.selectEnd(),
                  f.insertNode(p, e_4),
                  t_4.isAttached() && t_4.remove();
              });
          }
        }
      };
      $[12] = C;
      $[13] = f;
      $[14] = p;
      $[15] = t12;
    } else {
      t12 = $[15];
    }
    let t13;
    if ($[16] !== C || $[17] !== f || $[18] !== p) {
      t13 = [f, p, C];
      $[16] = C;
      $[17] = f;
      $[18] = p;
      $[19] = t13;
    } else {
      t13 = $[19];
    }
    const x = r.useCallback(t12, t13);
    let t14;
    if (
      $[20] !== C ||
      $[21] !== c ||
      $[22] !== f ||
      $[23] !== g ||
      $[24] !== x
    ) {
      t14 = () => (null != f && null != C ? c(f, x, g) : []);
      $[20] = C;
      $[21] = c;
      $[22] = f;
      $[23] = g;
      $[24] = x;
      $[25] = t14;
    } else {
      t14 = $[25];
    }
    let t15;
    if (
      $[26] !== C ||
      $[27] !== c ||
      $[28] !== f ||
      $[29] !== g ||
      $[30] !== x
    ) {
      t15 = [f, x, c, C, g];
      $[26] = C;
      $[27] = c;
      $[28] = f;
      $[29] = g;
      $[30] = x;
      $[31] = t15;
    } else {
      t15 = $[31];
    }
    const N = r.useMemo(t14, t15);
    let t16;
    if ($[32] !== p) {
      t16 = (e_5, t_5, n_2) => {
        p.update(() => {
          e_5.onSelect(t_5), n_2();
        });
      };
      $[32] = p;
      $[33] = t16;
    } else {
      t16 = $[33];
    }
    let t17;
    if ($[34] !== p) {
      t17 = [p];
      $[34] = p;
      $[35] = t17;
    } else {
      t17 = $[35];
    }
    const A = r.useCallback(t16, t17);
    let t18;
    if (
      $[36] !== A ||
      $[37] !== C ||
      $[38] !== N ||
      $[39] !== d ||
      $[40] !== g ||
      $[41] !== m
    ) {
      t18 =
        null != C
          ? s.jsx(n.LexicalNodeMenuPlugin, {
              nodeKey: C,
              onClose: g,
              onSelectOption: A,
              options: N,
              menuRenderFn: d,
              commandPriority: m,
            })
          : null;
      $[36] = A;
      $[37] = C;
      $[38] = N;
      $[39] = d;
      $[40] = g;
      $[41] = m;
      $[42] = t18;
    } else {
      t18 = $[42];
    }
    return t18;
  }),
  (exports.URL_MATCHER =
    /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/);

```
      