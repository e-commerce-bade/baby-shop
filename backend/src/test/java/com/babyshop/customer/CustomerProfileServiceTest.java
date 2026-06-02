package com.babyshop.customer;

import com.babyshop.auth.Role;
import com.babyshop.auth.UserAccount;
import com.babyshop.auth.UserAccountRepository;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.common.response.PageResponse;
import com.babyshop.customer.dto.CustomerProfileUpdateRequest;
import com.babyshop.order.OrderService;
import com.babyshop.order.dto.OrderAddressResponse;
import com.babyshop.order.dto.OrderResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class CustomerProfileServiceTest {

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private OrderService orderService;

    @InjectMocks
    private CustomerProfileService customerProfileService;

    @Test
    void shouldReturnProfileForAuthenticatedUser() {
        UserAccount user = new UserAccount();
        user.setId(1L);
        user.setEmail("customer@babyshop.local");
        user.setFirstName("Ceren");
        user.setLastName("Unlu");
        user.setPhoneNumber("5551112233");
        user.setActive(true);
        Role role = new Role();
        role.setName("CUSTOMER");
        user.setRoles(Set.of(role));

        given(userAccountRepository.findByEmailIgnoreCase("customer@babyshop.local")).willReturn(Optional.of(user));

        var response = customerProfileService.getProfile("customer@babyshop.local");

        assertThat(response.email()).isEqualTo("customer@babyshop.local");
        assertThat(response.roles()).contains("CUSTOMER");
    }

    @Test
    void shouldReturnOrdersForAuthenticatedUser() {
        given(orderService.getOrdersByUserEmail("customer@babyshop.local")).willReturn(List.of(
                new OrderResponse(
                        1L, "ORD-ABC123DEF456", "PAID", "customer@babyshop.local", "Ceren", "Unlu", "5551112233",
                        new BigDecimal("499.00"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("499.00"), "TRY",
                        OffsetDateTime.parse("2026-06-01T12:00:00+03:00"),
                        new OrderAddressResponse("Ataturk Cd. No:10", null, "Kadikoy", "Istanbul", "34710", "Turkey"),
                        null,
                        null,
                        List.of()
                )
        ));

        var response = customerProfileService.getOrders("customer@babyshop.local");

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().orderNumber()).isEqualTo("ORD-ABC123DEF456");
    }

    @Test
    void shouldReturnPagedOrdersForAuthenticatedUser() {
        given(orderService.getOrdersByUserEmail(
                "customer@babyshop.local",
                0,
                10,
                "PAID",
                LocalDate.parse("2026-06-01"),
                LocalDate.parse("2026-06-30")
        )).willReturn(new PageResponse<>(
                List.of(new OrderResponse(
                        1L, "ORD-ABC123DEF456", "PAID", "customer@babyshop.local", "Ceren", "Unlu", "5551112233",
                        new BigDecimal("499.00"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("499.00"), "TRY",
                        OffsetDateTime.parse("2026-06-01T12:00:00+03:00"),
                        new OrderAddressResponse("Ataturk Cd. No:10", null, "Kadikoy", "Istanbul", "34710", "Turkey"),
                        null,
                        null,
                        List.of()
                )),
                0,
                10,
                1,
                1,
                false,
                false
        ));

        var response = customerProfileService.getOrders(
                "customer@babyshop.local",
                0,
                10,
                "PAID",
                LocalDate.parse("2026-06-01"),
                LocalDate.parse("2026-06-30")
        );

        assertThat(response.content()).hasSize(1);
        assertThat(response.totalElements()).isEqualTo(1);
    }

    @Test
    void shouldThrowWhenAuthenticatedUserMissing() {
        given(userAccountRepository.findByEmailIgnoreCase("missing@babyshop.local")).willReturn(Optional.empty());

        assertThatThrownBy(() -> customerProfileService.getProfile("missing@babyshop.local"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Authenticated user not found for email: missing@babyshop.local");
    }

    @Test
    void shouldUpdateAuthenticatedUserProfile() {
        UserAccount user = new UserAccount();
        user.setId(1L);
        user.setEmail("customer@babyshop.local");
        user.setFirstName("Old");
        user.setLastName("Name");
        user.setPhoneNumber("111");
        user.setActive(true);
        Role role = new Role();
        role.setName("CUSTOMER");
        user.setRoles(Set.of(role));

        given(userAccountRepository.findByEmailIgnoreCase("customer@babyshop.local")).willReturn(Optional.of(user));
        given(userAccountRepository.save(user)).willReturn(user);

        var response = customerProfileService.updateProfile(
                "customer@babyshop.local",
                new CustomerProfileUpdateRequest("Ceren", "Unlu", "5551112233")
        );

        assertThat(response.firstName()).isEqualTo("Ceren");
        assertThat(response.lastName()).isEqualTo("Unlu");
        assertThat(response.phoneNumber()).isEqualTo("5551112233");
    }
}
