import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateStudentReportCard } from "@/lib/export-utils";
import { supabase } from "@/lib/supabase";

interface StudentScore {
  id: string;
  name: string;
  classScore: number;
  examScore: number;
}

interface SubjectScores {
  [subject: string]: {
    [studentId: string]: {
      classScore: number;
      examScore: number;
    };
  };
}

interface StudentReport {
  id: string;
  name: string;
  subjects: {
    name: string;
    classScore: number;
    examScore: number;
    total: number;
    grade: string;
  }[];
  totalScore: number;
  averageScore: number;
  classRank: number;
  remarks: string;
}

// Classes will be loaded from database
const classes = ["KG1", "KG2", "P1", "P2", "P3", "P4", "P5", "P6", "JHS1", "JHS2", "JHS3"];

export default function Academic() {
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState("P1");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [gradingPeriod, setGradingPeriod] = useState("mid-term");
  const [scores, setScores] = useState<StudentScore[]>([]);
  const [savedScores, setSavedScores] = useState<SubjectScores>({});
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({});
  const [loadingData, setLoadingData] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [studentList, setStudentList] = useState<{ id: string; name: string }[]>([]);

  const schoolName = localStorage.getItem("schoolName") || "Your School";
  const currentAcademicYear = "2024/2025";

  // Load students when class changes
  useEffect(() => {
    if (selectedClass) {
      loadStudents();
      loadSubjectsForClass();
    }
  }, [selectedClass]);

  // Load scores when subject changes
  useEffect(() => {
    if (selectedSubject && studentList.length > 0) {
      loadScoresForSubject();
    }
  }, [selectedSubject, studentList]);

  const loadSubjectsForClass = async () => {
    try {
      setLoadingSubjects(true);
      const { data, error } = await supabase
        .from("class_subjects")
        .select(`
          subject_id,
          subjects (
            subject_name
          )
        `)
        .eq("class", selectedClass)
        .eq("academic_year", currentAcademicYear)
        .eq("is_active", true);

      if (error) throw error;

      const subjectNames = (data || []).map((cs: any) => cs.subjects.subject_name);
      setSubjects(subjectNames);

      // Set first subject as selected if available
      if (subjectNames.length > 0 && !subjectNames.includes(selectedSubject)) {
        setSelectedSubject(subjectNames[0]);
      }
    } catch (error) {
      console.error("Error loading subjects:", error);
      toast({
        title: "Error",
        description: "Failed to load subjects for this class",
        variant: "destructive",
      });
    } finally {
      setLoadingSubjects(false);
    }
  };

  const loadStudents = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("students")
        .select("id, student_id, full_name")
        .eq("class", selectedClass)
        .eq("status", "active")
        .order("full_name");

      if (error) throw error;

      // Store student list
      const students = (data || []).map((student) => ({
        id: student.student_id,
        name: student.full_name,
      }));
      setStudentList(students);

      // Convert to score records with default 0 scores
      const studentScores: StudentScore[] = students.map((student) => ({
        id: student.id,
        name: student.name,
        classScore: 0,
        examScore: 0,
      }));

      setScores(studentScores);
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

  const loadScoresForSubject = () => {
    // Load saved scores for the selected subject
    const subjectScores = savedScores[selectedSubject] || {};
    
    const updatedScores = studentList.map((student) => ({
      id: student.id,
      name: student.name,
      classScore: subjectScores[student.id]?.classScore || 0,
      examScore: subjectScores[student.id]?.examScore || 0,
    }));

    setScores(updatedScores);
  };

  const handleSaveSubjectScores = () => {
    // Save current scores for the selected subject
    const subjectScoreData: { [studentId: string]: { classScore: number; examScore: number } } = {};
    
    scores.forEach((score) => {
      subjectScoreData[score.id] = {
        classScore: score.classScore,
        examScore: score.examScore,
      };
    });

    setSavedScores({
      ...savedScores,
      [selectedSubject]: subjectScoreData,
    });

    toast({
      title: "Scores Saved",
      description: `${selectedSubject} scores have been saved. You can now enter scores for other subjects.`,
    });
  };

  const handleScoreChange = (id: string, field: "classScore" | "examScore", value: number) => {
    setScores(
      scores.map((score) =>
        score.id === id ? { ...score, [field]: Math.min(value, field === "classScore" ? 30 : 70) } : score
      )
    );
  };

  const calculateGrade = (total: number): string => {
    if (total >= 80) return "A1";
    if (total >= 75) return "A2";
    if (total >= 70) return "B1";
    if (total >= 65) return "B2";
    if (total >= 60) return "B3";
    if (total >= 55) return "C1";
    if (total >= 50) return "C2";
    if (total >= 45) return "C3";
    if (total >= 40) return "D1";
    if (total >= 35) return "D2";
    if (total >= 30) return "E1";
    return "F";
  };

  const handleGenerateReports = () => {
    // Check if all subjects have scores
    const subjectsWithScores = Object.keys(savedScores);
    
    if (subjectsWithScores.length === 0) {
      toast({
        title: "No Scores Saved",
        description: "Please enter and save scores for at least one subject before generating reports.",
        variant: "destructive",
      });
      return;
    }

    // Generate comprehensive reports with all subjects
    const generatedReports: StudentReport[] = studentList.map((student) => {
      const studentSubjects = subjectsWithScores.map((subject) => {
        const subjectScore = savedScores[subject][student.id] || { classScore: 0, examScore: 0 };
        const total = subjectScore.classScore + subjectScore.examScore;
        
        return {
          name: subject,
          classScore: subjectScore.classScore,
          examScore: subjectScore.examScore,
          total,
          grade: calculateGrade(total),
        };
      });

      const totalScore = studentSubjects.reduce((sum, sub) => sum + sub.total, 0);
      const averageScore = totalScore / studentSubjects.length;

      return {
        id: student.id,
        name: student.name,
        subjects: studentSubjects,
        totalScore,
        averageScore,
        classRank: 0, // Will be calculated after sorting
        remarks: remarks[student.id] || "Good performance",
      };
    });

    // Sort by average score and assign ranks
    const sortedReports = generatedReports.sort((a, b) => b.averageScore - a.averageScore);
    sortedReports.forEach((report, index) => {
      report.classRank = index + 1;
    });

    setReports(sortedReports);
    toast({
      title: "Reports Generated",
      description: `${sortedReports.length} student reports with ${subjectsWithScores.length} subjects have been generated.`,
    });
  };

  const handleDownloadReport = (report: StudentReport) => {
    const studentData = {
      name: report.name,
      id: report.id,
      class: selectedClass,
      term: gradingPeriod === "mid-term" ? "Mid-Term" : "End of Term",
      totalScore: report.totalScore,
      averageScore: report.averageScore,
      classRank: report.classRank,
      remarks: report.remarks,
      subjects: report.subjects,
      attendance: "95", // Mock data
    };

    generateStudentReportCard(studentData, schoolName);
    toast({
      title: "Download Started",
      description: `Report card for ${report.name} is being downloaded.`,
    });
  };

  const handleDownloadAllReports = () => {
    reports.forEach((report, index) => {
      setTimeout(() => {
        handleDownloadReport(report);
      }, index * 500); // Stagger downloads
    });
    
    toast({
      title: "Batch Download Started",
      description: `Downloading ${reports.length} report cards...`,
    });
  };

  return (
    <Layout title="Academic Engine" subtitle="SBA & Exam Management">
      <Tabs defaultValue="entry" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="entry">Score Entry</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* SCORE ENTRY TAB */}
        <TabsContent value="entry" className="space-y-6 mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Score Entry Grid
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filter Section */}
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
                  <Label htmlFor="subject">Subject</Label>
                  <select
                    id="subject"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background mt-2"
                    disabled={loadingSubjects || subjects.length === 0}
                  >
                    {loadingSubjects ? (
                      <option>Loading subjects...</option>
                    ) : subjects.length === 0 ? (
                      <option>No subjects assigned to {selectedClass}</option>
                    ) : (
                      subjects.map((subject) => (
                        <option key={subject} value={subject}>
                          {subject} {savedScores[subject] ? "✓" : ""}
                        </option>
                      ))
                    )}
                  </select>
                  {subjects.length === 0 && !loadingSubjects && (
                    <p className="text-xs text-destructive mt-1">
                      No subjects assigned. Admin should configure subjects in Settings.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="period">Grading Period</Label>
                  <select
                    id="period"
                    value={gradingPeriod}
                    onChange={(e) => setGradingPeriod(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background mt-2"
                  >
                    <option value="mid-term">Mid-Term</option>
                    <option value="end-term">End-of-Term</option>
                  </select>
                </div>
              </div>

              {/* Progress Indicator */}
              {Object.keys(savedScores).length > 0 && (
                <div className="p-4 bg-muted rounded-lg border border-border">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Saved Subjects ({Object.keys(savedScores).length}/{subjects.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((subject) => (
                      <span
                        key={subject}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          savedScores[subject]
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground border border-border"
                        }`}
                      >
                        {subject} {savedScores[subject] && "✓"}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Score Entry Table */}
              <div className="overflow-x-auto border border-border/50 rounded-lg">
                {loadingData ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading students...</p>
                  </div>
                ) : scores.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No students found in {selectedClass}. Please add students in the Registrar page.
                  </div>
                ) : (
                <table className="w-full min-w-[600px]">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold">Student</th>
                      <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold">Class (30)</th>
                      <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold">Exam (70)</th>
                      <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold">Total</th>
                      <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scores.map((score) => {
                      const totalMark = score.classScore + score.examScore;
                      const grade = calculateGrade(totalMark);
                      return (
                        <tr key={score.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium">
                            <div className="max-w-[120px] sm:max-w-none truncate">{score.name}</div>
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-center">
                            <Input
                              type="number"
                              min="0"
                              max="30"
                              value={score.classScore === 0 ? "" : score.classScore}
                              onChange={(e) =>
                                handleScoreChange(score.id, "classScore", parseInt(e.target.value) || 0)
                              }
                              placeholder="0"
                              className="w-12 sm:w-16 mx-auto text-center text-xs sm:text-sm"
                            />
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-center">
                            <Input
                              type="number"
                              min="0"
                              max="70"
                              value={score.examScore === 0 ? "" : score.examScore}
                              onChange={(e) =>
                                handleScoreChange(score.id, "examScore", parseInt(e.target.value) || 0)
                              }
                              placeholder="0"
                              className="w-12 sm:w-16 mx-auto text-center text-xs sm:text-sm"
                            />
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold">
                            {totalMark}
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-center">
                            <span className="inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-bold bg-muted text-foreground border border-border">
                              {grade}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleSaveSubjectScores} 
                  variant="outline" 
                  className="gap-2 flex-1" 
                  disabled={scores.length === 0 || !selectedSubject}
                >
                  <FileText className="w-4 h-4" />
                  {selectedSubject ? `Save ${selectedSubject} Scores` : "Save Scores"}
                </Button>
                <Button 
                  onClick={handleGenerateReports} 
                  className="gap-2 flex-1" 
                  disabled={Object.keys(savedScores).length === 0}
                >
                  <FileText className="w-4 h-4" />
                  Generate All Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPORTS TAB */}
        <TabsContent value="reports" className="space-y-6 mt-6">
          {reports.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="text-center py-8 text-muted-foreground">
                No reports generated yet. Enter scores for all subjects, save them, and click "Generate All Reports"
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id} className="border-border/50 hover:shadow-md transition-shadow">
                  <CardContent className="pt-6 space-y-4">
                    {/* Student Header */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pb-4 border-b border-border">
                      <div>
                        <p className="text-sm text-muted-foreground">Student</p>
                        <p className="font-semibold text-foreground truncate">{report.name}</p>
                        <p className="text-xs text-muted-foreground">{report.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Score</p>
                        <p className="text-xl sm:text-2xl font-bold text-primary">{report.totalScore.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Average</p>
                        <p className="text-xl sm:text-2xl font-bold text-secondary">{report.averageScore.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Class Rank</p>
                        <p className="text-xl sm:text-2xl font-bold text-foreground">#{report.classRank}</p>
                      </div>
                    </div>

                    {/* Subject Breakdown */}
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">Subject Scores</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {report.subjects.map((subject) => (
                          <div key={subject.name} className="p-3 bg-muted rounded-lg border border-border">
                            <p className="text-xs font-semibold text-foreground mb-1">{subject.name}</p>
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-muted-foreground">
                                <span>Class: {subject.classScore}</span>
                                <span className="mx-1">•</span>
                                <span>Exam: {subject.examScore}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-foreground">{subject.total}</span>
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-background border border-border">
                                  {subject.grade}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Remarks and Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Teacher's Remarks</p>
                        <Input
                          value={remarks[report.id] || ""}
                          onChange={(e) =>
                            setRemarks({ ...remarks, [report.id]: e.target.value })
                          }
                          placeholder="Add remarks"
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1 flex-1"
                          onClick={() => handleDownloadReport(report)}
                        >
                          <Download className="w-4 h-4" />
                          Download Report Card
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button onClick={handleDownloadAllReports} className="w-full gap-2">
                <Download className="w-4 h-4" />
                Download All Report Cards (PDF)
              </Button>
            </div>
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-6 mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Report History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { term: "Term 3 2023", date: "Dec 2023", students: 150 },
                  { term: "Term 2 2023", date: "Aug 2023", students: 150 },
                  { term: "Term 1 2023", date: "May 2023", students: 145 },
                ].map((history) => (
                  <div key={history.term} className="p-4 border border-border/50 rounded-lg flex justify-between items-center hover:bg-muted/50">
                    <div>
                      <p className="font-semibold text-foreground">{history.term}</p>
                      <p className="text-sm text-muted-foreground">{history.date} • {history.students} students</p>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
