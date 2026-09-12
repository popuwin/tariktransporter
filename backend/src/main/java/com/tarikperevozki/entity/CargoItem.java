package com.tarikperevozki.entity;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CargoItem {
    @NotNull
    @Min(1)
    @Max(10000)
    private Integer l;

    @NotNull
    @Min(1)
    @Max(10000)
    private Integer w;

    @NotNull
    @Min(1)
    @Max(10000)
    private Integer h;

    @NotNull
    @Min(1)
    @Max(100000)
    private Integer weight;

    @NotNull
    @Min(1)
    @Max(100)
    private Integer qty;

    @NotNull
    private Boolean stackable;

    @NotNull
    private Boolean rotatable;
}