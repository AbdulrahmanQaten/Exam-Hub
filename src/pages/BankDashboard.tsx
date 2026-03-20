import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Library, ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { QuestionBank, getBanks, createBank, deleteBank } from "@/lib/bankStore";
import { toast } from "sonner";

export default function BankDashboard() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBankTitle, setNewBankTitle] = useState("");
  const [newBankDesc, setNewBankDesc] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    } else if (user) {
      loadBanks();
    }
  }, [user, isLoading, navigate]);

  const loadBanks = async () => {
    try {
      setLoading(true);
      const data = await getBanks(user!.id);
      setBanks(data);
    } catch (err: any) {
      toast.error("حدث خطأ في جلب البنوك");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBank = async () => {
    if (!newBankTitle.trim()) {
      toast.error("اسم البنك مطلوب");
      return;
    }
    try {
      const bank = await createBank(user!.id, newBankTitle, newBankDesc);
      setBanks([bank, ...banks]);
      setIsDialogOpen(false);
      setNewBankTitle("");
      setNewBankDesc("");
      toast.success("تم إنشاء البنك بنجاح");
    } catch (err: any) {
      toast.error("حدث خطأ أثناء الإنشاء");
    }
  };

  const handleDeleteBank = async () => {
    if (deleteTarget) {
      try {
        await deleteBank(deleteTarget);
        setBanks(banks.filter((b) => b.id !== deleteTarget));
        toast.success("تم الحذف بنجاح");
        setDeleteTarget(null);
      } catch (err: any) {
        toast.error("حدث خطأ أثناء الحذف");
      }
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="container py-8">
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>هل أنت متأكد من حذف هذا البنك؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف البنك وجميع الأسئلة والوحدات داخله بشكل نهائي. لا يمكنك التراجع عن هذا الإجراء أبداً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBank} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Library className="h-8 w-8 text-primary" />
            بنوك الأسئلة الخاصة بي
          </h1>
          <p className="text-muted-foreground mt-2">أنشئ بنك أسئلة واحتفظ بأسئلتك للرجوع إليها مستقبلاً وتكوين الاختبارات منها</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              إنشاء بنك جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="text-right" dir="rtl">
            <DialogHeader className="text-right sm:text-right">
              <DialogTitle>بنك أسئلة جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم البنك</label>
                <Input placeholder="مثال: رياضيات الصف الأول الثانوي" value={newBankTitle} onChange={(e) => setNewBankTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">وصف البنك (اختياري)</label>
                <Input placeholder="فصل دراسي أول، يغطي الجبر والهندسة..." value={newBankDesc} onChange={(e) => setNewBankDesc(e.target.value)} />
              </div>
              <Button onClick={handleCreateBank} className="w-full">إضافة البنك</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">جاري التحميل...</div>
      ) : banks.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed">
          <Library className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-medium mb-2">لا توجد بنوك أسئلة بعد</h3>
          <p className="text-muted-foreground">قم بإنشاء بنكك الأول للبدء بتخزين وتصنيف أسئلتك.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {banks.map((bank) => (
            <Card 
              key={bank.id} 
              className="p-5 hover:border-primary/50 transition-colors cursor-pointer group flex flex-col h-full"
              onClick={() => navigate(`/banks/${bank.id}`)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                  <Library className="h-5 w-5" />
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity" onClick={(e) => { e.stopPropagation(); setDeleteTarget(bank.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <h3 className="font-bold text-lg mb-1">{bank.title}</h3>
              {bank.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{bank.description}</p>}
              
              <div className="mt-auto pt-4 flex items-center text-sm font-medium text-primary">
                الوصول للأسئلة
                <ChevronLeft className="h-4 w-4 ml-1" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
