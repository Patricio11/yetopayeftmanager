'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail, Plus, Send, Search, Users, Store, Building2, Check, X,
  RefreshCw, Eye, Edit3, ChevronRight, Loader2, Clock, CheckCircle,
  XCircle, Radio, ArrowLeft, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Broadcast {
  id: string;
  subject: string;
  content: string;
  recipientType: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  sentAt: string | null;
  lastResentAt: string | null;
  createdByName: string;
}

interface BroadcastDetail extends Broadcast {
  recipients: {
    id: string;
    userId: string;
    email: string;
    name: string;
    status: string;
    sentAt: string | null;
    error: string | null;
  }[];
}

interface Recipient {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  role: string;
}

type View = 'list' | 'create' | 'detail';

export default function AdminBroadcastsPage() {
  const { toast } = useToast();

  // State
  const [view, setView] = useState<View>('list');
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create form
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Send modal
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendBroadcastId, setSendBroadcastId] = useState<string | null>(null);
  const [sendBroadcastSubject, setSendBroadcastSubject] = useState('');
  const [recipientType, setRecipientType] = useState<'all' | 'merchants' | 'partners' | 'custom'>('all');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Recipient[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Recipient[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const fetchBroadcasts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/broadcasts');
      const data = await res.json();
      if (data.success) setBroadcasts(data.data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load broadcasts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchBroadcasts(); }, [fetchBroadcasts]);

  const handleCreate = async () => {
    if (!subject.trim() || !content.trim()) {
      toast({ title: 'Error', description: 'Subject and content are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, content }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Broadcast created', description: 'You can now send it to recipients.' });
        setSubject('');
        setContent('');
        setView('list');
        fetchBroadcasts();
        // Open send modal for the new broadcast
        openSendModal(data.data.id, data.data.subject);
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create broadcast', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openSendModal = (id: string, broadcastSubject: string) => {
    setSendBroadcastId(id);
    setSendBroadcastSubject(broadcastSubject);
    setRecipientType('all');
    setSelectedUsers([]);
    setRecipientSearch('');
    setSearchResults([]);
    setShowSendModal(true);
  };

  const searchRecipients = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/broadcasts/recipients?search=${encodeURIComponent(query)}&type=${recipientType === 'custom' ? 'all' : recipientType}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data.filter((r: Recipient) => !selectedUsers.some(s => s.id === r.id)));
      }
    } catch {} finally { setSearching(false); }
  }, [recipientType, selectedUsers]);

  useEffect(() => {
    if (recipientType !== 'custom') return;
    const t = setTimeout(() => searchRecipients(recipientSearch), 300);
    return () => clearTimeout(t);
  }, [recipientSearch, searchRecipients, recipientType]);

  const handleSend = async () => {
    if (!sendBroadcastId) return;
    if (recipientType === 'custom' && selectedUsers.length === 0) {
      toast({ title: 'Error', description: 'Select at least one recipient', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/admin/broadcasts/${sendBroadcastId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientType,
          selectedUserIds: recipientType === 'custom' ? selectedUsers.map(u => u.id) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'Broadcast sent!',
          description: `Sent to ${data.data.sentCount} of ${data.data.totalRecipients} recipients${data.data.failedCount > 0 ? ` (${data.data.failedCount} failed)` : ''}.`,
        });
        setShowSendModal(false);
        fetchBroadcasts();
        if (selectedBroadcast?.id === sendBroadcastId) {
          loadBroadcastDetail(sendBroadcastId);
        }
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to send broadcast', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const loadBroadcastDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedBroadcast(data.data);
        setView('detail');
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load broadcast details', variant: 'destructive' });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedBroadcast) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/broadcasts/${selectedBroadcast.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: editSubject, content: editContent }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Updated', description: 'Broadcast updated successfully.' });
        setEditing(false);
        loadBroadcastDetail(selectedBroadcast.id);
        fetchBroadcasts();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update broadcast', variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; icon: any }> = {
      draft: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300', icon: Clock },
      sending: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: Loader2 },
      sent: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', icon: CheckCircle },
      failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: XCircle },
    };
    const s = map[status] || map.draft;
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
        <Icon className={`w-3 h-3 ${status === 'sending' ? 'animate-spin' : ''}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const recipientTypeLabel = (t: string) => {
    const map: Record<string, string> = { all: 'All Users', merchants: 'Merchants Only', partners: 'Partners Only', custom: 'Custom Selection' };
    return map[t] || t;
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // ── List View ──
  if (view === 'list') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Email Broadcasts</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Send emails to merchants and partners</p>
          </div>
          <Button
            onClick={() => { setSubject(''); setContent(''); setView('create'); }}
            className="gap-2 bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-0"
          >
            <Plus className="w-4 h-4" />
            New Broadcast
          </Button>
        </div>

        {/* Broadcasts List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 p-12 text-center">
            <Mail className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No broadcasts yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Create your first broadcast to communicate with your merchants and partners.</p>
            <Button
              onClick={() => setView('create')}
              className="gap-2 bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-0"
            >
              <Plus className="w-4 h-4" />
              Create Broadcast
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((b) => (
              <div
                key={b.id}
                className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 hover:border-amber-300 dark:hover:border-amber-700 transition-colors cursor-pointer"
                onClick={() => loadBroadcastDetail(b.id)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{b.subject}</h3>
                        {statusBadge(b.status)}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{b.content}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {b.status === 'draft' ? recipientTypeLabel(b.recipientType) : `${b.sentCount}/${b.totalRecipients} sent`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(b.sentAt || b.createdAt)}
                        </span>
                        {b.lastResentAt && (
                          <span className="flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Resent {formatDate(b.lastResentAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {b.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800"
                          onClick={(e) => { e.stopPropagation(); openSendModal(b.id, b.subject); }}
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send
                        </Button>
                      )}
                      {b.status === 'sent' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={(e) => { e.stopPropagation(); openSendModal(b.id, b.subject); }}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Resend
                        </Button>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Send Modal */}
        {showSendModal && renderSendModal()}
      </div>
    );
  }

  // ── Create View ──
  if (view === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('list')} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New Broadcast</h1>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-pink-600 flex items-center justify-center text-white">
                <Mail className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Compose Email</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Write your broadcast email content</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 text-sm">Subject</Label>
              <Input
                placeholder="e.g. Important Update from YetoPay"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 text-sm">Content</Label>
              <textarea
                className="w-full min-h-[200px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-y"
                placeholder="Write your email content here. You can use line breaks for paragraphs..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <p className="text-xs text-slate-400">Separate paragraphs with blank lines. The content will be wrapped in a branded YetoPay email template.</p>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/50 flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setView('list')}>Cancel</Button>
            <Button
              size="sm"
              disabled={saving || !subject.trim() || !content.trim()}
              onClick={handleCreate}
              className="gap-2 bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-0"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Create & Send
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Detail View ──
  if (view === 'detail' && selectedBroadcast) {
    const b = selectedBroadcast;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setView('list'); setEditing(false); }} className="gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-md">{b.subject}</h1>
            {statusBadge(b.status)}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => { setEditing(true); setEditSubject(b.subject); setEditContent(b.content); }}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-0"
              onClick={() => openSendModal(b.id, b.subject)}
            >
              {b.status === 'sent' ? <RefreshCw className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
              {b.status === 'sent' ? 'Resend' : 'Send'}
            </Button>
          </div>
        </div>

        {/* Edit Mode */}
        {editing && (
          <div className="border border-amber-200 dark:border-amber-800 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-200 dark:border-amber-800/50">
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Edit Broadcast</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Subject</Label>
                <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Content</Label>
                <textarea
                  className="w-full min-h-[150px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-y"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button
                  size="sm"
                  disabled={editSaving}
                  onClick={handleEdit}
                  className="bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-0"
                >
                  {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Broadcast Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 p-5">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-2">
              <Users className="w-3.5 h-3.5" />
              Recipients
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{b.totalRecipients || 0}</p>
            <p className="text-xs text-slate-400 mt-1">{recipientTypeLabel(b.recipientType)}</p>
          </div>
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 p-5">
            <div className="flex items-center gap-2 text-emerald-500 text-xs mb-2">
              <CheckCircle className="w-3.5 h-3.5" />
              Delivered
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{b.sentCount || 0}</p>
            <p className="text-xs text-slate-400 mt-1">{b.sentAt ? `Sent ${formatDate(b.sentAt)}` : 'Not sent yet'}</p>
          </div>
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 p-5">
            <div className="flex items-center gap-2 text-red-500 text-xs mb-2">
              <XCircle className="w-3.5 h-3.5" />
              Failed
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{b.failedCount || 0}</p>
            <p className="text-xs text-slate-400 mt-1">{b.lastResentAt ? `Last resent ${formatDate(b.lastResentAt)}` : '-'}</p>
          </div>
        </div>

        {/* Content Preview */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Email Content
            </h3>
          </div>
          <div className="p-6">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-5">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">{b.subject}</h4>
              <div className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{b.content}</div>
            </div>
          </div>
        </div>

        {/* Recipients List */}
        {b.recipients && b.recipients.length > 0 && (
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4" />
                Delivery Log ({b.recipients.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {b.recipients.map((r) => (
                <div key={r.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{r.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{r.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.sentAt && <span className="text-xs text-slate-400">{formatDate(r.sentAt)}</span>}
                    {r.status === 'sent' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    {r.status === 'failed' && (
                      <span className="flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-red-500" />
                        {r.error && <span className="text-xs text-red-500 max-w-[200px] truncate">{r.error}</span>}
                      </span>
                    )}
                    {r.status === 'pending' && <Clock className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showSendModal && renderSendModal()}
      </div>
    );
  }

  // ── Send Modal ──
  function renderSendModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !sending && setShowSendModal(false)} />
        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Send Broadcast</h2>
                <p className="text-xs text-slate-500 mt-1 truncate max-w-sm">{sendBroadcastSubject}</p>
              </div>
              <button onClick={() => !sending && setShowSendModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Recipient Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Send to</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'all', label: 'Everyone', desc: 'All merchants & partners', icon: Radio },
                  { value: 'merchants', label: 'Merchants', desc: 'Merchants only', icon: Store },
                  { value: 'partners', label: 'Partners', desc: 'Partners only', icon: Building2 },
                  { value: 'custom', label: 'Custom', desc: 'Search & select', icon: Search },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setRecipientType(opt.value); setSelectedUsers([]); setSearchResults([]); setRecipientSearch(''); }}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      recipientType === opt.value
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <opt.icon className={`w-4 h-4 flex-shrink-0 ${recipientType === opt.value ? 'text-amber-600' : 'text-slate-400'}`} />
                    <div>
                      <p className={`text-sm font-medium ${recipientType === opt.value ? 'text-amber-800 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</p>
                      <p className="text-[10px] text-slate-400">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Recipient Picker */}
            {recipientType === 'custom' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search by name, email, or company..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="pl-10"
                  />
                  {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 animate-spin" />}
                </div>

                {/* Selected users */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((u) => (
                      <span key={u.id} className="inline-flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-full text-xs font-medium">
                        {u.name}
                        <button onClick={() => setSelectedUsers(prev => prev.filter(s => s.id !== u.id))} className="hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search results */}
                {searchResults.length > 0 && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[200px] overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setSelectedUsers(prev => [...prev, r]);
                          setSearchResults(prev => prev.filter(s => s.id !== r.id));
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{r.name}</p>
                          <p className="text-xs text-slate-500">{r.email}{r.companyName ? ` - ${r.companyName}` : ''}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                          {r.role}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {recipientSearch.length >= 2 && !searching && searchResults.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">No results found</p>
                )}
              </div>
            )}

            {/* Warning for broadcast */}
            {recipientType !== 'custom' && (
              <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  This will send the email to <strong>{recipientType === 'all' ? 'all merchants and partners' : recipientType === 'merchants' ? 'all merchants' : 'all partners'}</strong> with verified email addresses.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/50 flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowSendModal(false)} disabled={sending}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending || (recipientType === 'custom' && selectedUsers.length === 0)}
              className="gap-2 bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-0"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending...' : `Send${recipientType === 'custom' ? ` to ${selectedUsers.length}` : ''}`}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
