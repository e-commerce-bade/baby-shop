package com.babyshop.category;

import com.babyshop.category.dto.CategoryAdminRequest;
import com.babyshop.category.dto.CategoryResponse;
import com.babyshop.common.exception.DuplicateResourceException;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public List<CategoryResponse> getActiveCategories() {
        return categoryRepository.findAllByActiveTrueOrderBySortOrderAscNameAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<CategoryResponse> getAllCategoriesForAdmin() {
        return categoryRepository.findAllByOrderBySortOrderAscNameAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public CategoryResponse getActiveCategoryBySlug(String slug) {
        Category category = categoryRepository.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found for slug: " + slug));

        return toResponse(category);
    }

    public CategoryResponse getCategoryById(Long id) {
        return toResponse(findCategoryById(id));
    }

    @Transactional
    public CategoryResponse createCategory(CategoryAdminRequest request) {
        validateSlugForCreate(request.slug());

        Category category = new Category();
        applyRequest(category, request);

        return toResponse(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryAdminRequest request) {
        Category category = findCategoryById(id);
        validateSlugForUpdate(id, request.slug());
        validateParentSelection(id, request.parentId());

        applyRequest(category, request);

        return toResponse(categoryRepository.save(category));
    }

    @Transactional
    public void deleteCategory(Long id) {
        Category category = findCategoryById(id);
        category.setActive(false);
        categoryRepository.save(category);
    }

    private Category findCategoryById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found for id: " + id));
    }

    private void applyRequest(Category category, CategoryAdminRequest request) {
        category.setParent(resolveParent(request.parentId()));
        category.setName(request.name().trim());
        category.setSlug(request.slug().trim());
        category.setDescription(request.description());
        category.setActive(request.active());
        category.setSortOrder(request.sortOrder());
    }

    private Category resolveParent(Long parentId) {
        if (parentId == null) {
            return null;
        }

        return findCategoryById(parentId);
    }

    private void validateSlugForCreate(String slug) {
        if (categoryRepository.existsBySlug(slug.trim())) {
            throw new DuplicateResourceException("Category slug already exists: " + slug);
        }
    }

    private void validateSlugForUpdate(Long id, String slug) {
        if (categoryRepository.existsBySlugAndIdNot(slug.trim(), id)) {
            throw new DuplicateResourceException("Category slug already exists: " + slug);
        }
    }

    private void validateParentSelection(Long id, Long parentId) {
        if (parentId != null && parentId.equals(id)) {
            throw new InvalidRequestException("Category cannot be its own parent");
        }
    }

    private CategoryResponse toResponse(Category category) {
        Long parentId = category.getParent() != null ? category.getParent().getId() : null;

        return new CategoryResponse(
                category.getId(),
                parentId,
                category.getName(),
                category.getSlug(),
                category.getDescription(),
                category.isActive(),
                category.getSortOrder()
        );
    }
}
