type StatsCallback = (stats: string) => void;

export class Backtester {
  private isRunning = false;
  private statsInterval: NodeJS.Timeout | null = null;
  private subscribers: Set<StatsCallback> = new Set();

  /**
   * Getter público para saber si el backtester está corriendo
   */
  public get running(): boolean {
    return this.isRunning;
  }

  /**
   * Inicia el backtester
   */
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    // Emite stats cada 1 segundo
    this.statsInterval = setInterval(() => {
      const stats = this.generateStats();

      for (const subscriber of this.subscribers) {
        subscriber(stats);
      }
    }, 1000);
  }

  /**
   * Detiene el backtester
   */
  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  /**
   * Subscripción a estadísticas
   * Retorna función unsubscribe
   */
  public stats(callback: StatsCallback): () => void {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Genera estadísticas mock
   */
  private generateStats(): string {
    return `Backtest running at ${new Date().toISOString()}`;
  }
}