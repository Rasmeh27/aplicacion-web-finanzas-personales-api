import type { Locale } from '@/store/slices/locale.store';

export type TranslationKey =
  | 'common.loading'
  | 'nav.dashboard'
  | 'nav.transactions'
  | 'nav.budgets'
  | 'nav.goals'
  | 'nav.debts'
  | 'nav.aiAssistant'
  | 'nav.profile'
  | 'nav.settings'
  | 'sidebar.healthScore'
  | 'health.excellent'
  | 'health.good'
  | 'health.fair'
  | 'health.poor'
  | 'health.empty'
  | 'dashboard.title'
  | 'dashboard.subtitle'
  | 'dashboard.addRecord'
  | 'period.today'
  | 'period.week'
  | 'period.month'
  | 'period.year'
  | 'card.balance'
  | 'card.income'
  | 'card.expenses'
  | 'card.topCategory'
  | 'hint.estimatedMonthly'
  | 'hint.monthly'
  | 'chart.title'
  | 'chart.subtitle'
  | 'chart.legend'
  | 'chartBar.fixed'
  | 'chartBar.variable'
  | 'chartBar.savings'
  | 'chartBar.balance'
  | 'category.title'
  | 'category.caption'
  | 'category.fixedExpenses'
  | 'category.variableExpenses'
  | 'category.savingTarget'
  | 'category.freeBalance'
  | 'topCategory.none'
  | 'recent.title'
  | 'recent.seeAll'
  | 'recent.emptyTitle'
  | 'recent.emptySubtitle'
  | 'comingSoon.subtitle'
  | 'comingSoon.working'
  | 'settings.title'
  | 'settings.subtitle'
  | 'settings.language.title'
  | 'settings.language.description'
  | 'settings.language.active'
  | 'language.es'
  | 'language.en';

type Dictionary = Record<TranslationKey, string>;

const es: Dictionary = {
  'common.loading': 'Cargando...',

  'nav.dashboard': 'Panel',
  'nav.transactions': 'Transacciones',
  'nav.budgets': 'Presupuestos',
  'nav.goals': 'Metas',
  'nav.debts': 'Deudas',
  'nav.aiAssistant': 'Wallter',
  'nav.profile': 'Perfil',
  'nav.settings': 'Configuración',

  'sidebar.healthScore': 'Salud financiera',
  'health.excellent': 'Excelente',
  'health.good': 'Bueno',
  'health.fair': 'Regular',
  'health.poor': 'Bajo',
  'health.empty': 'Sin datos',

  'dashboard.title': 'Panel',
  'dashboard.subtitle': 'Resumen de tus ingresos, gastos y balance financiero.',
  'dashboard.addRecord': 'Agregar registro',

  'period.today': 'Hoy',
  'period.week': 'Semana',
  'period.month': 'Mes',
  'period.year': 'Año',

  'card.balance': 'Balance disponible',
  'card.income': 'Ingresos',
  'card.expenses': 'Gastos totales',
  'card.topCategory': 'Mayor categoría',
  'hint.estimatedMonthly': 'Estimado mensual',
  'hint.monthly': 'Mensual',

  'chart.title': 'Distribución mensual estimada',
  'chart.subtitle': 'Gastos fijos, variables, ahorro y balance',
  'chart.legend': 'Mayor monto',
  'chartBar.fixed': 'Fijos',
  'chartBar.variable': 'Variables',
  'chartBar.savings': 'Ahorro',
  'chartBar.balance': 'Balance',

  'category.title': 'Gastos por categoría',
  'category.caption': 'Este mes',
  'category.fixedExpenses': 'Gastos fijos',
  'category.variableExpenses': 'Gastos variables',
  'category.savingTarget': 'Ahorro meta',
  'category.freeBalance': 'Balance libre',
  'topCategory.none': '—',

  'recent.title': 'Movimientos recientes',
  'recent.seeAll': 'Ver todos',
  'recent.emptyTitle': 'Aún no tienes movimientos registrados.',
  'recent.emptySubtitle': 'Cuando registres ingresos o gastos reales aparecerán aquí.',

  'comingSoon.subtitle': 'Esta sección estará disponible pronto.',
  'comingSoon.working': 'Estamos trabajando en {section}.',

  'settings.title': 'Configuración',
  'settings.subtitle': 'Administra las preferencias de tu cuenta.',
  'settings.language.title': 'Idioma',
  'settings.language.description': 'Elige el idioma en el que quieres usar la aplicación.',
  'settings.language.active': 'Activo',
  'language.es': 'Español',
  'language.en': 'Inglés',
};

const en: Dictionary = {
  'common.loading': 'Loading...',

  'nav.dashboard': 'Dashboard',
  'nav.transactions': 'Transactions',
  'nav.budgets': 'Budgets',
  'nav.goals': 'Goals',
  'nav.debts': 'Debts',
  'nav.aiAssistant': 'Wallter',
  'nav.profile': 'Profile',
  'nav.settings': 'Settings',

  'sidebar.healthScore': 'Health Score',
  'health.excellent': 'Excellent',
  'health.good': 'Good',
  'health.fair': 'Fair',
  'health.poor': 'Low',
  'health.empty': 'No data',

  'dashboard.title': 'Dashboard',
  'dashboard.subtitle': 'Overview of your income, expenses and balance.',
  'dashboard.addRecord': 'Add record',

  'period.today': 'Today',
  'period.week': 'Week',
  'period.month': 'Month',
  'period.year': 'Year',

  'card.balance': 'Available balance',
  'card.income': 'Income',
  'card.expenses': 'Total expenses',
  'card.topCategory': 'Top category',
  'hint.estimatedMonthly': 'Monthly estimate',
  'hint.monthly': 'Monthly',

  'chart.title': 'Estimated monthly breakdown',
  'chart.subtitle': 'Fixed, variable, savings and balance',
  'chart.legend': 'Highest amount',
  'chartBar.fixed': 'Fixed',
  'chartBar.variable': 'Variable',
  'chartBar.savings': 'Savings',
  'chartBar.balance': 'Balance',

  'category.title': 'Spending by category',
  'category.caption': 'This month',
  'category.fixedExpenses': 'Fixed expenses',
  'category.variableExpenses': 'Variable expenses',
  'category.savingTarget': 'Savings target',
  'category.freeBalance': 'Free balance',
  'topCategory.none': '—',

  'recent.title': 'Recent transactions',
  'recent.seeAll': 'See all',
  'recent.emptyTitle': "You don't have any transactions yet.",
  'recent.emptySubtitle': 'Real income and expenses will show up here.',

  'comingSoon.subtitle': 'This section will be available soon.',
  'comingSoon.working': "We're working on {section}.",

  'settings.title': 'Settings',
  'settings.subtitle': 'Manage your account preferences.',
  'settings.language.title': 'Language',
  'settings.language.description': 'Choose the language you want to use the app in.',
  'settings.language.active': 'Active',
  'language.es': 'Spanish',
  'language.en': 'English',
};

export const translations: Record<Locale, Dictionary> = { es, en };
