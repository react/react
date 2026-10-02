
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
    const $ = _c(51);
    const {
      embedConfigs: u,
      onOpenEmbedModalForConfig: a,
      getMenuOptions: c,
      menuRenderFn: d,
      menuCommandPriority: t1,
    } = t0;
    const m = t1 === undefined ? i.COMMAND_PRIORITY_LOW : t1;
    const t2 = t.useLexicalComposerContext();
    let p;
    if ($[0] !== t2) {
      const [t3] = t2;
      p = t3;
      $[0] = t2;
      $[1] = p;
    } else {
      p = $[1];
    }
    const t3 = r.useState(null);
    let C;
    let L;
    if ($[2] !== t3) {
      const [t4, t5] = t3;
      C = t4;
      L = t5;
      $[2] = t3;
      $[3] = C;
      $[4] = L;
    } else {
      C = $[3];
      L = $[4];
    }
    const t4 = r.useState(null);
    let M;
    let f;
    if ($[5] !== t4) {
      const [t5, t6] = t4;
      f = t5;
      M = t6;
      $[5] = t4;
      $[6] = M;
      $[7] = f;
    } else {
      M = $[6];
      f = $[7];
    }
    let t5;
    if ($[8] !== L || $[9] !== M) {
      t5 = () => {
        L(null), M(null);
      };
      $[8] = L;
      $[9] = M;
      $[10] = t5;
    } else {
      t5 = $[10];
    }
    let t6;
    if ($[11] === Symbol.for("react.memo_cache_sentinel")) {
      t6 = [];
      $[11] = t6;
    } else {
      t6 = $[11];
    }
    const g = r.useCallback(t5, t6);
    let t7;
    if ($[12] !== L || $[13] !== M || $[14] !== p || $[15] !== u) {
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
      $[12] = L;
      $[13] = M;
      $[14] = p;
      $[15] = u;
      $[16] = t7;
    } else {
      t7 = $[16];
    }

    const t8 = p;
    let t9;
    if ($[17] !== t8 || $[18] !== u) {
      t9 = [t8, u];
      $[17] = t8;
      $[18] = u;
      $[19] = t9;
    } else {
      t9 = $[19];
    }
    const E = r.useCallback(t7, t9);
    r.useEffect(
      () =>
        o.mergeRegister(
          ...[e.LinkNode, e.AutoLinkNode].map((e_0) =>
            p.registerMutationListener(
              e_0,
              (...t10) => {
                const e_1 = t10;
                return ((e_2, t11) => {
                  const { updateTags: t_0, dirtyLeaves: n_1 } = t11;
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
              const t_2 = u.find((t12) => {
                const { type: t_1 } = t12;
                return t_1 === e_3;
              });
              return !!t_2 && (a(t_2), true);
            },

            i.COMMAND_PRIORITY_EDITOR,
          ),
        [p, u, a],
      );
    let t13;
    if ($[20] !== C || $[21] !== f || $[22] !== p) {
      t13 = async function () {
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
      $[20] = C;
      $[21] = f;
      $[22] = p;
      $[23] = t13;
    } else {
      t13 = $[23];
    }

    const t14 = p;
    let t15;
    if ($[24] !== C || $[25] !== f || $[26] !== t14) {
      t15 = [f, t14, C];
      $[24] = C;
      $[25] = f;
      $[26] = t14;
      $[27] = t15;
    } else {
      t15 = $[27];
    }
    const x = r.useCallback(t13, t15);
    let t16;
    if (
      $[28] !== C ||
      $[29] !== c ||
      $[30] !== f ||
      $[31] !== g ||
      $[32] !== x
    ) {
      t16 = () => (null != f && null != C ? c(f, x, g) : []);
      $[28] = C;
      $[29] = c;
      $[30] = f;
      $[31] = g;
      $[32] = x;
      $[33] = t16;
    } else {
      t16 = $[33];
    }
    const t17 = x;
    let t18;
    if (
      $[34] !== C ||
      $[35] !== c ||
      $[36] !== f ||
      $[37] !== g ||
      $[38] !== t17
    ) {
      t18 = [f, t17, c, C, g];
      $[34] = C;
      $[35] = c;
      $[36] = f;
      $[37] = g;
      $[38] = t17;
      $[39] = t18;
    } else {
      t18 = $[39];
    }
    const N = r.useMemo(t16, t18);
    let t19;
    if ($[40] !== p) {
      t19 = (e_5, t_5, n_2) => {
        p.update(() => {
          e_5.onSelect(t_5), n_2();
        });
      };
      $[40] = p;
      $[41] = t19;
    } else {
      t19 = $[41];
    }

    const t20 = p;
    let t21;
    if ($[42] !== t20) {
      t21 = [t20];
      $[42] = t20;
      $[43] = t21;
    } else {
      t21 = $[43];
    }
    const A = r.useCallback(t19, t21);
    let t22;
    if (
      $[44] !== A ||
      $[45] !== C ||
      $[46] !== N ||
      $[47] !== d ||
      $[48] !== g ||
      $[49] !== m
    ) {
      t22 =
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
      $[44] = A;
      $[45] = C;
      $[46] = N;
      $[47] = d;
      $[48] = g;
      $[49] = m;
      $[50] = t22;
    } else {
      t22 = $[50];
    }
    return t22;
  }),
  (exports.URL_MATCHER =
    /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/);

```
      