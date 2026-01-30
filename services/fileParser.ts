import { Document, ProcessingStatus } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';

// Handle potential default export wrapping for PDF.js in browser ESM environments
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
const mammothClient = (mammoth as any).default || mammoth;

// Cấu hình worker cho PDF.js
// Sử dụng CDNJS để đảm bảo tính ổn định khi load worker trong môi trường browser/sandbox
if (pdfjs && pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const parseFile = async (file: File): Promise<Partial<Document>> => {
  return new Promise(async (resolve, reject) => {
    try {
      let content = "";

      if (file.type === 'application/pdf') {
        // Xử lý PDF
        const arrayBuffer = await file.arrayBuffer();
        
        // Use the resolved pdfjs object
        if (!pdfjs || !pdfjs.getDocument) {
            throw new Error("PDF.js library not loaded correctly");
        }

        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
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
              content = `[CẢNH BÁO]: Không thể trích xuất văn bản từ file ${file.name}. Có thể file này là dạng scan (ảnh). Hệ thống cần file PDF có text (selectable).`;
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