import express from 'express';
import cors from 'cors';
import { exportPdfHandler } from './handlers/pdfExport.js';

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 路由
app.post('/api/export-pdf', exportPdfHandler);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`PDF Export Service 已启动在端口 ${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`PDF 导出 API: http://localhost:${PORT}/api/export-pdf`);
});