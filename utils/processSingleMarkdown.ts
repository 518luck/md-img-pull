import { unified } from "unified"; // 处理器/核心底座
import remarkParse from "remark-parse"; // 语法解析插件
import remarkStringify from "remark-stringify";
import { visit } from "unist-util-visit";
import fs from "fs-extra";
import path from "path";
// 并发控制已移至 downloader.ts 中使用 Semaphore 实现
import { downloadAndLocalize } from "./downloader.ts";

export async function processSingleMarkdown(srcPath: string, distPath: string) {
  // 1. 读取 Markdown 文件内容
  const content = await fs.readFile(srcPath, "utf-8");
  // 2. 确定新文件夹中的 assets 目录  1. dirname:(去尾留头) 比如 D:/Backup/Work/notes.md => D:/Backup/Work
  const targetAssetDir = path.join(path.dirname(distPath), "assets");
  await fs.ensureDir(targetAssetDir);

  // 使用 unified 流程
  const processor = unified() //启动流水线
    .use(remarkParse) //使用remarkParse插件
    //返回一个函数的函数 这个地方是柯里化 使用了闭包  可以传递两个参数(tree:所有的修改,file 元数据)
    //被remarkParse处理之后的函数有三种,1.段落 paragraph连词回车即可划分 2.代码库code type:code 3.图片 type image
    .use(() => async (tree) => {
      const promises: Promise<void>[] = [];

      //   遍历所有图片节点
      //   visit -> 传入参数 (目标树、筛选条件 和 回调函数)
      visit(tree, "image", (node: any) => {
        //回调函数的参数就是筛选出来的值(json对象)
        // node: {
        //     type: 'image',
        //     title: null,
        //     url: 'https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/78cbd671d30a44b493f1a22db475bd8a~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=1856&h=990&s=850849&e=gif&f=43&b=fbfbfb',
        //     alt: '',
        //     position: {
        //         start: { line: 5, column: 1, offset: 65 },
        //         end: { line: 5, column: 173, offset: 237 }
        //     }
        // }
        // startsWith 判断一个字符串是否是以指定的字符开头的 只处理网络上的图片，放过本地已经存在的图片 防止重复处理已经本地化的图片
        if (node.url.startsWith("http")) {
          // 并发控制已移至 downloadAndLocalize 内部，使用 Semaphore 实现
          // 普通图片：占用 1 个槽位，最多 5 个并发
          // 超大图片（>20MB）：独占所有 5 个槽位，串行处理
          const downloadTask = downloadAndLocalize(node, targetAssetDir);
          promises.push(downloadTask);
        }
      });

      await Promise.all(promises);
    })
    .use(remarkStringify);

  //  启动处理流程
  const result = await processor.process(content);

  // 3. 写入本地化后的 Markdown 文件
  await fs.ensureDir(path.dirname(distPath));
  await fs.writeFile(distPath, result.toString());
  // .basename(): 顾名思义，取路径的“基准”部分（即最后一段）。
  console.log(`Markdown 文件 ${path.basename(distPath)} 已成功本地化！`); // 这个地方可以添加文件名称
}
