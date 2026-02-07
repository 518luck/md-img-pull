import path from "path";
import { getFilesRecursive } from "./utils/getFilesRecursive.ts";
import { processSingleMarkdown } from "./utils/processSingleMarkdown.ts";
import * as readline from "node:readline/promises"; // 用于从命令行读取输入
import { stdin as input, stdout as output } from "node:process"; // 用于从命令行读取输入和输出

async function runBatch() {
  // 获取命令行参数。process.argv[0]是node程序，[1]是脚本文件，[2]才是你输入的路径
  const rl = readline.createInterface({ input, output });

  try {
    const sourceDir = await rl.question(
      "📂 请输入或粘贴需要处理的源文件夹路径: ",
    );

    // 如果用户没输路径，打印用法提示并强行退出程序
    if (!sourceDir || sourceDir.trim() === "") {
      console.error("❌ 路径不能为空！");
      return;
    }
    // 将相对路径（如 ./img）转为绝对路径（如 C:\Users\Desktop\img）
    // replace 是为了防止用户粘贴路径时带了双引号
    const srcAbsPath = path.resolve(
      sourceDir.trim().replace(/^['"]|['"]$/g, ""),
    );
    // 定义目标文件夹（在同级目录下生成 path_localized）
    const distAbsPath = `${srcAbsPath}_localized`;

    console.log(`🚀 开始批量处理...`);
    console.log(`原目录: ${srcAbsPath}`);
    console.log(`目标目录: ${distAbsPath}`);

    // 3. 递归获取所有 Markdown 文件
    const allFiles = await getFilesRecursive(srcAbsPath);
    // 4. 筛选出所有 Markdown 文件
    const mdFiles = allFiles.filter((f) => f.endsWith(".md"));

    for (const mdFile of mdFiles) {
      // 计算相对路径，以便在目标目录维持相同的层级结构
      // 提取特征 srcAbsPath: C:/Users/Documents/Notes mdFile: C:/Users/Documents/Notes/编程/TS/基础.md
      // 结果: 编程/TS/基础.md
      const relativePath = path.relative(srcAbsPath, mdFile);
      const targetMdPath = path.join(distAbsPath, relativePath);

      // 执行核心本地化逻辑
      await processSingleMarkdown(mdFile, targetMdPath);
    }
    console.log(`\n✨ 全部处理完成！请查看: ${distAbsPath}`);
  } catch (error) {
    console.error("❌ 发生错误:", error);
  } finally {
    rl.close(); // 关闭输入流，防止终端会一直挂着
  }
}

runBatch();
