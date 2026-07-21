<?php

declare(strict_types=1);

const HEIF_PREVIEW_QUALITY = 88;
const HEIF_PREVIEW_CACHE_VERSION = 'native-preview-v2';

function fail_preview(int $status, string $message): void {
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    exit($message);
}

$href = $_GET['href'] ?? '';
$url_path = parse_url($href, PHP_URL_PATH);
$decoded_path = is_string($url_path) ? rawurldecode($url_path) : '';
$root_path = realpath('/h5ai');

if ($root_path === false || $decoded_path === '' || strpos($decoded_path, "\0") !== false) {
    fail_preview(400, 'Invalid HEIF preview path.');
}

$source_path = realpath($root_path . '/' . ltrim($decoded_path, '/'));
$root_prefix = $root_path . DIRECTORY_SEPARATOR;

if ($source_path === false || !is_file($source_path) || strpos($source_path, $root_prefix) !== 0) {
    fail_preview(404, 'HEIF source file not found.');
}

$extension = strtolower(pathinfo($source_path, PATHINFO_EXTENSION));
if (!in_array($extension, ['heic', 'heif'], true)) {
    fail_preview(415, 'Unsupported preview format.');
}

if (!class_exists('Imagick')) {
    fail_preview(501, 'HEIF preview support is unavailable.');
}

if (($_GET['metadata'] ?? '') === '1') {
    try {
        $image = new Imagick();
        $image->pingImage($source_path . '[0]');
        $width = $image->getImageWidth();
        $height = $image->getImageHeight();
        $image->clear();
        $image->destroy();

        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: private, max-age=86400');
        echo json_encode(['width' => $width, 'height' => $height]);
        exit;
    } catch (Throwable $error) {
        error_log('HEIF metadata read failed: ' . $error->getMessage());
        fail_preview(415, 'Unable to read HEIF metadata.');
    }
}

$source_mtime = filemtime($source_path) ?: 0;
$source_size = filesize($source_path) ?: 0;
$cache_key = hash('sha256', HEIF_PREVIEW_CACHE_VERSION . '|' . $source_path . '|' . $source_mtime . '|' . $source_size);
$cache_dir = __DIR__ . '/cache/heif-preview';
$cache_path = $cache_dir . '/' . $cache_key . '.jpg';
$etag = '"' . $cache_key . '"';

if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
    http_response_code(304);
    exit;
}

if (!is_file($cache_path)) {
    if (!is_dir($cache_dir) && !mkdir($cache_dir, 0775, true) && !is_dir($cache_dir)) {
        fail_preview(500, 'Unable to create the HEIF preview cache.');
    }

    $temporary_path = $cache_path . '.tmp-' . bin2hex(random_bytes(6));

    try {
        $image = new Imagick();
        $image->readImage($source_path . '[0]');

        if (method_exists($image, 'autoOrientImage')) {
            $image->autoOrientImage();
        }

        $image->setImageBackgroundColor('white');
        $image->setImageAlphaChannel(Imagick::ALPHACHANNEL_REMOVE);
        $image->setImageFormat('jpeg');
        $image->setImageCompressionQuality(HEIF_PREVIEW_QUALITY);
        $image->stripImage();
        $image->writeImage($temporary_path);
        $image->clear();
        $image->destroy();

        if (!rename($temporary_path, $cache_path)) {
            @unlink($temporary_path);
            fail_preview(500, 'Unable to cache the HEIF preview.');
        }

        @chmod($cache_path, 0664);
    } catch (Throwable $error) {
        @unlink($temporary_path);
        error_log('HEIF preview conversion failed: ' . $error->getMessage());
        fail_preview(415, 'Unable to decode the HEIF image.');
    }
}

header('Content-Type: image/jpeg');
header('Content-Length: ' . filesize($cache_path));
header('Cache-Control: private, max-age=86400');
header('ETag: ' . $etag);
readfile($cache_path);
