import { CategoryType } from '../planning/entities/category.entity';
import { TransactionClassification } from '../movements/entities/transaction.enums';

export interface DefaultCategorySeed {
  name: string;
  type: CategoryType;
  classification: TransactionClassification;
  icon: string;
  color: string;
}

/**
 * Categorías por defecto de finanzas personales.
 * NO incluye categorías de inversión en este alcance.
 */
export const DEFAULT_CATEGORIES: DefaultCategorySeed[] = [
  // Ingresos
  { name: 'Salario', type: CategoryType.INCOME, classification: TransactionClassification.REGULAR_INCOME, icon: 'Wallet', color: '#059669' },
  { name: 'Freelance', type: CategoryType.INCOME, classification: TransactionClassification.EXTRA_INCOME, icon: 'Laptop', color: '#0d9488' },
  { name: 'Bono', type: CategoryType.INCOME, classification: TransactionClassification.EXTRA_INCOME, icon: 'Gift', color: '#10b981' },
  { name: 'Reembolso', type: CategoryType.INCOME, classification: TransactionClassification.EXTRA_INCOME, icon: 'Undo2', color: '#14b8a6' },
  { name: 'Otros ingresos', type: CategoryType.INCOME, classification: TransactionClassification.EXTRA_INCOME, icon: 'PlusCircle', color: '#22c55e' },

  // Gastos fijos
  { name: 'Renta', type: CategoryType.EXPENSE, classification: TransactionClassification.FIXED_EXPENSE, icon: 'Home', color: '#e11d48' },
  { name: 'Servicios', type: CategoryType.EXPENSE, classification: TransactionClassification.FIXED_EXPENSE, icon: 'Plug', color: '#f43f5e' },
  { name: 'Internet', type: CategoryType.EXPENSE, classification: TransactionClassification.FIXED_EXPENSE, icon: 'Wifi', color: '#fb7185' },
  { name: 'Teléfono', type: CategoryType.EXPENSE, classification: TransactionClassification.FIXED_EXPENSE, icon: 'Smartphone', color: '#f97316' },
  { name: 'Gimnasio', type: CategoryType.EXPENSE, classification: TransactionClassification.FIXED_EXPENSE, icon: 'Dumbbell', color: '#ea580c' },
  { name: 'Suscripciones', type: CategoryType.EXPENSE, classification: TransactionClassification.FIXED_EXPENSE, icon: 'Repeat', color: '#d946ef' },
  { name: 'Seguros', type: CategoryType.EXPENSE, classification: TransactionClassification.FIXED_EXPENSE, icon: 'ShieldCheck', color: '#a855f7' },

  // Gastos variables
  { name: 'Comida', type: CategoryType.EXPENSE, classification: TransactionClassification.VARIABLE_EXPENSE, icon: 'Utensils', color: '#f59e0b' },
  { name: 'Transporte', type: CategoryType.EXPENSE, classification: TransactionClassification.VARIABLE_EXPENSE, icon: 'Bus', color: '#eab308' },
  { name: 'Supermercado', type: CategoryType.EXPENSE, classification: TransactionClassification.VARIABLE_EXPENSE, icon: 'ShoppingCart', color: '#84cc16' },
  { name: 'Salud', type: CategoryType.EXPENSE, classification: TransactionClassification.VARIABLE_EXPENSE, icon: 'HeartPulse', color: '#ef4444' },
  { name: 'Educación', type: CategoryType.EXPENSE, classification: TransactionClassification.VARIABLE_EXPENSE, icon: 'GraduationCap', color: '#3b82f6' },
  { name: 'Entretenimiento', type: CategoryType.EXPENSE, classification: TransactionClassification.VARIABLE_EXPENSE, icon: 'Clapperboard', color: '#8b5cf6' },
  { name: 'Compras', type: CategoryType.EXPENSE, classification: TransactionClassification.VARIABLE_EXPENSE, icon: 'ShoppingBag', color: '#ec4899' },
  { name: 'Otros gastos', type: CategoryType.EXPENSE, classification: TransactionClassification.VARIABLE_EXPENSE, icon: 'MoreHorizontal', color: '#64748b' },
];
