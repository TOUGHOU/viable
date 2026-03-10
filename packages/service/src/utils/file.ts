/**
 * @file: file.ts
 * @author: houfujian houfujian@jd.com
 * @description 读取目录/模板文件内容，支持扁平与递归
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const DEFAULT_SKIP_DIRS = new Set(['node_modules', '.git', '.vite', 'dist', '.turbo', '.next']);

export interface ReadDirOptions {
  /** 要跳过的目录名，不传则使用默认（node_modules、.git 等） */
  skipDirs?: Set<string>;
}

/**
 * 递归读取目录下所有文件，返回相对 root 的路径与内容（用于写入沙箱等）
 */
export function readDirectoryFilesRecursive(
  rootPath: string,
  options?: ReadDirOptions
): { relativePath: string; data: string }[] {
  const skipDirs = options?.skipDirs ?? DEFAULT_SKIP_DIRS;
  const result: { relativePath: string; data: string }[] = [];

  function walk(dir: string, relativeDir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const name = entry.name;
      const fullPath = path.join(dir, name);
      const relativePath = relativeDir ? path.join(relativeDir, name) : name;

      if (entry.isDirectory()) {
        if (skipDirs.has(name)) continue;
        walk(fullPath, relativePath);
      } else {
        const data = fs.readFileSync(fullPath, 'utf8');
        result.push({ relativePath, data });
      }
    }
  }

  walk(rootPath, '');
  return result;
}

/**
 * 读取目录下仅一层的文件（非递归）
 */
export function readDirectoryFiles(directoryPath: string): { path: string; data: string }[] {
  const files = fs.readdirSync(directoryPath);

  const filesArray = files
    .filter((file) => {
      const fullPath = path.join(directoryPath, file);
      return fs.statSync(fullPath).isFile();
    })
    .map((file) => {
      const filePath = path.join(directoryPath, file);
      return {
        path: filePath,
        data: fs.readFileSync(filePath, 'utf8'),
      };
    });

  return filesArray;
}
