'use client';

export default function TableHeader({column}) {
  return (
    <th className="table-header" data-column={column.key}>
      <span className="table-header-label">{column.label}</span>
      <span className="table-header-sort" aria-label="Sort" />
    </th>
  );
}
