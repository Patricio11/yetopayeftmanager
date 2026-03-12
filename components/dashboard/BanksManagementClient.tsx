"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Building2,
  CheckCircle,
  XCircle,
  TrendingUp,
  AlertTriangle,
  GripVertical,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Bank = {
  bank: {
    id: string;
    bankName: string;
    code: string;
    color: string | null;
    branchCode: string | null;
    enabled: boolean | null;
    createdAt: Date;
    updatedAt: Date;
  };
  transactionCount: number;
  completedCount: number;
};

interface BanksManagementClientProps {
  initialBanks: Bank[];
}

export function BanksManagementClient({ initialBanks }: BanksManagementClientProps) {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>(initialBanks);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    bankName: "",
    code: "",
    color: "#10b981",
    branchCode: "",
    enabled: true,
    displayOrder: 0,
  });

  const resetForm = () => {
    setFormData({
      bankName: "",
      code: "",
      color: "#10b981",
      branchCode: "",
      enabled: true,
      displayOrder: 0,
    });
  };

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // Add new bank to local state
        const newBank = {
          bank: result.bank,
          transactionCount: 0,
          completedCount: 0,
        };
        setBanks([newBank, ...banks]);
        
        setIsCreateDialogOpen(false);
        resetForm();
        router.refresh();
      } else {
        alert(result.message || "Failed to create bank");
      }
    } catch (error) {
      console.error("Error creating bank:", error);
      alert("Failed to create bank");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedBank) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/banks/${selectedBank.bank.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // Update bank in local state
        setBanks(banks.map(b => 
          b.bank.id === selectedBank.bank.id 
            ? { ...b, bank: result.bank }
            : b
        ));
        
        setIsEditDialogOpen(false);
        setSelectedBank(null);
        resetForm();
        router.refresh();
      } else {
        alert(result.message || "Failed to update bank");
      }
    } catch (error) {
      console.error("Error updating bank:", error);
      alert("Failed to update bank");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBank) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/banks/${selectedBank.bank.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        // Remove bank from local state
        setBanks(banks.filter(b => b.bank.id !== selectedBank.bank.id));
        
        setIsDeleteDialogOpen(false);
        setSelectedBank(null);
        router.refresh();
      } else {
        alert(result.message || "Failed to delete bank");
      }
    } catch (error) {
      console.error("Error deleting bank:", error);
      alert("Failed to delete bank");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEnabled = async (bank: Bank) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/banks/${bank.bank.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !bank.bank.enabled }),
      });

      const result = await response.json();

      if (result.success) {
        // Update bank status in local state
        setBanks(banks.map(b => 
          b.bank.id === bank.bank.id 
            ? { ...b, bank: { ...b.bank, enabled: result.bank.enabled } }
            : b
        ));
        router.refresh();
      } else {
        alert(result.message || "Failed to update bank status");
      }
    } catch (error) {
      console.error("Error toggling bank status:", error);
      alert("Failed to update bank status");
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (bank: Bank) => {
    setSelectedBank(bank);
    setFormData({
      bankName: bank.bank.bankName,
      code: bank.bank.code,
      color: bank.bank.color || "#10b981",
      branchCode: bank.bank.branchCode || "",
      enabled: bank.bank.enabled ?? true,
      displayOrder: (bank.bank as any).displayOrder ?? 0,
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (bank: Bank) => {
    setSelectedBank(bank);
    setIsViewDialogOpen(true);
  };

  const openDeleteDialog = (bank: Bank) => {
    setSelectedBank(bank);
    setIsDeleteDialogOpen(true);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newBanks = [...banks];
    const draggedBank = newBanks[draggedIndex];
    newBanks.splice(draggedIndex, 1);
    newBanks.splice(index, 0, draggedBank);

    setBanks(newBanks);
    setDraggedIndex(index);
    setHasOrderChanged(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSaveOrder = async () => {
    setIsLoading(true);
    try {
      const bankOrders = banks.map((bank, index) => ({
        id: bank.bank.id,
        displayOrder: index,
      }));

      const response = await fetch("/api/admin/banks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankOrders }),
      });

      const result = await response.json();

      if (result.success) {
        setHasOrderChanged(false);
        alert("Bank order saved successfully!");
        router.refresh();
      } else {
        alert(result.message || "Failed to save bank order");
      }
    } catch (error) {
      console.error("Error saving bank order:", error);
      alert("Failed to save bank order");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Bank Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage Pay By Bank payment banks and their settings. Drag banks to reorder them.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasOrderChanged && (
            <Button
              onClick={handleSaveOrder}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Order
            </Button>
          )}
          <Button
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
            className="bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Bank
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-blue-900/10 border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Total Banks
                </h3>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {banks.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                Registered banks
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-white to-amber-50/50 dark:from-slate-800 dark:to-amber-900/10 border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Active Banks
                </h3>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {banks.filter((b) => b.bank.enabled).length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                Currently enabled
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-white to-amber-50/50 dark:from-slate-800 dark:to-amber-900/10 border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Total Transactions
                </h3>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {banks.reduce((sum, b) => sum + b.transactionCount, 0)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                Across all banks
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Banks Table */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Banks List</h2>
        </div>

        <div className="overflow-x-auto px-6">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="pl-0">Bank</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Branch Code</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-0">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-4">
                      <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                      <div>
                        <p className="font-semibold mb-1">No banks found</p>
                        <p className="text-sm">Add your first bank to get started</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                banks.map((bank, index) => {
                  const successRate = bank.transactionCount > 0
                    ? Math.round((bank.completedCount / bank.transactionCount) * 100)
                    : 0;

                  return (
                    <TableRow
                      key={bank.bank.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                        draggedIndex === index ? "opacity-50" : ""
                      }`}
                    >
                      <TableCell className="pl-0 cursor-move">
                        <GripVertical className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                      </TableCell>
                      <TableCell className="pl-0">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                            style={{ backgroundColor: bank.bank.color || "#10b981" }}
                          >
                            {bank.bank.bankName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {bank.bank.bankName}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                          {bank.bank.code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {bank.bank.branchCode || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {bank.transactionCount}
                          </span>
                          <span className="text-slate-500 dark:text-slate-500 ml-1">
                            total
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-pink-600"
                              style={{ width: `${successRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-10">
                            {successRate}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleEnabled(bank)}
                          disabled={isLoading}
                          className={`gap-1.5 ${
                            bank.bank.enabled
                              ? "text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400"
                              : "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400"
                          }`}
                        >
                          {bank.bank.enabled ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4" />
                              Disabled
                            </>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="pr-0">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewDialog(bank)}
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(bank)}
                            className="hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(bank)}
                            className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                            disabled={bank.transactionCount > 0}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Bank</DialogTitle>
            <DialogDescription>
              Create a new bank for Pay By Bank payments
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                placeholder="e.g., First National Bank"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="code">Bank Code *</Label>
              <Input
                id="code"
                placeholder="e.g., fnb (lowercase, no spaces)"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
              />
              <p className="text-xs text-slate-500 mt-1">
                Use lowercase letters, numbers, hyphens, and underscores only
              </p>
            </div>

            <div>
              <Label htmlFor="color">Brand Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#10b981"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="branchCode">Branch Code (Optional)</Label>
              <Input
                id="branchCode"
                placeholder="e.g., 250655"
                value={formData.branchCode}
                onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="w-4 h-4 cursor-pointer"
              />
              <Label htmlFor="enabled" className="cursor-pointer">
                Enable bank immediately
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isLoading || !formData.bankName || !formData.code}>
              {isLoading ? "Creating..." : "Create Bank"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bank</DialogTitle>
            <DialogDescription>
              Update bank information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-bankName">Bank Name *</Label>
              <Input
                id="edit-bankName"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-code">Bank Code *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
              />
            </div>

            <div>
              <Label htmlFor="edit-color">Brand Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="edit-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-branchCode">Branch Code</Label>
              <Input
                id="edit-branchCode"
                value={formData.branchCode}
                onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-displayOrder">Display Order</Label>
              <Input
                id="edit-displayOrder"
                type="number"
                min="0"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-slate-500 mt-1">
                Lower numbers appear first in payment selection
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="w-4 h-4 cursor-pointer"
              />
              <Label htmlFor="edit-enabled" className="cursor-pointer">
                Bank enabled
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Bank"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bank Details</DialogTitle>
            <DialogDescription>
              View complete bank information
            </DialogDescription>
          </DialogHeader>

          {selectedBank && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center font-bold text-white text-xl"
                  style={{ backgroundColor: selectedBank.bank.color || "#10b981" }}
                >
                  {selectedBank.bank.bankName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedBank.bank.bankName}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Code: {selectedBank.bank.code}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">Branch Code</Label>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {selectedBank.bank.branchCode || "Not set"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">Status</Label>
                  <p className="font-semibold">
                    {selectedBank.bank.enabled ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-red-600">Disabled</span>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">Total Transactions</Label>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {selectedBank.transactionCount}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">Completed</Label>
                  <p className="font-semibold text-green-600">
                    {selectedBank.completedCount}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-600 dark:text-slate-400">Brand Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-8 h-8 rounded border-2 border-slate-200 dark:border-slate-700"
                    style={{ backgroundColor: selectedBank.bank.color || "#10b981" }}
                  />
                  <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                    {selectedBank.bank.color || "#10b981"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bank</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bank?
            </DialogDescription>
          </DialogHeader>

          {selectedBank && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {selectedBank.bank.bankName}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              {selectedBank.transactionCount > 0 && (
                <p className="text-sm text-red-600 mt-4">
                  This bank has {selectedBank.transactionCount} transaction(s) and cannot be deleted.
                  You can disable it instead.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isLoading || (selectedBank?.transactionCount ?? 0) > 0}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Deleting..." : "Delete Bank"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
