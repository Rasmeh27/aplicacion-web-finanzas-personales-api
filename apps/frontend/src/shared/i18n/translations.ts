import type { Locale } from '@/store/slices/locale.store';

export type TranslationKey =
  | 'common.loading'
  | 'nav.dashboard'
  | 'nav.transactions'
  | 'nav.budgets'
  | 'nav.goals'
  | 'nav.debts'
  | 'nav.reports'
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
  | 'language.en'
  | 'nav.investments'
  | 'plan.badge'
  | 'plan.basicName'
  | 'plan.premiumName'
  | 'plan.current'
  | 'plan.status.active'
  | 'plan.status.trialing'
  | 'plan.status.past_due'
  | 'plan.status.canceled'
  | 'plan.status.expired'
  | 'plan.status.none'
  | 'plan.renewsOn'
  | 'plan.noExpiration'
  | 'plan.activeFeatures'
  | 'plan.upgradeCta'
  | 'plan.error'
  | 'plan.feature.investments'
  | 'plan.feature.portfolioAnalytics'
  | 'plan.feature.premiumAssistant'
  | 'plan.feature.concentration'
  | 'settings.plan.title'
  | 'settings.plan.description'
  | 'settings.plan.comparison'
  | 'settings.plan.basicSummary'
  | 'settings.plan.premiumSummary'
  | 'upgrade.title'
  | 'upgrade.subtitle'
  | 'upgrade.checkoutUnavailable'
  | 'upgrade.goToCheckout'
  | 'upgrade.close'
  | 'upgrade.devHint'
  | 'investments.title'
  | 'investments.subtitle'
  | 'investments.premiumBadge'
  | 'investments.addPosition'
  | 'investments.demoData'
  | 'investments.marketClosed'
  | 'investments.partialData'
  | 'investments.delayed'
  | 'investments.lastAvailablePrice'
  | 'investments.updatedAt'
  | 'investments.retry'
  | 'investments.summary.portfolioValue'
  | 'investments.summary.totalInvested'
  | 'investments.summary.unrealizedGainLoss'
  | 'investments.summary.dayChange'
  | 'investments.summary.positions'
  | 'investments.notAvailable'
  | 'investments.marketStatus.fresh'
  | 'investments.marketStatus.partial'
  | 'investments.marketStatus.stale'
  | 'investments.marketStatus.unavailable'
  | 'investments.marketStatus.empty'
  | 'investments.weightsOnCost'
  | 'investments.charts.allocation.title'
  | 'investments.charts.allocation.subtitle'
  | 'investments.charts.byAssetType'
  | 'investments.charts.gainLoss.title'
  | 'investments.charts.gainLoss.subtitle'
  | 'investments.charts.evolution.title'
  | 'investments.charts.evolution.subtitle'
  | 'investments.charts.evolution.startNote'
  | 'investments.charts.evolution.insufficient'
  | 'investments.charts.history.title'
  | 'investments.charts.history.subtitle'
  | 'investments.charts.empty'
  | 'investments.charts.marketValue'
  | 'investments.charts.costBasis'
  | 'investments.charts.close'
  | 'investments.range.1M'
  | 'investments.range.3M'
  | 'investments.range.6M'
  | 'investments.range.1Y'
  | 'investments.range.ALL'
  | 'investments.table.title'
  | 'investments.table.asset'
  | 'investments.table.symbol'
  | 'investments.table.type'
  | 'investments.table.quantity'
  | 'investments.table.avgCost'
  | 'investments.table.price'
  | 'investments.table.value'
  | 'investments.table.gainLoss'
  | 'investments.table.weight'
  | 'investments.table.updated'
  | 'investments.table.actions'
  | 'investments.table.edit'
  | 'investments.table.delete'
  | 'investments.table.emptyTitle'
  | 'investments.table.emptySubtitle'
  | 'investments.table.error'
  | 'investments.type.stock'
  | 'investments.type.etf'
  | 'investments.delete.title'
  | 'investments.delete.message'
  | 'investments.delete.confirm'
  | 'investments.locked.title'
  | 'investments.locked.subtitle'
  | 'investments.locked.benefitsTitle'
  | 'investments.form.createTitle'
  | 'investments.form.editTitle'
  | 'investments.form.createDescription'
  | 'investments.form.editDescription'
  | 'investments.form.symbol'
  | 'investments.form.symbolSearchPlaceholder'
  | 'investments.form.searching'
  | 'investments.form.noResults'
  | 'investments.form.selectedSymbol'
  | 'investments.form.assetType'
  | 'investments.form.quantity'
  | 'investments.form.averageCost'
  | 'investments.form.purchaseDate'
  | 'investments.form.notes'
  | 'investments.form.optional'
  | 'investments.form.cancel'
  | 'investments.form.create'
  | 'investments.form.save'
  | 'investments.form.symbolRequired'
  | 'investments.form.quantityInvalid'
  | 'investments.form.averageCostInvalid'
  | 'investments.form.purchaseDateInvalid'
  | 'investments.form.notesTooLong'
  | 'investments.warning.validationSkipped'
  | 'investments.error.duplicate'
  | 'investments.error.invalidSymbol'
  | 'investments.error.rateLimited'
  | 'investments.error.marketUnavailable'
  | 'investments.error.premiumRequired'
  | 'investments.error.generic';

type Dictionary = Record<TranslationKey, string>;

const es: Dictionary = {
  'common.loading': 'Cargando...',

  'nav.dashboard': 'Panel',
  'nav.transactions': 'Transacciones',
  'nav.budgets': 'Presupuestos',
  'nav.goals': 'Metas',
  'nav.debts': 'Deudas',
  'nav.reports': 'Reportes',
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
  'topCategory.none': '-',

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

  'nav.investments': 'Inversiones',

  'plan.badge': 'PREMIUM',
  'plan.basicName': 'Basic',
  'plan.premiumName': 'Premium',
  'plan.current': 'Plan actual',
  'plan.status.active': 'Activa',
  'plan.status.trialing': 'En prueba',
  'plan.status.past_due': 'Pago pendiente',
  'plan.status.canceled': 'Cancelada',
  'plan.status.expired': 'Vencida',
  'plan.status.none': 'Sin suscripción',
  'plan.renewsOn': 'Se renueva o vence el {date}',
  'plan.noExpiration': 'Sin fecha de vencimiento',
  'plan.activeFeatures': 'Capacidades activas',
  'plan.upgradeCta': 'Mejorar a Premium',
  'plan.error': 'No se pudo cargar tu plan. Intenta nuevamente.',
  'plan.feature.investments': 'Portafolio de acciones y ETF de EE. UU.',
  'plan.feature.portfolioAnalytics': 'Analítica y gráficos del portafolio',
  'plan.feature.premiumAssistant': 'Wallter con contexto de tu portafolio',
  'plan.feature.concentration': 'Análisis de concentración y diversificación',

  'settings.plan.title': 'Plan y facturación',
  'settings.plan.description': 'Consulta tu plan actual y sus capacidades.',
  'settings.plan.comparison': 'Comparación de planes',
  'settings.plan.basicSummary':
    'Gestión de finanzas personales: movimientos, presupuestos, metas y Wallter básico.',
  'settings.plan.premiumSummary':
    'Todo lo de Basic, más portafolio de inversiones, analítica avanzada y Wallter con contexto de tu portafolio.',

  'upgrade.title': 'Mejora a Premium',
  'upgrade.subtitle':
    'Desbloquea el portafolio de inversiones, la analítica avanzada y el Wallter Premium.',
  'upgrade.checkoutUnavailable':
    'El pago en línea todavía no está habilitado. Tu plan no se modificará desde aquí.',
  'upgrade.goToCheckout': 'Continuar al checkout',
  'upgrade.close': 'Entendido',
  'upgrade.devHint':
    'En desarrollo, un administrador puede activar Premium con el script subscription:set-plan.',

  'investments.title': 'Inversiones',
  'investments.subtitle':
    'Administra tu portafolio de acciones y ETF del mercado de valores de EE. UU. (USD).',
  'investments.premiumBadge': 'Plan Premium',
  'investments.addPosition': 'Agregar posición',
  'investments.demoData': 'Datos de demostración',
  'investments.marketClosed': 'Mercado cerrado — mostrando el último precio disponible.',
  'investments.partialData': 'Sin cotización para: {symbols}. Se muestran con datos no disponibles.',
  'investments.delayed': 'Datos demorados',
  'investments.lastAvailablePrice': 'Último precio disponible',
  'investments.updatedAt': 'Actualizado: {time}',
  'investments.retry': 'Reintentar',

  'investments.summary.portfolioValue': 'Valor del portafolio',
  'investments.summary.totalInvested': 'Total invertido',
  'investments.summary.unrealizedGainLoss': 'Ganancia/pérdida no realizada',
  'investments.summary.dayChange': 'Cambio del día',
  'investments.summary.positions': 'posiciones',
  'investments.notAvailable': 'No disponible',

  'investments.marketStatus.fresh': 'Mercado actualizado',
  'investments.marketStatus.partial': 'Datos de mercado parciales',
  'investments.marketStatus.stale': 'Datos de mercado desactualizados',
  'investments.marketStatus.unavailable': 'Mercado no disponible',
  'investments.marketStatus.empty': 'Sin posiciones',
  'investments.weightsOnCost': 'Pesos calculados sobre el costo (faltan cotizaciones).',

  'investments.charts.allocation.title': 'Distribución del portafolio',
  'investments.charts.allocation.subtitle': 'Peso de cada símbolo',
  'investments.charts.byAssetType': 'Por tipo de activo',
  'investments.charts.gainLoss.title': 'Ganancia/pérdida por posición',
  'investments.charts.gainLoss.subtitle': 'No realizada, en USD',
  'investments.charts.evolution.title': 'Evolución del portafolio',
  'investments.charts.evolution.subtitle': 'Basada en snapshots diarios reales',
  'investments.charts.evolution.startNote':
    'El historial comienza cuando se registra el primer snapshot ({date}).',
  'investments.charts.evolution.insufficient':
    'Aún no hay suficientes snapshots para dibujar la evolución. Vuelve mañana.',
  'investments.charts.history.title': 'Histórico del símbolo',
  'investments.charts.history.subtitle': 'Precio de cierre diario',
  'investments.charts.empty': 'Sin datos para graficar todavía.',
  'investments.charts.marketValue': 'Valor de mercado',
  'investments.charts.costBasis': 'Costo',
  'investments.charts.close': 'Cierre',
  'investments.range.1M': '1M',
  'investments.range.3M': '3M',
  'investments.range.6M': '6M',
  'investments.range.1Y': '1A',
  'investments.range.ALL': 'Todo',

  'investments.table.title': 'Posiciones',
  'investments.table.asset': 'Activo',
  'investments.table.symbol': 'Símbolo',
  'investments.table.type': 'Tipo',
  'investments.table.quantity': 'Cantidad',
  'investments.table.avgCost': 'Costo promedio',
  'investments.table.price': 'Precio actual',
  'investments.table.value': 'Valor actual',
  'investments.table.gainLoss': 'Ganancia/pérdida',
  'investments.table.weight': 'Peso',
  'investments.table.updated': 'Actualizado',
  'investments.table.actions': 'Acciones',
  'investments.table.edit': 'Editar',
  'investments.table.delete': 'Eliminar',
  'investments.table.emptyTitle': 'Aún no tienes posiciones',
  'investments.table.emptySubtitle':
    'Agrega tu primera acción o ETF para comenzar a seguir tu portafolio.',
  'investments.table.error': 'No se pudieron cargar las posiciones.',
  'investments.type.stock': 'Acción',
  'investments.type.etf': 'ETF',

  'investments.delete.title': 'Eliminar posición',
  'investments.delete.message':
    '¿Seguro que quieres eliminar {symbol}? Podrás volver a agregarla cuando quieras.',
  'investments.delete.confirm': 'Eliminar',

  'investments.locked.title': 'Inversiones es una función Premium',
  'investments.locked.subtitle':
    'Crea tu portafolio de acciones y ETF de EE. UU., sigue su valor y recibe análisis de Wallter.',
  'investments.locked.benefitsTitle': 'Con Premium obtienes',

  'investments.form.createTitle': 'Agregar posición',
  'investments.form.editTitle': 'Editar posición',
  'investments.form.createDescription':
    'Registra manualmente una acción o ETF que ya posees.',
  'investments.form.editDescription': 'Actualiza los datos de tu posición.',
  'investments.form.symbol': 'Símbolo',
  'investments.form.symbolSearchPlaceholder': 'Busca por símbolo o nombre (ej. AAPL, Vanguard)',
  'investments.form.searching': 'Buscando…',
  'investments.form.noResults': 'Sin resultados. Verifica el símbolo.',
  'investments.form.selectedSymbol': 'Símbolo seleccionado',
  'investments.form.assetType': 'Tipo de activo',
  'investments.form.quantity': 'Cantidad',
  'investments.form.averageCost': 'Costo promedio (USD)',
  'investments.form.purchaseDate': 'Fecha de compra',
  'investments.form.notes': 'Notas',
  'investments.form.optional': 'Opcional',
  'investments.form.cancel': 'Cancelar',
  'investments.form.create': 'Agregar posición',
  'investments.form.save': 'Guardar cambios',
  'investments.form.symbolRequired': 'Selecciona o escribe un símbolo válido (ej. AAPL).',
  'investments.form.quantityInvalid': 'Ingresa una cantidad mayor a 0.',
  'investments.form.averageCostInvalid': 'Ingresa un costo promedio de 0 o mayor.',
  'investments.form.purchaseDateInvalid': 'Fecha inválida (no puede ser futura).',
  'investments.form.notesTooLong': 'Máximo 500 caracteres.',
  'investments.warning.validationSkipped':
    'El proveedor de mercado no está disponible; el símbolo se guardó sin verificar.',

  'investments.error.duplicate': 'Ya tienes una posición activa para ese símbolo.',
  'investments.error.invalidSymbol': 'El símbolo no es válido o no pudo resolverse.',
  'investments.error.rateLimited':
    'El proveedor de datos alcanzó su límite. Intenta en unos minutos.',
  'investments.error.marketUnavailable':
    'Los datos de mercado no están disponibles en este momento.',
  'investments.error.premiumRequired': 'Esta funcionalidad requiere el Plan Premium.',
  'investments.error.generic': 'Ocurrió un error. Intenta nuevamente.',
};

const en: Dictionary = {
  'common.loading': 'Loading...',

  'nav.dashboard': 'Dashboard',
  'nav.transactions': 'Transactions',
  'nav.budgets': 'Budgets',
  'nav.goals': 'Goals',
  'nav.debts': 'Debts',
  'nav.reports': 'Reports',
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
  'topCategory.none': '-',

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

  'nav.investments': 'Investments',

  'plan.badge': 'PREMIUM',
  'plan.basicName': 'Basic',
  'plan.premiumName': 'Premium',
  'plan.current': 'Current plan',
  'plan.status.active': 'Active',
  'plan.status.trialing': 'Trialing',
  'plan.status.past_due': 'Past due',
  'plan.status.canceled': 'Canceled',
  'plan.status.expired': 'Expired',
  'plan.status.none': 'No subscription',
  'plan.renewsOn': 'Renews or expires on {date}',
  'plan.noExpiration': 'No expiration date',
  'plan.activeFeatures': 'Active features',
  'plan.upgradeCta': 'Upgrade to Premium',
  'plan.error': "We couldn't load your plan. Please try again.",
  'plan.feature.investments': 'U.S. stocks and ETF portfolio',
  'plan.feature.portfolioAnalytics': 'Portfolio analytics and charts',
  'plan.feature.premiumAssistant': 'Wallter with your portfolio context',
  'plan.feature.concentration': 'Concentration and diversification analysis',

  'settings.plan.title': 'Plan & billing',
  'settings.plan.description': 'Review your current plan and its capabilities.',
  'settings.plan.comparison': 'Plan comparison',
  'settings.plan.basicSummary':
    'Personal finance management: transactions, budgets, goals and basic Wallter.',
  'settings.plan.premiumSummary':
    'Everything in Basic, plus an investment portfolio, advanced analytics and Wallter with portfolio context.',

  'upgrade.title': 'Upgrade to Premium',
  'upgrade.subtitle':
    'Unlock the investment portfolio, advanced analytics and Premium Wallter.',
  'upgrade.checkoutUnavailable':
    'Online checkout is not enabled yet. Your plan will not change from here.',
  'upgrade.goToCheckout': 'Continue to checkout',
  'upgrade.close': 'Got it',
  'upgrade.devHint':
    'In development, an admin can enable Premium with the subscription:set-plan script.',

  'investments.title': 'Investments',
  'investments.subtitle':
    'Manage your U.S. stock market portfolio of stocks and ETFs (USD).',
  'investments.premiumBadge': 'Premium Plan',
  'investments.addPosition': 'Add position',
  'investments.demoData': 'Demo data',
  'investments.marketClosed': 'Market closed — showing the last available price.',
  'investments.partialData': 'No quote for: {symbols}. Shown as not available.',
  'investments.delayed': 'Delayed data',
  'investments.lastAvailablePrice': 'Last available price',
  'investments.updatedAt': 'Updated: {time}',
  'investments.retry': 'Retry',

  'investments.summary.portfolioValue': 'Portfolio value',
  'investments.summary.totalInvested': 'Total invested',
  'investments.summary.unrealizedGainLoss': 'Unrealized gain/loss',
  'investments.summary.dayChange': "Day's change",
  'investments.summary.positions': 'positions',
  'investments.notAvailable': 'Not available',

  'investments.marketStatus.fresh': 'Market up to date',
  'investments.marketStatus.partial': 'Partial market data',
  'investments.marketStatus.stale': 'Stale market data',
  'investments.marketStatus.unavailable': 'Market unavailable',
  'investments.marketStatus.empty': 'No positions',
  'investments.weightsOnCost': 'Weights computed on cost (quotes missing).',

  'investments.charts.allocation.title': 'Portfolio allocation',
  'investments.charts.allocation.subtitle': 'Weight per symbol',
  'investments.charts.byAssetType': 'By asset type',
  'investments.charts.gainLoss.title': 'Gain/loss per position',
  'investments.charts.gainLoss.subtitle': 'Unrealized, in USD',
  'investments.charts.evolution.title': 'Portfolio evolution',
  'investments.charts.evolution.subtitle': 'Based on real daily snapshots',
  'investments.charts.evolution.startNote':
    'History starts when the first snapshot is recorded ({date}).',
  'investments.charts.evolution.insufficient':
    'Not enough snapshots to draw the evolution yet. Check back tomorrow.',
  'investments.charts.history.title': 'Symbol history',
  'investments.charts.history.subtitle': 'Daily closing price',
  'investments.charts.empty': 'No data to chart yet.',
  'investments.charts.marketValue': 'Market value',
  'investments.charts.costBasis': 'Cost basis',
  'investments.charts.close': 'Close',
  'investments.range.1M': '1M',
  'investments.range.3M': '3M',
  'investments.range.6M': '6M',
  'investments.range.1Y': '1Y',
  'investments.range.ALL': 'All',

  'investments.table.title': 'Positions',
  'investments.table.asset': 'Asset',
  'investments.table.symbol': 'Symbol',
  'investments.table.type': 'Type',
  'investments.table.quantity': 'Quantity',
  'investments.table.avgCost': 'Avg. cost',
  'investments.table.price': 'Current price',
  'investments.table.value': 'Current value',
  'investments.table.gainLoss': 'Gain/loss',
  'investments.table.weight': 'Weight',
  'investments.table.updated': 'Updated',
  'investments.table.actions': 'Actions',
  'investments.table.edit': 'Edit',
  'investments.table.delete': 'Delete',
  'investments.table.emptyTitle': "You don't have positions yet",
  'investments.table.emptySubtitle':
    'Add your first stock or ETF to start tracking your portfolio.',
  'investments.table.error': "We couldn't load your positions.",
  'investments.type.stock': 'Stock',
  'investments.type.etf': 'ETF',

  'investments.delete.title': 'Delete position',
  'investments.delete.message':
    'Are you sure you want to delete {symbol}? You can add it again anytime.',
  'investments.delete.confirm': 'Delete',

  'investments.locked.title': 'Investments is a Premium feature',
  'investments.locked.subtitle':
    'Build your U.S. stocks and ETF portfolio, track its value and get Wallter analysis.',
  'investments.locked.benefitsTitle': 'With Premium you get',

  'investments.form.createTitle': 'Add position',
  'investments.form.editTitle': 'Edit position',
  'investments.form.createDescription': 'Manually register a stock or ETF you already own.',
  'investments.form.editDescription': 'Update your position details.',
  'investments.form.symbol': 'Symbol',
  'investments.form.symbolSearchPlaceholder': 'Search by symbol or name (e.g. AAPL, Vanguard)',
  'investments.form.searching': 'Searching…',
  'investments.form.noResults': 'No results. Double-check the symbol.',
  'investments.form.selectedSymbol': 'Selected symbol',
  'investments.form.assetType': 'Asset type',
  'investments.form.quantity': 'Quantity',
  'investments.form.averageCost': 'Average cost (USD)',
  'investments.form.purchaseDate': 'Purchase date',
  'investments.form.notes': 'Notes',
  'investments.form.optional': 'Optional',
  'investments.form.cancel': 'Cancel',
  'investments.form.create': 'Add position',
  'investments.form.save': 'Save changes',
  'investments.form.symbolRequired': 'Select or type a valid symbol (e.g. AAPL).',
  'investments.form.quantityInvalid': 'Enter a quantity greater than 0.',
  'investments.form.averageCostInvalid': 'Enter an average cost of 0 or more.',
  'investments.form.purchaseDateInvalid': 'Invalid date (cannot be in the future).',
  'investments.form.notesTooLong': 'Maximum 500 characters.',
  'investments.warning.validationSkipped':
    'The market provider is unavailable; the symbol was saved without verification.',

  'investments.error.duplicate': 'You already have an active position for that symbol.',
  'investments.error.invalidSymbol': "The symbol is invalid or couldn't be resolved.",
  'investments.error.rateLimited': 'The data provider hit its limit. Try again in a few minutes.',
  'investments.error.marketUnavailable': 'Market data is not available right now.',
  'investments.error.premiumRequired': 'This feature requires the Premium Plan.',
  'investments.error.generic': 'Something went wrong. Please try again.',
};

export const translations: Record<Locale, Dictionary> = { es, en };
