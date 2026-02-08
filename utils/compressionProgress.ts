import ora, { type Ora } from "ora";
import { downloadProgress } from "./downloadProgress";

/**
 * 压缩进度管理器
 *
 * 📦 作用：
 * 管理全局的压缩 spinner，避免多个大图同时压缩时创建多个 spinner
 * 使用队列机制，确保同一时间只有一个压缩任务显示 spinner
 */
class CompressionProgressManager {
  private spinner: Ora | null = null;
  private activeCount = 0; // 当前正在压缩的任务数
  private currentTask = ""; // 当前显示的任务信息

  /**
   * 开始一个压缩任务
   * @param taskInfo 任务信息（如 "10.81MB → 转换为 WebP"）
   * @returns 更新函数，用于更新当前任务的进度
   */
  start(taskInfo: string): (newInfo: string) => void {
    this.activeCount++;

    // 如果是第一个压缩任务，暂停下载 spinner 并创建压缩 spinner
    if (this.activeCount === 1) {
      downloadProgress.pause();
      this.currentTask = taskInfo;
      this.spinner = ora({
        text: `压缩中: ${taskInfo}`,
        spinner: "dots",
        color: "yellow",
      }).start();
    }

    // 返回更新函数
    const updateFn = (newInfo: string) => {
      if (this.spinner && this.currentTask === taskInfo) {
        this.currentTask = newInfo;
        this.spinner.text = `压缩中: ${newInfo}`;
      }
    };

    return updateFn;
  }

  /**
   * 完成一个压缩任务
   * @param successMsg 成功消息
   */
  complete(successMsg: string): void {
    this.activeCount--;

    // 如果是最后一个压缩任务，显示成功并恢复下载 spinner
    if (this.activeCount === 0 && this.spinner) {
      this.spinner.succeed(successMsg);
      this.spinner = null;
      downloadProgress.resume();
    }
  }

  /**
   * 压缩任务失败
   * @param errorMsg 错误消息
   */
  fail(errorMsg: string): void {
    this.activeCount--;

    // 如果是最后一个压缩任务，显示失败并恢复下载 spinner
    if (this.activeCount === 0 && this.spinner) {
      this.spinner.fail(errorMsg);
      this.spinner = null;
      downloadProgress.resume();
    }
  }
}

// 导出全局单例
export const compressionProgress = new CompressionProgressManager();
