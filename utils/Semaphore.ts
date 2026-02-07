/**
 * 信号量（Semaphore）实现
 *
 * 📦 什么是信号量？
 * 信号量是一种并发控制机制，可以限制同时访问某个资源的数量。
 * 类似于停车场：有 N 个车位，满了就要等待。
 *
 * 🔑 核心概念：
 * - permits（许可数）：可用的"槽位"数量
 * - acquire（获取）：占用指定数量的槽位，如果不够则等待
 * - release（释放）：归还槽位，让等待的任务可以继续
 *
 * 💡 与 pLimit 的区别：
 * - pLimit(5) 每个任务固定占用 1 个槽位
 * - Semaphore 可以让不同任务占用不同数量的槽位
 * - 大图可以 acquire(5) 独占所有槽位，普通图片 acquire(1) 只占 1 个
 */
export class Semaphore {
  private permits: number; // 当前可用的许可数
  private readonly maxPermits: number; // 最大许可数（用于调试）
  private waiting: Array<{ resolve: () => void; required: number }> = []; // 等待队列

  constructor(permits: number) {
    this.permits = permits;
    this.maxPermits = permits;
  }

  /**
   * 获取指定数量的许可
   * @param count 需要获取的许可数量，默认为 1
   *
   * 📝 TypeScript 知识点：
   * - Promise<void> 表示这是一个异步函数，完成时不返回值
   * - async/await 是处理异步操作的语法糖
   */
  async acquire(count: number = 1): Promise<void> {
    // 如果当前许可数足够，直接扣除并返回
    if (this.permits >= count) {
      this.permits -= count;
      return;
    }

    // 许可数不够，加入等待队列
    // 关键理解：这个 Promise 不会立即 resolve，而是把 resolve 函数存起来，等到有许可时再调用它。
    return new Promise<void>((resolve) => {
      this.waiting.push({ resolve, required: count });
    });
  }

  /**
   * 释放指定数量的许可
   * @param count 要释放的许可数量，默认为 1
   */
  release(count: number = 1): void {
    this.permits += count;

    // 尝试唤醒等待队列中的任务
    this.tryWakeUp();
  }

  /**
   * 尝试唤醒等待队列中的任务
   * 按 FIFO（先进先出）顺序处理
   */
  private tryWakeUp(): void {
    while (this.waiting.length > 0) {
      // 使用 ! 非空断言，因为我们已经检查了 length > 0
      // 📝 TypeScript 知识点：! 是非空断言操作符，告诉编译器"我确定这个值不是 null/undefined"
      const first = this.waiting[0]!;

      // 如果当前许可数足够满足队首任务的需求
      if (this.permits >= first.required) {
        this.permits -= first.required;
        this.waiting.shift(); // 从队列中移除
        first.resolve(); // 唤醒该任务
      } else {
        // 许可数不够，停止处理（保持 FIFO 顺序）
        break;
      }
    }
  }

  /**
   * 获取当前可用的许可数（用于调试）
   */
  get available(): number {
    return this.permits;
  }
}

// 创建一个全局共享的信号量实例，总共 5 个槽位
export const downloadSemaphore = new Semaphore(5);

/**
 * 大图阈值：超过此大小的图片会独占所有槽位
 * 20MB = 20 * 1024 * 1024 字节
 */
export const LARGE_IMAGE_THRESHOLD = 20 * 1024 * 1024;

/**
 * 总槽位数：用于大图独占时获取所有槽位
 */
export const TOTAL_PERMITS = 5;
