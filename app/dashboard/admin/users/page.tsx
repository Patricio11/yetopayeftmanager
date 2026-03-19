'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, Users, CheckCircle, XCircle, Clock, RefreshCw, Mail, Shield,
  Building2, ChevronRight, UserCog
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface UserItem {
  id: string;
  name: string;
  email: string;
  fullName?: string;
  phone?: string;
  role?: string;
  companyName?: string;
  isActive: boolean;
  emailVerified: boolean;
  kycStatus?: string;
  lastLogin?: string;
  balance?: string;
  createdAt: string;
  avatarUrl?: string;
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [page, search, roleFilter, statusFilter, toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const stats = {
    total,
    merchants: users.filter(u => u.role === 'merchant').length,
    admins: users.filter(u => u.role === 'admin').length,
    active: users.filter(u => u.isActive).length,
  };

  const roleBadge = (role?: string) => {
    if (role === 'admin') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"><Shield className="w-3 h-3" />Admin</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><Building2 className="w-3 h-3" />Merchant</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">View and manage all platform users</p>
        </div>
        <Button variant="outline" onClick={() => { setPage(1); fetchUsers(); }} className="gap-2">
          <RefreshCw className="w-4 h-4" />Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, bg: 'bg-blue-100 dark:bg-blue-900/30', fg: 'text-blue-600 dark:text-blue-400' },
          { label: 'Merchants', value: stats.merchants, icon: Building2, bg: 'bg-amber-100 dark:bg-amber-900/30', fg: 'text-amber-500 dark:text-amber-400' },
          { label: 'Admins', value: stats.admins, icon: Shield, bg: 'bg-purple-100 dark:bg-purple-900/30', fg: 'text-purple-600 dark:text-purple-400' },
          { label: 'Active', value: stats.active, icon: CheckCircle, bg: 'bg-fyro-navy dark:bg-fyro-gold/10', fg: 'text-fyro-gold dark:text-fyro-gold' },
        ].map((s) => (
          <Card key={s.label} className="p-4 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon className={`w-5 h-5 ${s.fg}`} /></div>
              <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by name, email, or company..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
          </div>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm">
            <option value="all">All Roles</option>
            <option value="merchant">Merchants</option>
            <option value="admin">Admins</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Card>

      {/* User List */}
      <Card className="bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No users found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">User</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Company</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-500">Role</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-500">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-500">KYC</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-500">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Joined</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-fyro-navy to-fyro-gold flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {(u.name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{u.fullName || u.name}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.companyName || '—'}</td>
                      <td className="px-4 py-3 text-center">{roleBadge(u.role)}</td>
                      <td className="px-4 py-3 text-center">
                        {u.isActive
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" />Active</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">Inactive</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.kycStatus === 'approved'
                          ? <CheckCircle className="w-4 h-4 text-amber-500 mx-auto" />
                          : u.kycStatus === 'rejected'
                          ? <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                          : <Clock className="w-4 h-4 text-amber-500 mx-auto" />}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.emailVerified
                          ? <Mail className="w-4 h-4 text-amber-500 mx-auto" />
                          : <Mail className="w-4 h-4 text-slate-300 mx-auto" />}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        {u.role === 'merchant' && (
                          <Link href={`/dashboard/admin/merchants/${u.id}`}>
                            <Button size="sm" variant="outline" className="gap-1 text-xs">View<ChevronRight className="w-3 h-3" /></Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-700/50">
                <p className="text-sm text-slate-500">Page {page} of {totalPages} ({total} total)</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
