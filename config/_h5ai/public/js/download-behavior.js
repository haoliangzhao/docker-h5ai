(function () {
    "use strict";

    function selectedFile() {
        var selected = document.querySelectorAll("#items .item.selected");
        if (selected.length !== 1) {
            return null;
        }

        var element = selected[0];
        var item = element._item;
        var isFolder = item && typeof item.isFolder === "function"
            ? item.isFolder()
            : element.classList.contains("folder");

        if (isFolder) {
            return null;
        }

        var link = element.querySelector("a");
        var href = item && item.absHref
            ? item.absHref
            : link && link.href;

        if (!href) {
            return null;
        }

        return {
            href: href,
            name: item && item.label
                ? item.label
                : link && link.getAttribute("download") || ""
        };
    }

    function downloadOriginal(file) {
        var link = document.createElement("a");
        link.href = file.href;
        link.download = file.name;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();

        window.setTimeout(function () {
            link.remove();
        }, 0);
    }

    document.addEventListener("click", function (event) {
        var target = event.target;
        var downloadButton = target instanceof Element
            ? target.closest("#download")
            : null;

        if (!downloadButton) {
            return;
        }

        var file = selectedFile();
        if (!file) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        downloadOriginal(file);
    }, true);
})();
