import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingDown, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAcademicYear } from "@/hooks/use-academic-year";
import ClassFeesConfig from "@/components/finance/ClassFeesConfig";
import ExpensesDashboard from "@/components/finance/ExpensesDashboard";
import IncomeDashboard from "@/components/finance/IncomeDashboard";

export default function Finance() {
  const { profile } = useAuth();
  const { academicYear, term } = useAcademicYear();
  const [activeTab, setActiveTab] = useState("income");

  if (!profile?.school_id) {
    return (
      <Layout title="Finance" subtitle="Manage school finances">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Finance" subtitle="Manage income, expenses, and class fees">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="income" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Income
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2">
              <TrendingDown className="w-4 h-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="class-fees" className="gap-2">
              <Settings className="w-4 h-4" />
              Class Fees
            </TabsTrigger>
          </TabsList>

          <TabsContent value="income" className="mt-6">
            <IncomeDashboard
              schoolId={profile.school_id}
              academicYear={academicYear}
              term={term}
            />
          </TabsContent>

          <TabsContent value="expenses" className="mt-6">
            <ExpensesDashboard
              schoolId={profile.school_id}
              academicYear={academicYear}
              term={term}
            />
          </TabsContent>

          <TabsContent value="class-fees" className="mt-6">
            <ClassFeesConfig
              schoolId={profile.school_id}
              academicYear={academicYear}
              term={term}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
