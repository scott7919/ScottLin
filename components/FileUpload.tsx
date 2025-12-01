import React, { useCallback } from 'react';
import { UploadIcon } from './Icons';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  t: any;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, t }) => {
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = (Array.from(e.dataTransfer.files) as File[]).filter(file => 
        file.type.startsWith('image/')
      );
      onFilesSelected(validFiles);
    }
  }, [onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
       const validFiles = (Array.from(e.target.files) as File[]).filter(file => 
        file.type.startsWith('image/')
      );
      onFilesSelected(validFiles);
    }
  };

  return (
    <div 
      className="w-full rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400 transition-all duration-300 cursor-pointer group"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <label className="flex flex-col items-center justify-center w-full h-48 cursor-pointer">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <div className="p-3 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300">
             <UploadIcon className="w-8 h-8 text-indigo-600" />
          </div>
          <p className="mb-2 text-lg font-medium text-indigo-900">
            {t.uploadTitle}
          </p>
          <p className="text-sm text-indigo-600">
            {t.uploadSubtitle}
          </p>
        </div>
        <input 
          type="file" 
          className="hidden" 
          multiple 
          accept="image/*" 
          onChange={handleFileChange} 
        />
      </label>
    </div>
  );
};

export default FileUpload;
