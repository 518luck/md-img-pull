// 可以传入md5 极快,哈希值段 2.sha1 比md5慢,但更安全一般git管理版本用 3. sha256 更安全,但计算更慢 4. sha512 更安全,但计算更慢
import crypto from "crypto"; // node内置的加密模块
import * as path from "path"; // node内置的路径模块
import fs from "fs-extra"; // 扩展的fs模块
import axios from "axios"; // 网络请求模块
import type { Image } from "mdast";
import { compressImage, convertToWebp } from "./imageCompression";
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
  "image/webp": ".webp",
};

export async function downloadAndLocalize(node: Image, assetDir: string) {
  const currentUrl = node.url;
  if (!currentUrl) return;

  // 预判图片大小，决定需要获取多少槽位（避免死锁）
  let requiredPermits = 1;
  try {
    const headResponse = await axios.head(currentUrl, { timeout: 5000 });
    const contentLength = parseInt(
      headResponse.headers["content-length"] || "0",
      10,
    );
    // 如果预判是超大图（>20MB），直接获取所有槽位
    if (contentLength > LARGE_IMAGE_THRESHOLD) {
      requiredPermits = TOTAL_PERMITS;
    }
  } catch {
    // HEAD 请求失败时使用默认值 1，后续下载后再判断
  }

  // 一次性获取所需槽位（避免死锁）
  await downloadSemaphore.acquire(requiredPermits);
  let heldPermits = requiredPermits;

  try {
    // 1. 生成基于 URL 的 MD5 文件名，防止重复
    const hash = crypto
      .createHash("md5") //传入加密算法
      .update(currentUrl) // 传入需要加密的字符串 可以传入多个update
      .digest("hex"); // 生成十六进制字符串

    //2.发起网络请求获取图片内容
    // 使用 AbortController 实现整体请求超时（包括下载时间）
    const controller = new AbortController();
    const downloadTimeout = 60000; // 60 秒整体超时
    const timeoutId = setTimeout(() => controller.abort(), downloadTimeout);

    let response;
    try {
      response = await axios.get(currentUrl, {
        responseType: "arraybuffer",
        timeout: 10000, // 连接超时 10 秒
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

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

    // 所有非 SVG 图片都转换为 webp 格式
    if (contentType !== "image/svg+xml") {
      if (imageData.length > MAX_SIZE) {
        // 大于 10MB 的图片：压缩并转换为 webp
        imageData = await compressImage(imageData);
      } else {
        // 小于等于 10MB 的图片：只转换格式为 webp，保持原始质量
        imageData = await convertToWebp(imageData);
      }
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
