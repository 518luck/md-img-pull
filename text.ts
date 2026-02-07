// 1. 现有的并发限制（处理下载）
const downloadLimit = pLimit(5);

// 2. 定义一个全局独占锁（用于处理超大图片压缩）
let bigImageLock = Promise.resolve();

export async function downloadAndLocalize(node: Image, assetDir: string) {
  const currentUrl = node.url;
  if (!currentUrl) return;

  try {
    // 使用 downloadLimit 保证下载是 5 并发
    const response = await downloadLimit(async () => {
      return await axios.get(currentUrl, {
        responseType: "arraybuffer",
        timeout: 10000,
      });
    });

    let imageData = Buffer.from(response.data);
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    // 检查是否需要压缩
    if (imageData.length > MAX_SIZE && contentType !== "image/svg+xml") {
      // 💡 核心逻辑：大图独占锁
      // 当进入这个代码块时，任务会在这里排队，确保同一时间只有一个 bigImageLock 在运行
      imageData = await (bigImageLock = bigImageLock.then(async () => {
        console.log(
          `[独占模式] 正在处理超大图片 (${(imageData.length / 1024 / 1024).toFixed(2)}MB): ${path.basename(currentUrl)}`,
        );
        return await compressImage(imageData);
      }));
    }

    // ... 后续保存逻辑保持不变 ...
  } catch (err) {
    console.error(`失败: ${node.url}`, err);
  }
}
