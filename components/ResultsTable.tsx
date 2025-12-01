import React from 'react';
import { ImageFile, ProcessStatus } from '../types';
import { DownloadIcon, BookOpenIcon, RefreshIcon, LoaderIcon } from './Icons';

interface ResultsTableProps {
  processedFiles: ImageFile[];
  fields: string[];
  onUpdateData: (fileId: string, rowIndex: number, field: string, value: string) => void;
  onAddToExamples: (file: ImageFile) => void;
  onRetry: (fileId: string) => void;
  referenceIds: string[];
  t: any;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ 
  processedFiles, 
  fields, 
  onUpdateData, 
  onAddToExamples,
  onRetry,
  referenceIds,
  t
}) => {
  const visibleFiles = processedFiles.filter(f => 
    f.status === ProcessStatus.COMPLETED || 
    f.status === ProcessStatus.ERROR ||
    f.status === ProcessStatus.PROCESSING
  );

  if (visibleFiles.length === 0) return null;

  const downloadCSV = () => {
    const completedFiles = visibleFiles.filter(f => f.status === ProcessStatus.COMPLETED && f.data && f.data.length > 0);
    if (completedFiles.length === 0) return;

    const header = [t.colFileName, 'ID', ...fields].join(',');
    
    const rows = completedFiles.flatMap(file => {
      if (!file.data) return [];
      return file.data.map((item, index) => {
        const rowData = fields.map(field => {
          const value = item[field];
          const stringValue = value === null || value === undefined ? '' : String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });
        return [file.file.name, index + 1, ...rowData].join(',');
      });
    });

    const csvContent = '\ufeff' + [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `extraction_results_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-8 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800">{t.tableTitle}</h3>
            <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full">
                {t.tableSubtitle}
            </span>
        </div>
        <button 
          onClick={downloadCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <DownloadIcon className="w-4 h-4" />
          {t.btnExport}
        </button>
      </div>
      
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm text-left text-slate-600">
          <thead className="text-xs text-slate-700 uppercase bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="px-4 py-4 font-bold whitespace-nowrap w-16">{t.colAction}</th>
              <th className="px-4 py-4 font-bold whitespace-nowrap w-20">{t.colPreview}</th>
              <th className="px-4 py-4 font-bold whitespace-nowrap w-32">{t.colFileName}</th>
              {fields.map(field => (
                <th key={field} className="px-4 py-4 font-bold whitespace-nowrap min-w-[150px]">
                  {field}
                </th>
              ))}
            </tr>
          </thead>
          
          {/* Render each file as a tbody to group multiple rows if needed */}
          {visibleFiles.map((file) => {
             const isExample = referenceIds.includes(file.id);
             const isProcessing = file.status === ProcessStatus.PROCESSING;
             const isError = file.status === ProcessStatus.ERROR;
             
             const dataRows = file.data && file.data.length > 0 ? file.data : [{}];
             const rowCount = dataRows.length;

             return (
               <tbody key={file.id} className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${isExample ? 'bg-indigo-50/30' : ''}`}>
                  {dataRows.map((item, index) => (
                    <tr key={`${file.id}-${index}`} className="group/row">
                      
                      {/* Action / Preview / Name Columns - Only render on the first row, span across all data rows */}
                      {index === 0 && (
                        <>
                          <td rowSpan={rowCount} className="px-4 py-3 align-top bg-white/50 group-hover/row:bg-transparent">
                            <div className="flex gap-2">
                                {!isProcessing && (
                                    <>
                                    <button 
                                        onClick={() => onRetry(file.id)}
                                        title={t.retry}
                                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                    >
                                        <RefreshIcon className="w-4 h-4" />
                                    </button>
                                    {file.status === ProcessStatus.COMPLETED && (
                                        <button 
                                            onClick={() => onAddToExamples(file)}
                                            title={isExample ? t.addedToExample : t.addToExample}
                                            disabled={isExample}
                                            className={`p-1.5 rounded-md transition-colors ${isExample ? 'text-green-600 bg-green-50' : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'}`}
                                        >
                                            <BookOpenIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                    </>
                                )}
                                {isProcessing && <LoaderIcon className="w-4 h-4 animate-spin text-indigo-600" />}
                            </div>
                          </td>

                          <td rowSpan={rowCount} className="px-4 py-3 align-top bg-white/50 group-hover/row:bg-transparent">
                            <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer hover:scale-[2.5] hover:z-10 hover:shadow-lg transition-all origin-top-left relative z-0">
                                <img 
                                    src={file.previewUrl} 
                                    alt="preview" 
                                    className="h-full w-full object-cover" 
                                />
                            </div>
                            {rowCount > 1 && (
                                <span className="mt-1 inline-block text-[10px] font-medium bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                                    {t.itemsCount.replace('{count}', rowCount.toString())}
                                </span>
                            )}
                          </td>

                          <td rowSpan={rowCount} className="px-4 py-4 font-medium text-slate-900 whitespace-nowrap max-w-[150px] truncate align-top bg-white/50 group-hover/row:bg-transparent" title={file.file.name}>
                            {file.file.name}
                          </td>
                        </>
                      )}

                      {/* Data Fields */}
                      {fields.map(field => (
                        <td key={`${file.id}-${index}-${field}`} className="px-2 py-2 border-l border-slate-50">
                           {isError && index === 0 ? (
                                <span className="text-xs text-red-400">{t.error}</span>
                           ) : isProcessing && index === 0 ? (
                                <div className="h-4 w-20 bg-slate-100 animate-pulse rounded"></div>
                           ) : !isProcessing && !isError ? (
                                <input 
                                    type="text" 
                                    value={item[field] !== undefined && item[field] !== null ? String(item[field]) : ''}
                                    onChange={(e) => onUpdateData(file.id, index, field, e.target.value)}
                                    className={`
                                        w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded transition-all text-slate-700 text-sm
                                        ${!item[field] ? 'placeholder-slate-300' : ''}
                                    `}
                                    placeholder="-"
                                />
                           ) : null}
                        </td>
                      ))}
                    </tr>
                  ))}
               </tbody>
             );
          })}
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;
