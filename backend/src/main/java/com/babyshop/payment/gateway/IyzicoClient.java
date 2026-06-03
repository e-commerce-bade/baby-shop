package com.babyshop.payment.gateway;

import com.iyzipay.Options;
import com.iyzipay.model.CheckoutForm;
import com.iyzipay.model.CheckoutFormInitialize;
import com.iyzipay.request.CreateCheckoutFormInitializeRequest;
import com.iyzipay.request.RetrieveCheckoutFormRequest;
import org.springframework.stereotype.Component;

@Component
public class IyzicoClient {

    public CheckoutFormInitialize initializeCheckoutForm(
            CreateCheckoutFormInitializeRequest request,
            Options options
    ) {
        return CheckoutFormInitialize.create(request, options);
    }

    public CheckoutForm retrieveCheckoutForm(
            RetrieveCheckoutFormRequest request,
            Options options
    ) {
        return CheckoutForm.retrieve(request, options);
    }
}
