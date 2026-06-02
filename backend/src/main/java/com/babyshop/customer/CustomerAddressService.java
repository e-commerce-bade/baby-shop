package com.babyshop.customer;

import com.babyshop.auth.UserAccount;
import com.babyshop.auth.UserAccountRepository;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.customer.dto.CustomerAddressRequest;
import com.babyshop.customer.dto.CustomerAddressResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerAddressService {

    private final UserAccountRepository userAccountRepository;
    private final CustomerAddressRepository customerAddressRepository;

    public List<CustomerAddressResponse> getAddresses(String email) {
        String normalizedEmail = normalizeEmail(email);
        ensureUserExists(normalizedEmail);

        return customerAddressRepository.findAllByUserEmailIgnoreCaseOrderByIsDefaultDescCreatedAtDesc(normalizedEmail)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public CustomerAddressResponse getAddressById(String email, Long addressId) {
        return toResponse(findAddressById(email, addressId));
    }

    @Transactional
    public CustomerAddressResponse createAddress(String email, CustomerAddressRequest request) {
        String normalizedEmail = normalizeEmail(email);
        UserAccount user = findUserByEmail(normalizedEmail);

        CustomerAddress address = new CustomerAddress();
        address.setUser(user);
        applyRequest(address, request);

        boolean shouldBeDefault = !customerAddressRepository.existsByUserEmailIgnoreCase(normalizedEmail)
                || Boolean.TRUE.equals(request.defaultAddress());
        if (shouldBeDefault) {
            clearDefaultAddress(normalizedEmail);
        }
        address.setDefault(shouldBeDefault);

        return toResponse(customerAddressRepository.save(address));
    }

    @Transactional
    public CustomerAddressResponse updateAddress(String email, Long addressId, CustomerAddressRequest request) {
        String normalizedEmail = normalizeEmail(email);
        CustomerAddress address = findAddressById(normalizedEmail, addressId);
        applyRequest(address, request);

        if (Boolean.TRUE.equals(request.defaultAddress())) {
            clearDefaultAddress(normalizedEmail);
            address.setDefault(true);
        } else if (address.isDefault()) {
            address.setDefault(true);
        }

        return toResponse(customerAddressRepository.save(address));
    }

    @Transactional
    public void deleteAddress(String email, Long addressId) {
        String normalizedEmail = normalizeEmail(email);
        CustomerAddress address = findAddressById(normalizedEmail, addressId);
        boolean wasDefault = address.isDefault();

        customerAddressRepository.delete(address);

        if (!wasDefault) {
            return;
        }

        customerAddressRepository.findAllByUserEmailIgnoreCaseOrderByIsDefaultDescCreatedAtDesc(normalizedEmail)
                .stream()
                .findFirst()
                .ifPresent(nextDefault -> {
                    nextDefault.setDefault(true);
                    customerAddressRepository.save(nextDefault);
                });
    }

    @Transactional
    public CustomerAddressResponse setDefaultAddress(String email, Long addressId) {
        String normalizedEmail = normalizeEmail(email);
        CustomerAddress address = findAddressById(normalizedEmail, addressId);

        clearDefaultAddress(normalizedEmail);
        address.setDefault(true);

        return toResponse(customerAddressRepository.save(address));
    }

    private void applyRequest(CustomerAddress address, CustomerAddressRequest request) {
        address.setLabel(trimToNull(request.label()));
        address.setRecipientFirstName(request.recipientFirstName().trim());
        address.setRecipientLastName(request.recipientLastName().trim());
        address.setPhoneNumber(trimToNull(request.phoneNumber()));
        address.setLine1(request.line1().trim());
        address.setLine2(trimToNull(request.line2()));
        address.setDistrict(request.district().trim());
        address.setCity(request.city().trim());
        address.setPostalCode(trimToNull(request.postalCode()));
        address.setCountry(request.country().trim());
    }

    private void clearDefaultAddress(String email) {
        customerAddressRepository.findAllByUserEmailIgnoreCaseOrderByIsDefaultDescCreatedAtDesc(email)
                .stream()
                .filter(CustomerAddress::isDefault)
                .forEach(address -> address.setDefault(false));
    }

    private CustomerAddress findAddressById(String email, Long addressId) {
        return customerAddressRepository.findByIdAndUserEmailIgnoreCase(addressId, normalizeEmail(email))
                .orElseThrow(() -> new ResourceNotFoundException("Customer address not found for id: " + addressId));
    }

    private void ensureUserExists(String email) {
        findUserByEmail(email);
    }

    private UserAccount findUserByEmail(String email) {
        return userAccountRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found for email: " + email));
    }

    private CustomerAddressResponse toResponse(CustomerAddress address) {
        return new CustomerAddressResponse(
                address.getId(),
                address.getLabel(),
                address.getRecipientFirstName(),
                address.getRecipientLastName(),
                address.getPhoneNumber(),
                address.getLine1(),
                address.getLine2(),
                address.getDistrict(),
                address.getCity(),
                address.getPostalCode(),
                address.getCountry(),
                address.isDefault(),
                address.getCreatedAt(),
                address.getUpdatedAt()
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
