// 可以传入md5 极快,哈希值段 2.sha1 比md5慢,但更安全一般git管理版本用 3. sha256 更安全,但计算更慢 4. sha512 更安全,但计算更慢
import crypto from "crypto"; // node内置的加密模块
import * as path from "path"; // node内置的路径模块
import fs from "fs-extra"; // 扩展的fs模块
import axios from "axios"; // 网络请求模块
import type { Image } from "mdast";
import { compressImage } from "./imageCompression";
import {
  downloadSemaphore,
  LARGE_IMAGE_THRESHOLD,
  TOTAL_PERMITS,
} from "./Semaphore";
import { downloadProgress } from "./downloadProgress";
import { imageLog } from "./imageLog";

// 类型映射
const mimeMap: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

export async function downloadAndLocalize(node: Image, assetDir: string) {
  const currentUrl = node.url;
  if (!currentUrl) return;

  // 先获取 1 个槽位（普通并发）
  await downloadSemaphore.acquire(1);
  // 记录当前持有的槽位数，用于最后释放
  let heldPermits = 1;

  try {
    // 1. 生成基于 URL 的 MD5 文件名，防止重复
    const hash = crypto
      .createHash("md5") //传入加密算法
      .update(currentUrl) // 传入需要加密的字符串 可以传入多个update
      .digest("hex"); // 生成十六进制字符串

    //2.发起网络请求获取图片内容
    const response = await axios.get(currentUrl, {
      responseType: "arraybuffer",
      timeout: 10000,
    });

    // 3.从响应头获取真实图片信息
    const contentType = response.headers["content-type"];
    let finalExt = mimeMap[contentType];

    // 如果 Content-Type 没识别出来，走兜底逻辑
    if (!finalExt) {
      const rawPath = (currentUrl.split("?")[0] || "").split("#")[0];
      const rawExt = path.extname(rawPath || "");
      finalExt = rawExt === ".image" || !rawExt ? ".png" : rawExt;
    }

    // 检查是否压缩
    // Buffer.from() 的作用是将这些不同格式的二进制数据统一包装成 Node.js 的 Buffer 对象。
    let imageData = Buffer.from(response.data);
    const MAX_SIZE = 10 * 1024 * 1024;

    // [关键逻辑] 检测到大图时，获取额外槽位实现"独占"
    if (imageData.length > MAX_SIZE && contentType !== "image/svg+xml") {
      // 如果是超大图（>20MB），需要独占所有槽位
      if (imageData.length > LARGE_IMAGE_THRESHOLD) {
        // 额外获取 4 个槽位（已有 1 个，总共 5 个 = 独占）
        await downloadSemaphore.acquire(TOTAL_PERMITS - 1);
        heldPermits = TOTAL_PERMITS; // 现在持有 5 个槽位
      }

      imageData = await compressImage(imageData);
    }
    if (imageData.length !== response.data.byteLength) {
      finalExt = ".webp";
    }

    // 4. 组合文件名
    const fileName = `${hash}${finalExt}`;
    const localPath = path.join(assetDir, fileName);
    await fs.ensureDir(assetDir);

    // 5. 如果文件不存在则下载
    if (!(await fs.pathExists(localPath))) {
      await fs.writeFile(localPath, imageData);
    }

    // 6. 更新进度（使用 spinner 而不是 console.log）
    downloadProgress.complete(fileName);

    // 7. 记录日志
    const originalSize = response.data.byteLength;
    const finalSize = imageData.length;
    imageLog.addSuccess(
      currentUrl,
      `./assets/${fileName}`,
      originalSize,
      finalSize,
    );

    // 8. 修改 AST 节点的 URL 为相对路径
    node.url = `./assets/${fileName}`;
  } catch (err) {
    // 下载失败时也要更新进度
    downloadProgress.fail(node.url);
    // 记录失败日志（错误信息会保存到日志文件）
    imageLog.addFailed(node.url, String(err));
  } finally {
    // [关键] 无论成功还是失败，都要释放持有的槽位
    downloadSemaphore.release(heldPermits);
  }
}
