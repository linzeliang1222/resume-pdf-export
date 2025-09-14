FROM mcr.microsoft.com/playwright:v1.55.0-jammy

# 设置工作目录
WORKDIR /app

# 安装 Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# 复制 package files
COPY package*.json ./

# 安装依赖
RUN npm install --omit=dev && npm cache clean --force

# 复制应用代码和字体文件
COPY . .

# 创建非 root 用户来运行应用
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash -m nodejs

# 修改权限
RUN chown -R nodejs:nodejs /app
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# 启动应用
CMD ["npm", "start"]