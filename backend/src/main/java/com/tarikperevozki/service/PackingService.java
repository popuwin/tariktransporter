package com.tarikperevozki.service;

import com.tarikperevozki.dto.PlacementDto;
import com.tarikperevozki.entity.CargoItem;
import com.tarikperevozki.entity.Vehicle;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Упрощенный 3D First Fit Decreasing: сортировка по объему и укладка в первые доступные координаты.
 */
@Service
public class PackingService {

    public record PackingResult(List<PlacementDto> placed, List<PlacementDto> unplaced, boolean timedOut) {}

    private record ExpandedItem(String itemId, int l, int w, int h, int weight, boolean stackable, boolean rotatable) {}

    private record Candidate(int x, int y, int z) {}

    public PackingResult pack(Vehicle vehicle, List<CargoItem> items, long timeoutMs) {
        long started = System.currentTimeMillis();
        List<ExpandedItem> expanded = expandAndSort(items);
        List<PlacementDto> placed = new ArrayList<>();
        List<PlacementDto> unplaced = new ArrayList<>();
        List<Candidate> candidates = new ArrayList<>(List.of(new Candidate(0, 0, 0)));

        for (ExpandedItem box : expanded) {
            if (System.currentTimeMillis() - started > timeoutMs) {
                for (ExpandedItem remainder : expanded.subList(expanded.indexOf(box), expanded.size())) {
                    unplaced.add(toUnplaced(remainder));
                }
                return new PackingResult(placed, unplaced, true);
            }

            boolean fitted = false;
            candidates.sort(Comparator.comparingInt(Candidate::z).thenComparingInt(Candidate::y).thenComparingInt(Candidate::x));
            for (Candidate c : candidates) {
                if (fitted) break;
                for (Orientation o : orientations(box)) {
                    if (!inBounds(c, o, vehicle)) continue;
                    if (!hasSupport(c, o, placed)) continue;

                    PlacementDto next = PlacementDto.builder()
                            .itemId(box.itemId)
                            .x(c.x)
                            .y(c.y)
                            .z(c.z)
                            .l(o.l)
                            .w(o.w)
                            .h(o.h)
                            .rotated(o.rotated)
                            .weight(box.weight)
                            .build();

                    if (intersectsAny(next, placed)) continue;

                    placed.add(next);
                    candidates.add(new Candidate(c.x + o.l, c.y, c.z));
                    candidates.add(new Candidate(c.x, c.y + o.w, c.z));
                    if (box.stackable) {
                        candidates.add(new Candidate(c.x, c.y, c.z + o.h));
                    }
                    fitted = true;
                    break;
                }
            }

            if (!fitted) {
                unplaced.add(toUnplaced(box));
            }
        }

        return new PackingResult(placed, unplaced, false);
    }

    private List<ExpandedItem> expandAndSort(List<CargoItem> items) {
        List<ExpandedItem> expanded = new ArrayList<>();
        int itemIndex = 1;
        for (CargoItem item : items) {
            for (int i = 1; i <= item.getQty(); i++) {
                expanded.add(new ExpandedItem(
                        "item-" + itemIndex + "-" + i,
                        item.getL(),
                        item.getW(),
                        item.getH(),
                        item.getWeight(),
                        item.getStackable(),
                        item.getRotatable()
                ));
            }
            itemIndex++;
        }
        expanded.sort((a, b) -> Integer.compare(b.l * b.w * b.h, a.l * a.w * a.h));
        return expanded;
    }

    private record Orientation(int l, int w, int h, boolean rotated) {}

    private List<Orientation> orientations(ExpandedItem item) {
        if (!item.rotatable) {
            return List.of(new Orientation(item.l, item.w, item.h, false));
        }
        List<Orientation> variants = List.of(
                new Orientation(item.l, item.w, item.h, false),
                new Orientation(item.l, item.h, item.w, true),
                new Orientation(item.w, item.l, item.h, true),
                new Orientation(item.w, item.h, item.l, true),
                new Orientation(item.h, item.l, item.w, true),
                new Orientation(item.h, item.w, item.l, true)
        );
        Set<String> uniq = new HashSet<>();
        List<Orientation> result = new ArrayList<>();
        for (Orientation variant : variants) {
            String key = variant.l + "-" + variant.w + "-" + variant.h;
            if (uniq.add(key)) result.add(variant);
        }
        return result;
    }

    private boolean inBounds(Candidate c, Orientation o, Vehicle v) {
        return c.x + o.l <= v.getLengthCm()
                && c.y + o.w <= v.getWidthCm()
                && c.z + o.h <= v.getHeightCm();
    }

    private boolean hasSupport(Candidate c, Orientation o, List<PlacementDto> placed) {
        if (c.z == 0) return true;
        for (PlacementDto p : placed) {
            boolean topMatches = p.getZ() + p.getH() == c.z;
            boolean overlapX = c.x < p.getX() + p.getL() && c.x + o.l > p.getX();
            boolean overlapY = c.y < p.getY() + p.getW() && c.y + o.w > p.getY();
            if (topMatches && overlapX && overlapY) return true;
        }
        return false;
    }

    private boolean intersectsAny(PlacementDto candidate, List<PlacementDto> placed) {
        for (PlacementDto p : placed) {
            boolean separated =
                    candidate.getX() + candidate.getL() <= p.getX()
                            || p.getX() + p.getL() <= candidate.getX()
                            || candidate.getY() + candidate.getW() <= p.getY()
                            || p.getY() + p.getW() <= candidate.getY()
                            || candidate.getZ() + candidate.getH() <= p.getZ()
                            || p.getZ() + p.getH() <= candidate.getZ();
            if (!separated) return true;
        }
        return false;
    }

    private PlacementDto toUnplaced(ExpandedItem item) {
        return PlacementDto.builder()
                .itemId(item.itemId)
                .x(0)
                .y(0)
                .z(0)
                .l(item.l)
                .w(item.w)
                .h(item.h)
                .rotated(false)
                .weight(item.weight)
                .build();
    }
}