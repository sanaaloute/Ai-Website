export default function LocaleLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-glow-cyan animate-spin" />
        </div>
        <p className="text-sm font-medium text-zinc-400">Loading…</p>
      </div>
    </div>
  );
}
