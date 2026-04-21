import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Users, UserPlus, Trash2, ArrowRight, FileSpreadsheet, Download, Upload, Search, X, Loader2, Save
} from "lucide-react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ExcelColumnSelector } from "@/components/ExcelColumnSelector";

interface Student {
  name: string;
  studentId: string;
}

export default function ClassDetails() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classInfo, setClassInfo] = useState<{ name: string; description: string } | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [columnSelectorOpen, setColumnSelectorOpen] = useState(false);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<Record<string, any>[]>([]);

  usePageTitle(classInfo ? `فصل: ${classInfo.name}` : "تفاصيل الفصل");

  const loadClass = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", classId)
        .single();
      
      if (error) throw error;
      setClassInfo({ name: data.name, description: data.description });
      setStudents(data.students as Student[] || []);
    } catch (err) {
      toast.error("خطأ في تحميل بيانات الفصل");
      navigate("/classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user && classId) loadClass(); }, [user, classId]);

  const handleSaveStudents = async (updatedStudents: Student[]) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("classes")
        .update({ students: updatedStudents })
        .eq("id", classId);
      
      if (error) throw error;
      setStudents(updatedStudents);
      toast.success("تم حفظ التغييرات");
    } catch {
      toast.error("خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const addStudent = (name: string, sId: string) => {
    if (!name.trim() || !sId.trim()) return;
    if (students.some(s => s.studentId === sId)) {
      toast.error("هذا الرقم (الكود) مسجل مسبقاً لطالب آخر");
      return;
    }
    const newList = [...students, { name, studentId: sId }];
    handleSaveStudents(newList);
  };

  const removeStudent = (sId: string) => {
    const newList = students.filter(s => s.studentId !== sId);
    handleSaveStudents(newList);
  };

  const handleRosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
        if (rows.length === 0) { toast.error("الملف فارغ"); return; }
        const keys = Object.keys(rows[0]);
        
        if (keys.length === 2) {
          processImportedStudents(rows.map(row => ({
            name: String(row[keys[0]] || "").trim(),
            studentId: String(row[keys[1]] || "").trim()
          })));
        } else {
          setExcelColumns(keys);
          setExcelRows(rows);
          setColumnSelectorOpen(true);
        }
      } catch { toast.error("حدث خطأ في قراءة الملف"); }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processImportedStudents = (imported: Student[]) => {
    const valid = imported.filter(s => s.name && s.studentId);
    const uniqueMap = new Map<string, Student>();
    
    // Add existing ones
    students.forEach(s => uniqueMap.set(s.studentId, s));
    
    // Add new ones (overwrite or skip duplicates - here we skip or merge)
    let duplicates = 0;
    valid.forEach(s => {
      if (uniqueMap.has(s.studentId)) duplicates++;
      uniqueMap.set(s.studentId, s);
    });

    const newList = Array.from(uniqueMap.values());
    handleSaveStudents(newList);
    toast.success(`تم استيراد ${valid.length} طالب بنجاح${duplicates > 0 ? ` (تم تحديث ${duplicates} مكرر)` : ""}`);
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(students.map(s => ({
      "اسم الطالب": s.name,
      "الرقم (الكود)": s.studentId
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "قائمة الطلاب");
    XLSX.writeFile(wb, `طلاب_${classInfo?.name}.xlsx`);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.studentId.includes(searchQuery)
  );

  // Split students into two columns for desktop
  const half = Math.ceil(filteredStudents.length / 2);
  const leftCol = filteredStudents.slice(0, half);
  const rightCol = filteredStudents.slice(half);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const StudentTable = ({ list, startIndex }: { list: Student[], startIndex: number }) => (
    <div className="border rounded-lg overflow-x-auto bg-card min-w-full">
      <Table className="min-w-[350px] w-full">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 h-10">
            <TableHead className="w-10 text-center whitespace-nowrap text-xs">#</TableHead>
            <TableHead className="text-right whitespace-nowrap text-xs">اسم الطالب</TableHead>
            <TableHead className="text-right whitespace-nowrap text-xs">الكود</TableHead>
            <TableHead className="w-10 text-center whitespace-nowrap"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((s, idx) => (
            <TableRow key={s.studentId} className="group h-10">
              <TableCell className="text-center font-bold text-muted-foreground whitespace-nowrap text-xs p-2">{startIndex + idx + 1}</TableCell>
              <TableCell className="font-bold whitespace-nowrap text-sm p-2">{s.name}</TableCell>
              <TableCell className="font-mono text-xs whitespace-nowrap p-2">{s.studentId}</TableCell>
              <TableCell className="text-center p-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                  onClick={() => removeStudent(s.studentId)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="container max-w-7xl py-4 sm:py-6 px-3 sm:px-6" dir="rtl">
      <ExcelColumnSelector 
        open={columnSelectorOpen} 
        onClose={() => setColumnSelectorOpen(false)} 
        columns={excelColumns} 
        rows={excelRows} 
        onConfirm={processImportedStudents} 
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/classes")} className="h-9 w-9 rounded-full">
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">{classInfo?.name}</h1>
            <p className="text-xs text-muted-foreground line-clamp-1">{classInfo?.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleRosterUpload} className="hidden" />
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs flex-1 sm:flex-none px-3" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> استيراد
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs flex-1 sm:flex-none px-3" onClick={handleExportExcel}>
            <Download className="h-3.5 w-3.5" /> تصدير
          </Button>
          <AddStudentDialog onAdd={addStudent} />
        </div>
      </div>

      <Card className="p-3 sm:p-5 shadow-sm border-muted/60">
        <div className="flex flex-col gap-3 mb-4">
          <div className="bg-primary/5 text-primary px-3 py-1 rounded-full text-xs font-bold w-fit border border-primary/10">
            عدد الطلاب: {students.length}
          </div>
          <div className="relative w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="بحث سريع..." 
              className="pr-9 h-9 text-sm bg-muted/20 border-none focus-visible:ring-1" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">لا توجد نتائج للبحث</p>
          </div>
        ) : (
          <div className="w-full">
            {/* Mobile View: One Table with Horizontal Scroll */}
            <div className="block lg:hidden w-full overflow-hidden">
              <StudentTable list={filteredStudents} startIndex={0} />
            </div>

            {/* Desktop View: Two Tables */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              <StudentTable list={leftCol} startIndex={0} />
              <StudentTable list={rightCol} startIndex={half} />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function AddStudentDialog({ onAdd }: { onAdd: (n: string, s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [n, setN] = useState("");
  const [s, setS] = useState("");
  return (
    <div className="flex items-center flex-1 sm:flex-none">
      <Button className="gap-1.5 w-full sm:w-auto h-8 text-xs px-3" size="sm" onClick={() => setOpen(true)}><UserPlus className="h-3.5 w-3.5" /> إضافة طالب</Button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-5 relative animate-in fade-in zoom-in duration-200 shadow-2xl">
            <Button variant="ghost" size="icon" className="absolute left-3 top-3 h-8 w-8" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            <h3 className="text-lg font-bold mb-5 text-right">إضافة طالب جديد</h3>
            <div className="space-y-3">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-medium text-muted-foreground">اسم الطالب</label>
                <Input placeholder="أدخل الاسم" value={n} onChange={(e) => setN(e.target.value)} className="text-right h-10 text-sm" />
              </div>
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-medium text-muted-foreground">رقم الطالب (كود الدخول)</label>
                <Input placeholder="مثال: 2024001" value={s} onChange={(e) => setS(e.target.value)} className="text-right font-mono h-10 text-sm" />
              </div>
              <Button 
                onClick={() => { onAdd(n, s); setN(""); setS(""); setOpen(false); }} 
                className="w-full h-10 text-base mt-3"
                disabled={!n.trim() || !s.trim()}
              >
                تأكيد الإضافة
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
