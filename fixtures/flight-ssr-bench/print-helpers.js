'use strict';

function printGrid(colHeaders, rows, getValue, unit, note) {
  const labelWidth = Math.max(
    ...rows.map(function (r) {
      return r[0].length;
    })
  );
  const suffix = unit ? ' ' + unit : '';
  const fmtVal = function (v) {
    return (v.toFixed(1) + suffix).padStart(10 + suffix.length);
  };
  const fmtPct = function (v) {
    return ((v >= 0 ? '+' : '') + v.toFixed(1) + '%').padStart(8);
  };
  const fmtFactor = function (va, vb) {
    return ((vb / va).toFixed(2) + 'x').padStart(7);
  };
  const colWidth = 10 + suffix.length;

  const header =
    ''.padEnd(labelWidth) +
    '  ' +
    colHeaders
      .map(function (h) {
        return h.padStart(colWidth);
      })
      .join('  ') +
    '     Delta   Factor';
  console.log('  ' + header);
  console.log('  ' + '-'.repeat(header.length));
  for (const [label, a, b] of rows) {
    const va = getValue(a);
    const vb = getValue(b);
    const pct = ((vb - va) / va) * 100;
    console.log(
      '  ' +
        label.padEnd(labelWidth) +
        '  ' +
        fmtVal(va) +
        '  ' +
        fmtVal(vb) +
        '  ' +
        fmtPct(pct) +
        '  ' +
        fmtFactor(va, vb)
    );
  }
  if (note) {
    console.log('  (%s)', note);
  }
}

module.exports = {printGrid};
