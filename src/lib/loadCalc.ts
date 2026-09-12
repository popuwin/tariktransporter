export type CargoItemInput = {
  id: string;
  l: number;
  w: number;
  h: number;
  weight: number;
  qty: number;
  stackable: boolean;
  rotatable: boolean;
};

export type Vehicle = {
  id: number;
  name: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  maxWeightKg: number;
  maxVolumeM3: number;
};

export type Placement = {
  itemId: string;
  x: number;
  y: number;
  z: number;
  l: number;
  w: number;
  h: number;
  rotated: boolean;
  weight: number;
  color: "green" | "red";
};

export type LoadResponse = {
  fits: boolean;
  totalWeight: number;
  totalVolume: number;
  usedVolumePercent: number;
  usedWeightPercent: number;
  placement: Placement[];
  unplacedItems: Placement[];
  warnings: string[];
  recommendations: string[];
};

type Candidate = { x: number; y: number; z: number };

function getOrientations(l: number, w: number, h: number, rotatable: boolean) {
  if (!rotatable) return [{ l, w, h, rotated: false }];
  const variants = [
    { l, w, h },
    { l, w: h, h: w },
    { l: w, w: l, h },
    { l: w, w: h, h: l },
    { l: h, w: l, h: w },
    { l: h, w, h: l },
  ];
  const seen = new Set<string>();
  return variants
    .filter((v) => {
      const key = `${v.l}-${v.w}-${v.h}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((v, index) => ({ ...v, rotated: index !== 0 }));
}

function intersects(a: Placement, b: Placement) {
  return !(
    a.x + a.l <= b.x ||
    b.x + b.l <= a.x ||
    a.y + a.w <= b.y ||
    b.y + b.w <= a.y ||
    a.z + a.h <= b.z ||
    b.z + b.h <= a.z
  );
}

function hasValidSupport(candidate: Candidate, item: { l: number; w: number }, placed: Placement[]) {
  if (candidate.z === 0) return true;
  return placed.some((p) => {
    const topMatches = p.z + p.h === candidate.z;
    const overlapX = candidate.x < p.x + p.l && candidate.x + item.l > p.x;
    const overlapY = candidate.y < p.y + p.w && candidate.y + item.w > p.y;
    return topMatches && overlapX && overlapY && p.color === "green";
  });
}

export function calculateLoad(vehicle: Vehicle, inputs: CargoItemInput[]): LoadResponse {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const expanded = inputs.flatMap((item) =>
    Array.from({ length: item.qty }).map((_, idx) => ({
      itemId: `${item.id}-${idx + 1}`,
      id: item.id,
      l: item.l,
      w: item.w,
      h: item.h,
      weight: item.weight,
      stackable: item.stackable,
      rotatable: item.rotatable,
      volume: (item.l * item.w * item.h) / 1_000_000,
    }))
  );

  expanded.sort((a, b) => b.volume - a.volume);

  const totalWeight = expanded.reduce((sum, i) => sum + i.weight, 0);
  const totalVolume = expanded.reduce((sum, i) => sum + i.volume, 0);

  if (totalWeight > 3000) {
    warnings.push(`Превышен лимит ТЗ 3000 кг на ${Math.round(totalWeight - 3000)} кг`);
    recommendations.push("Разбейте груз на 2 рейса");
  }

  if (totalWeight > vehicle.maxWeightKg) {
    warnings.push(`Превышен вес машины на ${Math.round(totalWeight - vehicle.maxWeightKg)} кг`);
    recommendations.push("Выберите более грузоподъемную машину");
  }

  if (totalVolume > vehicle.maxVolumeM3) {
    warnings.push(`Превышен объем кузова на ${(totalVolume - vehicle.maxVolumeM3).toFixed(2)} м3`);
    recommendations.push("Выберите кузов с большим объемом");
  }

  const placed: Placement[] = [];
  const unplacedItems: Placement[] = [];
  const candidates: Candidate[] = [{ x: 0, y: 0, z: 0 }];

  for (const box of expanded) {
    let isPlaced = false;
    const sortedCandidates = [...candidates].sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);

    for (const candidate of sortedCandidates) {
      if (isPlaced) break;
      for (const orientation of getOrientations(box.l, box.w, box.h, box.rotatable)) {
        const inBounds =
          candidate.x + orientation.l <= vehicle.lengthCm &&
          candidate.y + orientation.w <= vehicle.widthCm &&
          candidate.z + orientation.h <= vehicle.heightCm;

        if (!inBounds) continue;
        if (!hasValidSupport(candidate, orientation, placed)) continue;

        const placement: Placement = {
          itemId: box.itemId,
          x: candidate.x,
          y: candidate.y,
          z: candidate.z,
          l: orientation.l,
          w: orientation.w,
          h: orientation.h,
          rotated: orientation.rotated,
          weight: box.weight,
          color: "green",
        };

        if (placed.some((p) => intersects(p, placement))) continue;

        placed.push(placement);
        candidates.push(
          { x: candidate.x + orientation.l, y: candidate.y, z: candidate.z },
          { x: candidate.x, y: candidate.y + orientation.w, z: candidate.z },
          { x: candidate.x, y: candidate.y, z: candidate.z + orientation.h }
        );
        isPlaced = true;
        break;
      }
    }

    if (!isPlaced) {
      unplacedItems.push({
        itemId: box.itemId,
        x: 0,
        y: 0,
        z: 0,
        l: box.l,
        w: box.w,
        h: box.h,
        rotated: false,
        weight: box.weight,
        color: "red",
      });
    }
  }

  if (unplacedItems.length > 0) {
    warnings.push(`Не удалось разместить ${unplacedItems.length} мест(а) по габаритам`);
    recommendations.push("Рассмотрите вторую машину или дополнительный рейс");
  }

  const usedWeightPercent = Math.min(100, Number(((totalWeight / vehicle.maxWeightKg) * 100).toFixed(1)));
  const usedVolumePercent = Math.min(100, Number(((totalVolume / vehicle.maxVolumeM3) * 100).toFixed(1)));
  const fits = warnings.length === 0 && unplacedItems.length === 0;

  return {
    fits,
    totalWeight,
    totalVolume: Number(totalVolume.toFixed(3)),
    usedVolumePercent,
    usedWeightPercent,
    placement: placed,
    unplacedItems,
    warnings,
    recommendations,
  };
}