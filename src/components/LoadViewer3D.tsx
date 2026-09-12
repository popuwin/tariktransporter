import { useEffect, useMemo, useRef, useState } from "react";
import type { Placement, Vehicle } from "../lib/loadCalc";
import { SprinterViewer, type ViewerItem } from "../lib/viewer3d";

type CameraView = "top" | "side" | "back" | "iso" | "reset";

type Props = {
  vehicle: Vehicle;
  placed: Placement[];
  unplaced: Placement[];
  usedVolumePercent?: number;
  usedWeightPercent?: number;
  fits?: boolean;
};

export default function LoadViewer3D({
  vehicle,
  placed,
  unplaced,
  usedVolumePercent = 0,
  usedWeightPercent = 0,
  fits = true,
}: Props) {
  const containerId = useMemo(() => `sprinter-viewer-${Math.random().toString(36).slice(2, 9)}`, []);
  const viewerRef = useRef<SprinterViewer | null>(null);
  const [initError, setInitError] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [transparent, setTransparent] = useState(true);
  const [explode, setExplode] = useState(0);

  useEffect(() => {
    try {
      viewerRef.current = new SprinterViewer(containerId);
      setInitError(false);
    } catch {
      setInitError(true);
    }
    return () => viewerRef.current?.dispose();
  }, [containerId]);

  useEffect(() => {
    viewerRef.current?.loadVehicle({
      length: vehicle.lengthCm / 100,
      width: vehicle.widthCm / 100,
      height: vehicle.heightCm / 100,
      maxWeight: vehicle.maxWeightKg,
    });
  }, [vehicle]);

  useEffect(() => {
    const unplacedList: ViewerItem[] = unplaced.map((item, index) => ({
      id: `u-${item.itemId}`,
      l: item.l / 100,
      w: item.w / 100,
      h: item.h / 100,
      x: -0.8,
      y: 0,
      z: index * 0.25,
      rotated: false,
      color: "#ef4444",
      weight: item.weight,
      fits: false,
    }));

    const placedList: ViewerItem[] = placed.map((item) => ({
      id: item.itemId,
      l: item.l / 100,
      w: item.w / 100,
      h: item.h / 100,
      x: item.x / 100,
      y: item.z / 100,
      z: item.y / 100,
      rotated: item.rotated,
      weight: item.weight,
      fits: true,
    }));

    viewerRef.current?.renderCargo([...placedList, ...unplacedList]);
  }, [placed, unplaced]);

  const setView = (view: CameraView) => viewerRef.current?.setCameraView(view);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => setView("top")} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700">Сверху</button>
        <button onClick={() => setView("side")} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700">Сбоку</button>
        <button onClick={() => setView("back")} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700">Сзади</button>
        <button onClick={() => setView("iso")} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700">Изометрия</button>
        <button onClick={() => setView("reset")} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700">Сброс</button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-slate-700">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => {
              setShowGrid(e.target.checked);
              viewerRef.current?.toggleGrid(e.target.checked);
            }}
          />
          Показать сетку кузова
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={transparent}
            onChange={(e) => {
              setTransparent(e.target.checked);
              viewerRef.current?.toggleTransparency(e.target.checked);
            }}
          />
          Прозрачный кузов
        </label>
        <label className="flex items-center gap-2">
          Раздвинуть стены
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explode}
            onChange={(e) => {
              const value = Number(e.target.value);
              setExplode(value);
              viewerRef.current?.animateExplode(value);
            }}
          />
        </label>
      </div>

      <div className="relative h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-[#f8fafc]">
        <div id={containerId} className="h-full w-full" />
        {initError && (
          <div className="absolute inset-0 grid place-items-center bg-white/90 p-4 text-center text-sm text-red-600">
            Ошибка инициализации 3D-визуализации. Обновите страницу.
          </div>
        )}
        <div className="pointer-events-none absolute left-3 top-3 w-[250px] rounded-xl border border-slate-200 bg-white/92 p-3 text-xs">
          <p className={`font-semibold ${fits ? "text-green-600" : "text-red-600"}`}>{fits ? "Груз помещается" : "Не помещается"}</p>
          <div className="mt-2">
            <p className="text-slate-600">Загрузка по объему: {usedVolumePercent}%</p>
            <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#1B3A5C]" style={{ width: `${usedVolumePercent}%` }} /></div>
          </div>
          <div className="mt-2">
            <p className="text-slate-600">Загрузка по весу: {usedWeightPercent}%</p>
            <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#2E2E2E]" style={{ width: `${usedWeightPercent}%` }} /></div>
          </div>
          {!fits && unplaced.length > 0 && (
            <div className="mt-2 text-red-600">
              {unplaced.slice(0, 4).map((item) => (
                <p key={item.itemId}>Проблемная коробка: {item.itemId}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}