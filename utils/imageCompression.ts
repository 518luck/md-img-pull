import sharp from "sharp";
import ora from "ora";

/**
 * 📦 ora 库说明
 * ora = 一个优雅的终端 spinner（旋转动画）库
 * 名字来源：拉丁语，意为"祈祷"（等待时的祈祷 🙏）
 *
 * 常用 API：
 * - ora("文字").start()  → 开始显示 spinner
 * - spinner.text = "新文字"  → 更新显示文字
 * - spinner.succeed("成功")  → 显示 ✔ 并停止
 * - spinner.fail("失败")     → 显示 ✖ 并停止
 * - spinner.stop()           → 静默停止
 */

// 提取通用的 sharp 配置
const SHARP_OPTIONS = {
  animated: true,
  limitInputPixels: false,
  sequentialRead: true,
};
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

  const originalSize = (inputBuffer.length / 1024 / 1024).toFixed(2);

  // 创建 spinner 实例
  const spinner = ora({
    text: `压缩中: ${originalSize}MB → 转换为 WebP...`,
    // spinner 动画类型，可选值很多，如 'dots', 'line', 'arc', 'bouncingBar' 等
    spinner: "dots",
    color: "yellow",
  }).start();

  try {
    // 统一转 WebP (保持动画)
    let currentBuffer = await image.webp({ quality: 80, effort: 6 }).toBuffer();

    // --- 策略 1: 如果还是太大，缩小分辨率 ---
    if (currentBuffer.length > MAX_SIZE) {
      spinner.text = `压缩中: ${originalSize}MB → 缩小分辨率至 2560px...`;
      currentBuffer = await sharp(inputBuffer, SHARP_OPTIONS)
        .resize(2560, undefined, { withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();
    }

    // --- 策略 2: 极限压缩 (保底) ---
    if (currentBuffer.length > MAX_SIZE) {
      spinner.text = `压缩中: ${originalSize}MB → 极限压缩 (quality: 60)...`;
      currentBuffer = await sharp(currentBuffer, SHARP_OPTIONS)
        .webp({ quality: 60 })
        .toBuffer();
    }

    const finalSize = (currentBuffer.length / 1024 / 1024).toFixed(2);
    spinner.succeed(`压缩完成: ${originalSize}MB → ${finalSize}MB`);

    return currentBuffer;
  } catch (error) {
    spinner.fail(`压缩失败: ${error}`);
    throw error;
  }
}
