import React from 'react';
import { ImageFile, ProcessStatus } from '../types';
import { TrashIcon, CheckCircleIcon, AlertCircleIcon, LoaderIcon } from './Icons';

interface ImageListProps {
  files: ImageFile[];
  onRemove: (id: string) => void;
  t: any;
}

const ImageList: React.FC<ImageListProps> = ({ files, onRemove, t }) => {
  if (files.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
      {files.map((file) => (
        <div 
          key={file.id} 
          className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-300 bg-white shadow-sm
            ${file.status === ProcessStatus.PROCESSING ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}
            ${file.status === ProcessStatus.ERROR ? 'border-red-300' : ''}
            ${file.status === ProcessStatus.COMPLETED ? 'border-green-400' : ''}
          `}
        >
          {/* Image Preview */}
          <div className="aspect-square w-full overflow-hidden bg-slate-100 relative">
             <img 
               src={file.previewUrl} 
               alt={file.file.name} 
               className={`w-full h-full object-cover transition-opacity duration-300 ${file.status === ProcessStatus.PROCESSING ? 'opacity-50' : 'opacity-100'}`}
             />
             
             {/* Overlay Status Icons */}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {file.status === ProcessStatus.PROCESSING && (
                  <LoaderIcon className="w-8 h-8 text-indigo-600 animate-spin" />
                )}
                {file.status === ProcessStatus.COMPLETED && (
                  <div className="bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-sm">
                    <CheckCircleIcon className="w-8 h-8 text-green-500" />
                  </div>
                )}
                {file.status === ProcessStatus.ERROR && (
                  <div className="bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-sm group-hover:opacity-0 transition-opacity">
                     <AlertCircleIcon className="w-8 h-8 text-red-500" />
                  </div>
                )}
             </div>

             {/* Remove Button (only when not processing) */}
             {file.status !== ProcessStatus.PROCESSING && (
               <button 
                 onClick={() => onRemove(file.id)}
                 className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm backdrop-blur-sm border border-slate-100"
               >
                 <TrashIcon className="w-4 h-4" />
               </button>
             )}
          </div>

          {/* Footer Info */}
          <div className="p-3 text-xs border-t border-slate-100">
            <p className="font-medium text-slate-700 truncate" title={file.file.name}>{file.file.name}</p>
            <div className="flex justify-between items-center mt-1">
               <span className="text-slate-400">{(file.file.size / 1024).toFixed(0)} KB</span>
               {file.status === ProcessStatus.ERROR && (
                  <span className="text-red-500 font-medium text-[10px]">{t.error}</span>
               )}
            </div>
             {file.status === ProcessStatus.ERROR && file.errorMessage && (
                <p className="text-red-500 text-[10px] mt-1 truncate">{file.errorMessage}</p>
             )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ImageList;
