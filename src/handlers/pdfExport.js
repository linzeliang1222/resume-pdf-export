import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

export async function exportPdfHandler(req, res) {
  let browser;

  try {
    const { content, styles, margin = 16 } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // 启动 Playwright Chromium
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--hide-scrollbars',
        '--disable-web-security'
      ]
    });

    const page = await browser.newPage();

    // 尝试加载字体文件
    let fontBase64 = '';
    try {
      const fontPath = path.join(process.cwd(), 'fonts/MiSans-VF.ttf');
      const fontBuffer = await fs.readFile(fontPath);
      fontBase64 = fontBuffer.toString('base64');
      console.log('字体加载成功，大小:', (fontBuffer.length / 1024 / 1024).toFixed(2), 'MB');
    } catch (fontError) {
      console.log('字体文件加载失败，将使用系统默认字体:', fontError.message);
    }

    // 构建字体 CSS
    const fontCSS = fontBase64 ? `
      @font-face {
        font-family: "MiSans VF";
        src: url("data:font/truetype;charset=utf-8;base64,${fontBase64}") format("truetype");
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }
    ` : `
      /* 使用系统默认字体 */
    `;

    // 构建完整的 HTML
    const pdfContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Export PDF</title>
          <style>
            ${fontCSS}

            @page {
              size: A4;
              padding: 0;
            }
            
            * {
              box-sizing: border-box;
            }
            
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              background: white;
              font-family: ${fontBase64 ? '"MiSans VF",' : ''} "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            #resume-preview {
              padding: 0 !important;
              margin: 0 !important;
            }

            #print-content {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 0;
              background: white;
              box-shadow: none;
            }
            
            #print-content * {
              box-shadow: none !important;
              transform: none !important;
              scale: 1 !important;
            }
            
            .scale-90 {
              transform: none !important;
            }
            
            .page-break-line {
              display: none;
            }

            /* 强制所有文本元素使用一致的字体 */
            h1, h2, h3, h4, h5, h6, p, span, div, li, td, th, a, label, input, textarea, select, button {
              font-family: inherit !important;
            }

            /* 应用自定义样式 */
            ${styles || ''}
          </style>
        </head>
        <body>
          <div id="print-content">
            ${content}
          </div>
        </body>
      </html>
    `;

    // 设置页面内容
    await page.setContent(pdfContent, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // 等待字体加载完成（如果有的话）
    if (fontBase64) {
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      
      // 额外等待确保字体完全渲染
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 生成 PDF
    const marginMM = (margin * 0.264583).toFixed(2); // px to mm 转换
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: `${marginMM}mm`,
        right: `${marginMM}mm`,
        bottom: `${marginMM}mm`,
        left: `${marginMM}mm`
      }
    });

    await browser.close();

    // 返回 PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="document.pdf"',
      'Content-Length': pdf.length
    });

    res.send(pdf);

  } catch (error) {
    console.error('PDF 生成错误:', error);

    // 确保浏览器被关闭
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('关闭浏览器出错:', closeError);
      }
    }

    res.status(500).json({
      error: 'PDF 生成失败',
      message: error.message
    });
  }
}