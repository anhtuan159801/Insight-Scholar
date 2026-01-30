
import React, { useCallback, useState } from 'react';
import { UploadCloud, FileType } from 'lucide-react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const filesArray = Array.from(e.dataTransfer.files);
        onFilesSelected(filesArray);
      }
    },
    [onFilesSelected]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer group
        flex flex-col items-center justify-center text-center
        ${isDragging 
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' 
            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
        }
      `}
    >
      <input
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md"
        onChange={handleInputChange}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center w-full h-full">
        <div className={`
            p-4 rounded-full mb-4 transition-all duration-300
            ${isDragging ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}
        `}>
          <UploadCloud size={48} strokeWidth={1.5} />
        </div>
        
        <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-700">
          Kéo thả hoặc chọn tài liệu
        </h3>
        
        <div className="flex items-center gap-4 text-xs text-slate-500 uppercase font-semibold tracking-wider">
            <span className="flex items-center gap-1"><FileType size={12}/> PDF</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="flex items-center gap-1"><FileType size={12}/> DOCX</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="flex items-center gap-1"><FileType size={12}/> TXT</span>
        </div>
      </label>
    </div>
  );
};

export default FileUpload;
