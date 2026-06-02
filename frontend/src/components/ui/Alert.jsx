export function Alert({ type = 'error', message }) {
  if (!message) return null;
  const styles = {
    error: 'bg-red-500/10 border-red-500/50 text-red-300',
    success: 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300',
    info: 'bg-brand-500/10 border-brand-500/50 text-brand-200',
  };
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>
      {message}
    </div>
  );
}
