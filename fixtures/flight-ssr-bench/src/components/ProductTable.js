import TableRow from './TableRow';
import TableHeader from './TableHeader';
import Badge from './Badge';
import Pagination from './Pagination';

const columns = [
  {key: 'name', label: 'Product'},
  {key: 'sku', label: 'SKU'},
  {key: 'category', label: 'Category'},
  {key: 'price', label: 'Price'},
  {key: 'stock', label: 'Stock'},
  {key: 'status', label: 'Status'},
  {key: 'rating', label: 'Rating'},
];

export default function ProductTable({products}) {
  return (
    <div className="product-table-container">
      <div className="table-toolbar">
        <h2>Products</h2>
        <span className="table-count">{products.length} items</span>
      </div>
      <table className="product-table">
        <thead>
          <tr>
            {columns.map(col => (
              <TableHeader key={col.key} column={col} />
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <TableRow key={product.id} product={product} columns={columns} />
          ))}
        </tbody>
      </table>
      <Pagination total={products.length} pageSize={20} />
    </div>
  );
}
