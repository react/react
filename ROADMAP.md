# React コードリーディング ロードマップ

最終更新: 2026-06-23

## 完了済み

- [x] ビルドシステム概要（babel / rollup の役割、packages/ 構成）

## 読書計画

### Step 1: エントリーポイントと公開API
- [ ] `packages/react/src/React.js` — createElement, useState等の公開API一覧
- [ ] `packages/react-dom/src/client/ReactDOMRoot.js` — createRootの実装

### Step 2: Fiber構造
- [ ] `packages/react-reconciler/src/ReactFiber.js` — Fiberノード構造（type, key, child, sibling, return等）
- [ ] `packages/react-reconciler/src/ReactInternalTypes.js` — 型定義から全体像把握

### Step 3: レンダーフェーズ
- [ ] `packages/react-reconciler/src/ReactFiberWorkLoop.js` — performSyncWorkOnRoot等のワークループ
- [ ] `ReactFiberBeginWork.js` — beginWork
- [ ] `ReactFiberCompleteWork.js` — completeWork

### Step 4: コミットフェーズ
- [ ] `ReactFiberCommitWork.js` — DOM反映処理

### Step 5: Scheduler
- [ ] `packages/scheduler/src/forks/Scheduler.js` — 優先度ベース協調スケジューリング

### Step 6: Hooks
- [ ] `packages/react-reconciler/src/ReactFiberHooks.js` — useState/useEffectの内部実装

## メモ

- ファイルパスは 2026-06-23 時点（commit `edd6ca8e60`、ブランチ `20260607_high-g_branch`）のもの。Reactは開発が活発なため、参照前に存在確認すること。
- 詳細な学習メモはZennに記録。
