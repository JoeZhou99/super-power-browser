export function normalizeExecutionTimeout(value) {
  const minutes = Number(value);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 120 ? minutes : 10;
}

export async function withExecutionTimeout(execute, timeoutMs, onTimeout = () => {}) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(execute),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`执行超时（${Math.round(timeoutMs / 60000)} 分钟），已请求停止，请检查连接或调整任务超时。`));
          Promise.resolve().then(onTimeout).catch(() => {});
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
