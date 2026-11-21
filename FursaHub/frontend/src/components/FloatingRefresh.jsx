/**
 * Fixed bottom-left refresh button visible on every page inside the Layout.
 * Reloads the current route so users can pull fresh data without thinking
 * about which page they are on.
 */
export default function FloatingRefresh() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      title="Refresh this page"
      aria-label="Refresh this page"
      className="fixed left-md bottom-[88px] md:bottom-md z-40 w-12 h-12 rounded-full bg-primary text-on-primary shadow-lg shadow-primary/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center"
    >
      <span className="material-symbols-outlined">refresh</span>
    </button>
  );
}
