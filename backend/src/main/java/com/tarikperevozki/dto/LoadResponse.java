package com.tarikperevozki.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class LoadResponse {
    private boolean fits;
    private double totalWeight;
    private double totalVolume;
    private double usedVolumePercent;
    private double usedWeightPercent;
    private List<PlacementDto> placement;
    private List<PlacementDto> unplacedItems;
    private List<String> warnings;
    private List<String> recommendations;
}