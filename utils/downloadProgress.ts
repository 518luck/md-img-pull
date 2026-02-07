import ora, { type Ora } from "ora";

/**
 * 下载进度管理器
 *
 * 📦 作用：
 * 管理全局的下载 spinner，避免并发下载时打印大量 "已下载" 消息
 * 所有下载任务共享同一个 spinner，只显示一行动态更新的状态
 *
 * 📝 TypeScript 知识点：
 * - type Ora 是 ora 库导出的类型，表示 spinner 实例的类型
 * - import type { Ora } from "ora" 只导入类型，不导入运行时代码
 */
class DownloadProgressManager {
  private spinner: Ora | null = null;
  private totalCount = 0; // 总图片数
  private completedCount = 0; // 已完成数
  private currentFile = ""; // 当前正在处理的文件
  private isPaused = false; // 是否暂停（用于压缩时暂停下载 spinner）

  /**
   * 开始下载任务
   * @param total 总图片数量
   */
  start(total: number): void {
    this.totalCount = total;
    this.completedCount = 0;
    this.currentFile = "";
    this.isPaused = false;

    if (total === 0) return;

    this.spinner = ora({
      text: this.formatText(),
      spinner: "dots",
      color: "cyan",
    }).start();
  }

  /**
   * 更新当前正在下载的文件名
   */
  updateCurrent(fileName: string): void {
    this.currentFile = fileName;
    if (this.spinner && !this.isPaused) {
      this.spinner.text = this.formatText();
    }
  }

  /**
   * 标记一个文件下载完成
   */
  complete(fileName: string): void {
    this.completedCount++;
    this.currentFile = fileName;
    if (this.spinner && !this.isPaused) {
      this.spinner.text = this.formatText();
    }
  }

  /**
   * 标记一个文件下载失败
   */
  fail(fileName: string): void {
    // 失败也算完成（只是失败了）
    this.completedCount++;
    if (this.spinner && !this.isPaused) {
      this.spinner.text = this.formatText();
    }
  }

  /**
   * 暂停 spinner（用于压缩时避免干扰）
   */
  pause(): void {
    if (this.spinner && !this.isPaused) {
      this.spinner.stop();
      this.isPaused = true;
    }
  }

  /**
   * 恢复 spinner
   */
  resume(): void {
    if (this.spinner && this.isPaused) {
      this.spinner.start();
      this.spinner.text = this.formatText();
      this.isPaused = false;
    }
  }

  /**
   * 结束下载任务
   */
  finish(): void {
    if (this.spinner) {
      if (this.completedCount > 0) {
        this.spinner.succeed(`下载完成: ${this.completedCount}/${this.totalCount} 张图片`);
      } else {
        this.spinner.stop();
      }
      this.spinner = null;
    }
  }

  /**
   * 格式化显示文本
   */
  private formatText(): string {
    const progress = `${this.completedCount}/${this.totalCount}`;
    if (this.currentFile) {
      return `下载中 [${progress}]: ${this.currentFile}`;
    }
    return `下载中 [${progress}]...`;
  }
}

// 导出全局单例
export const downloadProgress = new DownloadProgressManager();
