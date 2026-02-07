import sharp from "sharp";

// 压缩图片函数：尽可能保留画质，同时确保体积在 10MB 以内
export async function compressImage(inputBuffer: Buffer): Promise<Buffer> {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  // 读取时始终尝试开启动画支持 如果是静态图，sharp 会自动忽略动画参数，这样写最通用
  const image = sharp(inputBuffer, { animated: true }); // 原始切片 创建实例
  const meta = await image.metadata(); // 提取元数据

  // 如果原始文件已经小于 10MB，且不是为了统一格式，可以直接返回
  if (meta.size && meta.size <= MAX_SIZE) {
    return inputBuffer;
  }

  console.log(
    `⚖️ 处理大图 (${(meta.size! / 1024 / 1024).toFixed(2)}MB)，格式: ${meta.format}`,
  );

  // 统一转 WebP (保持动画)
  let currentBuffer = await image.webp({ quality: 80, effort: 6 }).toBuffer();

  // --- 策略 1: 如果还是太大，缩小分辨率 ---
  // 很多 50MB 的图是因为分辨率达到了 8K，其实网页显示只需要 2K 左右
  if (currentBuffer.length > MAX_SIZE) {
    console.log("⚠️ WebP 转换后仍超标，开始缩小分辨率...");
    currentBuffer = await sharp(inputBuffer, { animated: true })
      .resize(2560, undefined, { withoutEnlargement: true }) // 限制最大宽度 2560px
      .webp({ quality: 75 })
      .toBuffer();
  }

  // --- 策略 3: 极限压缩 (保底) ---
  if (currentBuffer.length > MAX_SIZE) {
    console.log("🚨 极端大图，进行强力质量压缩...");
    currentBuffer = await sharp(currentBuffer, { animated: true })
      .webp({ quality: 60 }) // 50-60 是画质可接受的底线
      .toBuffer();
  }

  console.log(
    `✨ 压缩完成: ${(currentBuffer.length / 1024 / 1024).toFixed(2)}MB`,
  );
  return currentBuffer;
}
