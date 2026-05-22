"use client";

import React, { useState, useEffect } from 'react';
import { Save, Eye, Edit3, Info, FileText, Loader2 } from 'lucide-react';
import { renderMarkdown } from '@/lib/utils/markdown';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      <div className="space-y-6">
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 p-6">
          <div className="space-y-4 animate-pulse">
            <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/3" />
            <div className="h-64 bg-slate-100 dark:bg-slate-700/50 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global enable toggle */}
      <div className={`flex items-center justify-between p-5 border rounded-xl transition-all ${
        enabled
          ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white ${
            enabled ? "bg-gradient-to-br from-amber-500 to-pink-600" : "bg-slate-300 dark:bg-slate-600"
          } transition-colors`}>
            <FileText className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Enable Terms &amp; Conditions</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              When enabled, customers must agree to the T&amp;C before submitting payment
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {/* Title and Content */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
              <Edit3 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Content Editor</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure the T&amp;C displayed on the payment page</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Modal Title */}
          <div className="space-y-2">
            <Label htmlFor="tc-title" className="text-slate-700 dark:text-slate-300 text-sm">Modal Title</Label>
            <Input
              id="tc-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Terms &amp; Conditions"
            />
          </div>

          {/* Editor / Preview tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-slate-700 dark:text-slate-300 text-sm">Content</Label>
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
                <button
                  onClick={() => setActiveTab('edit')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                    activeTab === 'edit'
                      ? 'bg-gradient-to-r from-amber-500 to-pink-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-gradient-to-r from-amber-500 to-pink-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            ) : (
              <div className="min-h-[16rem] border border-slate-200 dark:border-slate-700 rounded-lg px-5 py-4 prose dark:prose-invert max-w-none text-sm overflow-auto bg-white dark:bg-slate-800">
                {content ? renderMarkdown(content) : (
                  <p className="text-slate-400 dark:text-slate-500 italic">Nothing to preview yet.</p>
                )}
              </div>
            )}

            <div className="mt-2 flex items-start gap-2 text-xs text-slate-400 dark:text-slate-500">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                Markdown: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded"># Heading</code>{' '}
                <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">**bold**</code>{' '}
                <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">*italic*</code>{' '}
                <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">- list item</code>
              </span>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Changes apply to all customer payment pages immediately.
          </p>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-0"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
