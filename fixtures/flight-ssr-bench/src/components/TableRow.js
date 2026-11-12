'use client';

import Badge from './Badge';

export default function TableRow({product, columns}) {
  return (
    <tr className="table-row">
      {columns.map(col => (
        <td key={col.key} className="table-cell" data-column={col.key}>
          {col.key === 'status' ? (
            <Badge count={product[col.key]} variant="status" />
          ) : col.key === 'price' ? (
            <span className="price">${product[col.key]}</span>
          ) : col.key === 'rating' ? (
            <span className="rating">
              <span className="star">&#9733;</span> {product[col.key]}
              <span className="review-count">({product.reviewCount})</span>
            </span>
          ) : col.key === 'name' ? (
            <div className="product-name-cell">
              <span className="product-name">{product.name}</span>
              <span className="product-category">{product.category}</span>
            </div>
          ) : (
            product[col.key]
          )}
        </td>
      ))}
    </tr>
  );
}
