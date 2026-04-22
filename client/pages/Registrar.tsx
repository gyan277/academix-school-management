import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit2, Trash2, Users, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface Student {
  id: string;
  student_id: string;
  student_number: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  class: string;
  admission_date: string;
  parent_name: string;
  parent_phone: string;
  status: string;
}

interface Staff {
  id: string;
  staff_id: string;
  full_name: string;
  phone: string;
  position: string;
  specialization: string;
  employment_date: string;
  status: string;
}

const classes = ["KG1", "KG2", "P1", "P2", "P3", "P4", "P5", "P6", "JHS1", "JHS2", "JHS3"];

export default function Registrar() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "",
    dob: "",
    gender: "",
    class: "",
    parentName: "",
    parentPhone: "",
  });
  const [newStaff, setNewStaff] = useState({
    name: "",
    phone: "",
    position: "",
    specialization: "",
  });

  // Load students and staff from database
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .eq("status", "active")
        .order("full_name");

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Load staff
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("status", "active")
        .order("full_name");

      if (staffError) throw staffError;
      setStaff(staffData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data from database",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter students
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.student_number && student.student_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.student_id && student.student_id.includes(searchTerm));
    const matchesClass = !selectedClass || student.class === selectedClass;
    return matchesSearch && matchesClass;
  });

  // Filter staff
  const filteredStaff = staff.filter((member) =>
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.staff_id.includes(searchTerm)
  );

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.dob || !newStudent.class || !newStudent.parentName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.school_id) {
      toast({
        title: "Error",
        description: "School information not found. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("students")
        .insert([
          {
            full_name: newStudent.name,
            date_of_birth: newStudent.dob,
            gender: newStudent.gender,
            class: newStudent.class,
            parent_name: newStudent.parentName,
            parent_phone: newStudent.parentPhone,
            admission_date: new Date().toISOString().split("T")[0],
            status: "active",
            school_id: profile.school_id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setStudents([...students, data]);
      setNewStudent({
        name: "",
        dob: "",
        gender: "",
        class: "",
        parentName: "",
        parentPhone: "",
      });
      setIsStudentDialogOpen(false);
      
      toast({
        title: "Success",
        description: `Student ${newStudent.name} added successfully`,
      });
    } catch (error) {
      console.error("Error adding student:", error);
      toast({
        title: "Error",
        description: "Failed to add student to database",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setStudents(students.filter((s) => s.id !== id));
      
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting student:", error);
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      });
    }
  };

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.position || !newStaff.phone) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.school_id) {
      toast({
        title: "Error",
        description: "School information not found. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("staff")
        .insert([
          {
            full_name: newStaff.name,
            phone: newStaff.phone,
            position: newStaff.position,
            specialization: newStaff.specialization,
            employment_date: new Date().toISOString().split("T")[0],
            status: "active",
            school_id: profile.school_id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setStaff([...staff, data]);
      setNewStaff({
        name: "",
        phone: "",
        position: "",
        specialization: "",
      });
      setIsStaffDialogOpen(false);
      
      toast({
        title: "Success",
        description: `Staff member ${newStaff.name} added successfully`,
      });
    } catch (error) {
      console.error("Error adding staff:", error);
      toast({
        title: "Error",
        description: "Failed to add staff member to database",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;

    try {
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setStaff(staff.filter((s) => s.id !== id));
      
      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting staff:", error);
      toast({
        title: "Error",
        description: "Failed to delete staff member",
        variant: "destructive",
      });
    }
  };

  // Count students per class
  const classStudentCount = (classLevel: string) => {
    return students.filter((s) => s.class === classLevel).length;
  };

  return (
    <Layout title="Registrar" subtitle="Student & Staff Management System">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading data...</p>
        </div>
      ) : (
      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>

        {/* STUDENTS TAB */}
        <TabsContent value="students" className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
              {/* Class Filter Dropdown */}
              <div className="w-full sm:w-48">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm h-10"
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
              {/* Search Input */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto">
                  <UserPlus className="w-4 h-4" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                  <DialogDescription>
                    Fill in the student's information below
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={newStudent.name}
                      onChange={(e) =>
                        setNewStudent({ ...newStudent, name: e.target.value })
                      }
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={newStudent.dob}
                      onChange={(e) =>
                        setNewStudent({ ...newStudent, dob: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      value={newStudent.gender}
                      onChange={(e) =>
                        setNewStudent({ ...newStudent, gender: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="class">Class</Label>
                    <select
                      id="class"
                      value={newStudent.class}
                      onChange={(e) =>
                        setNewStudent({ ...newStudent, class: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="parentName">Parent/Guardian Name</Label>
                    <Input
                      id="parentName"
                      value={newStudent.parentName}
                      onChange={(e) =>
                        setNewStudent({ ...newStudent, parentName: e.target.value })
                      }
                      placeholder="Parent's name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="parentPhone">Parent Phone Number</Label>
                    <Input
                      id="parentPhone"
                      value={newStudent.parentPhone}
                      onChange={(e) =>
                        setNewStudent({ ...newStudent, parentPhone: e.target.value })
                      }
                      placeholder="+233501234567"
                    />
                  </div>
                  <Button onClick={handleAddStudent} className="w-full">
                    Add Student
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Results Counter */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredStudents.length} of {students.length} students
            {selectedClass && ` in ${selectedClass}`}
          </div>

          {/* Students List */}
          <div className="grid gap-4">
            {filteredStudents.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="text-center py-8 text-muted-foreground">
                  No students found
                </CardContent>
              </Card>
            ) : (
              filteredStudents.map((student) => (
                <Card key={student.id} className="border-border/50 hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-foreground">{student.full_name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {student.student_number || student.student_id || 'No ID'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <p className="text-xs font-semibold">Class</p>
                            <p>{student.class}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold">Gender</p>
                            <p>{student.gender}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold">Parent</p>
                            <p>{student.parent_name}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold">Phone</p>
                            <p>{student.parent_phone}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteStudent(student.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* CLASSES TAB */}
        <TabsContent value="classes" className="space-y-6 mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Class List
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((cls) => (
                  <Card
                    key={cls}
                    className="border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setSelectedClass(cls)}
                  >
                    <CardContent className="pt-6 text-center">
                      <h4 className="text-lg font-bold text-foreground mb-2">Class {cls}</h4>
                      <p className="text-3xl font-bold text-primary">
                        {classStudentCount(cls)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">Students Enrolled</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedClass && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Class {selectedClass} - Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {students
                    .filter((s) => s.class === selectedClass)
                    .map((student) => (
                      <div
                        key={student.id}
                        className="p-3 border border-border/50 rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium text-foreground">{student.full_name}</p>
                          <p className="text-sm text-muted-foreground">{student.student_number || student.student_id || 'No ID'}</p>
                        </div>
                        <Badge>{student.gender}</Badge>
                      </div>
                    ))}
                </div>
                <Button className="w-full mt-6">Promote All to Class {classes[classes.indexOf(selectedClass) + 1] || selectedClass}</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* STAFF TAB */}
        <TabsContent value="staff" className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:max-w-xs">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Staff Member</DialogTitle>
                  <DialogDescription>
                    Fill in the staff member's information below
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="staffName">Full Name</Label>
                    <Input
                      id="staffName"
                      value={newStaff.name}
                      onChange={(e) =>
                        setNewStaff({ ...newStaff, name: e.target.value })
                      }
                      placeholder="Mr./Mrs. Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="staffPhone">Phone Number</Label>
                    <Input
                      id="staffPhone"
                      value={newStaff.phone}
                      onChange={(e) =>
                        setNewStaff({ ...newStaff, phone: e.target.value })
                      }
                      placeholder="+233501234567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position/Role</Label>
                    <Input
                      id="position"
                      value={newStaff.position}
                      onChange={(e) =>
                        setNewStaff({ ...newStaff, position: e.target.value })
                      }
                      placeholder="Headmaster, Teacher, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="specialization">Specialization</Label>
                    <Input
                      id="specialization"
                      value={newStaff.specialization}
                      onChange={(e) =>
                        setNewStaff({ ...newStaff, specialization: e.target.value })
                      }
                      placeholder="Mathematics, English, etc."
                    />
                  </div>
                  <Button onClick={handleAddStaff} className="w-full">
                    Add Staff Member
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Staff List */}
          <div className="grid gap-4">
            {filteredStaff.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="text-center py-8 text-muted-foreground">
                  No staff members found
                </CardContent>
              </Card>
            ) : (
              filteredStaff.map((member) => (
                <Card key={member.id} className="border-border/50 hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-foreground">{member.full_name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {member.staff_id}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
                          <div>
                            <p className="text-xs font-semibold">Position</p>
                            <p>{member.position}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold">Specialization</p>
                            <p>{member.specialization}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold">Phone</p>
                            <p>{member.phone}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteStaff(member.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
      )}
    </Layout>
  );
}
