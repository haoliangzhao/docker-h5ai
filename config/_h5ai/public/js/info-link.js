(function () {
    "use strict";

    var panel = null;
    var copyButton = null;
    var currentLink = window.location.href;
    var resetTimer = null;

    function normalizeLink(link) {
        try {
            return new URL(link, window.location.href).href;
        } catch (error) {
            return window.location.href;
        }
    }

    function setLink(link) {
        currentLink = normalizeLink(link);
    }

    function resetCopyState() {
        if (!copyButton) {
            return;
        }

        copyButton.textContent = "Copy link";
        copyButton.classList.remove("copied");
    }

    function showCopyState(success) {
        window.clearTimeout(resetTimer);
        copyButton.textContent = success ? "Copied!" : "Copy failed";
        copyButton.classList.toggle("copied", success);
        resetTimer = window.setTimeout(resetCopyState, 1800);
    }

    function fallbackCopy(text) {
        var textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();

        var copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        return copied;
    }

    function copyLink() {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(currentLink).then(function () {
                showCopyState(true);
            }).catch(function () {
                showCopyState(fallbackCopy(currentLink));
            });
            return;
        }

        showCopyState(fallbackCopy(currentLink));
    }

    function createPanel() {
        var info = document.getElementById("info");
        if (!info) {
            return false;
        }

        panel = document.createElement("div");
        panel.className = "info-link";
        panel.innerHTML = '<button class="info-link-copy" type="button" aria-live="polite">Copy link</button>';

        copyButton = panel.querySelector(".info-link-copy");
        copyButton.addEventListener("click", copyLink);
        info.appendChild(panel);
        setLink(window.location.href);
        return true;
    }

    function closestItemLink(target) {
        if (!target || !target.closest) {
            return null;
        }
        return target.closest("#view .item a");
    }

    function initialize() {
        if (!createPanel()) {
            var observer = new MutationObserver(function () {
                if (createPanel()) {
                    observer.disconnect();
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }

        document.addEventListener("mouseover", function (event) {
            var link = closestItemLink(event.target);
            if (link) {
                setLink(link.href);
            }
        });

        document.addEventListener("mouseout", function (event) {
            var link = closestItemLink(event.target);
            if (link && (!event.relatedTarget || !link.contains(event.relatedTarget))) {
                setLink(window.location.href);
            }
        });

        document.addEventListener("focusin", function (event) {
            var link = closestItemLink(event.target);
            if (link) {
                setLink(link.href);
            }
        });

        document.addEventListener("focusout", function (event) {
            if (closestItemLink(event.target)) {
                setLink(window.location.href);
            }
        });

        document.addEventListener("click", function (event) {
            if (closestItemLink(event.target)) {
                window.setTimeout(function () {
                    setLink(window.location.href);
                }, 0);
            }
        });

        window.addEventListener("popstate", function () {
            setLink(window.location.href);
        });
        window.addEventListener("hashchange", function () {
            setLink(window.location.href);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
}());
