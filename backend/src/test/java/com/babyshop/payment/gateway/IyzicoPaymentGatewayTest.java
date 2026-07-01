package com.babyshop.payment.gateway;

import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.order.Order;
import com.babyshop.order.OrderItem;
import com.babyshop.payment.Payment;
import com.babyshop.payment.PaymentProperties;
import com.babyshop.payment.dto.PaymentCallbackRequest;
import com.iyzipay.Options;
import com.iyzipay.model.CheckoutForm;
import com.iyzipay.model.CheckoutFormInitialize;
import com.iyzipay.request.CreateCheckoutFormInitializeRequest;
import com.iyzipay.request.RetrieveCheckoutFormRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class IyzicoPaymentGatewayTest {

    @Mock
    private IyzicoClient iyzicoClient;

    @Test
    void shouldInitializeCheckoutForm() {
        IyzicoPaymentGateway gateway = new IyzicoPaymentGateway(properties(), iyzicoClient);
        CheckoutFormInitialize response = new CheckoutFormInitialize();
        response.setStatus("success");
        response.setToken("iyzico-token");
        response.setPaymentPageUrl("https://sandbox-api.iyzipay.com/checkoutform/iyzico-token");
        response.setCheckoutFormContent("<script>iyziInit</script>");

        given(iyzicoClient.initializeCheckoutForm(any(), any())).willReturn(response);

        PaymentGatewayInitiation initiation = gateway.initiatePayment(
                buildOrder(),
                "TXN-123",
                "https://shop.local/payment/success",
                "https://shop.local/payment/cancel",
                "203.0.113.7"
        );

        assertThat(initiation.providerReference()).isEqualTo("iyzico-token");
        assertThat(initiation.paymentPageUrl()).contains("checkoutform/iyzico-token");
        assertThat(initiation.checkoutFormContent()).isEqualTo("<script>iyziInit</script>");

        ArgumentCaptor<CreateCheckoutFormInitializeRequest> requestCaptor =
                ArgumentCaptor.forClass(CreateCheckoutFormInitializeRequest.class);
        ArgumentCaptor<Options> optionsCaptor = ArgumentCaptor.forClass(Options.class);
        org.mockito.Mockito.verify(iyzicoClient).initializeCheckoutForm(requestCaptor.capture(), optionsCaptor.capture());

        assertThat(requestCaptor.getValue().getConversationId()).isEqualTo("TXN-123");
        assertThat(requestCaptor.getValue().getCallbackUrl()).isEqualTo("https://api.shop.local/api/v1/payments/callbacks/IYZICO");
        assertThat(requestCaptor.getValue().getPaidPrice()).isEqualByComparingTo("998.00");
        assertThat(requestCaptor.getValue().getBasketItems()).hasSize(1);
        assertThat(requestCaptor.getValue().getBuyer().getIp()).isEqualTo("203.0.113.7");
        assertThat(optionsCaptor.getValue().getBaseUrl()).isEqualTo("https://sandbox-api.iyzipay.com");
    }

    @Test
    void shouldFallBackToConfiguredBuyerIpWhenClientIpMissing() {
        IyzicoPaymentGateway gateway = new IyzicoPaymentGateway(properties(), iyzicoClient);
        CheckoutFormInitialize response = new CheckoutFormInitialize();
        response.setStatus("success");
        response.setToken("iyzico-token");
        response.setPaymentPageUrl("https://sandbox-api.iyzipay.com/checkoutform/iyzico-token");

        given(iyzicoClient.initializeCheckoutForm(any(), any())).willReturn(response);

        gateway.initiatePayment(
                buildOrder(),
                "TXN-123",
                "https://shop.local/payment/success",
                "https://shop.local/payment/cancel",
                null
        );

        ArgumentCaptor<CreateCheckoutFormInitializeRequest> requestCaptor =
                ArgumentCaptor.forClass(CreateCheckoutFormInitializeRequest.class);
        org.mockito.Mockito.verify(iyzicoClient).initializeCheckoutForm(requestCaptor.capture(), any());
        assertThat(requestCaptor.getValue().getBuyer().getIp()).isEqualTo("127.0.0.1");
    }

    @Test
    void shouldNormalizeSchemelessCallbackUrl() {
        PaymentProperties properties = new PaymentProperties(
                new PaymentProperties.Mock("mock-secret"),
                new PaymentProperties.Iyzico(
                        "sandbox-api-key",
                        "sandbox-secret-key",
                        "https://sandbox-api.iyzipay.com",
                        "api.shop.local/api/v1/payments/callbacks/IYZICO",
                        "tr",
                        List.of(1),
                        0,
                        "11111111111",
                        "127.0.0.1"
                ),
                List.of()
        );
        IyzicoPaymentGateway gateway = new IyzicoPaymentGateway(properties, iyzicoClient);
        CheckoutFormInitialize response = new CheckoutFormInitialize();
        response.setStatus("success");
        response.setToken("iyzico-token");
        response.setPaymentPageUrl("https://sandbox-api.iyzipay.com/checkoutform/iyzico-token");

        given(iyzicoClient.initializeCheckoutForm(any(), any())).willReturn(response);

        gateway.initiatePayment(
                buildOrder(),
                "TXN-123",
                "https://shop.local/payment/success",
                "https://shop.local/payment/cancel",
                "203.0.113.7"
        );

        ArgumentCaptor<CreateCheckoutFormInitializeRequest> requestCaptor =
                ArgumentCaptor.forClass(CreateCheckoutFormInitializeRequest.class);
        org.mockito.Mockito.verify(iyzicoClient).initializeCheckoutForm(requestCaptor.capture(), any());
        assertThat(requestCaptor.getValue().getCallbackUrl())
                .isEqualTo("https://api.shop.local/api/v1/payments/callbacks/IYZICO");
    }

    @Test
    void shouldResolveSuccessfulCheckoutFormCallback() {
        IyzicoPaymentGateway gateway = new IyzicoPaymentGateway(properties(), iyzicoClient);
        CheckoutForm response = new CheckoutForm();
        response.setStatus("success");
        response.setPaymentStatus("SUCCESS");
        response.setToken("iyzico-token");
        response.setPaidPrice(new BigDecimal("998.00"));
        response.setBasketId("ORD-123");

        given(iyzicoClient.retrieveCheckoutForm(any(), any())).willReturn(response);

        PaymentGatewayCallbackResult result = gateway.verifyCallback(
                new PaymentCallbackRequest(null, "iyzico-token", null, null, "token=iyzico-token"),
                buildPayment()
        );

        assertThat(result.status()).isEqualTo("SUCCEEDED");

        ArgumentCaptor<RetrieveCheckoutFormRequest> requestCaptor =
                ArgumentCaptor.forClass(RetrieveCheckoutFormRequest.class);
        org.mockito.Mockito.verify(iyzicoClient).retrieveCheckoutForm(requestCaptor.capture(), any());
        assertThat(requestCaptor.getValue().getToken()).isEqualTo("iyzico-token");
        assertThat(requestCaptor.getValue().getConversationId()).isEqualTo("TXN-123");
    }

    @Test
    void shouldMapNonSuccessfulCheckoutFormPaymentToFailed() {
        IyzicoPaymentGateway gateway = new IyzicoPaymentGateway(properties(), iyzicoClient);
        CheckoutForm response = new CheckoutForm();
        response.setStatus("success");
        response.setPaymentStatus("FAILURE");

        given(iyzicoClient.retrieveCheckoutForm(any(), any())).willReturn(response);

        PaymentGatewayCallbackResult result = gateway.verifyCallback(
                new PaymentCallbackRequest(null, "iyzico-token", null, null, null),
                buildPayment()
        );

        assertThat(result.status()).isEqualTo("FAILED");
    }

    @Test
    void shouldRejectFailedInitializeResponse() {
        IyzicoPaymentGateway gateway = new IyzicoPaymentGateway(properties(), iyzicoClient);
        CheckoutFormInitialize response = new CheckoutFormInitialize();
        response.setStatus("failure");
        response.setErrorMessage("Invalid API key");

        given(iyzicoClient.initializeCheckoutForm(any(), any())).willReturn(response);

        assertThatThrownBy(() -> gateway.initiatePayment(
                buildOrder(),
                "TXN-123",
                "https://shop.local/payment/success",
                "https://shop.local/payment/cancel",
                "203.0.113.7"
        ))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("iyzico checkout form initialize failed: Invalid API key");
    }

    private PaymentProperties properties() {
        return new PaymentProperties(
                new PaymentProperties.Mock("mock-secret"),
                new PaymentProperties.Iyzico(
                        "sandbox-api-key",
                        "sandbox-secret-key",
                        "https://sandbox-api.iyzipay.com",
                        "https://api.shop.local/api/v1/payments/callbacks/IYZICO",
                        "tr",
                        List.of(1),
                        0,
                        "11111111111",
                        "127.0.0.1"
                ),
                List.of()
        );
    }

    private Order buildOrder() {
        Order order = new Order();
        order.setId(1L);
        order.setOrderNumber("ORD-123");
        order.setCustomerEmail("customer@example.com");
        order.setCustomerFirstName("Ada");
        order.setCustomerLastName("Yilmaz");
        order.setCustomerPhone("+905350000000");
        order.setSubtotalAmount(new BigDecimal("998.00"));
        order.setTotalAmount(new BigDecimal("998.00"));
        order.setCurrency("TRY");
        order.setShippingAddressLine1("Adres satiri 1");
        order.setShippingDistrict("Kadikoy");
        order.setShippingCity("Istanbul");
        order.setShippingPostalCode("34710");
        order.setShippingCountry("Turkey");

        OrderItem item = new OrderItem();
        item.setId(10L);
        item.setOrder(order);
        item.setProductVariantId(100L);
        item.setProductName("Bebek Tulumu");
        item.setVariantLabel("3-6 ay / Pembe");
        item.setQuantity(2);
        item.setUnitPrice(new BigDecimal("499.00"));
        item.setLineTotal(new BigDecimal("998.00"));
        item.setCurrency("TRY");
        order.getItems().add(item);
        return order;
    }

    @Test
    void shouldRejectSuccessfulCallbackWhenPaidAmountMismatch() {
        IyzicoPaymentGateway gateway = new IyzicoPaymentGateway(properties(), iyzicoClient);
        CheckoutForm response = new CheckoutForm();
        response.setStatus("success");
        response.setPaymentStatus("SUCCESS");
        response.setToken("iyzico-token");
        response.setPaidPrice(new BigDecimal("1.00"));
        response.setBasketId("ORD-123");

        given(iyzicoClient.retrieveCheckoutForm(any(), any())).willReturn(response);

        assertThatThrownBy(() -> gateway.verifyCallback(
                new PaymentCallbackRequest(null, "iyzico-token", null, null, null),
                buildPayment()
        ))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("iyzico callback paid amount does not match the order amount");
    }

    @Test
    void shouldRejectSuccessfulCallbackWhenBasketIdMismatch() {
        IyzicoPaymentGateway gateway = new IyzicoPaymentGateway(properties(), iyzicoClient);
        CheckoutForm response = new CheckoutForm();
        response.setStatus("success");
        response.setPaymentStatus("SUCCESS");
        response.setToken("iyzico-token");
        response.setPaidPrice(new BigDecimal("998.00"));
        response.setBasketId("ORD-OTHER");

        given(iyzicoClient.retrieveCheckoutForm(any(), any())).willReturn(response);

        assertThatThrownBy(() -> gateway.verifyCallback(
                new PaymentCallbackRequest(null, "iyzico-token", null, null, null),
                buildPayment()
        ))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("iyzico callback basket id does not match the order");
    }

    private Payment buildPayment() {
        Payment payment = new Payment();
        payment.setOrder(buildOrder());
        payment.setProvider("IYZICO");
        payment.setTransactionId("TXN-123");
        payment.setProviderReference("iyzico-token");
        payment.setAmount(new BigDecimal("998.00"));
        return payment;
    }
}
