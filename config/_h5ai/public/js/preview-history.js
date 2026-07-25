(function () {
    "use strict";

    var stateKey = "h5aiPreview";
    var stateValue = String(Date.now()) + "-" + Math.random().toString(36).slice(2);
    var overlay = null;
    var previewWasOpen = false;
    var closingFromHistory = false;
    var removingPreviewState = false;

    function previewIsOpen() {
        overlay = document.getElementById("pv-overlay");
        return Boolean(overlay && !overlay.classList.contains("hidden"));
    }

    function currentStateIsPreview() {
        return Boolean(history.state && history.state[stateKey] === stateValue);
    }

    function pushPreviewState() {
        var state = {};

        if (history.state && typeof history.state === "object") {
            Object.keys(history.state).forEach(function (key) {
                state[key] = history.state[key];
            });
        }

        state[stateKey] = stateValue;
        history.pushState(state, "", window.location.href);
    }

    function closePreview() {
        var closeButton = document.getElementById("pv-bar-close");

        if (closeButton) {
            closeButton.click();
        }
    }

    function handlePreviewVisibility() {
        var previewIsNowOpen = previewIsOpen();

        if (previewIsNowOpen && !previewWasOpen) {
            if (!closingFromHistory && !currentStateIsPreview()) {
                pushPreviewState();
            }
        } else if (!previewIsNowOpen && previewWasOpen) {
            if (closingFromHistory) {
                closingFromHistory = false;
            } else if (currentStateIsPreview()) {
                removingPreviewState = true;
                history.back();
            }
        }

        previewWasOpen = previewIsNowOpen;
    }

    window.addEventListener("popstate", function () {
        if (removingPreviewState) {
            removingPreviewState = false;
            return;
        }

        if (previewIsOpen()) {
            closingFromHistory = true;
            closePreview();
        }
    });

    document.addEventListener("DOMContentLoaded", function () {
        var observer = new MutationObserver(handlePreviewVisibility);

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["class"],
            childList: true,
            subtree: true
        });

        handlePreviewVisibility();
    });
}());
