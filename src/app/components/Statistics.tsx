import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";
import { supabase } from "../../supabaseClient";
import { Loader2 } from "lucide-react";

const weekDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function CircularProgress({ value, color, size = 80, label }: { value: number; color: string; size?: number; label: string }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#95D5B2" strokeWidth={strokeWidth} opacity={0.25} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold text-[#2D6A4F]">{value}%</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 text-center">{label}</p>
    </div>
  );
}

type Filter = "week" | "month" | "custom";

export function Statistics() {
  const [filter, setFilter] = useState<Filter>("week");
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [chartData, setChartData] = useState<any>({
    prayerData: [],
    quranData: [],
    sunanData: [],
    circularData: [],
    sunanPercent: 0,
  });

  const fetchStats = async (start?: string, end?: string) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    let startDateStr = "";
    let endDateStr = end || new Date().toISOString().split('T')[0];

    if (filter === "week") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      startDateStr = d.toISOString().split('T')[0];
    } else if (filter === "month") {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      startDateStr = d.toISOString().split('T')[0];
    } else {
      startDateStr = start || dateRange.from;
      endDateStr = end || dateRange.to;
    }

    // Fetch Prayer Logs
    const { data: prayerLogs, error: prayerError } = await supabase
      .from('prayer_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    // Fetch Daily Habits
    const { data: habits, error: habitError } = await supabase
      .from('daily_habits')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    if (prayerError || habitError) {
      console.error("Error fetching stats:", prayerError || habitError);
      setLoading(false);
      return;
    }

    // Process Data
    const processedPrayerData = [];
    const processedQuranData = [];
    const processedSunanData = [];
    const habitStats = {
      morningAdhkar: 0,
      eveningAdhkar: 0,
      sleepAdhkar: 0,
      duhaPrayer: 0,
      sunanRawatib: 0,
    };

    const startD = new Date(startDateStr);
    const endD = new Date(endDateStr);
    const diffTime = Math.abs(endD.getTime() - startD.getTime());
    const daysToFetch = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < daysToFetch; i++) {
      const d = new Date(startD);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      
      let dayLabel = "";
      if (daysToFetch <= 7) {
        dayLabel = weekDays[d.getDay()];
      } else if (daysToFetch <= 14) {
        dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      } else {
        dayLabel = `${d.getMonth() + 1}/${d.getDate()}`;
      }

      // Prayer Quality
      const dayPrayers = prayerLogs?.filter(log => log.date === dateStr) || [];
      processedPrayerData.push({
        day: dayLabel,
        total: dayPrayers.filter(p => p.is_prayed).length,
        congregation: dayPrayers.filter(p => p.is_jamaah).length,
        isTakbir: dayPrayers.filter(p => p.is_takbir).length,
      });

      // Quran Progress
      const dayHabit = habits?.find(h => h.date === dateStr);
      processedQuranData.push({
        day: dayLabel,
        pages: dayHabit?.quran_pages || 0,
      });

      // Sunan Rawatib Progress
      processedSunanData.push({
        day: dayLabel,
        rakahs: dayHabit?.sunan_rawatib || 0,
      });

      if (dayHabit) {
        if (dayHabit.morning_adhkar) habitStats.morningAdhkar++;
        if (dayHabit.evening_adhkar) habitStats.eveningAdhkar++;
        if (dayHabit.sleep_adhkar) habitStats.sleepAdhkar++;
        if (dayHabit.duha_prayer) habitStats.duhaPrayer++;
        habitStats.sunanRawatib += (dayHabit.sunan_rawatib || 0);
      }
    }

    const circularData = [
      { label: "أذكار الصباح", value: daysToFetch > 0 ? Math.round((habitStats.morningAdhkar / daysToFetch) * 100) : 0, color: "#2D6A4F" },
      { label: "أذكار المساء", value: daysToFetch > 0 ? Math.round((habitStats.eveningAdhkar / daysToFetch) * 100) : 0, color: "#40916C" },
      { label: "أذكار النوم", value: daysToFetch > 0 ? Math.round((habitStats.sleepAdhkar / daysToFetch) * 100) : 0, color: "#52B788" },
      { label: "صلاة الضحى", value: daysToFetch > 0 ? Math.round((habitStats.duhaPrayer / daysToFetch) * 100) : 0, color: "#95D5B2" },
    ];

    setChartData({
      prayerData: processedPrayerData,
      quranData: processedQuranData,
      sunanData: processedSunanData,
      circularData,
      sunanPercent: daysToFetch > 0 ? Math.round((habitStats.sunanRawatib / (daysToFetch * 12)) * 100) : 0,
      daysCount: daysToFetch,
    });
    setLoading(false);
  };

  useEffect(() => {
    if (filter !== "custom") {
      fetchStats();
    }
  }, [filter]);

  const filterLabel: Record<Filter, string> = {
    week: "آخر أسبوع",
    month: "آخر شهر",
    custom: "مخصص",
  };

  const calculatePercentages = () => {
    const data = chartData.prayerData;
    const totalPerformed = data.reduce((sum: number, d: any) => sum + d.total, 0);
    const totalCongregation = data.reduce((sum: number, d: any) => sum + d.congregation, 0);
    const totalIsTakbir = data.reduce((sum: number, d: any) => sum + d.isTakbir, 0);

    const congregationPercent = totalPerformed > 0 ? Math.round((totalCongregation / totalPerformed) * 100) : 0;
    const isTakbirPercent = totalPerformed > 0 ? Math.round((totalIsTakbir / totalPerformed) * 100) : 0;
    const sunanPercent = chartData.sunanPercent || 0;

    return { congregationPercent, isTakbirPercent, sunanPercent };
  };

  const { congregationPercent, isTakbirPercent, sunanPercent } = calculatePercentages();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7FBF9]">
        <Loader2 className="w-10 h-10 animate-spin text-[#2D6A4F]" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5" dir="rtl">
      {/* Filter */}
      <div className="bg-white rounded-[20px] p-2 shadow-sm flex flex-col gap-2">
        <div className="flex gap-2">
          {(["week", "month", "custom"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-2xl text-sm transition-all ${
                filter === f ? "bg-[#2D6A4F] text-white" : "text-[#2D6A4F] bg-transparent"
              }`}
            >
              {filterLabel[f]}
            </button>
          ))}
        </div>

        {filter === "custom" && (
          <div className="p-3 border-t border-[#95D5B2]/20 space-y-3 animate-slide-up">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-[#2D6A4F]/70 pr-1">من</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="w-full p-2 text-xs rounded-xl border border-[#95D5B2]/40 bg-[#F7FBF9] text-[#2D6A4F] outline-none focus:border-[#2D6A4F]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-[#2D6A4F]/70 pr-1">إلى</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full p-2 text-xs rounded-xl border border-[#95D5B2]/40 bg-[#F7FBF9] text-[#2D6A4F] outline-none focus:border-[#2D6A4F]"
                />
              </div>
            </div>
            <button
              onClick={() => fetchStats(dateRange.from, dateRange.to)}
              className="w-full py-2 bg-[#2D6A4F] text-white rounded-xl text-sm font-medium hover:bg-[#1B4332] transition-colors"
            >
              تطبيق
            </button>
          </div>
        )}
      </div>

      {/* Percentage Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-[#2D6A4F] to-[#1B4332] rounded-[20px] p-4 text-white shadow-md">
          <div className="text-3xl font-bold mb-1">{congregationPercent}%</div>
          <div className="text-xs opacity-90">صلاة الجماعة</div>
        </div>
        <div className="bg-gradient-to-br from-[#40916C] to-[#2D6A4F] rounded-[20px] p-4 text-white shadow-md">
          <div className="text-3xl font-bold mb-1">{isTakbirPercent}%</div>
          <div className="text-xs opacity-90">تكبيرة الإحرام</div>
        </div>
        <div className="bg-gradient-to-br from-[#52B788] to-[#40916C] rounded-[20px] p-4 text-white shadow-md">
          <div className="text-3xl font-bold mb-1">{sunanPercent}%</div>
          <div className="text-xs opacity-90">السنن الرواتب</div>
        </div>
      </div>

      {/* Bar Chart - Prayer Quality */}
      <div className="bg-white rounded-[20px] p-4 shadow-sm">
        <h2 className="text-[#2D6A4F] mb-4">جودة الصلاة</h2>
        <div dir="ltr">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart 
              data={chartData.prayerData}
              barGap={2}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#95D5B2" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #95D5B2", fontFamily: "Tajawal" }}
              />
              <Bar dataKey="total" name="إجمالي الصلوات" fill="#B7E4C7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="congregation" name="جماعة" fill="#52B788" radius={[4, 4, 0, 0]} />
              <Bar dataKey="isTakbir" name="تكبيرة الإحرام" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2 text-xs flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-[#B7E4C7] inline-block" /> إجمالي
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-[#52B788] inline-block" /> جماعة
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-[#2D6A4F] inline-block" /> تكبيرة الإحرام
          </span>
        </div>
      </div>

      {/* Line Chart - Quran Progress */}
      <div className="bg-white rounded-[20px] p-4 shadow-sm">
        <h2 className="text-[#2D6A4F] mb-4">تقدم قراءة القرآن</h2>
        <div dir="ltr">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData.quranData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#95D5B2" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #95D5B2", fontFamily: "Tajawal" }}
              />
              <Line
                type="monotone" dataKey="pages" name="صفحات" stroke="#2D6A4F" strokeWidth={3}
                dot={{ fill: "#2D6A4F", r: 4 }} activeDot={{ r: 6, fill: "#95D5B2" }}
              />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line Chart - Sunan Rawatib Progress */}
      <div className="bg-white rounded-[20px] p-4 shadow-sm">
        <h2 className="text-[#2D6A4F] mb-4">تقدم السنن الرواتب</h2>
        <div dir="ltr">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData.sunanData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#95D5B2" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 12]} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #95D5B2", fontFamily: "Tajawal" }}
              />
              <Line
                type="monotone" dataKey="rakahs" name="ركعات" stroke="#40916C" strokeWidth={3}
                dot={{ fill: "#40916C", r: 4 }} activeDot={{ r: 6, fill: "#95D5B2" }}
              />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Circular Progress */}
      <div className="bg-white rounded-[20px] p-4 shadow-sm">
        <h2 className="text-[#2D6A4F] mb-4">الأذكار والسنن</h2>
        <div className="grid grid-cols-2 gap-6 justify-items-center py-2">
          {chartData.circularData.map((item: any) => (
            <CircularProgress key={item.label} value={item.value} color={item.color} label={item.label} />
          ))}
        </div>
      </div>
    </div>
  );
}