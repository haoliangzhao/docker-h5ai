(function () {
    "use strict";

    var scriptUrl = document.currentScript && document.currentScript.src;
    var endpointUrl = new URL("../heif-preview.php", scriptUrl || window.location.href);
    var nativeSetAttribute = Element.prototype.setAttribute;
    var nativeRemoveAttribute = Element.prototype.removeAttribute;
    var metadataCache = {};
    var activeMetadata = null;
    var activeSourcePath = null;

    function toUrl(value) {
        try {
            return new URL(String(value), window.location.href);
        } catch (error) {
            return null;
        }
    }

    function isHeifUrl(url) {
        return url && /\.(?:heic|heif)$/i.test(url.pathname);
    }

    function downloadName(url) {
        var segments = url.pathname.split("/");
        var name = segments[segments.length - 1] || "image.heic";

        try {
            return decodeURIComponent(name);
        } catch (error) {
            return name;
        }
    }

    function loadMetadata(url) {
        var path = url.pathname;

        if (!metadataCache[path]) {
            metadataCache[path] = new Promise(function (resolve) {
                var requestUrl = new URL(endpointUrl.href);
                var request = new XMLHttpRequest();

                requestUrl.searchParams.set("href", path);
                requestUrl.searchParams.set("metadata", "1");
                request.open("GET", requestUrl.href, true);
                request.onreadystatechange = function () {
                    if (request.readyState !== XMLHttpRequest.DONE) {
                        return;
                    }

                    try {
                        var metadata = JSON.parse(request.responseText);
                        resolve(metadata.width > 0 && metadata.height > 0 ? metadata : null);
                    } catch (error) {
                        resolve(null);
                    }
                };
                request.send();
            });
        }

        return metadataCache[path];
    }

    function applyOriginalResolution() {
        if (!activeMetadata) {
            return;
        }

        var labels = document.querySelectorAll("#pv-buttons .bar-left");
        var resolution = activeMetadata.width + "x" + activeMetadata.height;

        if (labels.length > 1 && labels[1].textContent !== resolution) {
            labels[1].textContent = resolution;
        }
    }

    function useOriginalResolution(url) {
        var sourcePath = url.pathname;
        activeSourcePath = sourcePath;
        activeMetadata = null;

        loadMetadata(url).then(function (metadata) {
            if (activeSourcePath === sourcePath) {
                activeMetadata = metadata;
                window.setTimeout(applyOriginalResolution, 0);
            }
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (typeof MutationObserver !== "undefined") {
            var observer = new MutationObserver(applyOriginalResolution);
            observer.observe(document.body, {childList: true, characterData: true, subtree: true});
        }
    });

    Element.prototype.setAttribute = function (name, value) {
        var attributeName = String(name).toLowerCase();
        var sourceUrl;

        if (attributeName === "src" && this.id === "pv-content-img") {
            sourceUrl = toUrl(value);
            if (isHeifUrl(sourceUrl)) {
                useOriginalResolution(sourceUrl);
                var requestUrl = new URL(endpointUrl.href);
                requestUrl.searchParams.set("href", sourceUrl.pathname);
                value = requestUrl.href;
            } else {
                activeSourcePath = null;
                activeMetadata = null;
            }
        }

        if (attributeName === "href" && this.matches && this.matches("#pv-bar-raw a")) {
            sourceUrl = toUrl(value);
            if (isHeifUrl(sourceUrl)) {
                nativeSetAttribute.call(this, "download", downloadName(sourceUrl));
            } else {
                nativeRemoveAttribute.call(this, "download");
            }
        }

        return nativeSetAttribute.call(this, name, value);
    };
}());
