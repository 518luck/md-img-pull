import ora from "ora";

/**
 * 演示 ora spinner 的不同颜色
 *
 * ora 的 color 选项可以设置 spinner 的颜色
 * 类型: 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray'
 */

const colors = [
  "black", // 黑色（在深色终端可能看不清）
  "red", // 红色
  "green", // 绿色
  "yellow", // 黄色
  "blue", // 蓝色
  "magenta", // 洋红色/品红色
  "cyan", // 青色
  "white", // 白色
  "gray", // 灰色
] as const;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function demo() {
  console.log("🎨 ora spinner 颜色演示\n");

  for (const color of colors) {
    const spinner = ora({
      text: `这是 ${color} 颜色的 spinner`,
      color: color,
      spinner: "dots",
    }).start();

    await sleep(1500); // 每个颜色展示 1.5 秒
    spinner.succeed(`${color} 颜色演示完成`);
  }

  console.log("\n✨ 所有颜色演示完成！");
}

demo();
