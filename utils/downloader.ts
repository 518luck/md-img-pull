// 可以传入md5 极快,哈希值段 2.sha1 比md5慢,但更安全一般git管理版本用 3. sha256 更安全,但计算更慢 4. sha512 更安全,但计算更慢
import crypto from "crypto"; // node内置的加密模块
import * as path from "path"; // node内置的路径模块
import fs from "fs-extra"; // 扩展的fs模块
import axios from "axios"; // 网络请求模块
import type { Image } from "mdast";
import { compressImage } from "./imageCompression.ts";

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
    if (imageData.length > MAX_SIZE && contentType !== "image/svg+xml") {
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
      console.log(`已下载: ${fileName}`);
    }

    // 6. 修改 AST 节点的 URL 为相对路径
    node.url = `./assets/${fileName}`;
  } catch (err) {
    console.error(`下载失败: ${node.url}`, err);
  }
}
