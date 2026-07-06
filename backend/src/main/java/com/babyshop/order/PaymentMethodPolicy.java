package com.babyshop.order;

import com.babyshop.common.exception.InvalidRequestException;

import java.util.Locale;
import java.util.Set;

/**
 * Siparis odeme yontemleri ve dogrulama kurallari.
 * CARD = Kredi/Banka karti (iyzico), COD = Kapida nakit odeme, EFT = Havale/EFT.
 */
public final class PaymentMethodPolicy {

    public static final String CARD = "CARD";
    public static final String COD = "COD";
    public static final String EFT = "EFT";

    private static final Set<String> SUPPORTED = Set.of(CARD, COD, EFT);

    private PaymentMethodPolicy() {
    }

    /** Girisi normalize eder; bos ise varsayilan CARD, gecersizse istisna firlatir. */
    public static String normalizeOrDefault(String method) {
        if (method == null || method.trim().isEmpty()) {
            return CARD;
        }
        String normalized = method.trim().toUpperCase(Locale.ROOT);
        if (!SUPPORTED.contains(normalized)) {
            throw new InvalidRequestException("Desteklenmeyen ödeme yöntemi: " + method);
        }
        return normalized;
    }

    /** Cevrimici odeme (iyzico) gerektiren yontem mi. */
    public static boolean isOnline(String method) {
        return CARD.equalsIgnoreCase(method);
    }

    /** Cevrimdisi (kapida nakit / havale) yontem mi; siparis olusturulur, admin onaylar. */
    public static boolean isOffline(String method) {
        return COD.equalsIgnoreCase(method) || EFT.equalsIgnoreCase(method);
    }
}
