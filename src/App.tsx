import { motion, useScroll, useTransform } from "framer-motion";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import LoadViewer3D from "./components/LoadViewer3D";
import { calculateLoad, type CargoItemInput, type LoadResponse, type Vehicle } from "./lib/loadCalc";

function FadeSection({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <motion.section
      id={id}
      className="relative z-10 mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
    >
      {children}
    </motion.section>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 12.5 10.7 15 16 9.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden>
      <path d="M12 3 20 7.5 12 12 4 7.5 12 3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M4 7.5V16.5L12 21V12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M20 7.5V16.5L12 21" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function SeatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden>
      <path d="M8 4v7.5a2.5 2.5 0 0 0 2.5 2.5H18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M5 20v-5.5A2.5 2.5 0 0 1 7.5 12H18a1 1 0 0 1 1 1v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 20v-3M16 20v-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const vehicles: Vehicle[] = [
  { id: 1, name: "Газель 3м", lengthCm: 300, widthCm: 190, heightCm: 180, maxWeightKg: 1500, maxVolumeM3: 10.3 },
  { id: 2, name: "Газель удлиненная 4.2м", lengthCm: 420, widthCm: 205, heightCm: 210, maxWeightKg: 2000, maxVolumeM3: 18.1 },
  { id: 3, name: "Бычок 5м", lengthCm: 500, widthCm: 220, heightCm: 220, maxWeightKg: 3000, maxVolumeM3: 24.2 },
  { id: 4, name: "3-тонник 6м", lengthCm: 600, widthCm: 240, heightCm: 240, maxWeightKg: 3000, maxVolumeM3: 34.5 },
  { id: 5, name: "5-тонник 7м", lengthCm: 700, widthCm: 245, heightCm: 260, maxWeightKg: 5000, maxVolumeM3: 44.6 },
];

const createItem = (id: number): CargoItemInput => ({ id: `item-${id}`, l: 120, w: 80, h: 100, weight: 50, qty: 1, stackable: true, rotatable: true });
const progressClass = "h-2 rounded-full bg-gradient-to-r from-[#1B3A5C] to-[#234A73]";

export default function App() {
  const { scrollY } = useScroll();
  const decorOpacity = useTransform(scrollY, [0, 420, 760], [0, 0, 1]);

  const [vehicleId, setVehicleId] = useState<number>(3);
  const [items, setItems] = useState<CargoItemInput[]>([createItem(1)]);
  const [result, setResult] = useState<LoadResponse | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showMobile3D, setShowMobile3D] = useState(false);

  const passengerPrice = useMemo(() => {
    const min = 1700;
    const max = 2900;
    return Math.floor(Math.random() * ((max - min) / 100 + 1)) * 100 + min;
  }, []);

  const floatingItems = [
    { left: "8%", size: 34, delay: 0, duration: 22, xDrift: 18, rotation: 220, type: "box", color: "text-[#1B3A5C]/28" },
    { left: "18%", size: 30, delay: 4, duration: 19, xDrift: -14, rotation: -260, type: "seat", color: "text-slate-500/30" },
    { left: "30%", size: 28, delay: 2, duration: 24, xDrift: 16, rotation: 180, type: "box", color: "text-slate-500/25" },
    { left: "44%", size: 36, delay: 6, duration: 21, xDrift: -10, rotation: -240, type: "seat", color: "text-[#1B3A5C]/25" },
    { left: "58%", size: 26, delay: 1, duration: 18, xDrift: 12, rotation: 210, type: "box", color: "text-slate-500/28" },
    { left: "70%", size: 32, delay: 5, duration: 23, xDrift: -18, rotation: -200, type: "seat", color: "text-[#1B3A5C]/22" },
    { left: "82%", size: 29, delay: 3, duration: 20, xDrift: 14, rotation: 280, type: "box", color: "text-slate-500/27" },
    { left: "92%", size: 24, delay: 7, duration: 17, xDrift: -8, rotation: -170, type: "seat", color: "text-[#1B3A5C]/24" },
  ] as const;

  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? vehicles[0];
  const updateItem = (index: number, patch: Partial<CargoItemInput>) => setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const validate = () => {
    const nextErrors: string[] = [];
    if (items.length > 100) nextErrors.push("Максимум 100 мест в одном расчете.");
    items.forEach((item, index) => {
      if (item.l <= 0 || item.w <= 0 || item.h <= 0 || item.weight <= 0 || item.qty <= 0) nextErrors.push(`Строка ${index + 1}: все значения должны быть больше 0.`);
      if (item.l > vehicle.lengthCm || item.w > vehicle.widthCm || item.h > vehicle.heightCm) nextErrors.push(`Строка ${index + 1}: габариты коробки превышают габариты кузова.`);
    });
    if (items.reduce((sum, item) => sum + item.weight * item.qty, 0) > 3000) nextErrors.push("Суммарный вес превышает лимит 3000 кг. Разбейте на 2 рейса.");
    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const getCookie = (name: string) => document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))?.split("=")[1];

  const runCalculation = async () => {
    if (!validate()) {
      setResult(null);
      return;
    }

    const payload = { vehicleId, items: items.map((item) => ({ l: item.l, w: item.w, h: item.h, weight: item.weight, qty: item.qty, stackable: item.stackable, rotatable: item.rotatable })) };
    try {
      const csrfToken = getCookie("XSRF-TOKEN");
      const response = await fetch("/api/load/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-XSRF-TOKEN": decodeURIComponent(csrfToken) } : {}) },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error();
      setResult((await response.json()) as LoadResponse);
      return;
    } catch {
      // fallback
    }

    const response = calculateLoad(vehicle, items);
    setResult(response);
  };

  return (
    <div className="relative bg-[#F7F8FA] text-[#1A1A1A]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <a href="#top" className="text-lg font-semibold tracking-tight text-[#1B3A5C]">ТарикПеревозки</a>
          <nav className="hidden items-center gap-6 text-sm text-[#5A6472] lg:flex">
            <a href="#services" className="hover:text-[#1A1A1A]">Услуги</a>
            <a href="#drivers" className="hover:text-[#1A1A1A]">Водители</a>
            <a href="#prices" className="hover:text-[#1A1A1A]">Цены</a>
            <a href="#calculator" className="hover:text-[#1A1A1A]">3D-калькулятор</a>
            <a href="#contacts" className="hover:text-[#1A1A1A]">Контакты</a>
          </nav>
          <a href="tel:+79990000000" className="rounded-[10px] bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white">+7 (999) 000-00-00</a>
        </div>
      </header>

      <motion.div style={{ opacity: decorOpacity }} className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
        {floatingItems.map((item, index) => (
          <motion.div
            key={`${item.type}-${index}`}
            className={`absolute -top-12 ${item.color}`}
            style={{ left: item.left, width: item.size, height: item.size }}
            initial={{ y: "-10vh", x: 0, rotate: 0 }}
            animate={{ y: ["-10vh", "110vh"], x: [0, item.xDrift, -item.xDrift / 2, 0], rotate: [0, item.rotation] }}
            transition={{ duration: item.duration, delay: item.delay, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            {item.type === "box" ? <BoxIcon /> : <SeatIcon />}
          </motion.div>
        ))}
      </motion.div>

      <main id="top" className="relative z-10">
        <section className="relative isolate z-10 flex min-h-screen items-center overflow-hidden pt-24">
          <img src="/images/hero-sprinters.png" alt="Синий и белый Mercedes Sprinter" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#F7F8FA] to-transparent" />
          <div className="relative mx-auto w-full max-w-6xl px-4 md:px-6">
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">ТарикПеревозки. Один стандарт - безупречно.</h1>
            <p className="mt-5 max-w-2xl text-lg text-[#5A6472]">Пассажирские и грузовые перевозки на Mercedes Sprinter. Основное направление: Саратов - Москва.</p>
            <p className="mt-4 text-xl font-semibold text-[#1B3A5C]">Цена на пассажира сегодня: от {passengerPrice.toLocaleString("ru-RU")} руб.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#services" className="rounded-[10px] bg-[#1B3A5C] px-6 py-3 text-sm font-medium text-white">Пассажирские перевозки</a>
              <a href="#services" className="rounded-[10px] bg-[#2E2E2E] px-6 py-3 text-sm font-medium text-white">Грузовые перевозки</a>
            </div>
          </div>
        </section>

        <FadeSection id="services">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Наши услуги</h2>
          <p className="mt-3 max-w-2xl text-[#5A6472]">Два Sprinter, два профиля задач, персональная ответственность по каждому рейсу.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_36px_rgba(16,24,40,0.08)]">
              <div className="overflow-hidden rounded-xl">
                <img src="/images/blue-sprinter.png" alt="Синий Sprinter" className="h-52 w-full object-cover transition duration-500 group-hover:scale-110" />
              </div>
              <h3 className="mt-5 text-2xl font-semibold text-[#1B3A5C]">Пассажирские перевозки</h3>
              <ul className="mt-4 space-y-2 text-[#5A6472]">
                <li className="flex gap-2"><span className="mt-0.5 text-[#1B3A5C]"><CheckIcon /></span>До 20 мест, кондиционер, чистый салон</li>
                <li className="flex gap-2"><span className="mt-0.5 text-[#1B3A5C]"><CheckIcon /></span>Тарик, 45 лет, стаж более 25 лет</li>
                <li className="flex gap-2"><span className="mt-0.5 text-[#1B3A5C]"><CheckIcon /></span>Маршрут Саратов - Москва и обратные рейсы</li>
              </ul>
            </article>
            <article className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_36px_rgba(16,24,40,0.08)]">
              <div className="overflow-hidden rounded-xl">
                <img src="/images/white-sprinter.png" alt="Белый Sprinter" className="h-52 w-full object-cover transition duration-500 group-hover:scale-110" />
              </div>
              <h3 className="mt-5 text-2xl font-semibold text-[#2E2E2E]">Грузовые перевозки</h3>
              <ul className="mt-4 space-y-2 text-[#5A6472]">
                <li className="flex gap-2"><span className="mt-0.5 text-[#2E2E2E]"><CheckIcon /></span>Грузы любой сложности, аккуратная погрузка</li>
                <li className="flex gap-2"><span className="mt-0.5 text-[#2E2E2E]"><CheckIcon /></span>Андрей, 25 лет, стаж более 7 лет</li>
                <li className="flex gap-2"><span className="mt-0.5 text-[#2E2E2E]"><CheckIcon /></span>Лучшие ставки по направлению Саратов - Москва</li>
              </ul>
            </article>
          </div>
        </FadeSection>

        <FadeSection id="drivers">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Водители</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="text-2xl font-semibold">Тарик, 45 лет</h3><p className="mt-2 text-[#5A6472]">Стаж более 25 лет. Отвечает за пассажирские рейсы, безопасность и комфорт.</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="text-2xl font-semibold">Андрей, 25 лет</h3><p className="mt-2 text-[#5A6472]">Стаж более 7 лет. Отвечает за грузовые рейсы, точность сроков и сохранность.</p></div>
          </div>
        </FadeSection>

        <FadeSection id="prices">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Цены</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-2xl font-semibold text-[#1B3A5C]">Пассажирские</h3>
              <p className="mt-3 text-3xl font-semibold">от {passengerPrice.toLocaleString("ru-RU")} руб./пассажир</p>
              <p className="mt-2 text-[#5A6472]">Основной маршрут Саратов - Москва.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-2xl font-semibold text-[#2E2E2E]">Грузовые</h3>
              <p className="mt-3 text-3xl font-semibold">от 2 000 руб.</p>
              <p className="mt-2 text-[#5A6472]">Точная стоимость после уточнения объема и адреса.</p>
            </div>
          </div>
        </FadeSection>

        <FadeSection id="calculator">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">3D-калькулятор загрузки</h2>
          <p className="mt-3 max-w-3xl text-[#5A6472]">Показываем, как коробки размещаются в 3D-модели Sprinter на фоне складской улицы.</p>
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_36px_rgba(16,24,40,0.08)]">
              <label className="block text-sm text-[#5A6472]">Машина</label>
              <select value={vehicleId} onChange={(e) => setVehicleId(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3">
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.lengthCm}x{v.widthCm}x{v.heightCm} см)</option>)}
              </select>
              <div className="mt-6 space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="mb-3 font-medium">Груз #{index + 1}</p>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {[ ["Длина, см", "l"], ["Ширина, см", "w"], ["Высота, см", "h"], ["Вес, кг", "weight"], ["Кол-во", "qty"] ].map(([label, key]) => (
                        <label key={key} className="text-sm text-[#5A6472]">{label}
                          <input type="number" value={item[key as keyof CargoItemInput] as number} onChange={(e) => updateItem(index, { [key]: Number(e.target.value) } as Partial<CargoItemInput>)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[#1A1A1A]" />
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={item.stackable} onChange={(e) => updateItem(index, { stackable: e.target.checked })} />Можно штабелировать</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={item.rotatable} onChange={(e) => updateItem(index, { rotatable: e.target.checked })} />Можно класть на бок</label>
                    </div>
                    {items.length > 1 && <button onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))} className="mt-3 text-sm text-red-600">Удалить</button>}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={() => setItems((prev) => [...prev, createItem(prev.length + 1)])} className="rounded-[10px] border border-slate-300 px-4 py-2 text-sm font-medium">Добавить груз</button>
                <button onClick={runCalculation} className="rounded-[10px] bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white">Рассчитать</button>
              </div>
              {errors.length > 0 && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errors.map((e) => <p key={e}>{e}</p>)}</div>}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_36px_rgba(16,24,40,0.08)]">
                <button onClick={() => setShowMobile3D((s) => !s)} className="mb-3 rounded-lg border border-slate-300 px-3 py-2 text-sm lg:hidden">{showMobile3D ? "Скрыть 3D" : "Показать 3D"}</button>
                <div className={`${showMobile3D ? "block" : "hidden"} lg:block`}>
                  <LoadViewer3D
                    vehicle={vehicle}
                    placed={result?.placement ?? []}
                    unplaced={result?.unplacedItems ?? []}
                    fits={result?.fits ?? true}
                    usedWeightPercent={result?.usedWeightPercent ?? 0}
                    usedVolumePercent={result?.usedVolumePercent ?? 0}
                  />
                </div>
              </div>
              {result && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_36px_rgba(16,24,40,0.08)]">
                  <p className={`text-lg font-semibold ${result.fits ? "text-green-600" : "text-red-600"}`}>{result.fits ? "✅ Груз помещается" : "❌ Груз не помещается"}</p>
                  <p className="mt-2 text-sm text-[#5A6472]">Вес: {result.totalWeight.toLocaleString("ru-RU")} кг | Объем: {result.totalVolume} м3</p>
                  <div className="mt-4 space-y-3">
                    <div><p className="text-sm text-[#5A6472]">Загрузка по весу: {result.usedWeightPercent}%</p><div className="mt-1 h-2 rounded-full bg-slate-100"><div className={progressClass} style={{ width: `${result.usedWeightPercent}%` }} /></div></div>
                    <div><p className="text-sm text-[#5A6472]">Загрузка по объему: {result.usedVolumePercent}%</p><div className="mt-1 h-2 rounded-full bg-slate-100"><div className={progressClass} style={{ width: `${result.usedVolumePercent}%` }} /></div></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </FadeSection>

        <FadeSection id="contacts">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Контакты</h2>
          <p className="mt-3 text-[#5A6472]">Телефон, WhatsApp, Telegram, заявка в 1 клик.</p>
          <div className="mt-6 space-y-2 text-lg">
            <a className="block font-medium hover:text-[#1B3A5C]" href="tel:+79990000000">+7 (999) 000-00-00</a>
            <a className="block font-medium hover:text-[#1B3A5C]" href="https://wa.me/79990000000">WhatsApp</a>
            <a className="block font-medium hover:text-[#1B3A5C]" href="https://t.me/tarikperevozki">Telegram</a>
            <a className="block font-medium hover:text-[#1B3A5C]" href="mailto:info@tarikperevozki.ru">info@tarikperevozki.ru</a>
          </div>
        </FadeSection>
      </main>

      <footer className="relative z-10 border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 text-sm text-[#5A6472] md:px-6">
          <p className="text-lg font-semibold text-[#1B3A5C]">ТарикПеревозки</p>
          <p>Маршрут: Саратов - Москва | +7 (999) 000-00-00 | info@tarikperevozki.ru</p>
        </div>
      </footer>
    </div>
  );
}