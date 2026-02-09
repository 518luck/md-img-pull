import sharp from "sharp";

// 提取通用的 sharp 配置
const SHARP_OPTIONS = {
  animated: true,
  limitInputPixels: false,
  sequentialRead: true,
};

/**
 * 将图片转换为 WebP 格式（不压缩，保持原始质量）
 * 用于小于 10MB 的图片，只做格式转换
 */
export async function convertToWebp(inputBuffer: Buffer): Promise<Buffer> {
  const image = sharp(inputBuffer, SHARP_OPTIONS);
  // 使用高质量设置转换为 WebP，保持原始效果
  return await image.webp({ quality: 80, effort: 6 }).toBuffer();
}

// 压缩图片函数：尽可能保留画质，同时确保体积在 10MB 以内
export async function compressImage(inputBuffer: Buffer): Promise<Buffer> {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  // 读取时始终尝试开启动画支持 如果是静态图，sharp 会自动忽略动画参数，这样写最通用
  const image = sharp(inputBuffer, SHARP_OPTIONS); // 原始切片 创建实例
  const meta = await image.metadata(); // 提取元数据

  // 如果原始文件已经小于 10MB，且不是为了统一格式，可以直接返回
  if (meta.size && meta.size <= MAX_SIZE) {
    return inputBuffer;
  }

  // 统一转 WebP (保持动画)
  let currentBuffer = await image.webp({ quality: 80, effort: 6 }).toBuffer();

  // --- 策略 1: 如果还是太大，缩小分辨率 ---
  if (currentBuffer.length > MAX_SIZE) {
    currentBuffer = await sharp(inputBuffer, SHARP_OPTIONS)
      .resize(2560, undefined, { withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
  }

  // --- 策略 2: 极限压缩 (保底) ---
  if (currentBuffer.length > MAX_SIZE) {
    currentBuffer = await sharp(currentBuffer, SHARP_OPTIONS)
      .webp({ quality: 60 })
      .toBuffer();
  }

  return currentBuffer;
}
