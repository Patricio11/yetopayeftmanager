"use client";

import React, { useState, useEffect } from 'react';
import { Save, Eye, Edit3, Info } from 'lucide-react';
import { renderMarkdown } from '@/lib/utils/markdown';
import { Switch } from '@/components/ui/switch';

export function TermsAndConditionsSettings() {
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    fetch('/api/admin/settings/platform')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setEnabled(data.settings['eft_tc_enabled'] === 'true');
          setTitle(data.settings['eft_tc_title'] || '');
          setContent(data.settings['eft_tc_content'] || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/settings/platform', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eft_tc_enabled: enabled, eft_tc_title: title, eft_tc_content: content }),
      });
      const data = await res.json();
      if (data.success) setSaved(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/3" />
        <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Terms &amp; Conditions</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Configure the Pay By Bank Terms &amp; Conditions shown to all customers at payment time.
        </p>
      </div>

      {/* Global enable toggle */}
      <div className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
        enabled
          ? 'border-green-300 bg-green-50/50 dark:border-green-700 dark:bg-green-900/10'
          : 'border-gray-200 dark:border-slate-700'
      }`}>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Terms &amp; Conditions</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            When enabled, customers must agree to the T&amp;C before submitting payment
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
          Modal Title
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Terms &amp; Conditions"
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Editor / Preview tabs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Content</label>
          <div className="flex rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden text-xs">
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                activeTab === 'edit'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                activeTab === 'preview'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
          </div>
        </div>

        {activeTab === 'edit' ? (
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={16}
            placeholder={`# Terms & Conditions\n\nWrite your terms here using markdown.\n\n## Section 1\n\nYour content...\n\n- Bullet point\n- Another point\n\n**Bold text** and *italic text* are supported.`}
            className="w-full px-3 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-mono bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y leading-relaxed"
          />
        ) : (
          <div className="min-h-[16rem] border border-gray-200 dark:border-slate-600 rounded-lg px-5 py-4 prose max-w-none text-sm overflow-auto bg-white dark:bg-slate-800">
            {content ? renderMarkdown(content) : (
              <p className="text-gray-400 italic">Nothing to preview yet.</p>
            )}
          </div>
        )}

        <div className="mt-2 flex items-start gap-2 text-xs text-gray-500 dark:text-slate-500">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Markdown: <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded"># Heading</code>{' '}
            <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">**bold**</code>{' '}
            <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">*italic*</code>{' '}
            <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">- list item</code>
          </span>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-700">
        <p className="text-xs text-gray-500 dark:text-slate-500">
          Changes apply to all customer payment pages immediately.
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
