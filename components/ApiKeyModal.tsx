import React, { useState } from 'react';
import { KeyIcon, ShieldCheckIcon, XIcon, CheckCircleIcon, AlertCircleIcon, LoaderIcon } from './Icons';
import { validateApiKey } from '../services/geminiService';

interface ApiKeyModalProps {
  currentKey: string;
  onSave: (key: string) => void;
  onClose: () => void;
  t: any;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ currentKey, onSave, onClose, t }) => {
  const [keyInput, setKeyInput] = useState(currentKey);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid' | 'quota'>('idle');

  const handleTestConnection = async () => {
    if (!keyInput.trim()) return;
    setValidationStatus('validating');
    const result = await validateApiKey(keyInput.trim());
    setValidationStatus(result);
  };

  const handleSave = () => {
    onSave(keyInput.trim());
    onClose();
  };

  const handleRemove = () => {
    setKeyInput('');
    onSave('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <KeyIcon className="w-5 h-5 text-indigo-600" />
            {t.apiKeyTitle}
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4 bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex gap-3 items-start">
            <ShieldCheckIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {t.apiKeyDesc}
            </p>
          </div>

          <label className="block text-sm font-medium text-slate-700 mb-2">
            Gemini API Key
          </label>
          <div className="relative">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                setValidationStatus('idle');
              }}
              placeholder={t.apiKeyPlaceholder}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 mb-2 ${
                validationStatus === 'invalid' ? 'border-red-300 bg-red-50' : 
                validationStatus === 'quota' ? 'border-amber-300 bg-amber-50' :
                validationStatus === 'valid' ? 'border-green-300 bg-green-50' : 
                'border-slate-300'
              }`}
            />
            {validationStatus === 'valid' && (
              <CheckCircleIcon className="absolute right-3 top-3.5 w-5 h-5 text-green-500" />
            )}
            {validationStatus === 'invalid' && (
              <AlertCircleIcon className="absolute right-3 top-3.5 w-5 h-5 text-red-500" />
            )}
            {validationStatus === 'quota' && (
              <AlertCircleIcon className="absolute right-3 top-3.5 w-5 h-5 text-amber-500" />
            )}
          </div>
          
          {/* Status Text */}
          <div className="h-6 mb-2">
            {validationStatus === 'validating' && (
              <div className="flex items-center gap-2 text-xs text-indigo-600">
                <LoaderIcon className="w-3 h-3 animate-spin" />
                {t.apiKeyValidating}
              </div>
            )}
            {validationStatus === 'valid' && (
              <p className="text-xs text-green-600 font-medium">{t.apiKeySuccess}</p>
            )}
            {validationStatus === 'invalid' && (
              <p className="text-xs text-red-600 font-medium">{t.apiKeyInvalid}</p>
            )}
            {validationStatus === 'quota' && (
              <p className="text-xs text-amber-600 font-medium">⚠️ API Quota Exceeded (429). Key is valid but busy.</p>
            )}
          </div>
          
          <div className="flex justify-between items-center mt-4">
             {currentKey ? (
               <button 
                 onClick={handleRemove}
                 className="text-red-500 text-sm hover:underline font-medium"
               >
                 {t.apiKeyRemove}
               </button>
             ) : <div></div>}
             
             <div className="flex gap-2">
               <button
                 onClick={handleTestConnection}
                 disabled={!keyInput.trim() || validationStatus === 'validating'}
                 className="px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
               >
                 {t.apiKeyTest}
               </button>
               <button
                 onClick={handleSave}
                 className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors font-medium text-sm"
               >
                 {t.apiKeySave}
               </button>
             </div>
          </div>
        </div>
        
        <div className="bg-slate-50 px-6 py-3 text-xs text-slate-500 border-t border-slate-100 text-center">
           Get your key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;