/**
 * Utility functions for exporting data to various formats
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Generate CSV from data
export function generateCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

// Generate academic report PDF
export function generateAcademicReportPDF(data: any[], schoolName: string) {
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(20);
  doc.text(schoolName, 105, 20, { align: 'center' });
  doc.setFontSize(16);
  doc.text('Academic Performance Report', 105, 30, { align: 'center' });
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 40, { align: 'center' });
  
  // Add table
  autoTable(doc, {
    startY: 50,
    head: [['Class', 'Average Score', 'Top Student', 'Top Score']],
    body: data.map(item => [
      item.class,
      `${item.avgScore}%`,
      item.topStudent,
      item.topScore
    ]),
    theme: 'grid',
    headStyles: { fillColor: [66, 66, 66] },
  });
  
  // Add summary
  const finalY = (doc as any).lastAutoTable.finalY || 50;
  doc.setFontSize(12);
  doc.text('Summary', 14, finalY + 15);
  doc.setFontSize(10);
  doc.text(`Total Classes: ${data.length}`, 14, finalY + 25);
  doc.text(`School Average: ${(data.reduce((sum, item) => sum + item.avgScore, 0) / data.length).toFixed(1)}%`, 14, finalY + 32);
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    doc.text(`© ${new Date().getFullYear()} School Management System`, 105, 290, { align: 'center' });
  }
  
  doc.save(`Academic_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Generate attendance report PDF
export function generateAttendanceReportPDF(data: any[], schoolName: string) {
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(20);
  doc.text(schoolName, 105, 20, { align: 'center' });
  doc.setFontSize(16);
  doc.text('Attendance Report', 105, 30, { align: 'center' });
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 40, { align: 'center' });
  
  // Add table
  autoTable(doc, {
    startY: 50,
    head: [['Class', 'Attendance Rate', 'Total Students', 'Absences']],
    body: data.map(item => [
      item.class,
      `${item.rate}%`,
      item.students,
      item.absent
    ]),
    theme: 'grid',
    headStyles: { fillColor: [66, 66, 66] },
  });
  
  // Add summary
  const finalY = (doc as any).lastAutoTable.finalY || 50;
  doc.setFontSize(12);
  doc.text('Summary', 14, finalY + 15);
  doc.setFontSize(10);
  doc.text(`School Average Attendance: ${(data.reduce((sum, item) => sum + item.rate, 0) / data.length).toFixed(1)}%`, 14, finalY + 25);
  doc.text(`Total Absences: ${data.reduce((sum, item) => sum + item.absent, 0)}`, 14, finalY + 32);
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    doc.text(`© ${new Date().getFullYear()} School Management System`, 105, 290, { align: 'center' });
  }
  
  doc.save(`Attendance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Generate enrollment report PDF
export function generateEnrollmentReportPDF(data: any[], schoolName: string) {
  const doc = new jsPDF();
  
  const totalEnrollment = data.reduce((sum, item) => sum + item.total, 0);
  const totalBoys = data.reduce((sum, item) => sum + item.boys, 0);
  const totalGirls = data.reduce((sum, item) => sum + item.girls, 0);
  
  // Add header
  doc.setFontSize(20);
  doc.text(schoolName, 105, 20, { align: 'center' });
  doc.setFontSize(16);
  doc.text('Enrollment Report', 105, 30, { align: 'center' });
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 40, { align: 'center' });
  
  // Add overview
  doc.setFontSize(12);
  doc.text('Overview', 14, 55);
  autoTable(doc, {
    startY: 60,
    head: [['Metric', 'Value']],
    body: [
      ['Total Enrollment', totalEnrollment.toString()],
      ['Boys', `${totalBoys} (${((totalBoys / totalEnrollment) * 100).toFixed(1)}%)`],
      ['Girls', `${totalGirls} (${((totalGirls / totalEnrollment) * 100).toFixed(1)}%)`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [66, 66, 66] },
  });
  
  // Add enrollment by class
  const finalY = (doc as any).lastAutoTable.finalY || 60;
  doc.setFontSize(12);
  doc.text('Enrollment by Class', 14, finalY + 15);
  
  autoTable(doc, {
    startY: finalY + 20,
    head: [['Class', 'Boys', 'Girls', 'Total']],
    body: data.map(item => [
      item.class,
      item.boys,
      item.girls,
      item.total
    ]),
    theme: 'grid',
    headStyles: { fillColor: [66, 66, 66] },
  });
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    doc.text(`© ${new Date().getFullYear()} School Management System`, 105, 290, { align: 'center' });
  }
  
  doc.save(`Enrollment_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Generate student report card
export function generateStudentReportCard(student: any, schoolName: string, schoolLogo?: string) {
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(20);
  doc.text(schoolName, 105, 20, { align: 'center' });
  doc.setFontSize(16);
  doc.text('Student Report Card', 105, 30, { align: 'center' });
  
  // Add student information
  doc.setFontSize(12);
  doc.text('Student Information', 14, 45);
  autoTable(doc, {
    startY: 50,
    head: [['Field', 'Value']],
    body: [
      ['Name', student.name],
      ['Student ID', student.id],
      ['Class', student.class],
      ['Term', student.term || 'Current Term'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [66, 66, 66] },
  });
  
  // Add academic performance
  const finalY1 = (doc as any).lastAutoTable.finalY || 50;
  doc.setFontSize(12);
  doc.text('Academic Performance', 14, finalY1 + 15);
  
  autoTable(doc, {
    startY: finalY1 + 20,
    head: [['Subject', 'Class Score (30%)', 'Exam Score (70%)', 'Total (100%)', 'Grade']],
    body: student.subjects?.map((subject: any) => [
      subject.name,
      subject.classScore,
      subject.examScore,
      subject.total,
      subject.grade
    ]) || [['No subjects recorded', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [66, 66, 66] },
  });
  
  // Add summary
  const finalY2 = (doc as any).lastAutoTable.finalY || 50;
  doc.setFontSize(12);
  doc.text('Summary', 14, finalY2 + 15);
  
  autoTable(doc, {
    startY: finalY2 + 20,
    head: [['Metric', 'Value']],
    body: [
      ['Total Score', student.totalScore || 'N/A'],
      ['Class Rank', student.classRank || 'N/A'],
      ['Attendance', `${student.attendance || 'N/A'}%`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [66, 66, 66] },
  });
  
  // Add remarks
  const finalY3 = (doc as any).lastAutoTable.finalY || 50;
  doc.setFontSize(12);
  doc.text("Teacher's Remarks", 14, finalY3 + 15);
  doc.setFontSize(10);
  const remarks = student.remarks || 'No remarks provided.';
  const splitRemarks = doc.splitTextToSize(remarks, 180);
  doc.text(splitRemarks, 14, finalY3 + 22);
  
  // Add signature section
  const remarksHeight = splitRemarks.length * 5;
  doc.setFontSize(10);
  doc.text("Headmaster's Signature: _______________________", 14, finalY3 + 30 + remarksHeight);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, finalY3 + 40 + remarksHeight);
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    doc.text(`© ${new Date().getFullYear()} School Management System`, 105, 290, { align: 'center' });
  }
  
  doc.save(`Report_Card_${student.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Download blob helper
function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Export data as JSON
export function exportAsJSON(data: any, filename: string) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
}
