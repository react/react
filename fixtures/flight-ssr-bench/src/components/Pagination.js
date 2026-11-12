'use client';

export default function Pagination({total, pageSize}) {
  const pageCount = Math.ceil(total / pageSize);
  const pages = [];
  for (let i = 1; i <= pageCount; i++) {
    pages.push(i);
  }
  return (
    <div className="pagination">
      <button className="pagination-btn" disabled>
        Previous
      </button>
      <div className="pagination-pages">
        {pages.map(page => (
          <button
            key={page}
            className={'pagination-page' + (page === 1 ? ' active' : '')}>
            {page}
          </button>
        ))}
      </div>
      <button className="pagination-btn">Next</button>
    </div>
  );
}
