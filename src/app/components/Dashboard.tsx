import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, X, BookOpen, Sun, Moon, Bed, Sunrise, ChevronLeft, ChevronRight, Loader2, Check } from "lucide-react";
import { supabase } from "../../supabaseClient";

const prayers = [
  { id: "fajr", name: "الفجر", icon: "🌅" },
  { id: "dhuhr", name: "الظهر", icon: "☀️" },
  { id: "asr", name: "العصر", icon: "🌤️" },
  { id: "maghrib", name: "المغرب", icon: "🌇" },
  { id: "isha", name: "العشاء", icon: "🌙" },
];

interface PrayerState {
  performed: boolean;
  congregation: boolean;
  isTakbir: boolean;
}

interface DhikrItem {
  id: string;
  name: string;
  target: number;
  current: number;
}

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [prayerStates, setPrayerStates] = useState<Record<string, PrayerState>>(
    Object.fromEntries(
      prayers.map((p) => [p.id, { performed: false, congregation: false, isTakbir: false }])
    )
  );
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [habits, setHabits] = useState({
    morningAdhkar: false,
    eveningAdhkar: false,
    sleepAdhkar: false,
    duhaPrayer: false,
    witrPrayer: false,
    quranPages: 0,
    sunanRawatib: 0,
  });
  const [customDhikr, setCustomDhikr] = useState<DhikrItem[]>([]);
  const [showDhikrModal, setShowDhikrModal] = useState(false);
  const [newDhikrName, setNewDhikrName] = useState("");
  const [newDhikrTarget, setNewDhikrTarget] = useState(33);
  const carouselRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === today;

  // Fetch data on load or when date changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch Prayer Logs
      const { data: prayerData, error: prayerError } = await supabase
        .from('prayer_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', selectedDate);

      if (prayerError) console.error("Error fetching prayers:", prayerError);
      else if (prayerData) {
        const newStates = Object.fromEntries(
          prayers.map((p) => [p.id, { performed: false, congregation: false, isTakbir: false }])
        );
        prayerData.forEach(log => {
          const prayerId = log.prayer_name?.toLowerCase();
          if (newStates[prayerId]) {
            newStates[prayerId] = {
              performed: log.is_prayed,
              congregation: log.is_jamaah,
              isTakbir: log.is_takbir,
            };
          }
        });
        setPrayerStates(newStates);
      }

      // Fetch Daily Habits
      const { data: habitData, error: habitError } = await supabase
        .from('daily_habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', selectedDate)
        .maybeSingle();

      if (habitError) {
        console.error("Error fetching habits:", habitError);
      } else if (habitData) {
        setHabits({
          morningAdhkar: habitData.morning_adhkar ?? false,
          eveningAdhkar: habitData.evening_adhkar ?? false,
          sleepAdhkar: habitData.sleep_adhkar ?? false,
          duhaPrayer: habitData.duha_prayer ?? false,
          witrPrayer: habitData.witr_prayer ?? false,
          quranPages: habitData.quran_pages ?? 0,
          sunanRawatib: habitData.sunan_rawatib ?? 0,
        });
      } else {
        // Reset habits if no data for the selected date
        setHabits({
          morningAdhkar: false,
          eveningAdhkar: false,
          sleepAdhkar: false,
          duhaPrayer: false,
          witrPrayer: false,
          quranPages: 0,
          sunanRawatib: 0,
        });
      }

      // Fetch Custom Adhkar
      const { data: dhikrData, error: dhikrError } = await supabase
        .from('user_custom_adhkar')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', selectedDate);

      if (dhikrError) console.error("Error fetching dhikr:", dhikrError);
      else if (dhikrData) {
        setCustomDhikr(dhikrData.map(d => ({
          id: d.id,
          name: d.adhkar_name,
          target: d.target_count,
          current: d.current_count,
        })));
      }

      setLoading(false);
    };

    fetchData();
  }, [selectedDate]);

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Upsert Prayer Log
  const upsertPrayer = async (prayerId: string, state: PrayerState, date: string) => {
    const validPrayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
    const sanitizedId = prayerId.toLowerCase().trim();

    if (!validPrayers.includes(sanitizedId)) {
      console.error(`Invalid prayer name attempted: ${prayerId}`);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('prayer_logs')
      .upsert({
        user_id: user.id,
        date: date,
        prayer_name: sanitizedId,
        is_prayed: state.performed,
        is_jamaah: state.congregation,
        is_takbir: state.isTakbir,
      }, { onConflict: 'user_id,date,prayer_name' });

    if (error) console.error("Error upserting prayer:", error);
  };

  // Upsert Daily Habits
  const upsertHabits = async (newHabits: typeof habits, date: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('daily_habits')
      .upsert({
        user_id: user.id,
        date: date,
        morning_adhkar: newHabits.morningAdhkar,
        evening_adhkar: newHabits.eveningAdhkar,
        sleep_adhkar: newHabits.sleepAdhkar,
        duha_prayer: newHabits.duhaPrayer,
        witr_prayer: newHabits.witrPrayer,
        quran_pages: newHabits.quranPages,
        sunan_rawatib: newHabits.sunanRawatib,
      }, { onConflict: 'user_id,date' });

    if (error) console.error("Error upserting habits:", error);
  };

  // Simple debounce implementation
  const debounce = (fn: Function, ms: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function (this: any, ...args: any[]) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), ms);
    };
  };

  // Debounced Habit Upsert
  const debouncedUpsertHabits = useCallback(
    debounce((h: typeof habits, d: string) => upsertHabits(h, d), 500),
    []
  );

  const togglePrayer = (prayerId: string, field: keyof PrayerState) => {
    setPrayerStates((prev) => {
      const newState = {
        ...prev[prayerId],
        [field]: !prev[prayerId][field],
      };
      // Reset dependent fields if 'performed' or 'congregation' is unchecked
      if (field === 'performed' && !newState.performed) {
        newState.congregation = false;
        newState.isTakbir = false;
      }
      if (field === 'congregation' && !newState.congregation) {
        newState.isTakbir = false;
      }
      
      const nextStates = { ...prev, [prayerId]: newState };
      upsertPrayer(prayerId, newState, selectedDate);
      return nextStates;
    });
  };

  const handleHabitToggle = (key: keyof typeof habits) => {
    setHabits((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      upsertHabits(next, selectedDate);
      return next;
    });
  };

  const handleCounterChange = (key: 'quranPages' | 'sunanRawatib', value: number) => {
    setHabits((prev) => {
      const next = { ...prev, [key]: value };
      debouncedUpsertHabits(next, selectedDate);
      return next;
    });
  };

  const addDhikr = async () => {
    if (!newDhikrName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_custom_adhkar')
      .insert({
        user_id: user.id,
        date: selectedDate,
        adhkar_name: newDhikrName,
        target_count: newDhikrTarget,
        current_count: 0,
      })
      .select()
      .single();

    if (error) console.error("Error adding dhikr:", error);
    else if (data) {
      setCustomDhikr((prev) => [
        ...prev,
        { id: data.id, name: data.adhkar_name, target: data.target_count, current: 0 },
      ]);
      setNewDhikrName("");
      setNewDhikrTarget(33);
      setShowDhikrModal(false);
    }
  };

  const incrementDhikr = async (id: string) => {
    const dhikr = customDhikr.find(d => d.id === id);
    if (!dhikr) return;

    if (dhikr.current >= dhikr.target) return;

    const newCurrent = Math.min(dhikr.current + 1, dhikr.target);
    
    setCustomDhikr((prev) =>
      prev.map((d) => (d.id === id ? { ...d, current: newCurrent } : d))
    );

    const { error } = await supabase
      .from('user_custom_adhkar')
      .update({ current_count: newCurrent })
      .eq('id', id);

    if (error) console.error("Error updating dhikr:", error);
  };

  const markDhikrDone = async (id: string) => {
    const dhikr = customDhikr.find(d => d.id === id);
    if (!dhikr) return;

    setCustomDhikr((prev) =>
      prev.map((d) => (d.id === id ? { ...d, current: d.target } : d))
    );

    const { error } = await supabase
      .from('user_custom_adhkar')
      .update({ current_count: dhikr.target })
      .eq('id', id);

    if (error) console.error("Error marking dhikr as done:", error);
  };

  const removeDhikr = async (id: string) => {
    const { error } = await supabase
      .from('user_custom_adhkar')
      .delete()
      .eq('id', id);

    if (error) console.error("Error deleting dhikr:", error);
    else {
      setCustomDhikr((prev) => prev.filter((x) => x.id !== id));
    }
  };

  const scroll = (dir: number) => {
    carouselRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  const completedPrayers = Object.values(prayerStates).filter((p) => p.performed).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7FBF9]">
        <Loader2 className="w-10 h-10 animate-spin text-[#2D6A4F]" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      {/* Date Navigation */}
      <div className="bg-white rounded-[20px] p-4 shadow-sm flex items-center justify-between">
        <button
          onClick={() => changeDate(-1)}
          className="p-2 rounded-xl bg-[#F7FBF9] text-[#2D6A4F] hover:bg-[#95D5B2]/20 transition-colors"
        >
          <ChevronRight size={24} />
        </button>
        <div className="text-center">
          <p className="text-[#2D6A4F] font-bold">
            {new Date(selectedDate).toLocaleDateString("ar-SA", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          {!isToday && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mt-1 inline-block">
              عرض تاريخ سابق
            </span>
          )}
        </div>
        <button
          onClick={() => changeDate(1)}
          className="p-2 rounded-xl bg-[#F7FBF9] text-[#2D6A4F] hover:bg-[#95D5B2]/20 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Daily Progress */}
      <div className="bg-white rounded-[20px] p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#2D6A4F]">التقدم اليومي</h2>
          <span className="text-sm text-[#2D6A4F]/70">{completedPrayers}/5 صلوات</span>
        </div>
        <div className="w-full h-2 bg-[#95D5B2]/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2D6A4F] rounded-full transition-all duration-500"
            style={{ width: `${(completedPrayers / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Prayer Carousel */}
      <div className="bg-white rounded-[20px] p-4 shadow-sm">
        <h2 className="text-[#2D6A4F] mb-3">الصلوات الخمس</h2>
        <div className="relative">
          <button
            onClick={() => scroll(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full p-1 shadow"
          >
            <ChevronRight size={18} className="text-[#2D6A4F]" />
          </button>
          <button
            onClick={() => scroll(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full p-1 shadow"
          >
            <ChevronLeft size={18} className="text-[#2D6A4F]" />
          </button>
          <div
            ref={carouselRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide px-6 snap-x"
            style={{ scrollbarWidth: "none" }}
          >
            {prayers.map((prayer) => {
              const state = prayerStates[prayer.id];
              return (
                <div
                  key={prayer.id}
                  className={`min-w-[140px] snap-center rounded-2xl p-3 border-2 transition-all ${
                    state.performed
                      ? "border-[#2D6A4F] bg-[#2D6A4F]/5"
                      : "border-[#95D5B2]/40 bg-white"
                  }`}
                >
                  <div className="text-center mb-2">
                    <span className="text-2xl">{prayer.icon}</span>
                    <p className="text-[#2D6A4F] mt-1">{prayer.name}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={state.performed}
                        onChange={() => togglePrayer(prayer.id, "performed")}
                        className="accent-[#2D6A4F] w-4 h-4"
                      />
                      <span>أديت</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={state.congregation}
                        onChange={() => togglePrayer(prayer.id, "congregation")}
                        className="accent-[#2D6A4F] w-4 h-4"
                        disabled={!state.performed}
                      />
                      <span className={!state.performed ? "opacity-40" : ""}>جماعة</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={state.isTakbir}
                        onChange={() => togglePrayer(prayer.id, "isTakbir")}
                        className="accent-[#2D6A4F] w-4 h-4"
                        disabled={!state.congregation}
                      />
                      <span className={!state.congregation ? "opacity-40" : ""}>تكبيرة الإحرام</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Habits */}
      <div className="bg-white rounded-[20px] p-4 shadow-sm space-y-3">
        <h2 className="text-[#2D6A4F] mb-1">العبادات اليومية</h2>

        {[
          { key: "morningAdhkar" as const, label: "أذكار الصباح", icon: <Sun size={20} className="text-amber-500" /> },
          { key: "eveningAdhkar" as const, label: "أذكار المساء", icon: <Moon size={20} className="text-indigo-400" /> },
          { key: "sleepAdhkar" as const, label: "أذكار النوم", icon: <Bed size={20} className="text-purple-400" /> },
          { key: "duhaPrayer" as const, label: "صلاة الضحى", icon: <Sunrise size={20} className="text-orange-400" /> },
          { key: "witrPrayer" as const, label: "صلاة الوتر", icon: <Moon size={20} className="text-indigo-600" /> },
        ].map((item) => (
          <label
            key={item.key}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
              habits[item.key] ? "bg-[#2D6A4F]/5 border border-[#2D6A4F]/20" : "bg-[#F7FBF9] border border-transparent"
            }`}
          >
            <input
              type="checkbox"
              checked={habits[item.key]}
              onChange={() => handleHabitToggle(item.key)}
              className="accent-[#2D6A4F] w-5 h-5"
            />
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {habits[item.key] && <span className="text-[#2D6A4F] text-sm">✓</span>}
          </label>
        ))}

        {/* Quran Pages */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F7FBF9]">
          <BookOpen size={20} className="text-[#2D6A4F]" />
          <span className="flex-1">قراءة القرآن</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCounterChange('quranPages', Math.max(0, habits.quranPages - 1))}
              className="w-8 h-8 rounded-lg bg-[#95D5B2]/30 text-[#2D6A4F] flex items-center justify-center"
            >
              -
            </button>
            <input
              type="number"
              min={0}
              value={habits.quranPages}
              onChange={(e) =>
                handleCounterChange('quranPages', Math.max(0, parseInt(e.target.value) || 0))
              }
              className="w-12 text-center bg-white border border-[#95D5B2]/40 rounded-lg py-1 text-[#2D6A4F]"
            />
            <button
              onClick={() => handleCounterChange('quranPages', habits.quranPages + 1)}
              className="w-8 h-8 rounded-lg bg-[#2D6A4F] text-white flex items-center justify-center"
            >
              +
            </button>
            <span className="text-sm text-gray-500">صفحة</span>
          </div>
        </div>

        {/* Sunan Rawatib */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F7FBF9]">
            <div className="relative">
              <svg width={48} height={48} className="-rotate-90">
                <circle cx={24} cy={24} r={20} fill="none" stroke="#95D5B2" strokeWidth={4} opacity={0.25} />
                <circle
                  cx={24} cy={24} r={20} fill="none" stroke="#2D6A4F" strokeWidth={4}
                  strokeDasharray={125.6} strokeDashoffset={125.6 - (habits.sunanRawatib / 12) * 125.6}
                  strokeLinecap="round" className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-semibold text-[#2D6A4F]">{habits.sunanRawatib}</span>
              </div>
            </div>
            <span className="flex-1">السُّنن الرواتب</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCounterChange('sunanRawatib', Math.max(0, habits.sunanRawatib - 2))}
                className="w-8 h-8 rounded-lg bg-[#95D5B2]/30 text-[#2D6A4F] flex items-center justify-center"
              >
                -
              </button>
              <span className="text-sm text-[#2D6A4F] font-medium min-w-[30px] text-center">{habits.sunanRawatib}/12</span>
              <button
                onClick={() => handleCounterChange('sunanRawatib', Math.min(12, habits.sunanRawatib + 2))}
                className="w-8 h-8 rounded-lg bg-[#2D6A4F] text-white flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
          
          {/* Sunan Progress Trend UI */}
          <div className="px-3 pb-2">
            <div className="flex justify-between text-[10px] text-[#2D6A4F]/60 mb-1">
              <span>البداية</span>
              <span>المستهدف (12 ركعة)</span>
            </div>
            <div className="relative h-4 bg-[#95D5B2]/20 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 right-0 h-full bg-[#2D6A4F] transition-all duration-700 rounded-full"
                style={{ width: `${(habits.sunanRawatib / 12) * 100}%` }}
              />
              {/* Markers for each 2 rakahs */}
              {[2, 4, 6, 8, 10].map((step) => (
                <div 
                  key={step}
                  className="absolute top-0 h-full w-0.5 bg-white/30"
                  style={{ right: `${(step / 12) * 100}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Dhikr */}
      {customDhikr.length > 0 && (
        <div className="bg-white rounded-[20px] p-4 shadow-sm space-y-3">
          <h2 className="text-[#2D6A4F] mb-1">أذكار مخصصة</h2>
          {customDhikr.map((d) => (
            <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F7FBF9]">
              <button
                onClick={() => incrementDhikr(d.id)}
                disabled={d.current >= d.target}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg shrink-0 transition-all ${
                  d.current >= d.target ? "bg-[#95D5B2] text-white" : "bg-[#2D6A4F] text-white"
                }`}
              >
                {d.current}
              </button>
              <div className="flex-1">
                <p className="text-sm">{d.name}</p>
                <div className="w-full h-1.5 bg-[#95D5B2]/30 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-[#2D6A4F] rounded-full transition-all"
                    style={{ width: `${(d.current / d.target) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{d.target}/{d.current}</span>
                <button
                  onClick={() => markDhikrDone(d.id)}
                  disabled={d.current >= d.target}
                  className={`p-2 rounded-lg transition-all ${
                    d.current >= d.target 
                      ? "bg-[#2D6A4F] text-white" 
                      : "bg-[#95D5B2]/20 text-[#2D6A4F] hover:bg-[#95D5B2]/40"
                  }`}
                  title="تم الانتهاء"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => removeDhikr(d.id)}
                  className="text-gray-300 hover:text-red-400 p-1"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowDhikrModal(true)}
        className="fixed bottom-20 left-5 w-14 h-14 rounded-full bg-[#2D6A4F] text-white shadow-lg flex items-center justify-center z-40 hover:bg-[#1B4332] transition-colors"
      >
        <Plus size={28} />
      </button>

      {/* Modal */}
      {showDhikrModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-[24px] p-6 pb-24 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-[#2D6A4F]">إضافة ذكر مخصص</h3>
              <button onClick={() => setShowDhikrModal(false)} className="text-gray-400">
                <X size={22} />
              </button>
            </div>
            <input
              type="text"
              placeholder="اسم الذكر (مثال: سبحان الله)"
              value={newDhikrName}
              onChange={(e) => setNewDhikrName(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#95D5B2]/50 bg-[#F7FBF9] outline-none focus:border-[#2D6A4F]"
            />
            <div className="flex items-center gap-3">
              <span className="text-sm">العدد المستهدف:</span>
              <input
                type="number"
                min={1}
                value={newDhikrTarget}
                onChange={(e) => setNewDhikrTarget(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 p-2 text-center rounded-xl border border-[#95D5B2]/50 bg-[#F7FBF9] outline-none"
              />
            </div>
            <button
              onClick={addDhikr}
              className="w-full py-3 rounded-xl bg-[#2D6A4F] text-white hover:bg-[#1B4332] transition-colors"
            >
              إضافة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}