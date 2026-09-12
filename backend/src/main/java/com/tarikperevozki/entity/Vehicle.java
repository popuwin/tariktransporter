package com.tarikperevozki.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "vehicles")
public class Vehicle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "length_cm", nullable = false)
    private Integer lengthCm;

    @Column(name = "width_cm", nullable = false)
    private Integer widthCm;

    @Column(name = "height_cm", nullable = false)
    private Integer heightCm;

    @Column(name = "max_weight_kg", nullable = false)
    private Integer maxWeightKg;

    @Column(name = "max_volume_m3", nullable = false)
    private Double maxVolumeM3;

    @Column(name = "image_url")
    private String imageUrl;
}