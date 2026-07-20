(function () {
    "use strict";

    var storageKey = "h5ai-color-theme";
    var root = document.documentElement;
    var colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    var button = null;

    function readStoredTheme() {
        try {
            var storedTheme = window.localStorage.getItem(storageKey);
            return storedTheme === "dark" || storedTheme === "light" ? storedTheme : null;
        } catch (error) {
            return null;
        }
    }

    function writeStoredTheme(theme) {
        try {
            window.localStorage.setItem(storageKey, theme);
        } catch (error) {
            // The selected theme still applies when storage is unavailable.
        }
    }

    function preferredTheme() {
        return colorSchemeQuery.matches ? "dark" : "light";
    }

    function updateButton(theme) {
        if (!button) {
            return;
        }

        var isDark = theme === "dark";
        var nextTheme = isDark ? "light" : "dark";
        button.setAttribute("aria-pressed", String(isDark));
        button.setAttribute("aria-label", "Switch to " + nextTheme + " mode");
        button.setAttribute("title", "Switch to " + nextTheme + " mode");
    }

    function applyTheme(theme, remember) {
        root.setAttribute("data-theme", theme);
        root.style.colorScheme = theme;
        updateButton(theme);

        if (remember) {
            writeStoredTheme(theme);
        }
    }

    function themeIcon(className, contents) {
        return '<svg class="theme-icon ' + className + '" viewBox="0 0 24 24" aria-hidden="true">' + contents + "</svg>";
    }

    function createButton() {
        var backlink = document.getElementById("backlink");
        if (!backlink || document.getElementById("theme-toggle")) {
            return Boolean(backlink);
        }

        button = document.createElement("button");
        button.id = "theme-toggle";
        button.type = "button";
        button.innerHTML = themeIcon(
            "theme-icon-sun",
            '<circle cx="12" cy="12" r="3.75"></circle>' +
                '<path d="M12 2v2.25M12 19.75V22M4.93 4.93l1.59 1.59M17.48 17.48l1.59 1.59M2 12h2.25M19.75 12H22M4.93 19.07l1.59-1.59M17.48 6.52l1.59-1.59"></path>'
        ) + themeIcon(
            "theme-icon-moon",
            '<path d="M20.3 14.6A8.5 8.5 0 0 1 9.4 3.7 8.5 8.5 0 1 0 20.3 14.6Z"></path>'
        );

        button.addEventListener("click", function () {
            var nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
            applyTheme(nextTheme, true);
        });

        backlink.parentNode.insertBefore(button, backlink);
        updateButton(root.getAttribute("data-theme"));
        return true;
    }

    function initializeButton() {
        if (createButton()) {
            return;
        }

        var observer = new MutationObserver(function () {
            if (createButton()) {
                observer.disconnect();
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    applyTheme(readStoredTheme() || preferredTheme(), false);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeButton);
    } else {
        initializeButton();
    }

    window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
            root.classList.add("theme-transitions");
        });
    });

    function handleSystemThemeChange() {
        if (!readStoredTheme()) {
            applyTheme(preferredTheme(), false);
        }
    }

    if (colorSchemeQuery.addEventListener) {
        colorSchemeQuery.addEventListener("change", handleSystemThemeChange);
    } else {
        colorSchemeQuery.addListener(handleSystemThemeChange);
    }

    window.addEventListener("storage", function (event) {
        if (event.key === storageKey) {
            applyTheme(readStoredTheme() || preferredTheme(), false);
        }
    });
}());
