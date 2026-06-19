package com.babyshop.payment.gateway;

import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.order.Order;
import com.babyshop.order.OrderItem;
import com.babyshop.payment.Payment;
import com.babyshop.payment.PaymentProperties;
import com.babyshop.payment.dto.PaymentCallbackRequest;
import com.iyzipay.Options;
import com.iyzipay.model.Address;
import com.iyzipay.model.BasketItem;
import com.iyzipay.model.BasketItemType;
import com.iyzipay.model.Buyer;
import com.iyzipay.model.CheckoutForm;
import com.iyzipay.model.CheckoutFormInitialize;
import com.iyzipay.model.Locale;
import com.iyzipay.model.PaymentGroup;
import com.iyzipay.model.Status;
import com.iyzipay.request.CreateCheckoutFormInitializeRequest;
import com.iyzipay.request.RetrieveCheckoutFormRequest;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Component
public class IyzicoPaymentGateway implements PaymentGateway {

    private static final String PROVIDER_CODE = "IYZICO";
    private static final String PAYMENT_STATUS_SUCCEEDED = "SUCCEEDED";
    private static final String PAYMENT_STATUS_FAILED = "FAILED";
    private static final String IYZICO_PAYMENT_STATUS_SUCCESS = "SUCCESS";

    private final PaymentProperties paymentProperties;
    private final IyzicoClient iyzicoClient;

    public IyzicoPaymentGateway(PaymentProperties paymentProperties, IyzicoClient iyzicoClient) {
        this.paymentProperties = paymentProperties;
        this.iyzicoClient = iyzicoClient;
    }

    @Override
    public String providerCode() {
        return PROVIDER_CODE;
    }

    @Override
    public PaymentGatewayInitiation initiatePayment(
            Order order,
            String transactionId,
            String successUrl,
            String cancelUrl
    ) {
        PaymentProperties.Iyzico properties = properties();
        CreateCheckoutFormInitializeRequest request = new CreateCheckoutFormInitializeRequest();
        request.setLocale(locale());
        request.setConversationId(transactionId);
        request.setPrice(money(order.getSubtotalAmount()));
        request.setPaidPrice(money(order.getTotalAmount()));
        request.setCurrency(order.getCurrency().toUpperCase(java.util.Locale.ROOT));
        request.setBasketId(order.getOrderNumber());
        request.setPaymentGroup(PaymentGroup.PRODUCT.name());
        request.setPaymentSource("BabyShop");
        request.setCallbackUrl(callbackUrl(properties));
        request.setEnabledInstallments(enabledInstallments(properties));
        request.setForceThreeDS(properties.forceThreeDS() == null ? 0 : properties.forceThreeDS());
        request.setBuyer(buildBuyer(order, properties));
        Address address = buildAddress(order);
        request.setShippingAddress(address);
        request.setBillingAddress(address);
        request.setBasketItems(buildBasketItems(order));

        CheckoutFormInitialize response = iyzicoClient.initializeCheckoutForm(request, options(properties));
        validateSuccess(response.getStatus(), response.getErrorMessage(), "iyzico checkout form initialize failed");
        verifySignatureIfPresent(response);

        String token = required(response.getToken(), "iyzico checkout form token is missing");
        String paymentPageUrl = response.getPaymentPageUrl();
        if (paymentPageUrl == null || paymentPageUrl.isBlank()) {
            paymentPageUrl = response.getPayWithIyzicoPageUrl();
        }

        return new PaymentGatewayInitiation(
                token,
                required(paymentPageUrl, "iyzico payment page URL is missing"),
                response.getCheckoutFormContent()
        );
    }

    @Override
    public PaymentGatewayCallbackResult verifyCallback(PaymentCallbackRequest request, Payment payment) {
        String token = required(
                firstNonBlank(request.providerReference(), payment.getProviderReference()),
                "iyzico callback token is required"
        );

        RetrieveCheckoutFormRequest retrieveRequest = new RetrieveCheckoutFormRequest();
        retrieveRequest.setLocale(locale());
        retrieveRequest.setConversationId(payment.getTransactionId());
        retrieveRequest.setToken(token);

        CheckoutForm checkoutForm = iyzicoClient.retrieveCheckoutForm(retrieveRequest, options(properties()));
        validateSuccess(checkoutForm.getStatus(), checkoutForm.getErrorMessage(), "iyzico checkout form retrieve failed");
        verifySignatureIfPresent(checkoutForm);

        String status = IYZICO_PAYMENT_STATUS_SUCCESS.equalsIgnoreCase(checkoutForm.getPaymentStatus())
                ? PAYMENT_STATUS_SUCCEEDED
                : PAYMENT_STATUS_FAILED;

        return new PaymentGatewayCallbackResult(status);
    }

    private Buyer buildBuyer(Order order, PaymentProperties.Iyzico properties) {
        Buyer buyer = new Buyer();
        buyer.setId(order.getOrderNumber());
        buyer.setName(firstNonBlank(order.getCustomerFirstName(), "Baby"));
        buyer.setSurname(firstNonBlank(order.getCustomerLastName(), "Shop"));
        buyer.setEmail(order.getCustomerEmail());
        buyer.setGsmNumber(order.getCustomerPhone());
        buyer.setIdentityNumber(firstNonBlank(properties.defaultBuyerIdentityNumber(), "11111111111"));
        buyer.setRegistrationAddress(addressText(order));
        buyer.setCity(firstNonBlank(order.getShippingCity(), "Istanbul"));
        buyer.setCountry(firstNonBlank(order.getShippingCountry(), "Turkey"));
        buyer.setZipCode(firstNonBlank(order.getShippingPostalCode(), "34000"));
        buyer.setIp(firstNonBlank(properties.defaultBuyerIp(), "127.0.0.1"));
        return buyer;
    }

    private Address buildAddress(Order order) {
        Address address = new Address();
        address.setAddress(addressText(order));
        address.setZipCode(firstNonBlank(order.getShippingPostalCode(), "34000"));
        address.setContactName((firstNonBlank(order.getCustomerFirstName(), "Baby") + " "
                + firstNonBlank(order.getCustomerLastName(), "Shop")).trim());
        address.setCity(firstNonBlank(order.getShippingCity(), "Istanbul"));
        address.setCountry(firstNonBlank(order.getShippingCountry(), "Turkey"));
        return address;
    }

    private List<BasketItem> buildBasketItems(Order order) {
        return order.getItems().stream()
                .map(this::buildBasketItem)
                .toList();
    }

    private BasketItem buildBasketItem(OrderItem item) {
        BasketItem basketItem = new BasketItem();
        basketItem.setId(String.valueOf(firstNonNull(item.getProductVariantId(), item.getId())));
        basketItem.setName(item.getProductName());
        basketItem.setCategory1("Baby Shop");
        basketItem.setCategory2(firstNonBlank(item.getVariantLabel(), "Product"));
        basketItem.setItemType(BasketItemType.PHYSICAL.name());
        basketItem.setPrice(money(item.getLineTotal()));
        return basketItem;
    }

    private Options options(PaymentProperties.Iyzico properties) {
        Options options = new Options();
        options.setApiKey(required(properties.apiKey(), "iyzico API key must be configured"));
        options.setSecretKey(required(properties.secretKey(), "iyzico secret key must be configured"));
        options.setBaseUrl(required(properties.baseUrl(), "iyzico base URL must be configured"));
        return options;
    }

    private PaymentProperties.Iyzico properties() {
        PaymentProperties.Iyzico properties = paymentProperties.iyzico();
        if (properties == null) {
            throw new IllegalStateException("iyzico payment properties must be configured");
        }
        return properties;
    }

    private String callbackUrl(PaymentProperties.Iyzico properties) {
        String callbackUrl = required(properties.callbackUrl(), "iyzico callback URL must be configured");
        String lowerCased = callbackUrl.toLowerCase(java.util.Locale.ROOT);
        if (lowerCased.startsWith("http://") || lowerCased.startsWith("https://")) {
            return callbackUrl;
        }
        return "https://" + callbackUrl;
    }

    private String locale() {
        String configuredLocale = properties().locale();
        if (configuredLocale == null || configuredLocale.isBlank()) {
            return Locale.TR.getValue();
        }
        return configuredLocale.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private List<Integer> enabledInstallments(PaymentProperties.Iyzico properties) {
        if (properties.enabledInstallments() == null || properties.enabledInstallments().isEmpty()) {
            return List.of(1);
        }
        return properties.enabledInstallments();
    }

    private String addressText(Order order) {
        return firstNonBlank(
                joinNonBlank(
                        order.getShippingAddressLine1(),
                        order.getShippingAddressLine2(),
                        order.getShippingDistrict()
                ),
                "Address"
        );
    }

    private BigDecimal money(BigDecimal value) {
        return firstNonNull(value, BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    private void validateSuccess(String status, String errorMessage, String message) {
        if (!Status.SUCCESS.getValue().equalsIgnoreCase(status)) {
            throw new InvalidRequestException(message + ": " + firstNonBlank(errorMessage, "unknown iyzico error"));
        }
    }

    private void verifySignatureIfPresent(CheckoutFormInitialize response) {
        if (response.getSignature() != null && !response.getSignature().isBlank()
                && !response.verifySignature(required(properties().secretKey(), "iyzico secret key must be configured"))) {
            throw new InvalidRequestException("Invalid iyzico checkout form initialize signature");
        }
    }

    private void verifySignatureIfPresent(CheckoutForm response) {
        if (response.getSignature() != null && !response.getSignature().isBlank()
                && !response.verifySignature(required(properties().secretKey(), "iyzico secret key must be configured"))) {
            throw new InvalidRequestException("Invalid iyzico checkout form callback signature");
        }
    }

    private String required(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new InvalidRequestException(message);
        }
        return value.trim();
    }

    private String firstNonBlank(String primary, String fallback) {
        return primary == null || primary.trim().isEmpty() ? fallback : primary.trim();
    }

    private <T> T firstNonNull(T primary, T fallback) {
        return primary == null ? fallback : primary;
    }

    private String joinNonBlank(String... parts) {
        return java.util.Arrays.stream(parts)
                .filter(part -> part != null && !part.trim().isEmpty())
                .map(String::trim)
                .collect(java.util.stream.Collectors.joining(", "));
    }
}
