import fs from "fs-extra";
import path from "path";

//递归获取目录下所有文件路径函数
export async function getFilesRecursive(dir: string): Promise<string[]> {
  // 读取目录下所有子项（文件和文件夹）readdir是"read directory" 的缩写
  const subdirs = await fs.readdir(dir);
  // 自然排序：让数字按数值大小排序，而不是字符串字典序（避免 1, 10, 2 这种顺序）
  subdirs.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  );
  const files = await Promise.all(
    //返回数组
    subdirs.map(async (subdir) => {
      //它会从右向左处理路径片段，直到构造出一个绝对路径。
      //path.resolve() 自动根据你的操作系统选择正确的斜杠。
      const res = path.resolve(dir, subdir);
      //fs.stat(res) “探测”路径 res 的详细信息 返回一个对象，包含文件的大小、创建时间、类型等信息。
      //.isDirectory() “判断”这是否是一个文件夹
      return (await fs.stat(res)).isDirectory() ? getFilesRecursive(res) : res;
    }),
  );
  //reduce 是数组的一个高级方法，用于将数组中的所有项汇总成一个单一的结果。
  //a.concat(f) 如果 f 是字符串，它就把字符串放进 a 后面。 如果 f 是数组，它会把数组里的每一项拿出来，依次放进 a 后面（而不是把整个数组塞进去）。
  return files.reduce(
    (accumulator: string[], currentValue: string | string[]) =>
      accumulator.concat(currentValue),
    [],
  );
}
