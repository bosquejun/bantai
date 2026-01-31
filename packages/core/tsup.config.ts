import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],

  format: ['esm'],
  target: 'es2022',

  dts: true,
  sourcemap: true,
  clean: true,

  outDir: 'dist',

  // Preserve folder structure
  bundle: false,
  splitting: false,
  treeshake: false,

  // Do NOT bundle deps like zod
  external: ['zod', 'ms'],

  // Preserve directory structure
  outExtension() {
    return {
      js: '.js',
    };
  },

  // Fix imports after build using a plugin
  plugins: [
    {
      name: 'fix-esm-imports',
      setup(build) {
        build.onEnd(async () => {
          const fs = await import('fs');
          const path = await import('path');
          const { existsSync, readFileSync, readdirSync, statSync, writeFileSync } = fs;
          const { dirname, extname, join } = path;

          function fixImportsInFile(filePath: string) {
            let content = readFileSync(filePath, 'utf-8');
            const fromDir = dirname(filePath);
            
            // Replace relative imports without proper extension
            content = content.replace(
              /from\s+(['"])(\.\.?\/[^'"]+?)\1/g,
              (match, quote, importPath) => {
                // If it already has .js or .json extension, return as-is
                if (importPath.endsWith('.js') || importPath.endsWith('.json') || importPath.includes('?')) {
                  return match;
                }
                
                const resolvedPath = join(fromDir, importPath);
                
                // Check if it's a directory with index.js
                if (existsSync(resolvedPath)) {
                  const stat = statSync(resolvedPath);
                  if (stat.isDirectory()) {
                    const indexPath = join(resolvedPath, 'index.js');
                    if (existsSync(indexPath)) {
                      return `from ${quote}${importPath}/index.js${quote}`;
                    }
                  }
                }
                
                // Check if it's a file with .js extension
                const jsPath = resolvedPath + '.js';
                if (existsSync(jsPath)) {
                  return `from ${quote}${importPath}.js${quote}`;
                }
                
                // Default: add .js extension
                return `from ${quote}${importPath}.js${quote}`;
              }
            );
            
            writeFileSync(filePath, content, 'utf-8');
          }

          function getAllJsFiles(dir: string, fileList: string[] = []): string[] {
            const files = readdirSync(dir);
            
            for (const file of files) {
              const filePath = join(dir, file);
              const stat = statSync(filePath);
              
              if (stat.isDirectory()) {
                getAllJsFiles(filePath, fileList);
              } else if (extname(file) === '.js') {
                fileList.push(filePath);
              }
            }
            
            return fileList;
          }

          const distDir = join(process.cwd(), 'dist');
          const files = getAllJsFiles(distDir);
          
          for (const file of files) {
            fixImportsInFile(file);
          }
          
          console.log(`Fixed imports in ${files.length} files`);
        });
      },
    },
  ],
});
