package com.babyshop.search;

import com.babyshop.search.dto.AdminSearchResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/search")
@RequiredArgsConstructor
public class AdminSearchController {

    private final AdminSearchService adminSearchService;

    @GetMapping
    public ResponseEntity<AdminSearchResponse> search(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(adminSearchService.search(q));
    }
}
