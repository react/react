/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Monaco} from '@monaco-editor/react';
import {
  CompilerDiagnostic,
  CompilerErrorDetail,
  ErrorSeverity,
} from 'babel-plugin-react-compiler';
import {MarkerSeverity, type editor} from 'monaco-editor';

function mapReactCompilerSeverityToMonaco(
  level: ErrorSeverity,
  monaco: Monaco,
): MarkerSeverity {
  switch (level) {
    case ErrorSeverity.Todo:
      return monaco.MarkerSeverity.Warning;
    default:
      return monaco.MarkerSeverity.Error;
  }
}

function mapReactCompilerDiagnosticToMonacoMarker(
  detail: CompilerErrorDetail | CompilerDiagnostic,
  monaco: Monaco,
  source: string,
): editor.IMarkerData | null {
  const loc = detail.primaryLocation();
  if (loc == null || typeof loc === 'symbol') {
    return null;
  }
  const severity = mapReactCompilerSeverityToMonaco(detail.severity, monaco);
  let message = detail.printErrorMessage(source, {eslint: true});
  return {
    severity,
    message,
    startLineNumber: loc.start.line,
    startColumn: loc.start.column + 1,
    endLineNumber: loc.end.line,
    endColumn: loc.end.column + 1,
  };
}

type ReactCompilerMarkerConfig = {
  monaco: Monaco;
  model: editor.ITextModel;
  details: Array<CompilerErrorDetail | CompilerDiagnostic>;
  source: string;
};
let decorations: Array<string> = [];
export function renderReactCompilerMarkers({
  monaco,
  model,
  details,
  source,
}: ReactCompilerMarkerConfig): void {
  const markers: Array<editor.IMarkerData> = [];
  for (const detail of details) {
    const marker = mapReactCompilerDiagnosticToMonacoMarker(
      detail,
      monaco,
      source,
    );
    if (marker == null) {
      continue;
    }
    markers.push(marker);
  }
  if (markers.length > 0) {
    monaco.editor.setModelMarkers(model, 'owner', markers);
    const newDecorations = markers.map(marker => {
      return {
        range: new monaco.Range(
          marker.startLineNumber,
          marker.startColumn,
          marker.endLineNumber,
          marker.endColumn,
        ),
        options: {
          isWholeLine: true,
          glyphMarginClassName: 'bg-red-300',
        },
      };
    });
    decorations = model.deltaDecorations(decorations, newDecorations);
  } else {
    monaco.editor.setModelMarkers(model, 'owner', []);
    decorations = model.deltaDecorations(
      model.getAllDecorations().map(d => d.id),
      [],
    );
  }
}
