import chalk from "chalk";
import ora, { type Ora } from "ora";

/**
 * 统一进度管理器 - 使用 ora（稳定版）
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
  private isCompressing = false;

  // 分区信息
  private partitionIndex = 1;
  private partitionSize = "0 B";

  // ora spinner
  private spinner: Ora | null = null;
  // 定时器（只用于更新时间）
  private timer: ReturnType<typeof setInterval> | null = null;

  /**
   * 初始化
   */
  init(_srcPath: string, distPath: string, totalFiles: number): void {
    this.totalFiles = totalFiles;
    this.completedFiles = 0;
    this.startTime = Date.now();

    console.log(chalk.blue.bold("▶ 目标目录: ") + chalk.gray(distPath));
    console.log("");
  }

  /**
   * 设置分区
   */
  setPartition(index: number, _path: string): void {
    this.partitionIndex = index;
  }

  /**
   * 设置分区大小
   */
  setPartitionSize(size: string): void {
    this.partitionSize = size;
  }

  /**
   * 开始处理文件
   */
  startFile(fileName: string, imageCount: number): void {
    this.currentFileName = fileName;
    this.downloadTotal = imageCount;
    this.downloadCompleted = 0;
    this.isCompressing = false;
    this.fileStartTime = Date.now();

    // 创建 spinner
    this.spinner = ora({
      text: this.getText(),
      spinner: "dots",
    }).start();

    // 每 500ms 更新一次时间
    this.timer = setInterval(() => {
      if (this.spinner) {
        this.spinner.text = this.getText();
      }
    }, 500);
  }

  /**
   * 更新下载进度
   */
  updateDownload(): void {
    this.downloadCompleted++;
    this.isCompressing = false;
    if (this.spinner) {
      this.spinner.text = this.getText();
    }
  }

  /**
   * 开始压缩
   */
  startCompress(): void {
    this.isCompressing = true;
    if (this.spinner) {
      this.spinner.text = this.getText();
    }
  }

  /**
   * 完成压缩
   */
  updateCompress(): void {
    this.isCompressing = false;
    if (this.spinner) {
      this.spinner.text = this.getText();
    }
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

    const time = this.formatTime(Date.now() - this.startTime);
    const bar = this.getBar(this.totalFiles, this.totalFiles);
    console.log(chalk.green("OK") + ` ${bar} ${this.completedFiles}/${this.totalFiles} | ${time}`);
    console.log("");
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private getText(): string {
    const bar = this.getBar(this.completedFiles, this.totalFiles);
    const time = this.formatTime(Date.now() - this.startTime);
    const fileTime = this.formatTime(Date.now() - this.fileStartTime);

    // 截断文件名
    let name = this.currentFileName;
    if (name.length > 25) {
      name = name.slice(0, 22) + "...";
    }

    // 状态
    let status = this.isCompressing
      ? "压缩中"
      : `↓${this.downloadCompleted}/${this.downloadTotal}`;

    return `${bar} ${this.completedFiles}/${this.totalFiles} | 分区${this.partitionIndex}(${this.partitionSize}) | ${name}(${fileTime}) | ${status} | ${time}`;
  }

  private getBar(cur: number, total: number): string {
    const w = 15;
    const f = total > 0 ? Math.round((cur / total) * w) : 0;
    return chalk.green("█".repeat(f)) + chalk.gray("░".repeat(w - f));
  }

  private formatTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m${s % 60}s`;
  }
}

export const progressManager = new ProgressManager();
