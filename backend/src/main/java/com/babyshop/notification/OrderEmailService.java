package com.babyshop.notification;

import com.babyshop.order.Order;
import com.babyshop.order.OrderItem;
import com.babyshop.order.PaymentMethodPolicy;
import com.babyshop.settings.StoreSettingService;
import com.babyshop.settings.dto.StoreSettingResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

// Siparis onay e-postasini kurar. sendOrderConfirmation, cagiranin acik transaction'i icinden
// cagrilir (order.getItems() gibi lazy alanlar burada okunur); asil SMTP gonderimi async yapilir.
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderEmailService {

    private final MailProperties mailProperties;
    private final AsyncMailDispatcher dispatcher;

    // Opsiyonel enjeksiyon: 2 argumanli manuel yapicilar (testler) bozulmasin diye.
    // Havale (EFT) siparislerinde banka bilgilerini e-postaya eklemek icin kullanilir.
    @Autowired(required = false)
    private StoreSettingService storeSettingService;

    public void sendOrderConfirmation(Order order) {
        if (!mailProperties.enabled()) {
            return;
        }

        String to = order.getCustomerEmail();
        if (to == null || to.isBlank()) {
            return;
        }

        String subject = "Siparişiniz alındı · " + order.getOrderNumber();
        dispatcher.dispatchHtml(mailProperties.from(), to, subject, buildHtml(order));
    }

    private String buildHtml(Order order) {
        String currency = order.getCurrency();
        StringBuilder rows = new StringBuilder();
        for (OrderItem item : order.getItems()) {
            rows.append("""
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #EFE7DC;">
                        <div style="font-weight:600;color:#3D2B1F;">%s</div>
                        <div style="font-size:12px;color:#9A8A78;">%s · %d adet</div>
                      </td>
                      <td style="padding:8px 0;border-bottom:1px solid #EFE7DC;text-align:right;font-weight:600;color:#3D2B1F;white-space:nowrap;">%s</td>
                    </tr>
                    """.formatted(
                    escape(item.getProductName()),
                    escape(item.getVariantLabel() == null ? "" : item.getVariantLabel()),
                    item.getQuantity(),
                    money(item.getLineTotal(), item.getCurrency())
            ));
        }

        String name = join(order.getCustomerFirstName(), order.getCustomerLastName());
        String greeting = name.isBlank() ? "Merhaba," : "Merhaba " + escape(name) + ",";
        String trackUrl = mailProperties.trackBaseUrl() + "/orders/track?orderNumber="
                + urlEncode(order.getOrderNumber());

        String address = join2(
                order.getShippingAddressLine1(),
                order.getShippingAddressLine2(),
                order.getShippingDistrict(),
                order.getShippingCity(),
                order.getShippingPostalCode(),
                order.getShippingCountry()
        );

        String method = PaymentMethodPolicy.normalizeOrDefault(order.getPaymentMethod());
        String intro = introFor(method);
        String codRow = codSurchargeRow(order.getCodSurcharge(), currency);
        String paymentInfoHtml = paymentInfoFor(method, order);

        String notes = order.getNotes();
        String notesHtml = (notes == null || notes.isBlank()) ? "" : """
                <div style="margin-top:18px;">
                  <div style="font-size:12px;color:#9A8A78;margin-bottom:4px;">Sipariş Notu</div>
                  <div style="font-size:13px;color:#6B5747;line-height:1.5;">%s</div>
                </div>
                """.formatted(escape(notes));

        return """
                <div style="background:#FAF6F1;padding:24px;font-family:Arial,Helvetica,sans-serif;">
                  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ECE3D6;border-radius:16px;overflow:hidden;">
                    <div style="padding:24px 28px;border-bottom:1px solid #ECE3D6;">
                      <div style="font-size:20px;font-weight:700;color:#3D2B1F;">%s</div>
                    </div>
                    <div style="padding:24px 28px;">
                      <p style="color:#5B4839;font-size:15px;margin:0 0 8px;">%s</p>
                      <p style="color:#6B5747;font-size:14px;line-height:1.6;margin:0 0 18px;">
                        %s
                      </p>
                      <div style="background:#FAF6F1;border-radius:12px;padding:14px 16px;margin-bottom:18px;">
                        <div style="font-size:12px;color:#9A8A78;">Sipariş Numarası</div>
                        <div style="font-size:16px;font-weight:700;color:#3D2B1F;font-family:monospace;">%s</div>
                      </div>
                      <table style="width:100%%;border-collapse:collapse;font-size:14px;">%s</table>
                      <table style="width:100%%;border-collapse:collapse;font-size:14px;margin-top:14px;">
                        <tr><td style="padding:3px 0;color:#6B5747;">Ara toplam</td><td style="padding:3px 0;text-align:right;color:#3D2B1F;">%s</td></tr>
                        <tr><td style="padding:3px 0;color:#6B5747;">Kargo</td><td style="padding:3px 0;text-align:right;color:#3D2B1F;">%s</td></tr>
                        %s
                        <tr><td style="padding:8px 0 0;font-weight:700;color:#3D2B1F;border-top:1px solid #ECE3D6;">Toplam</td><td style="padding:8px 0 0;text-align:right;font-weight:700;color:#3D2B1F;border-top:1px solid #ECE3D6;">%s</td></tr>
                      </table>
                      %s
                      <div style="margin-top:18px;">
                        <div style="font-size:12px;color:#9A8A78;margin-bottom:4px;">Teslimat Adresi</div>
                        <div style="font-size:13px;color:#6B5747;line-height:1.5;">%s</div>
                      </div>
                      %s
                      <div style="margin-top:24px;text-align:center;">
                        <a href="%s" style="display:inline-block;background:#C07B5A;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 26px;border-radius:12px;">Siparişini Takip Et</a>
                      </div>
                    </div>
                    <div style="padding:16px 28px;border-top:1px solid #ECE3D6;color:#B5A090;font-size:12px;text-align:center;">
                      Bu e-posta %s siparişiniz için gönderildi.
                    </div>
                  </div>
                </div>
                """.formatted(
                escape(mailProperties.storeName()),
                greeting,
                intro,
                escape(order.getOrderNumber()),
                rows.toString(),
                money(order.getSubtotalAmount(), currency),
                shipping(order.getShippingAmount(), currency),
                codRow,
                money(order.getTotalAmount(), currency),
                paymentInfoHtml,
                address.isBlank() ? "—" : escape(address),
                notesHtml,
                trackUrl,
                escape(mailProperties.storeName())
        );
    }

    private String introFor(String method) {
        return switch (method) {
            case PaymentMethodPolicy.COD ->
                    "Siparişiniz başarıyla alındı. Ödemeyi teslimat sırasında kapıda nakit olarak yapabilirsiniz. Detaylar aşağıda.";
            case PaymentMethodPolicy.EFT ->
                    "Siparişiniz alındı. Havale/EFT ödemenizi aşağıdaki banka hesabına yaptığınızda siparişiniz hazırlanmaya başlanır. Açıklama kısmına sipariş numaranızı yazmayı unutmayın. Detaylar aşağıda.";
            default ->
                    "Siparişiniz başarıyla alındı ve ödemeniz onaylandı. Detaylar aşağıda.";
        };
    }

    private String codSurchargeRow(BigDecimal codSurcharge, String currency) {
        if (codSurcharge == null || codSurcharge.signum() <= 0) {
            return "";
        }
        return """
                <tr><td style="padding:3px 0;color:#6B5747;">Kapıda Ödeme Farkı</td><td style="padding:3px 0;text-align:right;color:#3D2B1F;">%s</td></tr>
                """.formatted(money(codSurcharge, currency));
    }

    // EFT icin banka/IBAN bilgilerini; COD icin kapida odeme bilgisini gosterir.
    private String paymentInfoFor(String method, Order order) {
        if (PaymentMethodPolicy.EFT.equals(method)) {
            StoreSettingResponse settings = storeSettingService == null ? null : storeSettingService.getSettings();
            String bankName = settings == null ? null : settings.bankTransferBankName();
            String accountName = settings == null ? null : settings.bankTransferAccountName();
            String iban = settings == null ? null : settings.bankTransferIban();
            return """
                    <div style="margin-top:18px;background:#FFF8EC;border:1px solid #F0E2C8;border-radius:12px;padding:14px 16px;">
                      <div style="font-size:13px;font-weight:700;color:#8A6D1F;margin-bottom:8px;">Havale / EFT Bilgileri</div>
                      <div style="font-size:13px;color:#6B5747;line-height:1.7;">
                        <div><span style="color:#9A8A78;">Banka:</span> <strong>%s</strong></div>
                        <div><span style="color:#9A8A78;">Hesap Sahibi:</span> <strong>%s</strong></div>
                        <div><span style="color:#9A8A78;">IBAN:</span> <strong style="font-family:monospace;">%s</strong></div>
                        <div style="margin-top:6px;"><span style="color:#9A8A78;">Açıklama:</span> <strong>%s</strong></div>
                      </div>
                    </div>
                    """.formatted(
                    escape(bankName == null ? "—" : bankName),
                    escape(accountName == null ? "—" : accountName),
                    escape(iban == null ? "—" : iban),
                    escape(order.getOrderNumber())
            );
        }
        if (PaymentMethodPolicy.COD.equals(method)) {
            return """
                    <div style="margin-top:18px;background:#EDF7F1;border:1px solid #CDE9D9;border-radius:12px;padding:14px 16px;">
                      <div style="font-size:13px;font-weight:700;color:#1A6640;margin-bottom:4px;">Kapıda Nakit Ödeme</div>
                      <div style="font-size:13px;color:#6B5747;line-height:1.6;">
                        Ödemeyi teslimat sırasında kuryeye nakit olarak yapabilirsiniz.
                      </div>
                    </div>
                    """;
        }
        return "";
    }

    private String shipping(BigDecimal amount, String currency) {
        if (amount == null || amount.signum() == 0) {
            return "Ücretsiz";
        }
        return money(amount, currency);
    }

    private String money(BigDecimal amount, String currency) {
        BigDecimal value = (amount == null ? BigDecimal.ZERO : amount).setScale(2, RoundingMode.HALF_UP);
        String symbol = "TRY".equalsIgnoreCase(currency) ? "₺" : (currency == null ? "" : currency);
        // Turkce gosterim: ondalik ayraci virgul.
        return value.toPlainString().replace('.', ',') + " " + symbol;
    }

    private String join(String a, String b) {
        return ((a == null ? "" : a) + " " + (b == null ? "" : b)).trim();
    }

    private String join2(String... parts) {
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (part != null && !part.isBlank()) {
                if (sb.length() > 0) {
                    sb.append(", ");
                }
                sb.append(part.trim());
            }
        }
        return sb.toString();
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private String urlEncode(String value) {
        return java.net.URLEncoder.encode(value == null ? "" : value, java.nio.charset.StandardCharsets.UTF_8);
    }
}
