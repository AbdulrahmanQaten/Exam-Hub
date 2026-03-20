import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { StudentRosterEntry } from "@/lib/quizStore";

interface ExcelColumnSelectorProps {
  open: boolean;
  onClose: () => void;
  columns: string[];
  rows: Record<string, any>[];
  onConfirm: (entries: StudentRosterEntry[]) => void;
}

export function ExcelColumnSelector({ open, onClose, columns, rows, onConfirm }: ExcelColumnSelectorProps) {
  const [nameColumn, setNameColumn] = useState<string>("");
  const [idColumn, setIdColumn] = useState<string>("");

  const previewRows = rows.slice(0, 5);

  const handleConfirm = () => {
    if (!nameColumn || !idColumn) return;
    const entries: StudentRosterEntry[] = rows
      .map((row) => ({
        name: String(row[nameColumn] || "").trim(),
        studentId: String(row[idColumn] || "").trim(),
      }))
      .filter((e) => e.name && e.studentId);
    onConfirm(entries);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>اختيار الأعمدة</DialogTitle>
          <DialogDescription>
            حدد العمود الذي يحتوي على اسم الطالب والعمود الذي يحتوي على رقم الطالب
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 my-4">
          <div>
            <Label className="mb-2 block">عمود اسم الطالب</Label>
            <Select value={nameColumn} onValueChange={setNameColumn}>
              <SelectTrigger>
                <SelectValue placeholder="اختر العمود" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">عمود رقم الطالب</Label>
            <Select value={idColumn} onValueChange={setIdColumn}>
              <SelectTrigger>
                <SelectValue placeholder="اختر العمود" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview */}
        {nameColumn && idColumn && (
          <div>
            <Label className="mb-2 block text-sm text-muted-foreground">معاينة ({Math.min(5, rows.length)} من {rows.length} صف)</Label>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم الطالب</TableHead>
                    <TableHead className="text-right">رقم الطالب</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{String(row[nameColumn] || "")}</TableCell>
                      <TableCell className="font-mono">{String(row[idColumn] || "")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleConfirm} disabled={!nameColumn || !idColumn}>
            تأكيد ({rows.length} طالب)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
