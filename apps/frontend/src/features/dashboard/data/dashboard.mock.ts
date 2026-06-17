// Temporary mock data for the dashboard UI.
// Replace these exports with real API data once the endpoints are wired.

export type DashboardSummary = {
  balanceAvailable: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  topCategory: string;
};

export type SpendingBar = {
  label: string;
  amount: number;
  highlight?: boolean;
};

export type SpendingCategory = {
  name: string;
  pct: number;
};

export type TransactionType = 'Gasto Variable' | 'Gasto Fijo' | 'Ingreso';

export type RecentTransaction = {
  id: string;
  merchant: string;
  category: string;
  date: string;
  method: string;
  amount: number;
  type: TransactionType;
};

export const dashboardSummary: DashboardSummary = {
  balanceAvailable: 33650,
  monthlyIncome: 72000,
  monthlyExpenses: 38350.86,
  topCategory: 'Ropa',
};

export const spendingByPeriod: SpendingBar[] = [
  { label: '8 AM', amount: 1200 },
  { label: '10 AM', amount: 3400 },
  { label: '12 PM', amount: 11647 },
  { label: '2 PM', amount: 1500 },
  { label: '4 PM', amount: 2200 },
  { label: '6 PM', amount: 3000 },
  { label: '8 PM', amount: 15000, highlight: true },
];

export const spendingCategories: SpendingCategory[] = [
  { name: 'Ropa', pct: 68 },
  { name: 'Transporte', pct: 46 },
  { name: 'Servicios', pct: 28 },
  { name: 'Alquiler', pct: 22 },
  { name: 'Entretenimiento', pct: 14 },
  { name: 'Otros', pct: 8 },
];

export const recentTransactions: RecentTransaction[] = [
  {
    id: 'tx-1',
    merchant: 'Zara Agora',
    category: 'Ropa',
    date: 'Hoy 8:00 PM',
    method: 'Tarjeta Crédito',
    amount: 15000.83,
    type: 'Gasto Variable',
  },
  {
    id: 'tx-2',
    merchant: 'KB Women',
    category: 'Regalos',
    date: 'Hoy 6:00 PM',
    method: 'Transferencia',
    amount: 3000,
    type: 'Gasto Variable',
  },
  {
    id: 'tx-3',
    merchant: 'Netflix',
    category: 'Entretenimiento',
    date: 'Hoy 2:00 PM',
    method: 'Tarjeta Débito',
    amount: 1500,
    type: 'Gasto Fijo',
  },
  {
    id: 'tx-4',
    merchant: 'El Nacional',
    category: 'Supermercado',
    date: 'Hoy 12:45 PM',
    method: 'Tarjeta Débito',
    amount: 11647.14,
    type: 'Gasto Fijo',
  },
];
