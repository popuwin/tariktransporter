package com.tarikperevozki.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PlacementDto {
    private String itemId;
    private Integer x;
    private Integer y;
    private Integer z;
    private Integer l;
    private Integer w;
    private Integer h;
    private Boolean rotated;
    private Integer weight;
}