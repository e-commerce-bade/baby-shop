package com.babyshop.common.security;

import com.babyshop.common.health.HealthController;
import com.babyshop.order.OrderAdminController;
import com.babyshop.order.OrderService;
import com.babyshop.product.ProductController;
import com.babyshop.product.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({
        HealthController.class,
        ProductController.class,
        OrderAdminController.class
})
@Import({
        SecurityConfig.class
})
@TestPropertySource(properties = {
        "spring.autoconfigure.exclude=",
        "app.security.jwt.secret=test-jwt-secret-key-with-32-bytes!!",
        "app.security.jwt.access-token-ttl-minutes=120",
        "app.security.jwt.issuer=test-suite"
})
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProductService productService;

    @MockBean
    private OrderService orderService;

    @Test
    void shouldAllowPublicHealthEndpointWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk());
    }

    @Test
    void shouldRequireAuthenticationForAdminEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/admin/orders"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldAllowAdminEndpointsWithAdminJwt() throws Exception {
        mockMvc.perform(get("/api/v1/admin/orders")
                        .with(jwt().authorities(() -> "ROLE_ADMIN")))
                .andExpect(status().isOk());
    }
}
