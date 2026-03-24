import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Bookmark, Loader2 } from "lucide-react";
import { supabase } from "../../supabaseClient";

export function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      setMessage({
        type: "success",
        text: "تم إرسال رابط الدخول! تفقد بريدك الإلكتروني الآن.",
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "حدث خطأ أثناء محاولة تسجيل الدخول.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "حدث خطأ أثناء محاولة تسجيل الدخول عبر جوجل.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-md space-y-8">
        {/* Islamic Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-[#95D5B2] opacity-20 blur-2xl rounded-full"></div>
            <div className="relative bg-gradient-to-br from-[#2D6A4F] to-[#40916C] p-6 rounded-[24px] shadow-lg">
              <Bookmark className="w-12 h-12 text-white" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl text-[#2D6A4F] font-semibold tracking-tight">
            مرحباً بك في وردك اليومي
          </h1>
          <p className="text-sm text-gray-500">
            تابع عباداتك اليومية بسهولة وسلاسة
          </p>
        </div>

        {/* Message Area */}
        {message && (
          <div
            className={`p-4 rounded-[16px] text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-100"
                : "bg-red-50 text-red-700 border border-red-100"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Email Form */}
        <form onSubmit={handleEmailLogin} className="space-y-6 pt-4">
          <div>
            <label htmlFor="email" className="block text-sm text-gray-600 mb-2">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-4 py-3.5 rounded-[16px] border border-gray-200 focus:border-[#95D5B2] focus:outline-none focus:ring-2 focus:ring-[#95D5B2] focus:ring-opacity-20 transition-all text-right placeholder:text-gray-400"
              required
              dir="ltr"
              disabled={loading}
            />
          </div>

          {/* Primary Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2D6A4F] text-white py-4 rounded-[16px] font-medium hover:bg-[#1B4332] transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              "دخول سريع عبر الإيميل"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-4 bg-white text-gray-400">أو</span>
          </div>
        </div>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-[16px] border border-gray-200 hover:border-[#95D5B2] hover:bg-gray-50 transition-all group disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-gray-700 text-sm font-medium group-hover:text-[#2D6A4F]">
            الدخول عبر جوجل
          </span>
        </button>

        {/* Footer Note */}
        <p className="text-center text-xs text-gray-400 pt-4">
          بالدخول، أنت توافق على شروط الخدمة وسياسة الخصوصية
        </p>
      </div>
    </div>
  );
}
