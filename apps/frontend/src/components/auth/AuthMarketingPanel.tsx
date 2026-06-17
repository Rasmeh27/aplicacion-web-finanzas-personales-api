import { ArrowLeftRight, BarChart3, CreditCard, Gauge, PiggyBank, Target } from 'lucide-react';

type AuthMarketingPanelProps = {
  title: string;
  variant?: 'login' | 'register';
};

const menuItems = [
  { label: 'Dashboard', icon: Gauge, active: true },
  { label: 'Transactions', icon: ArrowLeftRight },
  { label: 'Budgets', icon: PiggyBank },
  { label: 'Goals', icon: Target },
  { label: 'Debts', icon: CreditCard },
  { label: 'Reports', icon: BarChart3 },
];

export function AuthMarketingPanel({ title, variant = 'login' }: AuthMarketingPanelProps) {
  return (
    <aside className="relative hidden overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-10 text-white shadow-2xl shadow-blue-700/25 lg:flex lg:min-h-[760px] lg:flex-col">
      <div className="absolute inset-x-0 bottom-0 h-64 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_45%),linear-gradient(135deg,rgba(255,255,255,0.22),transparent_50%)]" />
      <div className="absolute -right-24 top-28 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-28 left-16 h-80 w-80 rounded-full bg-cyan-200/20 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-sm pt-10 text-center">
        <h2 className="text-4xl font-bold leading-tight tracking-tight">{title}</h2>
        <div className="mt-8 flex justify-center gap-2">
          <span className="h-2.5 w-8 rounded-full bg-white" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/35" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/35" />
        </div>
      </div>

      <div className="relative z-10 mt-auto translate-x-6 rounded-[2rem] border border-white/30 bg-white/95 p-4 text-slate-950 shadow-2xl shadow-blue-950/30 backdrop-blur-xl">
        <div className="grid grid-cols-[180px_1fr] overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white">
          <div className="border-r border-slate-100 bg-slate-50/70 p-5">
            <div className="mb-8 flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-center text-sm font-black leading-7 text-white">W</div>
              <span className="text-sm font-bold">SmartWallet</span>
            </div>
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-xs font-semibold ${
                      item.active ? 'bg-blue-50 text-blue-700' : 'text-slate-500'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="min-w-[330px] p-6">
            <h3 className="text-2xl font-bold tracking-tight">Dashboard</h3>

            <div className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-xl shadow-slate-950/5">
              <p className="text-xs font-semibold text-slate-500">Total Balance</p>
              <div className="mt-2 flex items-end justify-between gap-5">
                <div>
                  <p className="text-3xl font-bold">$24,560.75</p>
                  <p className="mt-1 text-xs font-bold text-emerald-600">+ 8.4%</p>
                </div>
                <svg viewBox="0 0 120 56" className="h-16 w-32" aria-hidden="true">
                  <path d="M4 46 C22 14 36 54 54 28 C72 2 82 28 94 16 C104 6 112 8 118 3" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="text-blue-600" />
                </svg>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-xl shadow-slate-950/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">{variant === 'register' ? 'Savings Goal' : 'Spending This Month'}</p>
                  <p className="mt-2 text-2xl font-bold">{variant === 'register' ? '$8,240.00' : '$3,672.50'}</p>
                  <p className="text-xs text-slate-400">{variant === 'register' ? 'of $12,000 target' : 'of $6,000 budget'}</p>
                </div>
                <div className="grid h-20 w-20 place-items-center rounded-full bg-[conic-gradient(#2563eb_0_61%,#22c55e_61%_82%,#facc15_82%_100%)]">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-xs font-bold">61%</div>
                </div>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[61%] rounded-full bg-blue-600" />
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-xl shadow-slate-950/5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Recent Transactions</p>
                <span className="text-xs font-bold text-blue-600">View all</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">Grocery Store</span>
                  <span className="font-bold">-$68.24</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">Coffee</span>
                  <span className="font-bold">-$5.75</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
