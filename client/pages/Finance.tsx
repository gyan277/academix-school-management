import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, CreditCard, Wallet, Plus, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface ClassFee {
  id: string;
  class: string;
  academic_year: string;
  term: string | null;
  fee_amount: number;
  description: string | null;
  student_count?: number;
}

interface StudentFee {
  id: string;
  student_id: string;
  class: string;
  total_fee_amount: number;
  total_paid: number;
  balance: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  student_name: string;
  student_number: string;
}

export default function Finance() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    outstanding: 0,
    collectedToday: 0,
    collectionRate: 0,
  });

  // Class Fees State
  const [classFees, setClassFees] = useState<ClassFee[]>([]);
  const [isSetFeeDialogOpen, setIsSetFeeDialogOpen] = useState(false);
  const [newFee, setNewFee] = useState({
    class: "",
    fee_amount: "",
    term: "",
    description: "",
  });

  // Student Fees State
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentFee | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  useEffect(() => {
    loadFinanceData();
  }, [profile?.school_id]);

  const loadFinanceData = async () => {
    if (!profile?.school_id) return;

    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadClassFees(),
        loadStudentFees(),
        loadAvailableClasses(),
      ]);
    } catch (error: any) {
      console.error("Error loading finance data:", error);
      
      // Check if it's a "table does not exist" error
      if (error.message?.includes("does not exist") || error.code === '42P01') {
        toast({
          title: "Finance System Not Set Up",
          description: "Please run the database migration first. Check FINANCE_SYSTEM_GUIDE.md for instructions.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load finance data. Check console for details.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!profile?.school_id) return;

    try {
      // Get current academic year from school settings
      const { data: schoolData } = await supabase
        .from("school_settings")
        .select("current_academic_year")
        .eq("id", profile.school_id)
        .single();

      const currentYear = schoolData?.current_academic_year || "2024/2025";

      // Total revenue (all payments this year)
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount")
        .eq("school_id", profile.school_id);

      if (paymentsError && paymentsError.code !== 'PGRST116') {
        console.error("Error loading payments:", paymentsError);
      }

      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Outstanding fees (total balance)
      const { data: fees, error: feesError } = await supabase
        .from("student_fees")
        .select("balance, total_fee_amount")
        .eq("school_id", profile.school_id)
        .eq("academic_year", currentYear);

      if (feesError && feesError.code !== 'PGRST116') {
        console.error("Error loading fees:", feesError);
      }

      const outstanding = fees?.reduce((sum, f) => sum + Number(f.balance), 0) || 0;

      // Collected today
      const today = new Date().toISOString().split("T")[0];
      const { data: todayPayments, error: todayError } = await supabase
        .from("payments")
        .select("amount")
        .eq("school_id", profile.school_id)
        .eq("payment_date", today);

      if (todayError && todayError.code !== 'PGRST116') {
        console.error("Error loading today's payments:", todayError);
      }

      const collectedToday = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Collection rate
      const totalExpected = fees?.reduce((sum, f) => sum + Number(f.total_fee_amount), 0) || 0;
      const collectionRate = totalExpected > 0 ? ((totalRevenue / totalExpected) * 100) : 0;

      setStats({
        totalRevenue,
        outstanding,
        collectedToday,
        collectionRate,
      });
    } catch (error) {
      console.error("Error in loadStats:", error);
      // Set default stats on error
      setStats({
        totalRevenue: 0,
        outstanding: 0,
        collectedToday: 0,
        collectionRate: 0,
      });
    }
  };

  const loadClassFees = async () => {
    if (!profile?.school_id) return;

    try {
      const { data, error } = await supabase
        .from("class_fees")
        .select("*")
        .eq("school_id", profile.school_id)
        .order("class", { ascending: true });

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading class fees:", error);
      }
      setClassFees(data || []);
    } catch (error) {
      console.error("Error in loadClassFees:", error);
      setClassFees([]);
    }
  };

  const loadStudentFees = async () => {
    if (!profile?.school_id) return;

    try {
      const { data, error } = await supabase
        .from("student_fees")
        .select(`
          *,
          students (
            full_name,
            student_number
          )
        `)
        .eq("school_id", profile.school_id)
        .order("class", { ascending: true});

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading student fees:", error);
      }

      const formatted = data?.map((sf: any) => ({
        ...sf,
        student_name: sf.students?.full_name || "Unknown",
        student_number: sf.students?.student_number || "N/A",
      })) || [];

      setStudentFees(formatted);
    } catch (error) {
      console.error("Error in loadStudentFees:", error);
      setStudentFees([]);
    }
  };

  const loadAvailableClasses = async () => {
    if (!profile?.school_id) return;

    try {
      const { data, error } = await supabase
        .from("students")
        .select("class")
        .eq("school_id", profile.school_id)
        .eq("status", "active");

      if (error) {
        console.error("Error loading classes:", error);
        return;
      }

      const uniqueClasses = [...new Set(data?.map((s) => s.class) || [])].sort();
      setAvailableClasses(uniqueClasses);
    } catch (error) {
      console.error("Error in loadAvailableClasses:", error);
      setAvailableClasses([]);
    }
  };

  const loadPaymentHistory = async (studentFeeId: string) => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          users (
            full_name
          )
        `)
        .eq("student_fee_id", studentFeeId)
        .order("payment_date", { ascending: false });

      if (error) {
        console.error("Error loading payment history:", error);
        setPaymentHistory([]);
        return;
      }

      setPaymentHistory(data || []);
    } catch (error) {
      console.error("Error in loadPaymentHistory:", error);
      setPaymentHistory([]);
    }
  };

  const handleSetClassFee = async () => {
    if (!profile?.school_id || !newFee.class || !newFee.fee_amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get current academic year
      const { data: schoolData } = await supabase
        .from("school_settings")
        .select("current_academic_year")
        .eq("id", profile.school_id)
        .single();

      const currentYear = schoolData?.current_academic_year || "2024/2025";

      const { error } = await supabase
        .from("class_fees")
        .insert({
          school_id: profile.school_id,
          class: newFee.class,
          academic_year: currentYear,
          term: newFee.term || null,
          fee_amount: parseFloat(newFee.fee_amount),
          description: newFee.description || null,
          created_by: profile.id,
        });

      if (error) throw error;

      toast({
        title: "Fee Set Successfully",
        description: `All students in ${newFee.class} have been billed GH₵ ${newFee.fee_amount}`,
      });

      setIsSetFeeDialogOpen(false);
      setNewFee({ class: "", fee_amount: "", term: "", description: "" });
      loadFinanceData();
    } catch (error: any) {
      console.error("Error setting class fee:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to set class fee",
        variant: "destructive",
      });
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedStudent || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("payments")
        .insert({
          school_id: profile?.school_id,
          student_fee_id: selectedStudent.id,
          student_id: selectedStudent.student_id,
          amount: parseFloat(paymentAmount),
          payment_method: paymentMethod,
          reference_number: paymentReference || null,
          recorded_by: profile?.id,
        });

      if (error) throw error;

      toast({
        title: "Payment Recorded",
        description: `GH₵ ${paymentAmount} payment recorded for ${selectedStudent.student_name}`,
      });

      setIsPaymentDialogOpen(false);
      setSelectedStudent(null);
      setPaymentAmount("");
      setPaymentReference("");
      loadFinanceData();
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const filteredStudentFees = studentFees.filter(
    (sf) =>
      sf.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sf.student_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sf.class.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">Paid</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500">Partial</Badge>;
      case "unpaid":
        return <Badge variant="destructive">Unpaid</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout title="Finance" subtitle="Manage school finances, fees, and payments">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Finance" subtitle="Manage school finances, fees, and payments">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">GH₵ {stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                This academic year
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding Fees
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">GH₵ {stats.outstanding.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Pending payments
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Collected Today
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">GH₵ {stats.collectedToday.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Today's collections
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Collection Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.collectionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Payment completion
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students">Student Payments</TabsTrigger>
            <TabsTrigger value="class-fees">Class Fees</TabsTrigger>
          </TabsList>

          {/* Student Payments Tab */}
          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Student Payments</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Total Fee</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudentFees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No student fees found. Set class fees first.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudentFees.map((sf) => (
                        <TableRow key={sf.id}>
                          <TableCell className="font-medium">{sf.student_number}</TableCell>
                          <TableCell>{sf.student_name}</TableCell>
                          <TableCell>{sf.class}</TableCell>
                          <TableCell className="text-right">GH₵ {Number(sf.total_fee_amount).toFixed(2)}</TableCell>
                          <TableCell className="text-right">GH₵ {Number(sf.total_paid).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            GH₵ {Number(sf.balance).toFixed(2)}
                          </TableCell>
                          <TableCell>{getStatusBadge(sf.payment_status)}</TableCell>
                          <TableCell>
                            {sf.payment_status !== "paid" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedStudent(sf);
                                    setIsPaymentDialogOpen(true);
                                  }}
                                >
                                  Record Payment
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedStudent(sf);
                                    loadPaymentHistory(sf.id);
                                    setIsHistoryDialogOpen(true);
                                  }}
                                >
                                  History
                                </Button>
                              </div>
                            )}
                            {sf.payment_status === "paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedStudent(sf);
                                  loadPaymentHistory(sf.id);
                                  setIsHistoryDialogOpen(true);
                                }}
                              >
                                View History
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Class Fees Tab */}
          <TabsContent value="class-fees" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Class Fees</CardTitle>
                  <Dialog open={isSetFeeDialogOpen} onOpenChange={setIsSetFeeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Set Class Fee
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Set Class Fee</DialogTitle>
                        <DialogDescription>
                          Set fee for a class. All students in that class will be automatically billed.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="class">Class *</Label>
                          <select
                            id="class"
                            className="w-full p-2 border rounded-md"
                            value={newFee.class}
                            onChange={(e) => setNewFee({ ...newFee, class: e.target.value })}
                          >
                            <option value="">Select a class</option>
                            {availableClasses.map((cls) => (
                              <option key={cls} value={cls}>
                                {cls}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="fee_amount">Fee Amount (GH₵) *</Label>
                          <Input
                            id="fee_amount"
                            type="number"
                            step="0.01"
                            placeholder="e.g., 500.00"
                            value={newFee.fee_amount}
                            onChange={(e) => setNewFee({ ...newFee, fee_amount: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="term">Term (Optional)</Label>
                          <Input
                            id="term"
                            placeholder="e.g., Term 1"
                            value={newFee.term}
                            onChange={(e) => setNewFee({ ...newFee, term: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description (Optional)</Label>
                          <Input
                            id="description"
                            placeholder="e.g., School fees for Term 1"
                            value={newFee.description}
                            onChange={(e) => setNewFee({ ...newFee, description: e.target.value })}
                          />
                        </div>
                        <Button onClick={handleSetClassFee} className="w-full">
                          Set Fee & Bill Students
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead className="text-right">Fee Amount</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classFees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No class fees set yet. Click "Set Class Fee" to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      classFees.map((cf) => (
                        <TableRow key={cf.id}>
                          <TableCell className="font-medium">{cf.class}</TableCell>
                          <TableCell>{cf.academic_year}</TableCell>
                          <TableCell>{cf.term || "Full Year"}</TableCell>
                          <TableCell className="text-right font-semibold">
                            GH₵ {Number(cf.fee_amount).toFixed(2)}
                          </TableCell>
                          <TableCell>{cf.description || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record payment for {selectedStudent?.student_name}
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Fee:</span>
                    <span className="font-semibold">GH₵ {Number(selectedStudent.total_fee_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Already Paid:</span>
                    <span className="font-semibold">GH₵ {Number(selectedStudent.total_paid).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium">Balance:</span>
                    <span className="font-bold text-lg">GH₵ {Number(selectedStudent.balance).toFixed(2)}</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="payment_amount">Payment Amount (GH₵) *</Label>
                  <Input
                    id="payment_amount"
                    type="number"
                    step="0.01"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <select
                    id="payment_method"
                    className="w-full p-2 border rounded-md"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="payment_reference">Reference Number (Optional)</Label>
                  <Input
                    id="payment_reference"
                    placeholder="Receipt or transaction number"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                </div>
                <Button onClick={handleRecordPayment} className="w-full">
                  Record Payment
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment History Dialog */}
        <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Payment History</DialogTitle>
              <DialogDescription>
                Payment history for {selectedStudent?.student_name}
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Student:</span>
                    <span className="font-semibold">{selectedStudent.student_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Class:</span>
                    <span className="font-semibold">{selectedStudent.class}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm text-muted-foreground">Total Fee:</span>
                    <span className="font-semibold">GH₵ {Number(selectedStudent.total_fee_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Paid:</span>
                    <span className="font-semibold text-green-600">GH₵ {Number(selectedStudent.total_paid).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Balance:</span>
                    <span className="font-bold text-lg">GH₵ {Number(selectedStudent.balance).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    {getStatusBadge(selectedStudent.payment_status)}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Payment Transactions</h4>
                  {paymentHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No payments recorded yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Recorded By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentHistory.map((payment: any) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {new Date(payment.payment_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-semibold">
                              GH₵ {Number(payment.amount).toFixed(2)}
                            </TableCell>
                            <TableCell className="capitalize">
                              {payment.payment_method?.replace('_', ' ')}
                            </TableCell>
                            <TableCell>{payment.reference_number || '-'}</TableCell>
                            <TableCell>{payment.users?.full_name || 'Unknown'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
