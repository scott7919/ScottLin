import React, { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ImageFile, ProcessStatus, ReferenceExample, Language } from './types';
import { analyzeImage, fileToGenericBase64 } from './services/geminiService';
import { 
  loadUserConfig, saveUserConfig, 
  loadReferenceExamples, saveReferenceExamples, 
  clearUserWorkspace,
  loadApiKey, saveApiKey 
} from './services/storageService';
import FileUpload from './components/FileUpload';
import ImageList from './components/ImageList';
import ConfigurationPanel from './components/ConfigurationPanel';
import ResultsTable from './components/ResultsTable';
import ApiKeyModal from './components/ApiKeyModal';
import { PlayIcon, SparklesIcon, BookOpenIcon, XIcon, ShieldCheckIcon, TrashIcon, KeyIcon } from './components/Icons';
import { TRANSLATIONS } from './translations';

const App: React.FC = () => {
  // Initialize state from LocalStorage if available (Persistence/Isolation)
  const [lang, setLang] = useState<Language>(() => {
    const saved = loadUserConfig();
    return saved.lang || 'zh-TW';
  });
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [fields, setFields] = useState<string[]>(() => {
    const saved = loadUserConfig();
    return saved.fields || [];
  });
  const [customPrompt, setCustomPrompt] = useState<string>(() => {
    const saved = loadUserConfig();
    return saved.customPrompt || '';
  });
  const [referenceExamples, setReferenceExamples] = useState<ReferenceExample[]>(() => {
    return loadReferenceExamples();
  });

  // API Key State
  const [apiKey, setApiKey] = useState<string>(() => loadApiKey());
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const t = TRANSLATIONS[lang];

  // Scroll ref for auto-scrolling to results
  const resultsRef = useRef<HTMLDivElement>(null);

  // Persist Configuration when changed
  useEffect(() => {
    saveUserConfig(fields, customPrompt, lang);
  }, [fields, customPrompt, lang]);

  // Persist Examples when changed
  useEffect(() => {
    const success = saveReferenceExamples(referenceExamples);
    if (!success && referenceExamples.length > 0) {
      console.warn("Could not save examples due to storage limits.");
    }
  }, [referenceExamples]);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    saveApiKey(key);
  };

  const handleResetWorkspace = () => {
    if (window.confirm(t.confirmReset)) {
      clearUserWorkspace();
      setFields([]);
      setCustomPrompt('');
      setReferenceExamples([]);
      setFiles([]);
      // We also clear the state of API Key locally to reflect "total clear" if user wants, 
      // though clearUserWorkspace technically removes it from storage, state needs update
      setApiKey('');
    }
  };

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    const newFiles: ImageFile[] = selectedFiles.map(file => ({
      id: uuidv4(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: ProcessStatus.IDLE,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  // Update data for a specific row (item) within a file
  const handleUpdateData = useCallback((fileId: string, rowIndex: number, field: string, value: string) => {
    setFiles(prev => prev.map(f => {
        if (f.id === fileId && f.data) {
            const newData = [...f.data];
            if (newData[rowIndex]) {
                newData[rowIndex] = {
                    ...newData[rowIndex],
                    [field]: value
                };
            }
            return {
                ...f,
                data: newData
            };
        }
        return f;
    }));
  }, []);

  const handleAddToExamples = async (file: ImageFile) => {
    if (!file.data) return;
    
    // We need the base64 string for the prompt
    try {
        const base64 = await fileToGenericBase64(file.file);
        const newExample: ReferenceExample = {
            id: file.id,
            previewUrl: file.previewUrl,
            data: file.data,
            base64
        };
        
        setReferenceExamples(prev => {
            // Avoid duplicates
            if (prev.find(e => e.id === file.id)) return prev;
            return [...prev, newExample];
        });
    } catch (e) {
        console.error("Failed to convert to example", e);
    }
  };

  const handleRemoveExample = (id: string) => {
      setReferenceExamples(prev => prev.filter(e => e.id !== id));
  };

  // Helper to process a single file
  const processSingleFile = async (fileId: string) => {
      const currentFileObj = files.find(f => f.id === fileId);
      if (!currentFileObj) return;

      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: ProcessStatus.PROCESSING, errorMessage: undefined } : f));

      try {
        // Pass current references for few-shot learning AND the API Key
        const data = await analyzeImage(apiKey, currentFileObj.file, fields, customPrompt, referenceExamples);
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: ProcessStatus.COMPLETED, data } : f));
      } catch (error: any) {
        setFiles(prev => prev.map(f => f.id === fileId ? { 
          ...f, 
          status: ProcessStatus.ERROR, 
          errorMessage: error.message || "Analysis failed" 
        } : f));
      }
  };

  const handleProcessAll = async () => {
    if (files.length === 0 || fields.length === 0) return;

    // Check for API key
    if (!apiKey && !process.env.API_KEY) {
       setIsApiKeyModalOpen(true);
       return;
    }

    setIsProcessing(true);

    // Mark idle/error files as pending
    setFiles(prev => prev.map(f => 
      f.status === ProcessStatus.IDLE || f.status === ProcessStatus.ERROR 
        ? { ...f, status: ProcessStatus.PENDING } 
        : f
    ));

    const filesToProcess = files
      .filter(f => f.status === ProcessStatus.IDLE || f.status === ProcessStatus.ERROR || f.status === ProcessStatus.PENDING)
      .map(f => f.id);

    // Process concurrently
    await Promise.all(filesToProcess.map(id => processSingleFile(id)));

    setIsProcessing(false);
    
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleRetrySingle = async (fileId: string) => {
      await processSingleFile(fileId);
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      files.forEach(f => URL.revokeObjectURL(f.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
               <SparklesIcon className="w-5 h-5 text-white" />
             </div>
             <h1 className="text-xl font-bold text-slate-900 tracking-tight hidden sm:block">{t.appTitle}</h1>
             <h1 className="text-xl font-bold text-slate-900 tracking-tight sm:hidden">IntelliOCR</h1>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4">
            {/* API Key Button */}
            <button 
                onClick={() => setIsApiKeyModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    apiKey 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title={apiKey ? t.apiKeySet : t.apiKeyMissing}
            >
                <KeyIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                    {apiKey ? 'Custom Key' : 'Set Key'}
                </span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
            
            <div className="text-sm text-slate-500 font-medium hidden md:flex items-center gap-1">
                <ShieldCheckIcon className="w-4 h-4 text-green-600" />
                {t.secureWorkspace}
            </div>
            
            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
            
            <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value as Language)}
                className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5"
            >
                <option value="zh-TW">🇹🇼 繁體中文</option>
                <option value="en">🇺🇸 English</option>
                <option value="ja">🇯🇵 日本語</option>
                <option value="vi">🇻🇳 Tiếng Việt</option>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <ConfigurationPanel 
              t={t}
              lang={lang}
              fields={fields} 
              setFields={setFields} 
              customPrompt={customPrompt}
              setCustomPrompt={setCustomPrompt}
              disabled={isProcessing}
            />

            {/* Reference Examples Panel */}
            {referenceExamples.length > 0 && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 animate-fade-in">
                    <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                        <BookOpenIcon className="w-4 h-4" />
                        {t.teachingTitle} ({referenceExamples.length})
                    </h3>
                    <p className="text-xs text-amber-700 mb-3 leading-relaxed">
                        {t.teachingDesc}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {referenceExamples.map(ex => (
                            <div key={ex.id} className="relative group w-12 h-12 rounded-lg overflow-hidden border border-amber-300 shadow-sm">
                                <img src={ex.previewUrl} alt="ref" className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => handleRemoveExample(ex.id)}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <XIcon className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 text-sm text-indigo-800">
              <p className="font-semibold mb-1">💡 {t.multiEntityTitle}</p>
              <ul className="list-disc list-inside space-y-1 opacity-80">
                <li>{t.multiEntityTip1}</li>
                <li>{t.multiEntityTip2}</li>
                <li>{t.multiEntityTip3} <span className="inline-flex items-center justify-center w-5 h-5 bg-white rounded border border-indigo-200 align-middle mx-1"><BookOpenIcon className="w-3 h-3"/></span></li>
              </ul>
            </div>
          </div>

          {/* Right Column: Upload & List */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-slate-800">{t.uploadHeader}</h2>
                  <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-500">
                    {t.selectedCount.replace('{count}', files.length.toString())}
                  </span>
               </div>
               
               <FileUpload onFilesSelected={handleFilesSelected} t={t} />
               
               <ImageList files={files} onRemove={handleRemoveFile} t={t} />
            </div>

            {/* Action Bar */}
            <div className="sticky bottom-6 z-40">
               <div className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-slate-200 shadow-lg flex justify-between items-center">
                 <div className="text-sm text-slate-600 hidden sm:block">
                    {files.length === 0 
                      ? t.statusNoFiles 
                      : fields.length === 0 
                        ? t.statusNoFields
                        : t.statusReady}
                 </div>
                 <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <button
                        onClick={handleProcessAll}
                        disabled={isProcessing || files.length === 0 || fields.length === 0}
                        className={`
                        flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-white shadow-md transition-all w-full sm:w-auto
                        ${isProcessing || files.length === 0 || fields.length === 0
                            ? 'bg-slate-300 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0'
                        }
                        `}
                    >
                        {isProcessing ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t.btnProcessing}
                        </>
                        ) : (
                        <>
                            <PlayIcon className="w-5 h-5 fill-current" />
                            {files.some(f => f.status !== ProcessStatus.IDLE) ? t.btnContinue : t.btnStart}
                        </>
                        )}
                    </button>
                 </div>
               </div>
            </div>

          </div>
        </div>

        {/* Results Section */}
        <div ref={resultsRef}>
          <ResultsTable 
            t={t}
            processedFiles={files} 
            fields={fields} 
            onUpdateData={handleUpdateData}
            onAddToExamples={handleAddToExamples}
            onRetry={handleRetrySingle}
            referenceIds={referenceExamples.map(e => e.id)}
          />
        </div>

        {/* Workspace Footer (Reset) */}
        <div className="mt-12 flex justify-center pt-8 border-t border-slate-200">
            <button 
                onClick={handleResetWorkspace}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-500 transition-colors"
            >
                <TrashIcon className="w-4 h-4" />
                {t.resetWorkspace}
            </button>
        </div>

      </main>

      {/* API Key Modal */}
      {isApiKeyModalOpen && (
        <ApiKeyModal 
            currentKey={apiKey} 
            onSave={handleSaveApiKey} 
            onClose={() => setIsApiKeyModalOpen(false)} 
            t={t} 
        />
      )}

    </div>
  );
};

export default App;
