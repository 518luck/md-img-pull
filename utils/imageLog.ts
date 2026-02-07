import fs from "fs-extra";
import path from "path";

/**
 * 图片处理日志条目
 * @property markdownFile - 来源的 Markdown 文件名
 * @property originalUrl - 图片原始 URL
 * @property localPath - 本地保存路径（相对路径）
 * @property compressed - 是否经过压缩
 * @property originalSize - 原始大小（字节）
 * @property finalSize - 最终大小（字节）
 * @property status - 处理状态
 */
interface ImageLogEntry {
  markdownFile: string;
  originalUrl: string;
  localPath: string;
  compressed: boolean;
  originalSize: number;
  finalSize: number;
  status: "success" | "failed";
  error?: string;
}

/**
 * 图片日志管理器
 * 用于记录图片处理过程，最终输出到文件
 */
class ImageLogManager {
  private entries: ImageLogEntry[] = [];
  private currentMarkdownFile: string = "";

  /** 设置当前正在处理的 Markdown 文件名 */
  setCurrentFile(fileName: string): void {
    this.currentMarkdownFile = fileName;
  }

  /** 添加成功处理的日志条目 */
  addSuccess(
    originalUrl: string,
    localPath: string,
    originalSize: number,
    finalSize: number,
  ): void {
    this.entries.push({
      markdownFile: this.currentMarkdownFile,
      originalUrl,
      localPath,
      compressed: finalSize < originalSize,
      originalSize,
      finalSize,
      status: "success",
    });
  }

  /** 添加失败的日志条目 */
  addFailed(originalUrl: string, error: string): void {
    this.entries.push({
      markdownFile: this.currentMarkdownFile,
      originalUrl,
      localPath: "",
      compressed: false,
      originalSize: 0,
      finalSize: 0,
      status: "failed",
      error,
    });
  }

  /** 格式化文件大小为可读字符串 */
  private formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  }

  /** 将日志保存到文件 */
  async saveToFile(outputDir: string): Promise<void> {
    if (this.entries.length === 0) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logFileName = `image-log-${timestamp}.txt`;
    const logPath = path.join(outputDir, logFileName);

    // 构建日志内容
    const lines: string[] = [];
    lines.push("=" .repeat(60));
    lines.push("图片处理日志");
    lines.push(`生成时间: ${new Date().toLocaleString("zh-CN")}`);
    lines.push("=" .repeat(60));
    lines.push("");

    // 按 Markdown 文件分组
    const grouped = new Map<string, ImageLogEntry[]>();
    for (const entry of this.entries) {
      const key = entry.markdownFile || "未知文件";
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(entry);
    }

    // 输出每个文件的日志
    for (const [mdFile, entries] of grouped) {
      lines.push(`📄 ${mdFile}`);
      lines.push("-".repeat(40));

      for (const entry of entries) {
        if (entry.status === "success") {
          const sizeInfo = entry.compressed
            ? `${this.formatSize(entry.originalSize)} → ${this.formatSize(entry.finalSize)}`
            : this.formatSize(entry.finalSize);
          lines.push(`  ✅ ${entry.localPath}`);
          lines.push(`     原始: ${entry.originalUrl}`);
          lines.push(`     大小: ${sizeInfo}${entry.compressed ? " (已压缩)" : ""}`);
        } else {
          lines.push(`  ❌ 失败`);
          lines.push(`     原始: ${entry.originalUrl}`);
          lines.push(`     错误: ${entry.error}`);
        }
        lines.push("");
      }
    }

    // 统计信息
    const successCount = this.entries.filter((e) => e.status === "success").length;
    const failedCount = this.entries.filter((e) => e.status === "failed").length;
    const compressedCount = this.entries.filter((e) => e.compressed).length;

    lines.push("=".repeat(60));
    lines.push("统计信息");
    lines.push("=".repeat(60));
    lines.push(`总计: ${this.entries.length} 张图片`);
    lines.push(`成功: ${successCount} 张`);
    lines.push(`失败: ${failedCount} 张`);
    lines.push(`压缩: ${compressedCount} 张`);

    await fs.writeFile(logPath, lines.join("\n"), "utf-8");
  }

  /** 清空日志 */
  clear(): void {
    this.entries = [];
    this.currentMarkdownFile = "";
  }
}

/** 全局日志管理器实例 */
export const imageLog = new ImageLogManager();
