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
