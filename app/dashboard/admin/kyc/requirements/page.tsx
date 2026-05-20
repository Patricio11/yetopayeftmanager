"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, GripVertical, Pencil, Trash2, Upload, X, FileText,
  ChevronDown, Loader2, ToggleLeft, ToggleRight, Download, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Requirement {
  id: string;
  name: string;
  description: string | null;
  appliesTo: "merchant" | "partner" | "both";
  templateUrl: string | null;
  templateOriginalName: string | null;
  templateMimeType: string | null;
  templateSizeBytes: number | null;
  required: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const API = "/api/admin/onboarding-requirements";

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Requirement | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(API);
      const data = await res.json();
      if (data.success) setRequirements(data.data);
    } catch {
      toast({ title: "Error", description: "Failed to load requirements", variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  };
  const handleDrop = async (idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const items = [...requirements];
    const [moved] = items.splice(dragIdx, 1);
    items.splice(idx, 0, moved);
    setRequirements(items);
    setDragIdx(null);
    setOverIdx(null);

    try {
      await fetch(`${API}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: items.map((r) => r.id) }),
      });
    } catch {
      toast({ title: "Error", description: "Failed to save order", variant: "destructive" });
      fetchData();
    }
  };

  const toggleActive = async (req: Requirement) => {
    try {
      const res = await fetch(`${API}/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !req.active }),
      });
      const data = await res.json();
      if (data.success) {
        setRequirements((prev) => prev.map((r) => (r.id === req.id ? data.data : r)));
        toast({ title: req.active ? "Deactivated" : "Activated", description: `${req.name} is now ${req.active ? "inactive" : "active"}` });
      }
    } catch {
      toast({ title: "Error", description: "Failed to toggle", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setRequirements((prev) => prev.filter((r) => r.id !== id));
        toast({ title: "Deleted", description: "Requirement removed" });
      } else {
        toast({ title: "Cannot delete", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
    setDeleteConfirm(null);
  };

  const appliesToBadge = (v: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      both: { label: "Both", cls: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300" },
      merchant: { label: "Merchant", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
      partner: { label: "Partner", cls: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400" },
    };
    const s = map[v] || map.both;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Onboarding Requirements</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage the documents and information required during merchant/partner onboarding.
          </p>
        </div>
        <Button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
        >
          <Plus className="w-4 h-4" /> Add Requirement
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      ) : requirements.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
          <FileText className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">No requirements yet</p>
          <p className="text-sm text-slate-500 mt-1">Click "Add Requirement" to create one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requirements.map((req, idx) => (
            <div
              key={req.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              className={`group relative flex items-center gap-4 p-4 rounded-xl border transition-all ${
                overIdx === idx && dragIdx !== idx
                  ? "border-amber-400 bg-amber-50/50 dark:bg-amber-900/10"
                  : req.active
                    ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                    : "border-slate-200/60 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 opacity-60"
              }`}
            >
              {/* Drag handle */}
              <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <GripVertical className="w-5 h-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 dark:text-white">{req.name}</span>
                  {appliesToBadge(req.appliesTo)}
                  {req.required ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Required</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">Optional</span>
                  )}
                  {req.templateUrl && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Has Template</span>
                  )}
                  {!req.active && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300">Inactive</span>
                  )}
                </div>
                {req.description && (
                  <p className="text-sm text-slate-500 mt-1 truncate">{req.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {req.templateUrl ? (
                  <a
                    href={req.templateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="Download template"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                ) : null}
                <TemplateUploadButton reqId={req.id} onDone={fetchData} />
                <button
                  onClick={() => toggleActive(req)}
                  className={`p-2 rounded-lg transition-colors ${
                    req.active
                      ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                      : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                  title={req.active ? "Deactivate" : "Activate"}
                >
                  {req.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => { setEditing(req); setShowForm(true); }}
                  className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(req.id)}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Delete confirmation */}
              {deleteConfirm === req.id && (
                <div className="absolute inset-0 bg-white/95 dark:bg-slate-800/95 rounded-xl flex items-center justify-center gap-3 z-10 backdrop-blur-sm">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">Delete "{req.name}"?</span>
                  <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDelete(req.id)}>Delete</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <RequirementForm
          requirement={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); fetchData(); }}
          toast={toast}
        />
      )}
    </div>
  );
}

function TemplateUploadButton({ reqId, onDone }: { reqId: string; onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API}/${reqId}/template`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Template uploaded", description: file.name });
        onDone();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
        title="Upload template"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
      </button>
    </>
  );
}

function RequirementForm({
  requirement,
  onClose,
  onSaved,
  toast,
}: {
  requirement: Requirement | null;
  onClose: () => void;
  onSaved: () => void;
  toast: any;
}) {
  const [name, setName] = useState(requirement?.name || "");
  const [description, setDescription] = useState(requirement?.description || "");
  const [appliesTo, setAppliesTo] = useState<"merchant" | "partner" | "both">(requirement?.appliesTo || "both");
  const [required, setRequired] = useState(requirement?.required ?? true);
  const [saving, setSaving] = useState(false);

  const isEdit = !!requirement;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const url = isEdit ? `${API}/${requirement.id}` : API;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, appliesTo, required }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: isEdit ? "Updated" : "Created", description: `${name} ${isEdit ? "updated" : "created"} successfully` });
        onSaved();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isEdit ? "Edit Requirement" : "New Requirement"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tax Clearance Certificate"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Helper text shown to the user during upload..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white resize-none"
            />
          </div>

          {/* Applies To */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Applies To
            </label>
            <div className="flex gap-2">
              {(["both", "merchant", "partner"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAppliesTo(opt)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    appliesTo === opt
                      ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/20 dark:border-amber-600 dark:text-amber-400"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Required toggle */}
          <div className="flex items-center justify-between py-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Required document</label>
            <button
              type="button"
              onClick={() => setRequired(!required)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                required ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                required ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
