// Mock data for perfect functional dashboard demo
export const MOCK_STATS = {
  totalOrders: 47,
  totalSpent: 128500,
  completedOrders: 32,
  cartItems: 3,
  cartTotal: 12500
};

export const MOCK_ORDERS = [
  {
    id: '#ORD-001',
    date: '2024-01-15',
    status: 'delivered',
    items: 3,
    total: '₦18,500',
    vendor: 'Mama Chops Express'
  },
  {
    id: '#ORD-002',
    date: '2024-01-12',
    status: 'pending_approval',
    items: 2,
    total: '₦9,800',
    vendor: 'Grill Masters'
  },
  {
    id: '#ORD-003',
    date: '2024-01-10',
    status: 'preparing',
    items: 4,
    total: '₦24,200',
    vendor: 'Jollof Palace'
  }
];

export const MOCK_PROFILE = {
  name: 'Chinedu Okeke',
  email: 'chinedu@example.com',
  phone: '+234 801 234 5678',
  address: '12 Aba Road, Port Harcourt',
  joined: 'Jan 2023',
  orders: 47,
  totalSpent: '₦128,500'
};

export const MOCK_CART = {
  items: [
    {
      id: 1,
      name: 'Grilled Chicken Feast',
      price: 8500,
      qty: 1,
      image: '../asset/grilled.jpg'
    },
    {
      id: 2,
      name: 'Jollof Rice + Beans',
      price: 4500,
      qty: 2,
      image: '../asset/jollof.webp'
    }
  ],
  subtotal: 17500,
  delivery: 500,
  total: 18000
};

export const MOCK_PAYMENTS = [
  {
    id: '#PAY-001',
    date: '2024-01-15',
    amount: '₦18,500',
    method: 'Paystack Card',
    status: 'completed'
  },
  {
    id: '#PAY-002',
    date: '2024-01-12',
    amount: '₦9,800',
    method: 'Flutterwave USSD',
    status: 'completed'
  }
];

