import chalk from "chalk";

/**
 * 统一进度管理器
 *
 * 显示格式：
 * ▶ 原目录:  c:\Users\zhang\Desktop\React通关秘籍
 * ▶ 目标目录: c:\Users\zhang\Desktop\React通关秘籍_localized
 *
 * ████████████░░░░░░░░ 3/5 | 累计 1m47s
 * [当前] Hooks.md | 下载 8/12 | 压缩 2 | 23s
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

  // 控制台行数（用于清除）
  private lastLineCount = 0;

  /**
   * 初始化进度管理器
   */
  init(srcPath: string, distPath: string, totalFiles: number): void {
    this.srcPath = srcPath;
    this.distPath = distPath;
    this.totalFiles = totalFiles;
    this.completedFiles = 0;
    this.startTime = Date.now();
    this.lastLineCount = 0;

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
    this.render();
  }

  /**
   * 更新下载进度
   */
  updateDownload(): void {
    this.downloadCompleted++;
    this.render();
  }

  /**
   * 更新压缩计数
   */
  updateCompress(): void {
    this.compressedCount++;
    this.render();
  }

  /**
   * 完成当前文件
   */
  completeFile(): void {
    this.completedFiles++;
    this.clearLines();
  }

  /**
   * 全部完成
   */
  finish(): void {
    this.clearLines();
    const totalTime = this.formatTime(Date.now() - this.startTime);
    console.log(
      this.createProgressBar(this.totalFiles, this.totalFiles) +
        ` ${this.completedFiles}/${this.totalFiles} | 累计 ${totalTime}`,
    );
    console.log("");
  }

  /**
   * 渲染进度显示
   */
  private render(): void {
    this.clearLines();

    const totalTime = this.formatTime(Date.now() - this.startTime);
    const fileTime = this.formatTime(Date.now() - this.fileStartTime);

    // 总进度行
    const progressBar = this.createProgressBar(
      this.completedFiles,
      this.totalFiles,
    );
    const progressLine = `${progressBar} ${this.completedFiles}/${this.totalFiles} | 累计 ${totalTime}`;

    // 当前文件行
    let currentLine = `[当前] ${this.currentFileName}`;
    if (this.downloadTotal > 0) {
      currentLine += ` | 下载 ${this.downloadCompleted}/${this.downloadTotal}`;
    }
    if (this.compressedCount > 0) {
      currentLine += ` | 压缩 ${this.compressedCount}`;
    }
    currentLine += ` | ${fileTime}`;

    // 输出
    console.log(progressLine);
    console.log(currentLine);
    this.lastLineCount = 2;
  }

  /**
   * 清除之前输出的行
   */
  private clearLines(): void {
    if (this.lastLineCount > 0) {
      // 移动光标到上面 N 行，然后清除到屏幕底部
      process.stdout.write(`\x1b[${this.lastLineCount}A\x1b[0J`);
      this.lastLineCount = 0;
    }
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