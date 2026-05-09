package org.nexasphere.util;

import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

@Component
public final class Sanitizer {

    public static String clean(String input) {
        if (input == null) {
            return null;
        }
        String trimmed = input.trim().replace("\u0000", "");
        return HtmlUtils.htmlEscape(trimmed);
    }

    public String sanitizeHtml(String input) {
        return clean(input);
    }
}
