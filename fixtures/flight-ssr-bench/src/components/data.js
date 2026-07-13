const categories = [
  'Electronics',
  'Clothing',
  'Home & Garden',
  'Sports',
  'Books',
  'Toys',
  'Food',
  'Health',
];
const statuses = ['In Stock', 'Low Stock', 'Out of Stock', 'Discontinued'];
const activityTypes = [
  'order_placed',
  'order_shipped',
  'order_delivered',
  'refund_requested',
  'review_posted',
  'product_added',
  'stock_alert',
  'payment_received',
];
const userNames = [
  'Alice Johnson',
  'Bob Williams',
  'Carol Davis',
  'Dan Miller',
  'Eve Wilson',
  'Frank Moore',
  'Grace Taylor',
  'Henry Anderson',
  'Iris Thomas',
  'Jack Jackson',
];
const reviewTexts = [
  'Great product, exactly what I needed. The quality exceeded my expectations and shipping was fast.',
  'Decent value for the price. Some minor issues with packaging but the product itself works well.',
  'Not what I expected based on the description. Returning this item for a refund.',
  'Outstanding quality and craftsmanship. Would highly recommend to anyone looking for this type of item.',
  'Average product, nothing special. Does what it says but nothing more than that.',
];

export function generateProducts(count) {
  const products = [];
  for (let i = 0; i < count; i++) {
    products.push({
      id: i,
      name: 'Product ' + i,
      sku: 'SKU-' + String(i).padStart(6, '0'),
      price: (((i * 17 + 3) % 9999) / 100).toFixed(2),
      category: categories[i % categories.length],
      status: statuses[i % statuses.length],
      stock: (i * 7 + 13) % 500,
      rating: (((i * 3 + 1) % 50) / 10).toFixed(1),
      reviewCount: (i * 13 + 5) % 200,
      description:
        'This is a detailed description for product ' +
        i +
        '. It includes specifications, features, and other relevant information that a customer might need.',
      tags: [
        categories[(i + 1) % categories.length].toLowerCase(),
        i % 2 === 0 ? 'featured' : 'new',
        i % 3 === 0 ? 'sale' : 'regular',
      ],
      dimensions: {
        weight: ((i * 3 + 1) % 100) / 10,
        width: ((i * 7 + 2) % 50) + 5,
        height: ((i * 11 + 3) % 40) + 5,
        depth: ((i * 13 + 4) % 30) + 2,
        unit: 'cm',
      },
      supplier: {
        name: 'Supplier ' + (i % 20),
        leadTime: (i % 14) + 1 + ' days',
        minOrder: ((i * 3) % 50) + 10,
        contact: 'supplier' + (i % 20) + '@example.com',
        address: {
          street: ((100 + i * 7) % 9999) + ' Industrial Blvd',
          city: ['Portland', 'Austin', 'Denver', 'Seattle', 'Boston'][i % 5],
          state: ['OR', 'TX', 'CO', 'WA', 'MA'][i % 5],
          zip: String(10000 + ((i * 37) % 89999)),
        },
      },
      specifications: {
        material: ['Aluminum', 'Plastic', 'Steel', 'Wood', 'Carbon Fiber'][
          i % 5
        ],
        color: ['Black', 'White', 'Silver', 'Blue', 'Red', 'Green'][i % 6],
        warranty: (i % 3) + 1 + ' years',
        certifications: [
          i % 2 === 0 ? 'CE' : 'FCC',
          i % 3 === 0 ? 'RoHS' : 'UL',
          'ISO 9001',
        ],
      },
      reviews: [
        {
          author: userNames[(i * 3) % userNames.length],
          rating: ((i * 7 + 3) % 5) + 1,
          date:
            '2026-0' +
            ((i % 3) + 1) +
            '-' +
            String((i % 28) + 1).padStart(2, '0'),
          text: reviewTexts[i % reviewTexts.length],
          helpful: (i * 11 + 2) % 50,
        },
        {
          author: userNames[(i * 3 + 1) % userNames.length],
          rating: ((i * 11 + 1) % 5) + 1,
          date:
            '2026-0' +
            ((i % 3) + 1) +
            '-' +
            String(((i + 5) % 28) + 1).padStart(2, '0'),
          text: reviewTexts[(i + 2) % reviewTexts.length],
          helpful: (i * 7 + 5) % 30,
        },
        {
          author: userNames[(i * 3 + 2) % userNames.length],
          rating: ((i * 13 + 2) % 5) + 1,
          date:
            '2026-0' +
            ((i % 3) + 1) +
            '-' +
            String(((i + 10) % 28) + 1).padStart(2, '0'),
          text: reviewTexts[(i + 4) % reviewTexts.length],
          helpful: (i * 3 + 1) % 20,
        },
      ],
    });
  }
  return products;
}

export function generateActivities(count) {
  const activities = [];
  for (let i = 0; i < count; i++) {
    activities.push({
      id: i,
      type: activityTypes[i % activityTypes.length],
      user: userNames[i % userNames.length],
      timestamp:
        '2026-03-' +
        String((i % 28) + 1).padStart(2, '0') +
        'T' +
        String((i * 7) % 24).padStart(2, '0') +
        ':' +
        String((i * 13) % 60).padStart(2, '0') +
        ':00Z',
      details: {
        orderId: '#' + String(10000 + i),
        amount: '$' + ((i * 23 + 7) % 999).toFixed(2),
        items: ((i * 3 + 1) % 5) + 1,
        shippingMethod: ['Standard', 'Express', 'Overnight', 'Economy'][i % 4],
        paymentMethod: ['Credit Card', 'PayPal', 'Apple Pay', 'Wire Transfer'][
          i % 4
        ],
      },
      message:
        userNames[i % userNames.length] +
        ' ' +
        activityTypes[i % activityTypes.length].replace(/_/g, ' ') +
        ' for order #' +
        (10000 + i),
    });
  }
  return activities;
}

export function generateStats() {
  return {
    totalRevenue: '$1,284,320.50',
    totalOrders: 8432,
    totalCustomers: 3841,
    conversionRate: '3.2%',
    avgOrderValue: '$152.30',
    returnsRate: '2.1%',
    cards: [
      {
        title: 'Total Revenue',
        value: '$1,284,320',
        change: '+12.5%',
        trend: 'up',
        sparkline: [65, 59, 80, 81, 56, 55, 72, 84, 91, 88, 95, 102],
      },
      {
        title: 'Orders',
        value: '8,432',
        change: '+8.2%',
        trend: 'up',
        sparkline: [28, 48, 40, 19, 86, 27, 90, 65, 72, 81, 56, 88],
      },
      {
        title: 'Customers',
        value: '3,841',
        change: '+4.1%',
        trend: 'up',
        sparkline: [12, 19, 25, 32, 28, 35, 42, 38, 45, 51, 48, 55],
      },
      {
        title: 'Conversion Rate',
        value: '3.2%',
        change: '-0.3%',
        trend: 'down',
        sparkline: [3.8, 3.5, 3.2, 3.6, 3.1, 3.4, 3.0, 3.3, 3.5, 3.2, 3.1, 3.2],
      },
    ],
    revenueByMonth: [
      {month: 'Jan 25', value: 72000, orders: 480, returns: 24},
      {month: 'Feb 25', value: 78000, orders: 520, returns: 31},
      {month: 'Mar 25', value: 85000, orders: 567, returns: 28},
      {month: 'Apr 25', value: 92000, orders: 613, returns: 35},
      {month: 'May 25', value: 88000, orders: 587, returns: 29},
      {month: 'Jun 25', value: 105000, orders: 700, returns: 42},
      {month: 'Jul 25', value: 112000, orders: 747, returns: 38},
      {month: 'Aug 25', value: 98000, orders: 653, returns: 33},
      {month: 'Sep 25', value: 115000, orders: 767, returns: 41},
      {month: 'Oct 25', value: 108000, orders: 720, returns: 36},
      {month: 'Nov 25', value: 120000, orders: 800, returns: 44},
      {month: 'Dec 25', value: 118320, orders: 789, returns: 39},
      {month: 'Jan 26', value: 85000, orders: 567, returns: 28},
      {month: 'Feb 26', value: 92000, orders: 613, returns: 32},
      {month: 'Mar 26', value: 95000, orders: 633, returns: 30},
      {month: 'Apr 26', value: 110000, orders: 733, returns: 37},
      {month: 'May 26', value: 118000, orders: 787, returns: 40},
      {month: 'Jun 26', value: 105000, orders: 700, returns: 35},
      {month: 'Jul 26', value: 122000, orders: 813, returns: 43},
      {month: 'Aug 26', value: 115000, orders: 767, returns: 38},
      {month: 'Sep 26', value: 128000, orders: 853, returns: 45},
      {month: 'Oct 26', value: 125000, orders: 833, returns: 42},
      {month: 'Nov 26', value: 135000, orders: 900, returns: 47},
      {month: 'Dec 26', value: 130000, orders: 867, returns: 44},
    ],
    topCategories: [
      {
        name: 'Electronics',
        revenue: 420000,
        orders: 2800,
        avgPrice: 150,
        growth: '+15.2%',
      },
      {
        name: 'Clothing',
        revenue: 310000,
        orders: 2100,
        avgPrice: 147.6,
        growth: '+8.7%',
      },
      {
        name: 'Home & Garden',
        revenue: 225000,
        orders: 1500,
        avgPrice: 150,
        growth: '+12.1%',
      },
      {
        name: 'Sports',
        revenue: 180000,
        orders: 1200,
        avgPrice: 150,
        growth: '+5.3%',
      },
      {
        name: 'Books',
        revenue: 149320,
        orders: 832,
        avgPrice: 179.5,
        growth: '+2.1%',
      },
      {
        name: 'Toys',
        revenue: 95000,
        orders: 680,
        avgPrice: 139.7,
        growth: '+18.4%',
      },
      {
        name: 'Food',
        revenue: 82000,
        orders: 1640,
        avgPrice: 50,
        growth: '+6.8%',
      },
      {
        name: 'Health',
        revenue: 73000,
        orders: 520,
        avgPrice: 140.4,
        growth: '+22.1%',
      },
    ],
  };
}
