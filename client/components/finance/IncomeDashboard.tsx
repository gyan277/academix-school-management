import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, DollarSign, TrendingUp, AlertCircle, Edit } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { Payment, StudentFeeOverride } from "@shared/types";

interface IncomeDashboardProps {
  schoolId: string;
  academicYear: string;
  term: string;
}

interface StudentWithFees {
  id: string;
  student_number: string;
  full_name: string;
  class: string;
  tuition_fee: number;
  bus_fee: number;
  canteen_fee: number;
  total_fee: number;
  total_paid: number;
  balance: number;
  uses_bus: boolean;
  uses_canteen: boolean;
}

export default function IncomeDashboard({ schoolId, academicYear, term }: IncomeDashboardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  const [students, setStudents] = useState<StudentWithFees[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithFees | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_type: "tuition" as "tuition" | "bus" | "canteen",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "cash",
    reference_number: "",
    notes: "",
  });

  const [overrideForm, setOverrideForm] = useState({
    uses_bus: false,
    uses_canteen: false,
    bus_fee_override: "",
    canteen_fee_override: "",
  });

  useEffect(() => {
    loadStudentsWithFees();
  }, [schoolId, academicYear, term]);

  const loadStudentsWithFees = async () => {
    try {
      setLoading(true);
      console.log("Loading students with fees...", { schoolId, academicYear, term });

      // Load students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, student_number, full_name, class")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .order("class")
        .order("full_name");

      if (studentsError) throw studentsError;

      // Load class fees
      const { data: classFeesData, error: classFeesError } = await supabase
        .from("class_fees")
        .select("*")
        .eq("school_id", schoolId)
        .eq("academic_year", academicYear)
        .eq("term", term);

      if (classFeesError) throw classFeesError;

      // Load student fee overrides
      const { data: overridesData, error: overridesError } = await supabase
        .from("student_fee_overrides")
        .select("*")
        .eq("school_id", schoolId)
        .eq("academic_year", academicYear)
        .eq("term", term);

      if (overridesError) throw overridesError;

      // Load payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("student_id, amount, payment_type")
        .eq("school_id", schoolId);

      if (paymentsError) throw paymentsError;

      // Build student fees map
      const classFeeMap = new Map(classFeesData?.map(cf => [cf.class, cf]) || []);
      const overrideMap = new Map(overridesData?.map(o => [o.student_id, o]) || []);
      const paymentMap = new Map<string, { tuition: number; bus: number; canteen: number }>();

      // Calculate payments per student
      paymentsData?.forEach(payment => {
        if (!paymentMap.has(payment.student_id)) {
          paymentMap.set(payment.student_id, { tuition: 0, bus: 0, canteen: 0 });
        }
        const studentPayments = paymentMap.get(payment.student_id)!;
        if (payment.payment_type === "tuition") {
          studentPayments.tuition += Number(payment.amount);
        } else if (payment.payment_type === "bus") {
          studentPayments.bus += Number(payment.amount);
        } else if (payment.payment_type === "canteen") {
          studentPayments.canteen += Number(payment.amount);
        }
      });

      // Calculate fees for each student
      const studentsWithFees: StudentWithFees[] = (studentsData || []).map(student => {
        const classFee = classFeeMap.get(student.class);
        const override = overrideMap.get(student.id);
        const payments = paymentMap.get(student.id) || { tuition: 0, bus: 0, canteen: 0 };

        const tuition_fee = classFee?.fee_amount || 0;
        
        let bus_fee = 0;
        if (override?.uses_bus) {
          bus_fee = override.bus_fee_override ?? classFee?.bus_fee ?? 0;
        }

        let canteen_fee = 0;
        if (override?.uses_canteen) {
          canteen_fee = override.canteen_fee_override ?? classFee?.canteen_fee ?? 0;
        }

        const total_fee = tuition_fee + bus_fee + canteen_fee;
        const total_paid = payments.tuition + payments.bus + payments.canteen;
        const balance = total_fee - total_paid;

        return {
          id: student.id,
          student_number: student.student_number,
          full_name: student.full_name,
          class: student.class,
          tuition_fee,
          bus_fee,
          canteen_fee,
          total_fee,
          total_paid,
          balance,
          uses_bus: override?.uses_bus || false,
          uses_canteen: override?.uses_canteen || false,
        };
      });

      setStudents(studentsWithFees);
      console.log("Loaded students with fees:", studentsWithFees.length);
    } catch (error: any) {
      console.error("Error loading students with fees:", error);
      toast({
        title: "Error",
        description: "Failed to load student fees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedStudent || !paymentForm.amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("payments").insert({
        school_id: schoolId,
        student_id: selectedStudent.id,
        amount: parseFloat(paymentForm.amount),
        payment_type: paymentForm.payment_type,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number || null,
        notes: paymentForm.notes || null,
        recorded_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Payment Recorded",
        description: `Payment of GHS ${paymentForm.amount} recorded successfully`,
      });

      setIsPaymentDialogOpen(false);
      setSelectedStudent(null);
      setPaymentForm({
        amount: "",
        payment_type: "tuition",
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "cash",
        reference_number: "",
        notes: "",
      });
      loadStudentsWithFees();
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const handleSaveOverride = async () => {
    if (!selectedStudent) return;

    try {
      const overrideData = {
        school_id: schoolId,
        student_id: selectedStudent.id,
        academic_year: academicYear,
        term: term,
        uses_bus: overrideForm.uses_bus,
        uses_canteen: overrideForm.uses_canteen,
        bus_fee_override: overrideForm.bus_fee_override ? parseFloat(overrideForm.bus_fee_override) : null,
        canteen_fee_override: overrideForm.canteen_fee_override ? parseFloat(overrideForm.canteen_fee_override) : null,
      };

      const { error } = await supabase
        .from("student_fee_overrides")
        .upsert(overrideData, {
          onConflict: "student_id,academic_year,term",
        });

      if (error) throw error;

      toast({
        title: "Fee Override Saved",
        description: "Student fee settings have been updated",
      });

      setIsOverrideDialogOpen(false);
      setSelectedStudent(null);
      setOverrideForm({
        uses_bus: false,
        uses_canteen: false,
        bus_fee_override: "",
        canteen_fee_override: "",
      });
      loadStudentsWithFees();
    } catch (error: any) {
      console.error("Error saving override:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save fee override",
        variant: "destructive",
      });
    }
  };

  // Calculate summary statistics
  const totalExpectedIncome = students.reduce((sum, s) => sum + s.total_fee, 0);
  const totalCollected = students.reduce((sum, s) => sum + s.total_paid, 0);
  const totalOutstanding = students.reduce((sum, s) => sum + s.balance, 0);
  const collectionRate = totalExpectedIncome > 0 ? (totalCollected / totalExpectedIncome) * 100 : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Expected Income</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg sm:text-2xl font-bold">GHS {totalExpectedIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{students.length} students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Collected</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg sm:text-2xl font-bold text-green-600">GHS {totalCollected.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{collectionRate.toFixed(1)}% collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg sm:text-2xl font-bold text-orange-600">GHS {totalOutstanding.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {students.filter(s => s.balance > 0).length} students with balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Fully Paid</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg sm:text-2xl font-bold">
              {students.filter(s => s.balance <= 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {students.length > 0 
                ? ((students.filter(s => s.balance <= 0).length / students.length) * 100).toFixed(1)
                : 0}% of students
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Student Balances</TabsTrigger>
          <TabsTrigger value="outstanding" className="text-xs sm:text-sm">Outstanding Only</TabsTrigger>
        </TabsList>

        {/* All Students Tab */}
        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Student Payment Status</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                View and manage student fees and payments
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Total Fee</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground text-xs sm:text-sm">
                        No students found. Configure class fees first.
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">{student.student_number}</TableCell>
                        <TableCell className="text-xs sm:text-sm whitespace-nowrap">{student.full_name}</TableCell>
                        <TableCell className="text-xs sm:text-sm whitespace-nowrap">{student.class}</TableCell>
                        <TableCell className="text-right text-xs sm:text-sm whitespace-nowrap">
                          GHS {student.total_fee.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 text-xs sm:text-sm whitespace-nowrap">
                          GHS {student.total_paid.toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold text-xs sm:text-sm whitespace-nowrap ${
                          student.balance > 0 ? "text-orange-600" : "text-green-600"
                        }`}>
                          GHS {student.balance.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1 sm:gap-2">
                            <Button
                              size="sm"
                              className="text-xs px-2 py-1"
                              onClick={() => {
                                setSelectedStudent(student);
                                setPaymentForm({
                                  ...paymentForm,
                                  amount: student.balance > 0 ? student.balance.toString() : "",
                                });
                                setIsPaymentDialogOpen(true);
                              }}
                            >
                              <span className="hidden sm:inline">Record Payment</span>
                              <span className="sm:hidden">Pay</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="px-2 py-1"
                              onClick={() => {
                                setSelectedStudent(student);
                                setOverrideForm({
                                  uses_bus: student.uses_bus,
                                  uses_canteen: student.uses_canteen,
                                  bus_fee_override: student.bus_fee > 0 ? student.bus_fee.toString() : "",
                                  canteen_fee_override: student.canteen_fee > 0 ? student.canteen_fee.toString() : "",
                                });
                                setIsOverrideDialogOpen(true);
                              }}
                            >
                              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outstanding Only Tab */}
        <TabsContent value="outstanding" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Students with Outstanding Balance</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Students who still owe fees
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Student Number</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Name</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Class</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">Total Fee</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">Paid</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">Balance</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.filter(s => s.balance > 0).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground text-xs sm:text-sm">
                        All students have paid their fees!
                      </TableCell>
                    </TableRow>
                  ) : (
                    students
                      .filter(s => s.balance > 0)
                      .map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">{student.student_number}</TableCell>
                          <TableCell className="text-xs sm:text-sm whitespace-nowrap">{student.full_name}</TableCell>
                          <TableCell className="text-xs sm:text-sm whitespace-nowrap">{student.class}</TableCell>
                          <TableCell className="text-right text-xs sm:text-sm whitespace-nowrap">
                            GHS {student.total_fee.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-green-600 text-xs sm:text-sm whitespace-nowrap">
                            GHS {student.total_paid.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-orange-600 text-xs sm:text-sm whitespace-nowrap">
                            GHS {student.balance.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              className="text-xs px-2 py-1"
                              onClick={() => {
                                setSelectedStudent(student);
                                setPaymentForm({
                                  ...paymentForm,
                                  amount: student.balance.toString(),
                                });
                                setIsPaymentDialogOpen(true);
                              }}
                            >
                              <span className="hidden sm:inline">Record Payment</span>
                              <span className="sm:hidden">Pay</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record payment for {selectedStudent?.full_name} ({selectedStudent?.student_number})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Tuition Fee:</span>
                  <span className="ml-2 font-medium">GHS {selectedStudent?.tuition_fee.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Bus Fee:</span>
                  <span className="ml-2 font-medium">GHS {selectedStudent?.bus_fee.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Canteen Fee:</span>
                  <span className="ml-2 font-medium">GHS {selectedStudent?.canteen_fee.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Fee:</span>
                  <span className="ml-2 font-semibold">GHS {selectedStudent?.total_fee.toFixed(2)}</span>
                </div>
                <div className="col-span-2 pt-2 border-t">
                  <span className="text-muted-foreground">Outstanding Balance:</span>
                  <span className="ml-2 font-bold text-orange-600">
                    GHS {selectedStudent?.balance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label>Payment Type *</Label>
              <select
                value={paymentForm.payment_type}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_type: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-md mt-2"
              >
                <option value="tuition">Tuition</option>
                <option value="bus">Bus Fee</option>
                <option value="canteen">Canteen Fee</option>
              </select>
            </div>

            <div>
              <Label>Amount (GHS) *</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Payment Method</Label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                className="w-full px-3 py-2 border rounded-md mt-2"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="mobile_money">Mobile Money</option>
              </select>
            </div>

            <div>
              <Label>Reference Number</Label>
              <Input
                placeholder="Optional reference number"
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                placeholder="Optional notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="mt-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecordPayment}>Record Payment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fee Override Dialog */}
      <Dialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Student Fees</DialogTitle>
            <DialogDescription>
              Set individual fee settings for {selectedStudent?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="uses_bus"
                checked={overrideForm.uses_bus}
                onChange={(e) => setOverrideForm({ ...overrideForm, uses_bus: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="uses_bus">Student uses bus service</Label>
            </div>

            {overrideForm.uses_bus && (
              <div>
                <Label>Bus Fee Override (GHS)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Leave empty to use class default"
                  value={overrideForm.bus_fee_override}
                  onChange={(e) => setOverrideForm({ ...overrideForm, bus_fee_override: e.target.value })}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to use the default bus fee for this class
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="uses_canteen"
                checked={overrideForm.uses_canteen}
                onChange={(e) => setOverrideForm({ ...overrideForm, uses_canteen: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="uses_canteen">Student uses canteen service</Label>
            </div>

            {overrideForm.uses_canteen && (
              <div>
                <Label>Canteen Fee Override (GHS)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Leave empty to use class default"
                  value={overrideForm.canteen_fee_override}
                  onChange={(e) => setOverrideForm({ ...overrideForm, canteen_fee_override: e.target.value })}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to use the default canteen fee for this class
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsOverrideDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveOverride}>Save Settings</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
