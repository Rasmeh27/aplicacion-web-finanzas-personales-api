type SmartWalletLogoProps = {
  className?: string;
};

export function SmartWalletLogo({ className = '' }: SmartWalletLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 shadow-lg shadow-blue-500/25">
        <span className="text-xl font-black tracking-tighter text-white">W</span>
      </div>
      <span className="text-xl font-bold tracking-tight text-slate-950">SmartWallet</span>
    </div>
  );
}
