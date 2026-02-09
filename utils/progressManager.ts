import chalk from "chalk";
import ora, { type Ora } from "ora";

/**
 * 统一进度管理器
 *
 * 显示格式：
 * ▶ 原目录:  c:\Users\zhang\Desktop\React通关秘籍
 * ▶ 目标目录: c:\Users\zhang\Desktop\React通关秘籍_localized
 *
 * ████████████░░░░░░░░ 3/5 | 累计 1m47s
 * ◐ Hooks.md | 下载 8/12 | 压缩 2 | 23s
 */
class ProgressManager {
  private srcPath = "";
  private distPath = "";
  private totalFiles = 0;
  private completedFiles = 0;
  private startTime = 0;
  private fileStartTime = 0;

  // 当前文件状态
  private currentFileName = "";
  private downloadTotal = 0;
  private downloadCompleted = 0;
  private compressedCount = 0;

  // ora spinner 实例
  private spinner: Ora | null = null;
  // 定时器（用于实时更新时间）
  private timer: ReturnType<typeof setInterval> | null = null;

  /**
   * 初始化进度管理器
   */
  init(srcPath: string, distPath: string, totalFiles: number): void {
    this.srcPath = srcPath;
    this.distPath = distPath;
    this.totalFiles = totalFiles;
    this.completedFiles = 0;
    this.startTime = Date.now();

    // 打印固定的头部信息
    console.log(chalk.blue.bold("▶ 原目录: ") + chalk.gray(this.srcPath));
    console.log(chalk.blue.bold("▶ 目标目录:") + chalk.gray(this.distPath));
    console.log(""); // 空行
  }

  /**
   * 开始处理一个新文件
   */
  startFile(fileName: string, imageCount: number): void {
    this.currentFileName = fileName;
    this.downloadTotal = imageCount;
    this.downloadCompleted = 0;
    this.compressedCount = 0;
    this.fileStartTime = Date.now();

    // 创建 spinner
    this.spinner = ora({
      text: this.formatText(),
      spinner: "dots",
      prefixText: this.formatProgressBar(),
    }).start();

    // 启动定时器，每 100ms 更新一次时间显示
    this.timer = setInterval(() => {
      this.updateDisplay();
    }, 100);
  }

  /**
   * 更新下载进度
   */
  updateDownload(): void {
    this.downloadCompleted++;
    this.updateDisplay();
  }

  /**
   * 更新压缩计数
   */
  updateCompress(): void {
    this.compressedCount++;
    this.updateDisplay();
  }

  /**
   * 完成当前文件
   */
  completeFile(): void {
    this.completedFiles++;
    this.stopTimer();

    if (this.spinner) {
      // 清除当前行，不显示完成信息
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * 全部完成
   */
  finish(): void {
    this.stopTimer();

    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }

    const totalTime = this.formatTime(Date.now() - this.startTime);
    console.log(
      this.createProgressBar(this.totalFiles, this.totalFiles) +
        ` ${this.completedFiles}/${this.totalFiles} | 累计 ${totalTime}`,
    );
    console.log("");
  }

  /**
   * 更新显示（由定时器或事件触发）
   */
  private updateDisplay(): void {
    if (this.spinner) {
      this.spinner.prefixText = this.formatProgressBar();
      this.spinner.text = this.formatText();
    }
  }

  /**
   * 停止定时器
   */
  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 格式化进度条行
   */
  private formatProgressBar(): string {
    const totalTime = this.formatTime(Date.now() - this.startTime);
    const progressBar = this.createProgressBar(
      this.completedFiles,
      this.totalFiles,
    );
    return `${progressBar} ${this.completedFiles}/${this.totalFiles} | 累计 ${totalTime}\n`;
  }

  /**
   * 格式化当前文件行
   */
  private formatText(): string {
    const fileTime = this.formatTime(Date.now() - this.fileStartTime);

    let text = this.currentFileName;
    if (this.downloadTotal > 0) {
      text += ` | 下载 ${this.downloadCompleted}/${this.downloadTotal}`;
    }
    if (this.compressedCount > 0) {
      text += ` | 压缩 ${this.compressedCount}`;
    }
    text += ` | ${fileTime}`;

    return text;
  }

  /**
   * 创建进度条
   */
  private createProgressBar(current: number, total: number): string {
    const width = 20;
    const filled = total > 0 ? Math.round((current / total) * width) : 0;
    const empty = width - filled;
    return chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(empty));
  }

  /**
   * 格式化时间
   */
  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m${remainingSeconds}s`;
  }
}

// 导出全局单例
export const progressManager = new ProgressManager();