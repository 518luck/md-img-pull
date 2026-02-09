import fs from "fs-extra";
import path from "path";

/**
 * 递归计算文件夹的总大小（字节）
 */
export async function getFolderSize(folderPath: string): Promise<number> {
  //初始化累加器
  let totalSize = 0;

  // 使用 fs-extra 的异步方法检查路径是否存在，不存在直接返回 0，防止程序因路径错误崩溃。
  if (!(await fs.pathExists(folderPath))) {
    return 0;
  }

  // 获取该目录下所有文件和子文件夹的名称列表（返回数组） 无论你的文件夹嵌套得有多深，fs.readdir 永远只返回一个一维的字符串数组。
  const items = await fs.readdir(folderPath);

  for (const item of items) {
    const itemPath = path.join(folderPath, item);
    // 文件属性对象返回一个 Stats 对象，包含文件或目录的元数据，如大小、修改时间等。
    const stats = await fs.stat(itemPath);

    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      totalSize += await getFolderSize(itemPath);
    }
  }

  return totalSize;
}

/**
 * 格式化文件大小为可读字符串
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
