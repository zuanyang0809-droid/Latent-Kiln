import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // 加载环境变量 (保持原样)
    const env = loadEnv(mode, '.', '');
    
    return {
      // 1. 这里是关键！告诉 GitHub Pages 你的仓库名字
      // 注意：如果你的仓库名大小写不同，请一定要改成跟 GitHub 上显示的一模一样
      base: "/Latent-Kiln/",

      // 2. 服务器设置 (保持原样)
      server: {
        port: 3000,
        host: '0.0.0.0',
      },

      // 3. 插件 (保持原样)
      plugins: [react()],

      // 4. 环境变量定义 (保持原样)
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },

      // 5. 路径别名 (保持原样)
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
