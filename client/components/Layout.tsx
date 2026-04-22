import { useState } from "react";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Menu, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function Layout({ children, title, subtitle }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userName, userRole, loading } = useAuth();
  const navigate = useNavigate();

  const getRoleBadge = () => {
    switch (userRole) {
      case "admin":
        return "Administrator";
      case "teacher":
        return "Teacher";
      case "registrar":
        return "Registrar";
      default:
        return "User";
    }
  };

  const handleProfileClick = () => {
    // Only admin can access settings
    if (userRole === "admin") {
      navigate("/settings");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="sm:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-border sticky top-0 z-20 shadow-sm paper-texture">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              {title && (
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                  )}
                </div>
              )}
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              </Button>
              <div className="flex items-center space-x-3 pl-4 border-l border-border">
                {loading ? (
                  // Loading skeleton for user info
                  <>
                    <div className="hidden sm:block text-right space-y-1">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
                      <div className="h-3 w-20 bg-muted rounded animate-pulse"></div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-muted animate-pulse"></div>
                  </>
                ) : (
                  <>
                    <div className="hidden sm:block text-right">
                      <p className="text-sm font-medium text-foreground">{userName}</p>
                      <p className="text-xs text-muted-foreground">{getRoleBadge()}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleProfileClick}
                      className={cn(
                        "w-10 h-10 rounded-full bg-primary/10",
                        userRole === "admin" && "cursor-pointer hover:bg-primary/20"
                      )}
                      title={userRole === "admin" ? "Go to Settings" : "Profile"}
                    >
                      <User className="w-5 h-5 text-primary" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-white py-6 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
            <p>© 2026 Glinax Tech Innovations. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
