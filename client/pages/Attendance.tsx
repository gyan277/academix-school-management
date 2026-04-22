import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface AttendanceRecord {
  id: string;
  name: string;
  status: "present" | "absent" | "late";
}

interface DailyAttendance {
  date: string;
  records: AttendanceRecord[];
  attendanceRate: number;
}

// Classes will be loaded from database
const classes = ["KG1", "KG2", "P1", "P2", "P3", "P4", "P5", "P6", "JHS1", "JHS2", "JHS3"];

export default function Attendance() {
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState("P1");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [studentAttendance, setStudentAttendance] = useState<AttendanceRecord[]>([]);
  const [staffAttendance, setStaffAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<DailyAttendance[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const isAdmin = profile?.role === "admin";

  // Set correct default tab based on role
  useEffect(() => {
    if (profile && !selectedTab) {
      if (profile.role === "admin") {
        setSelectedTab("staff");
      } else {
        setSelectedTab("students");
      }
    }
  }, [profile, selectedTab]);

  // Load students when class changes (for teachers)
  useEffect(() => {
    if (!isAdmin && selectedClass && selectedTab === "students") {
      loadStudents();
    }
  }, [selectedClass, isAdmin, selectedTab]);

  // Load staff when Staff tab is selected (for admins)
  useEffect(() => {
    if (isAdmin && selectedTab === "staff") {
      loadStaff();
    }
  }, [isAdmin, selectedTab]);

  // Load attendance history when Reports tab is selected
  useEffect(() => {
    if (selectedTab === "reports") {
      loadAttendanceHistory();
    }
  }, [selectedTab]);

  const loadAttendanceHistory = async () => {
    try {
      setLoadingData(true);
      
      // Load attendance records from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("school_id", profile?.school_id)
        .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (error) throw error;

      // Group by date and calculate attendance rate
      const groupedByDate = (data || []).reduce((acc: any, record: any) => {
        if (!acc[record.date]) {
          acc[record.date] = [];
        }
        acc[record.date].push({
          id: record.student_id || record.staff_id,
          name: "Student/Staff", // We'll need to join with students/staff to get names
          status: record.status,
        });
        return acc;
      }, {});

      const history: DailyAttendance[] = Object.entries(groupedByDate).map(
        ([date, records]: [string, any]) => {
          const total = records.length;
          const present = records.filter((r: any) => r.status === "present").length;
          const rate = (present / total) * 100;
          return {
            date,
            records,
            attendanceRate: rate,
          };
        }
      );

      setAttendanceHistory(history);
    } catch (error) {
      console.error("Error loading attendance history:", error);
      toast({
        title: "Error",
        description: "Failed to load attendance history",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const loadStudents = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("students")
        .select("id, student_number, full_name")
        .eq("class", selectedClass)
        .eq("status", "active")
        .order("full_name");

      if (error) throw error;

      // Convert to attendance records with default "present" status
      const records: AttendanceRecord[] = (data || []).map((student) => ({
        id: student.id, // Use the UUID id, not student_number
        name: student.full_name,
        status: "present" as const,
      }));

      setStudentAttendance(records);
    } catch (error) {
      console.error("Error loading students:", error);
      toast({
        title: "Error",
        description: "Failed to load students from database",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const loadStaff = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("staff")
        .select("id, staff_number, full_name")
        .eq("status", "active")
        .order("full_name");

      if (error) throw error;

      // Convert to attendance records with default "present" status
      const records: AttendanceRecord[] = (data || []).map((staff) => ({
        id: staff.id, // Use the UUID id, not staff_number
        name: staff.full_name,
        status: "present" as const,
      }));

      setStaffAttendance(records);
    } catch (error) {
      console.error("Error loading staff:", error);
      toast({
        title: "Error",
        description: "Failed to load staff from database",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleAttendanceChange = (id: string, status: "present" | "absent" | "late") => {
    if (selectedTab === "students") {
      setStudentAttendance(
        studentAttendance.map((record) =>
          record.id === id ? { ...record, status } : record
        )
      );
    } else {
      setStaffAttendance(
        staffAttendance.map((record) =>
          record.id === id ? { ...record, status } : record
        )
      );
    }
  };

  const handleSaveAttendance = async () => {
    try {
      const currentRecords =
        selectedTab === "students" ? studentAttendance : staffAttendance;
      
      if (currentRecords.length === 0) {
        toast({
          title: "No Records",
          description: "No attendance records to save",
          variant: "destructive",
        });
        return;
      }

      // Prepare attendance records for database
      const attendanceRecords = currentRecords.map((record) => ({
        school_id: profile?.school_id,
        student_id: selectedTab === "students" ? record.id : null,
        staff_id: selectedTab === "staff" ? record.id : null,
        date: selectedDate,
        status: record.status,
        class: selectedTab === "students" ? selectedClass : null,
        recorded_by: profile?.id,
      }));

      // Delete existing attendance for this date/class (to allow updates)
      if (selectedTab === "students") {
        await supabase
          .from("attendance")
          .delete()
          .eq("date", selectedDate)
          .eq("class", selectedClass)
          .eq("school_id", profile?.school_id);
      } else {
        await supabase
          .from("attendance")
          .delete()
          .eq("date", selectedDate)
          .is("class", null)
          .eq("school_id", profile?.school_id);
      }

      // Insert new attendance records
      const { error } = await supabase
        .from("attendance")
        .insert(attendanceRecords);

      if (error) throw error;

      // Update local history
      const total = currentRecords.length;
      const present = currentRecords.filter((r) => r.status === "present").length;
      const rate = (present / total) * 100;

      const newHistory: DailyAttendance = {
        date: selectedDate,
        records: currentRecords,
        attendanceRate: rate,
      };

      setAttendanceHistory([newHistory, ...attendanceHistory.filter((h) => h.date !== selectedDate)]);
      
      toast({
        title: "Success",
        description: `Attendance saved successfully for ${selectedDate}!`,
      });
    } catch (error: any) {
      console.error("Error saving attendance:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save attendance",
        variant: "destructive",
      });
    }
  };

  const currentRecords =
    selectedTab === "students" ? studentAttendance : staffAttendance;
  const total = currentRecords.length;
  const present = currentRecords.filter((r) => r.status === "present").length;
  const absent = currentRecords.filter((r) => r.status === "absent").length;
  const late = currentRecords.filter((r) => r.status === "late").length;
  const attendanceRate = ((present / total) * 100).toFixed(1);

  return (
    <Layout 
      title="Attendance" 
      subtitle={isAdmin ? "Track Staff Attendance" : "Track Student Attendance"}
    >
      {loading || !selectedTab ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading attendance...</p>
        </div>
      ) : (
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            {!isAdmin && <TabsTrigger value="students">Students</TabsTrigger>}
            {isAdmin && <TabsTrigger value="staff">Staff</TabsTrigger>}
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

        {/* STUDENTS TAB - TEACHERS ONLY */}
        {!isAdmin && (
          <TabsContent value="students" className="space-y-6 mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Daily Attendance Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="class">Class</Label>
                  <select
                    id="class"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background mt-2"
                  >
                    {classes.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background mt-2"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSaveAttendance} className="w-full">
                    Save Attendance
                  </Button>
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-primary">{total}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total</p>
                </div>
                <div className="p-3 sm:p-4 bg-muted rounded-lg text-center border border-border">
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{present}</p>
                  <p className="text-xs text-muted-foreground mt-1">Present</p>
                </div>
                <div className="p-3 sm:p-4 bg-muted rounded-lg text-center border border-border">
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{absent}</p>
                  <p className="text-xs text-muted-foreground mt-1">Absent</p>
                </div>
                <div className="p-3 sm:p-4 bg-muted rounded-lg text-center border border-border">
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{late}</p>
                  <p className="text-xs text-muted-foreground mt-1">Late</p>
                </div>
              </div>

              {/* Attendance Rate */}
              <div className="p-4 bg-muted rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-2">Attendance Rate</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-2 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground transition-all"
                        style={{ width: `${attendanceRate}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-bold text-foreground text-lg">{attendanceRate}%</span>
                </div>
              </div>

              {/* Student Attendance List */}
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Mark Attendance</h4>
                {loadingData ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading students...</p>
                  </div>
                ) : studentAttendance.length === 0 ? (
                  <Card className="border-border/50">
                    <CardContent className="text-center py-8 text-muted-foreground">
                      No students found in {selectedClass}. Please add students in the Registrar page.
                    </CardContent>
                  </Card>
                ) : (
                  studentAttendance.map((record) => (
                  <div
                    key={record.id}
                    className="p-3 sm:p-4 border border-border/50 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{record.name}</p>
                        <p className="text-xs text-muted-foreground">{record.id}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                        <Button
                          variant={record.status === "present" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleAttendanceChange(record.id, "present")}
                          className="gap-1 flex-1 sm:flex-none"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">Present</span>
                          <span className="sm:hidden">P</span>
                        </Button>
                        <Button
                          variant={record.status === "late" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleAttendanceChange(record.id, "late")}
                          className="gap-1 flex-1 sm:flex-none"
                        >
                          <Clock className="w-4 h-4" />
                          <span className="hidden sm:inline">Late</span>
                          <span className="sm:hidden">L</span>
                        </Button>
                        <Button
                          variant={record.status === "absent" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleAttendanceChange(record.id, "absent")}
                          className="gap-1 flex-1 sm:flex-none"
                        >
                          <XCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">Absent</span>
                          <span className="sm:hidden">A</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* STAFF TAB - ADMIN ONLY */}
        {isAdmin && (
          <TabsContent value="staff" className="space-y-6 mt-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Staff Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="staffDate">Date</Label>
                    <input
                      id="staffDate"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background mt-2"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleSaveAttendance} className="w-full">
                      Save Staff Attendance
                    </Button>
                  </div>
                </div>

                {/* Staff Summary */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-muted rounded-lg text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-primary">{total}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total</p>
                  </div>
                  <div className="p-3 sm:p-4 bg-muted rounded-lg text-center border border-border">
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{present}</p>
                    <p className="text-xs text-muted-foreground mt-1">Present</p>
                  </div>
                  <div className="p-3 sm:p-4 bg-muted rounded-lg text-center border border-border">
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{absent}</p>
                    <p className="text-xs text-muted-foreground mt-1">Absent</p>
                  </div>
                </div>

                {/* Staff Attendance List */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground">Mark Staff Attendance</h4>
                  {loadingData ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading staff...</p>
                    </div>
                  ) : staffAttendance.length === 0 ? (
                    <Card className="border-border/50">
                      <CardContent className="text-center py-8 text-muted-foreground">
                        No staff members found. Please add staff in the Registrar page.
                      </CardContent>
                    </Card>
                  ) : (
                    staffAttendance.map((record) => (
                    <div
                      key={record.id}
                      className="p-3 sm:p-4 border border-border/50 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{record.name}</p>
                          <p className="text-xs text-muted-foreground">{record.id}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                          <Button
                            variant={record.status === "present" ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAttendanceChange(record.id, "present")}
                            className="gap-1 flex-1 sm:flex-none"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">Present</span>
                            <span className="sm:hidden">P</span>
                          </Button>
                          <Button
                            variant={record.status === "absent" ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAttendanceChange(record.id, "absent")}
                            className="gap-1 flex-1 sm:flex-none"
                          >
                            <XCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">Absent</span>
                            <span className="sm:hidden">A</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* REPORTS TAB */}
        <TabsContent value="reports" className="space-y-6 mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Attendance Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {attendanceHistory.map((history) => (
                <div
                  key={history.date}
                  className="p-4 border border-border/50 rounded-lg flex items-center justify-between hover:bg-muted/50"
                >
                  <div>
                    <p className="font-semibold text-foreground">{history.date}</p>
                    <p className="text-sm text-muted-foreground">
                      {history.records.length} students recorded
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {history.attendanceRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Attendance Rate</p>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </Layout>
  );
}
