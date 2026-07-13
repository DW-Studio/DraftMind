/** @type {import('next').NextConfig} */
const nextConfig = {
  // 允许外部资源
  images: {
    unoptimized: true,
  },
  
  // 设置基础路径为相对路径
  basePath: '',
  
  // 使用相对路径输出
  trailingSlash: false,
  
  // 确保开发服务器设置正确
  experimental: {
    // turbo: false, // 禁用 Turbo 模式以避免潜在的构建问题
  },
};

module.exports = nextConfig;