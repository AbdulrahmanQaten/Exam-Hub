import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Trash2, Plus, Users, GraduationCap, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useNavigate } from "react-router-dom";

interface ClassEntry {
  id: string;
  name: string;
  description: string;
  students: { name: string; studentId: string }[];
}

export default function ClassManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  usePageTitle("إدارة الفصول والطلاب");
  
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("teacher_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setClasses(data as any);
    } catch {
      toast.error("خطأ في جلب الفصول");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) loadClasses(); }, [user]);

  const handleCreateClass = async () => {
    if (!newName.trim()) return;
    try {
      const { data, error } = await supabase
        .from("classes")
        .insert({ teacher_id: user?.id, name: newName, description: newDesc })
        .select()
        .single();
      if (error) throw error;
      setClasses([data as any, ...classes]);
      setIsAddOpen(false);
      setNewName(""); setNewDesc("");
      toast.success("تم إنشاء الفصل");
    } catch {
      toast.error("خطأ في الإنشاء");
    }
  };

  const handleDeleteClass = async () => {
    if (!deleteTarget) return;
    try {
      await supabase.from("classes").delete().eq("id", deleteTarget);
      setClasses(classes.filter(c => c.id !== deleteTarget));
      toast.success("تم حذف الفصل بنجاح");
      setDeleteTarget(null);
    } catch {
      toast.error("خطأ في الحذف");
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="container py-8" dir="rtl">
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>هل أنت متأكد من حذف هذا الفصل؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الفصل وجميع بيانات الطلاب المسجلين به بشكل نهائي. لن يؤثر هذا على نتائج الاختبارات السابقة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClass} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            إدارة الفصول والطلاب
          </h1>
          <p className="text-muted-foreground mt-2">نظّم طلابك في مجموعات لتسهيل إدارة الاختبارات والنتائج</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> فصل جديد</Button>
          </DialogTrigger>
          <DialogContent className="text-right" dir="rtl">
            <DialogHeader className="text-right sm:text-right"><DialogTitle>إنشاء فصل دراسي</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم الفصل</label>
                <Input placeholder="مثال: ثاني ثانوي - أ" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">وصف قصير (اختياري)</label>
                <Input placeholder="أدخل وصفاً للفصل..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              </div>
              <Button onClick={handleCreateClass} className="w-full h-12">إنشاء الفصل</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed">
          <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-medium mb-2">لا توجد فصول دراسية بعد</h3>
          <p className="text-muted-foreground">قم بإنشاء فصلك الأول للبدء بإضافة الطلاب.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map(cls => (
            <Card 
              key={cls.id} 
              className="p-5 hover:border-primary/50 transition-all cursor-pointer group flex flex-col h-full relative"
              onClick={() => navigate(`/classes/${cls.id}`)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity" 
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(cls.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <h3 className="font-bold text-lg mb-1">{cls.name}</h3>
              {cls.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{cls.description}</p>}
              
              <div className="mt-auto pt-4 flex items-center justify-between border-t border-muted">
                <span className="text-xs font-medium bg-muted px-2 py-1 rounded-md">
                  {cls.students?.length || 0} طالب
                </span>
                <div className="flex items-center text-sm font-medium text-primary">
                  إدارة الطلاب
                  <ChevronLeft className="h-4 w-4 mr-1" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
