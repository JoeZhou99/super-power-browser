export class ExecutionQueue {
  private active = new Set<QueueEntry>();
  private pending: QueueEntry[] = [];
  private limit = 2;

  acquire({ limit = 2, signal }: { limit?: number; signal?: AbortSignal } = {}): Promise<
    () => void
  > {
    this.limit = Number.isInteger(Number(limit)) && limit >= 1 && limit <= 8 ? Number(limit) : 2;
    return new Promise((resolve, reject) => {
      const entry: QueueEntry = { resolve, signal, cancel: () => {} };
      entry.cancel = () => {
        this.pending = this.pending.filter((item) => item !== entry);
        signal?.removeEventListener("abort", entry.cancel);
        reject(new Error("Task cancelled"));
        this.drain();
      };
      if (signal?.aborted) return entry.cancel();
      signal?.addEventListener("abort", entry.cancel, { once: true });
      this.pending.push(entry);
      this.drain();
    });
  }

  private drain() {
    while (this.pending.length && this.active.size < this.limit) {
      const entry = this.pending.shift()!;
      entry.signal?.removeEventListener("abort", entry.cancel);
      this.active.add(entry);
      let released = false;
      entry.resolve(() => {
        if (released) return;
        released = true;
        this.active.delete(entry);
        this.drain();
      });
    }
  }
}

interface QueueEntry {
  resolve: (_release: () => void) => void;
  signal?: AbortSignal;
  cancel: () => void;
}
