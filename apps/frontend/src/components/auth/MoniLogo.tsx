type MoniLogoProps = {
  className?: string;
};

export function MoniLogo({ className = '' }: MoniLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 shadow-lg shadow-indigo-500/25">
        <span className="text-xl font-black tracking-tighter text-white">M</span>
      </div>
      <span className="text-xl font-bold tracking-tight text-slate-950">MONI</span>
    </div>
  );
}
