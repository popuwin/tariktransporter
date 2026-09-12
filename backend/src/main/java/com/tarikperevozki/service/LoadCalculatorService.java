package com.tarikperevozki.service;

import com.tarikperevozki.dto.LoadRequest;
import com.tarikperevozki.dto.LoadResponse;
import com.tarikperevozki.dto.PlacementDto;
import com.tarikperevozki.entity.CargoItem;
import com.tarikperevozki.entity.Vehicle;
import com.tarikperevozki.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LoadCalculatorService {
    private final VehicleRepository vehicleRepository;
    private final PackingService packingService;

    /**
     * Основной расчет: проверка лимитов, запуск укладки и формирование рекомендаций.
     */
    public LoadResponse calculate(LoadRequest request) {
        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new IllegalArgumentException("Машина не найдена"));

        if (request.getItems().size() > 100) {
            throw new IllegalArgumentException("Максимум 100 позиций в запросе");
        }

        List<String> warnings = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();

        double totalWeight = totalWeight(request.getItems());
        double totalVolume = totalVolume(request.getItems());

        if (totalWeight > 3000) {
            warnings.add("Суммарный вес превышает лимит ТЗ 3000 кг");
            recommendations.add("Разбейте на 2 рейса");
        }
        if (totalWeight > vehicle.getMaxWeightKg()) {
            warnings.add("Превышен допустимый вес выбранной машины");
            recommendations.add("Выберите машину с большей грузоподъемностью");
        }
        if (totalVolume > vehicle.getMaxVolumeM3()) {
            warnings.add("Превышен допустимый объем кузова");
            recommendations.add("Выберите машину с большим объемом кузова");
        }

        PackingService.PackingResult packing = packingService.pack(vehicle, request.getItems(), 2000);
        List<PlacementDto> unplaced = packing.unplaced();
        if (!unplaced.isEmpty()) {
            warnings.add("Часть груза не размещается по габаритам");
            recommendations.add("Подберите другую машину или второй рейс");
        }
        if (packing.timedOut()) {
            warnings.add("Алгоритм укладки превысил лимит 2 секунды");
        }

        double usedWeightPercent = Math.min(100, (totalWeight / vehicle.getMaxWeightKg()) * 100);
        double usedVolumePercent = Math.min(100, (totalVolume / vehicle.getMaxVolumeM3()) * 100);
        boolean fits = warnings.isEmpty() && unplaced.isEmpty();

        return LoadResponse.builder()
                .fits(fits)
                .totalWeight(totalWeight)
                .totalVolume(totalVolume)
                .usedWeightPercent(round(usedWeightPercent))
                .usedVolumePercent(round(usedVolumePercent))
                .placement(packing.placed())
                .unplacedItems(unplaced)
                .warnings(warnings)
                .recommendations(recommendations)
                .build();
    }

    private double totalWeight(List<CargoItem> items) {
        return items.stream().mapToDouble(i -> i.getWeight() * i.getQty()).sum();
    }

    private double totalVolume(List<CargoItem> items) {
        return items.stream().mapToDouble(i -> (i.getL() * i.getW() * i.getH() / 1_000_000.0) * i.getQty()).sum();
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}