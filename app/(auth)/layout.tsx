export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-brand-600">
            {process.env.NEXT_PUBLIC_SITE_NAME ?? "Qlippo"}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Discover photos, articles, and videos.
          </p>
        </div>
        <div className="rounded-xl2 border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {children}
        </div>
      </div>
    </div>
  );
}
