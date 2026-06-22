import { Document, ProcessingStatus } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Tesseract from 'tesseract.js';

// Handle potential default export wrapping for PDF.js in browser ESM environments
const pdfjs = pdfjsLib;
const mammothClient = (mammoth as any).default || mammoth;

// Cấu hình worker cho PDF.js
// Sử dụng CDNJS để đảm bảo tính ổn định khi load worker trong môi trường browser/sandbox
if (pdfjs && pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// OCR fallback for scanned PDFs (process first few pages to limit latency)
const ocrPdf = async (pdf: any, pageLimit: number = 3): Promise<string> => {
    try {
        const total = Math.min(pdf.numPages, pageLimit);
        let text = '';

        for (let i = 1; i <= total; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) continue;

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: context, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/png');

            // Try Vietnamese + English first, then fallback to English.
            let pageText = '';
            try {
                const resultVieEng = await Tesseract.recognize(dataUrl, 'vie+eng');
                pageText = resultVieEng.data.text || '';
            } catch {
                const resultEng = await Tesseract.recognize(dataUrl, 'eng');
                pageText = resultEng.data.text || '';
            }
            text += pageText + '\n';
        }
        return text.trim();
    } catch (err) {
        console.warn('OCR fallback failed', err);
        return '';
    }
};

export const parseFile = async (file: File): Promise<Partial<Document>> => {
  return new Promise(async (resolve, reject) => {
    try {
      let content = "";
      let pdf: any = null;

      if (file.type === 'application/pdf') {
        // Xử lý PDF
        const arrayBuffer = await file.arrayBuffer();
        
        // Use the resolved pdfjs object
        if (!pdfjs || !pdfjs.getDocument) {
            throw new Error("PDF.js library not loaded correctly");
        }

        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        pdf = await loadingTask.promise;
        
        let fullText = "";
        const maxPages = pdf.numPages;
        
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          // Type safety for items
          const pageText = textContent.items.map((item: any) => item.str || "").join(' ');
          fullText += pageText + "\n";
        }
        content = fullText;

      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.name.endsWith('.docx')
      ) {
        // Xử lý Word (DOCX)
        const arrayBuffer = await file.arrayBuffer();
        // Use resolved mammoth client
        const result = await mammothClient.extractRawText({ arrayBuffer: arrayBuffer });
        content = result.value;

      } else {
        // Xử lý Text / Markdown
        content = await file.text();
      }

      // Kiểm tra nếu không trích xuất được nội dung (ví dụ PDF scan ảnh)
      if (!content || content.trim().length < 50) {
          if (file.type === 'application/pdf') {
              // Thử OCR fallback cho PDF scan (tối đa 3 trang để tránh chậm)
              const ocrText = pdf ? await ocrPdf(pdf, 3) : '';
              if (ocrText && ocrText.length > 20) {
                  content = ocrText;
              } else {
                  content = `[CẢNH BÁO]: Không thể trích xuất văn bản từ file ${file.name}. Có thể file này là dạng scan (ảnh). Hệ thống cần file PDF có text (selectable).`;
              }
          } else if (!content) {
              content = "[Nội dung trống]";
          }
      }

      resolve({
        id: Math.random().toString(36).substring(7),
        fileName: file.name,
        fileType: file.type,
        content: content,
        status: ProcessingStatus.PENDING,
        uploadDate: Date.now(),
      });

    } catch (err) {
      console.error("Lỗi khi đọc file:", err);
      resolve({
        id: Math.random().toString(36).substring(7),
        fileName: file.name,
        fileType: file.type,
        content: "",
        status: ProcessingStatus.ERROR,
        errorMessage: "Không thể đọc file. Vui lòng kiểm tra định dạng.",
        uploadDate: Date.now(),
      });
    }
  });
};
