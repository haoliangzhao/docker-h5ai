(function () {
    "use strict";

    var storageKey = "h5ai-readme-panel-visible";
    var scriptUrl = document.currentScript && document.currentScript.src;
    var publicUrl = new URL("../", scriptUrl || window.location.href);
    var iconUrl = new URL("images/ui/readme-toggle.svg", publicUrl);
    var enabled = false;
    var control = null;
    var panel = null;
    var currentHref = null;
    var requestToken = 0;
    var refreshTimer = null;

    function readStoredState() {
        try {
            var storedState = window.localStorage.getItem(storageKey);
            return storedState === null ? true : storedState === "true";
        } catch (error) {
            return true;
        }
    }

    function writeStoredState(value) {
        try {
            window.localStorage.setItem(storageKey, String(value));
        } catch (error) {
            // The control still works when local storage is unavailable.
        }
    }

    function ensurePanel() {
        var content = document.getElementById("content");

        if (panel && panel.parentNode) {
            return true;
        }

        if (!content) {
            return false;
        }

        panel = document.createElement("section");
        panel.id = "readme-panel";
        panel.className = "hidden";
        panel.setAttribute("aria-live", "polite");
        content.appendChild(panel);
        return true;
    }

    function setControlState() {
        if (!control) {
            return;
        }

        control.classList.toggle("active", enabled);
        control.setAttribute("aria-pressed", String(enabled));
        control.setAttribute("title", enabled ? "Hide README" : "Show README");
    }

    function setEnabled(value, remember) {
        enabled = Boolean(value);
        setControlState();

        if (remember) {
            writeStoredState(enabled);
        }

        currentHref = null;
        requestToken += 1;

        if (!enabled && panel) {
            panel.classList.add("hidden");
            panel.classList.remove("loading");
            panel.innerHTML = "";
        }

        scheduleRefresh();
    }

    function handleControlKeydown(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setEnabled(!enabled, true);
        }
    }

    function ensureControl() {
        var sidebar = document.getElementById("sidebar");
        var treeControl = document.getElementById("view-tree");
        var anchorBlock = treeControl && treeControl.closest(".block");

        if (control && control.parentNode) {
            return true;
        }

        if (!sidebar || !anchorBlock) {
            return false;
        }

        var block = document.createElement("div");
        var heading = document.createElement("h1");
        var icon = document.createElement("img");

        block.id = "readme-control";
        block.className = "block";
        heading.textContent = "Readme";

        control = document.createElement("div");
        control.id = "view-readme";
        control.className = "button";
        control.setAttribute("role", "button");
        control.setAttribute("tabindex", "0");
        control.addEventListener("click", function () {
            setEnabled(!enabled, true);
        });
        control.addEventListener("keydown", handleControlKeydown);

        icon.src = iconUrl.href;
        icon.alt = "view-readme";
        control.appendChild(icon);
        block.appendChild(heading);
        block.appendChild(control);
        anchorBlock.parentNode.insertBefore(block, anchorBlock.nextSibling);

        setControlState();
        return true;
    }

    function findReadmeHref() {
        var items = document.querySelectorAll("#items .item");

        for (var index = 0; index < items.length; index += 1) {
            var label = items[index].querySelector(".label");
            var link = items[index].querySelector("a");

            if (label && link && label.textContent.trim().toLowerCase() === "readme.md") {
                return link.href;
            }
        }

        return null;
    }

    function showLoading() {
        panel.classList.remove("hidden");
        panel.classList.add("loading");
        panel.textContent = "Loading README\u2026";
    }

    function hidePanel() {
        panel.classList.add("hidden");
        panel.classList.remove("loading");
        panel.innerHTML = "";
    }

    function renderMarkdown(markdown, href, token) {
        if (token !== requestToken || href !== currentHref || !enabled) {
            return;
        }

        try {
            panel.innerHTML = window.marked(markdown);
            panel.classList.remove("loading", "hidden");
        } catch (error) {
            hidePanel();
        }
    }

    function requestReadme(href) {
        var token = requestToken;
        var request = new XMLHttpRequest();

        showLoading();
        request.open("GET", href, true);
        request.onreadystatechange = function () {
            if (request.readyState !== XMLHttpRequest.DONE || token !== requestToken) {
                return;
            }

            if (request.status >= 200 && request.status < 300) {
                renderMarkdown(request.responseText || "", href, token);
            } else {
                hidePanel();
            }
        };
        request.send();
    }

    function refresh() {
        refreshTimer = null;

        if (!ensureControl() || !ensurePanel() || !enabled || typeof window.marked !== "function") {
            return;
        }

        var href = findReadmeHref();

        if (!href) {
            if (currentHref !== null || !panel.classList.contains("hidden")) {
                currentHref = null;
                requestToken += 1;
                hidePanel();
            }
            return;
        }

        if (href === currentHref) {
            return;
        }

        currentHref = href;
        requestToken += 1;
        requestReadme(href);
    }

    function scheduleRefresh() {
        if (refreshTimer === null) {
            refreshTimer = window.setTimeout(refresh, 0);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        enabled = readStoredState();

        var observer = new MutationObserver(scheduleRefresh);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        scheduleRefresh();
    });

    window.addEventListener("popstate", scheduleRefresh);
}());
