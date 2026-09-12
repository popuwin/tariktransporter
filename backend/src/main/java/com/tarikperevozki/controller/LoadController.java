package com.tarikperevozki.controller;

import com.tarikperevozki.dto.LoadRequest;
import com.tarikperevozki.dto.LoadResponse;
import com.tarikperevozki.service.LoadCalculatorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/load")
@RequiredArgsConstructor
public class LoadController {
    private final LoadCalculatorService loadCalculatorService;

    @PostMapping("/calculate")
    public ResponseEntity<LoadResponse> calculate(@Valid @RequestBody LoadRequest request) {
        return ResponseEntity.ok(loadCalculatorService.calculate(request));
    }
}