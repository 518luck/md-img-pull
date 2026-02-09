import path from "path";
import { getFilesRecursive } from "./utils/getFilesRecursive";
import { processSingleMarkdown } from "./utils/processSingleMarkdown";
import * as readline from "node:readline/promises"; // 用于从命令行读取输入
import fs from "fs-extra"; // 用于文件操作，如检查路径是否存在
import { stdin as input, stdout as output } from "node:process"; // 用于从命令行读取输入和输出
import chalk from "chalk";
import { imageLog } from "./utils/imageLog";
import { getFolderSize, formatSize } from "./utils/getFolderSize";
import { progressManager } from "./utils/progressManager";
const log = console.log;

// 分区大小限制（50MB）
const PARTITION_SIZE_LIMIT = 50 * 1024 * 1024;

async function runBatch() {
  // 获取命令行参数。process.argv[0]是node程序，[1]是脚本文件，[2]才是你输入的路径
  const rl = readline.createInterface({ input, output });

  try {
    const sourceDir = await rl.question(
      chalk.cyan.bold("请输入或粘贴需要处理的源文件夹路径: "),
    );

    // 如果用户没输路径，打印用法提示并强行退出程序
    if (!sourceDir || sourceDir.trim() === "") {
      log(chalk.red.bold("\n错误：路径不能为空！"));
      return;
    }
    // 将相对路径（如 ./img）转为绝对路径（如 C:\Users\Desktop\img）
    // replace 是为了防止用户粘贴路径时带了双引号
    const srcAbsPath = path.resolve(
      sourceDir.trim().replace(/^['"]|['"]$/g, ""),
    );
    // 定义目标文件夹（在同级目录下生成 path_localized）
    const distAbsPath = `${srcAbsPath}_localized`;

    if (await fs.pathExists(distAbsPath)) {
      log(
        chalk.bgYellow.black.bold(`\n ⚠️  警报 `) +
          chalk.yellow(` 目标目录 [${path.basename(distAbsPath)}] 已存在。`),
      );

      // 2. 交互式询问
      const answer = await rl.question(
        chalk.white("目录已存在，继续操作可能会覆盖同名文件。是否继续? (") +
          chalk.green.bold("y") +
          "/" +
          chalk.red("n") +
          "): ",
      );

      // 3. 处理用户输入
      const processedAnswer = answer.trim().toLowerCase();
      const isConfirmed =
        processedAnswer === "y" ||
        processedAnswer === "yes" ||
        processedAnswer === "";

      if (!isConfirmed) {
        log(chalk.red.italic("\n已取消操作，程序退出。"));
        rl.close();
        return;
      }

      log(chalk.blue("继续执行，正在更新目标目录..."));
    }

    const stats = await fs.stat(srcAbsPath);
    let mdFiles: string[] = [];
    let finalDistAbsPath = distAbsPath;
    // 2. 判断输入类型
    if (stats.isFile()) {
      // 如果是文件，直接放入数组（前提是 .md）
      if (srcAbsPath.endsWith(".md")) {
        mdFiles = [srcAbsPath];
        const fileName = path.basename(srcAbsPath, ".md");
        finalDistAbsPath = path.join(
          path.dirname(srcAbsPath),
          `${fileName}_localized`,
        );
      } else {
        log(chalk.red.bold("\n错误：所选文件不是 Markdown 格式！"));
        return;
      }
    } else {
      // 如果是文件夹，调用你写的递归函数
      const allFiles = await getFilesRecursive(srcAbsPath);
      mdFiles = allFiles.filter((f) => f.endsWith(".md"));
    }

    // 初始化进度管理器（显示原目录和目标目录）
    progressManager.init(srcAbsPath, finalDistAbsPath, mdFiles.length);

    // 分区计数器和当前分区路径
    let partitionIndex = 1;
    let currentPartitionPath = path.join(
      finalDistAbsPath,
      `part_${partitionIndex}`,
    );

    // 设置初始分区信息
    progressManager.setPartition(partitionIndex, currentPartitionPath);

    for (const mdFile of mdFiles) {
      // 计算相对路径，以便在目标目录维持相同的层级结构
      let relativePath = "";

      if (stats.isFile()) {
        // 单文件模式下，直接使用文件名作为相对路径
        relativePath = path.basename(mdFile);
      } else {
        // 文件夹模式保持不变
        relativePath = path.relative(srcAbsPath, mdFile);
      }

      // 目标路径放在当前分区下
      const targetMdPath = path.join(currentPartitionPath, relativePath);

      // 执行核心本地化逻辑
      await processSingleMarkdown(mdFile, targetMdPath);

      // 处理完一个 md 文件后，更新分区大小并检查
      await progressManager.updatePartitionSize();
      const currentPartitionSize = await getFolderSize(currentPartitionPath);

      // 如果当前分区超过 50MB，创建新分区（下一个文件会放到新分区）
      if (currentPartitionSize >= PARTITION_SIZE_LIMIT) {
        partitionIndex++;
        currentPartitionPath = path.join(
          finalDistAbsPath,
          `part_${partitionIndex}`,
        );
        // 更新分区信息
        progressManager.setPartition(partitionIndex, currentPartitionPath);
      }
    }

    // 完成所有处理，显示最终进度
    progressManager.finish();

    // 保存日志文件到输出目录
    await imageLog.saveToFile(finalDistAbsPath);

    log(chalk.green.bold(`全部处理完成！`));
    log(chalk.green(`共创建 ${partitionIndex} 个分区`));
    log(
      chalk.green(`结果已保存至: `) + chalk.underline.white(finalDistAbsPath),
    );
  } catch (error) {
    log(chalk.bgRed.white.bold(" ERROR ") + "\n", error);
  } finally {
    rl.close(); // 关闭输入流，防止终端会一直挂着
  }
}

runBatch();
