import React, { useState } from 'react';
import { PlusIcon, XIcon, SparklesIcon, ShieldCheckIcon } from './Icons';
import { Language } from '../types';

interface ConfigurationPanelProps {
  fields: string[];
  setFields: (fields: string[]) => void;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  disabled: boolean;
  t: any;
  lang: Language;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  fields,
  setFields,
  customPrompt,
  setCustomPrompt,
  disabled,
  t,
  lang
}) => {
  const [newField, setNewField] = useState('');

  const addField = () => {
    if (newField.trim() && !fields.includes(newField.trim())) {
      setFields([...fields, newField.trim()]);
      setNewField('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addField();
    }
  };

  const removeField = (fieldToRemove: string) => {
    setFields(fields.filter(f => f !== fieldToRemove));
  };

  // Predefined presets for quick start using translations
  const loadPreset = (type: 'receipt' | 'businessCard' | 'invoice') => {
    if (disabled) return;
    const presetFields = t.fields[type];
    if (presetFields) {
      setFields(presetFields);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6 relative">
      
      <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
        <ShieldCheckIcon className="w-3 h-3" />
        {t.autoSaved}
      </div>

      {/* Field Definition Section */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-sm">1</span>
          {t.configTitle}
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          {t.configDesc}
        </p>
        
        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => loadPreset('receipt')} disabled={disabled} className="px-3 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
            {t.presetReceipt}
          </button>
          <button onClick={() => loadPreset('businessCard')} disabled={disabled} className="px-3 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
            {t.presetBusinessCard}
          </button>
           <button onClick={() => loadPreset('invoice')} disabled={disabled} className="px-3 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
            {t.presetInvoice}
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newField}
            onChange={(e) => setNewField(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.placeholderField}
            disabled={disabled}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-slate-100"
          />
          <button
            onClick={addField}
            disabled={disabled || !newField.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 min-h-[40px]">
          {fields.length === 0 && (
            <span className="text-sm text-slate-400 italic py-2">{t.noFields}</span>
          )}
          {fields.map(field => (
            <span key={field} className="inline-flex items-center px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-sm">
              {field}
              {!disabled && (
                <button onClick={() => removeField(field)} className="ml-2 text-indigo-400 hover:text-indigo-900">
                  <XIcon className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100"></div>

      {/* Custom Prompt Section */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-sm">2</span>
          {t.promptTitle}
        </h3>
        <p className="text-sm text-slate-500 mb-3">
          {t.promptDesc}
        </p>
        <div className="relative">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            disabled={disabled}
            rows={3}
            placeholder={t.promptPlaceholder}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-slate-100 resize-none text-sm"
          />
          <SparklesIcon className="absolute right-3 bottom-3 w-5 h-5 text-indigo-300 pointer-events-none" />
        </div>
      </div>

    </div>
  );
};

export default ConfigurationPanel;