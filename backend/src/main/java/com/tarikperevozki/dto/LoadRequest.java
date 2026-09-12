package com.tarikperevozki.dto;

import com.tarikperevozki.entity.CargoItem;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class LoadRequest {
    @NotNull
    private Long vehicleId;

    @NotNull
    @Size(min = 1, max = 100)
    @Valid
    private List<CargoItem> items;
}