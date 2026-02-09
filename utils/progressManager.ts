import chalk from "chalk";
import ora, { type Ora } from "ora";
import { getFolderSize, formatSize } from "./getFolderSize";

/**
 * 统一进度管理器 - 单行紧凑风格
 *
 * 显示格式：
 * ▶ 原目录: c:\Users\zhang\Desktop\Three.js通关秘籍
 * ▶ 目标目录:c:\Users\zhang\Desktop\Three.js通关秘籍_localized
 *
 * ⠹ ░░░░░░░░░░░░░░░░░░░░ 0/243 | 分区1 (12.5MB) | 1. 开篇词.md | 下载 6/7 | 29s
 */
class ProgressManager {
  private totalFiles = 0;
  private completedFiles = 0;
  private startTime = 0;
  private fileStartTime = 0;

  // 当前文件状态
  private currentFileName = "";
  private downloadTotal = 0;
  private downloadCompleted = 0;
  private compressedCount = 0;
  private isCompressing = false; // 是否正在压缩

  // 分区信息
  private partitionIndex = 1;
  private partitionPath = "";
  private cachedPartitionSize = "0 B";

  // ora spinner 实例
  private spinner: Ora | null = null;
  // 定时器（用于实时更新时间）
  private timer: ReturnType<typeof setInterval> | null = null;

  /**
   * 初始化进度管理器
   */
  init(srcPath: string, distPath: string, totalFiles: number): void {
    this.totalFiles = totalFiles;
    this.completedFiles = 0;
    this.startTime = Date.now();

    // 打印固定的头部信息
    console.log(chalk.blue.bold("▶ 原目录: ") + chalk.gray(srcPath));
    console.log(chalk.blue.bold("▶ 目标目录:") + chalk.gray(distPath));
    console.log(""); // 空行
  }

  /**
   * 设置当前分区信息
   */
  setPartition(index: number, partitionPath: string): void {
    this.partitionIndex = index;
    this.partitionPath = partitionPath;
  }

  /**
   * 异步更新分区大小缓存
   */
  async updatePartitionSize(): Promise<void> {
    if (this.partitionPath) {
      const size = await getFolderSize(this.partitionPath);
      this.cachedPartitionSize = formatSize(size);
    }
  }

  /**
   * 开始处理一个新文件
   */
  startFile(fileName: string, imageCount: number): void {
    this.currentFileName = fileName;
    this.downloadTotal = imageCount;
    this.downloadCompleted = 0;
    this.compressedCount = 0;
    this.isCompressing = false;
    this.fileStartTime = Date.now();

    // 创建 spinner（单行显示）
    this.spinner = ora({
      text: this.formatText(),
      spinner: "dots",
    }).start();

    // 启动定时器，每 200ms 更新一次时间显示
    this.timer = setInterval(() => {
      this.updateDisplay();
    }, 200);
  }

  /**
   * 更新下载进度
   */
  updateDownload(): void {
    this.downloadCompleted++;
    this.isCompressing = false;
    this.updateDisplay();
  }

  /**
   * 开始压缩（设置压缩状态）
   */
  startCompress(): void {
    this.isCompressing = true;
    this.updateDisplay();
  }

  /**
   * 更新压缩计数
   */
  updateCompress(): void {
    this.compressedCount++;
    this.isCompressing = false;
    this.updateDisplay();
  }

  /**
   * 完成当前文件
   */
  completeFile(): void {
    this.completedFiles++;
    this.stopTimer();

    if (this.spinner) {
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
    const progressBar = this.createProgressBar(
      this.totalFiles,
      this.totalFiles,
    );
    console.log(
      chalk.green("OK") +
        ` ${progressBar} ${this.completedFiles}/${this.totalFiles} | 累计 ${totalTime}`,
    );
    console.log("");
  }

  /**
   * 更新显示（由定时器或事件触发）
   */
  private updateDisplay(): void {
    if (this.spinner) {
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
   * 格式化单行显示文本
   */
  private formatText(): string {
    const totalTime = this.formatTime(Date.now() - this.startTime);
    const fileTime = this.formatTime(Date.now() - this.fileStartTime);
    const progressBar = this.createProgressBar(
      this.completedFiles,
      this.totalFiles,
    );

    // 构建状态文本
    let status = "";
    if (this.isCompressing) {
      status = "压缩中";
    } else if (this.downloadTotal > 0) {
      status = `下载 ${this.downloadCompleted}/${this.downloadTotal}`;
    }

    // 组装单行文本
    let text = `${progressBar} ${this.completedFiles}/${this.totalFiles}`;
    text += ` | 分区${this.partitionIndex} (${this.cachedPartitionSize})`;
    text += ` | ${this.currentFileName}`;
    if (status) {
      text += ` | ${status}`;
    }
    if (this.compressedCount > 0) {
      text += ` | 已压缩 ${this.compressedCount}`;
    }
    text += ` | ${fileTime}`;
    text += chalk.gray(` | 累计 ${totalTime}`);

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
