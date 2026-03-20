export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.LAC_LOCAL_DIR) {
    const { startLacWatcher } = await import('./lib/lac-watcher')
    await startLacWatcher(process.env.LAC_LOCAL_DIR)
  }
}
