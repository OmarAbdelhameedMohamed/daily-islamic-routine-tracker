import { Outlet, useLocation, useNavigate } from "react-router";
import { LayoutDashboard, BarChart3, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname === "/";
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      }
      setLoading(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) return null;

  return (
    <div dir="rtl" className="min-h-screen font-['Tajawal'] bg-[#F7FBF9]">
      <header className="bg-[#2D6A4F] text-white px-5 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <h1 className="text-[1.2rem]">متابع العبادات اليومية</h1>
        <div className="flex items-center gap-4">
          <span className="text-[#95D5B2] text-sm">
            {new Date().toLocaleDateString("ar-SA", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <button onClick={handleLogout} className="text-white hover:text-[#95D5B2] transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="pb-20 max-w-lg mx-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-[#95D5B2]/30 flex z-50">
        <button
          onClick={() => navigate("/")}
          className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
            isDashboard ? "text-[#2D6A4F]" : "text-gray-400"
          }`}
        >
          <LayoutDashboard size={22} />
          <span className="text-xs">الرئيسية</span>
        </button>
        <button
          onClick={() => navigate("/statistics")}
          className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
            !isDashboard ? "text-[#2D6A4F]" : "text-gray-400"
          }`}
        >
          <BarChart3 size={22} />
          <span className="text-xs">الإحصائيات</span>
        </button>
      </nav>
    </div>
  );
}
