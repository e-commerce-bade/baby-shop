package com.babyshop.customer;

import com.babyshop.auth.UserAccount;
import com.babyshop.auth.UserAccountRepository;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.customer.dto.CustomerAddressRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CustomerAddressServiceTest {

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private CustomerAddressRepository customerAddressRepository;

    @InjectMocks
    private CustomerAddressService customerAddressService;

    @Test
    void shouldReturnCustomerAddresses() {
        UserAccount user = buildUser();
        CustomerAddress address = buildAddress(user, 1L, true);

        given(userAccountRepository.findByEmailIgnoreCase("customer@babyshop.local")).willReturn(Optional.of(user));
        given(customerAddressRepository.findAllByUserEmailIgnoreCaseOrderByIsDefaultDescCreatedAtDesc("customer@babyshop.local"))
                .willReturn(List.of(address));

        var response = customerAddressService.getAddresses("customer@babyshop.local");

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().defaultAddress()).isTrue();
    }

    @Test
    void shouldCreateFirstAddressAsDefault() {
        UserAccount user = buildUser();
        CustomerAddressRequest request = addressRequest(false);

        given(userAccountRepository.findByEmailIgnoreCase("customer@babyshop.local")).willReturn(Optional.of(user));
        given(customerAddressRepository.existsByUserEmailIgnoreCase("customer@babyshop.local")).willReturn(false);
        given(customerAddressRepository.save(any(CustomerAddress.class))).willAnswer(invocation -> {
            CustomerAddress address = invocation.getArgument(0);
            address.setId(1L);
            return address;
        });

        var response = customerAddressService.createAddress("customer@babyshop.local", request);

        assertThat(response.defaultAddress()).isTrue();
    }

    @Test
    void shouldUnsetPreviousDefaultWhenCreatingNewDefaultAddress() {
        UserAccount user = buildUser();
        CustomerAddress previousDefault = buildAddress(user, 1L, true);
        CustomerAddressRequest request = addressRequest(true);

        given(userAccountRepository.findByEmailIgnoreCase("customer@babyshop.local")).willReturn(Optional.of(user));
        given(customerAddressRepository.existsByUserEmailIgnoreCase("customer@babyshop.local")).willReturn(true);
        given(customerAddressRepository.findAllByUserEmailIgnoreCaseOrderByIsDefaultDescCreatedAtDesc("customer@babyshop.local"))
                .willReturn(List.of(previousDefault));
        given(customerAddressRepository.save(any(CustomerAddress.class))).willAnswer(invocation -> {
            CustomerAddress address = invocation.getArgument(0);
            if (address.getId() == null) {
                address.setId(2L);
            }
            return address;
        });

        var response = customerAddressService.createAddress("customer@babyshop.local", request);

        assertThat(previousDefault.isDefault()).isFalse();
        assertThat(response.defaultAddress()).isTrue();
    }

    @Test
    void shouldPromoteAnotherAddressWhenDeletingDefault() {
        UserAccount user = buildUser();
        CustomerAddress deletedAddress = buildAddress(user, 1L, true);
        CustomerAddress remainingAddress = buildAddress(user, 2L, false);

        given(customerAddressRepository.findByIdAndUserEmailIgnoreCase(1L, "customer@babyshop.local"))
                .willReturn(Optional.of(deletedAddress));
        given(customerAddressRepository.findAllByUserEmailIgnoreCaseOrderByIsDefaultDescCreatedAtDesc("customer@babyshop.local"))
                .willReturn(List.of(remainingAddress));
        given(customerAddressRepository.save(any(CustomerAddress.class))).willAnswer(invocation -> invocation.getArgument(0));

        customerAddressService.deleteAddress("customer@babyshop.local", 1L);

        verify(customerAddressRepository).delete(deletedAddress);
        assertThat(remainingAddress.isDefault()).isTrue();
    }

    @Test
    void shouldSetRequestedAddressAsDefault() {
        UserAccount user = buildUser();
        CustomerAddress previousDefault = buildAddress(user, 1L, true);
        CustomerAddress newDefault = buildAddress(user, 2L, false);

        given(customerAddressRepository.findByIdAndUserEmailIgnoreCase(2L, "customer@babyshop.local"))
                .willReturn(Optional.of(newDefault));
        given(customerAddressRepository.findAllByUserEmailIgnoreCaseOrderByIsDefaultDescCreatedAtDesc("customer@babyshop.local"))
                .willReturn(List.of(previousDefault, newDefault));
        given(customerAddressRepository.save(any(CustomerAddress.class))).willAnswer(invocation -> invocation.getArgument(0));

        var response = customerAddressService.setDefaultAddress("customer@babyshop.local", 2L);

        assertThat(previousDefault.isDefault()).isFalse();
        assertThat(newDefault.isDefault()).isTrue();
        assertThat(response.id()).isEqualTo(2L);
    }

    @Test
    void shouldThrowWhenAddressMissing() {
        given(customerAddressRepository.findByIdAndUserEmailIgnoreCase(99L, "customer@babyshop.local"))
                .willReturn(Optional.empty());

        assertThatThrownBy(() -> customerAddressService.getAddressById("customer@babyshop.local", 99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Customer address not found for id: 99");
    }

    private UserAccount buildUser() {
        UserAccount user = new UserAccount();
        user.setId(1L);
        user.setEmail("customer@babyshop.local");
        user.setActive(true);
        return user;
    }

    private CustomerAddress buildAddress(UserAccount user, Long id, boolean defaultAddress) {
        CustomerAddress address = new CustomerAddress();
        address.setId(id);
        address.setUser(user);
        address.setLabel("Ev");
        address.setRecipientFirstName("Ceren");
        address.setRecipientLastName("Unlu");
        address.setPhoneNumber("5551112233");
        address.setLine1("Ataturk Cd. No:10");
        address.setLine2("Daire 5");
        address.setDistrict("Kadikoy");
        address.setCity("Istanbul");
        address.setPostalCode("34710");
        address.setCountry("Turkey");
        address.setDefault(defaultAddress);
        return address;
    }

    private CustomerAddressRequest addressRequest(boolean defaultAddress) {
        return new CustomerAddressRequest(
                "Ev",
                "Ceren",
                "Unlu",
                "5551112233",
                "Ataturk Cd. No:10",
                "Daire 5",
                "Kadikoy",
                "Istanbul",
                "34710",
                "Turkey",
                defaultAddress
        );
    }
}
