<?php

class Thumb {
    private static $FFMPEG_CMDV = ['ffmpeg', '-ss', '0:00:10', '-i', '[SRC]', '-an', '-vframes', '1', '[DEST]'];
    private static $AVCONV_CMDV = ['avconv', '-ss', '0:00:10', '-i', '[SRC]', '-an', '-vframes', '1', '[DEST]'];
    private static $CONVERT_CMDV = ['convert', '-density', '200', '-quality', '100', '-strip', '[SRC][0]', '[DEST]'];
    private static $GM_CONVERT_CMDV = ['gm', 'convert', '-density', '200', '-quality', '100', '[SRC][0]', '[DEST]'];
    private static $THUMB_CACHE = 'thumbs';

    private $context;
    private $setup;
    private $thumbs_path;
    private $thumbs_href;

    public function __construct($context) {
        $this->context = $context;
        $this->setup = $context->get_setup();
        $this->thumbs_path = $this->setup->get('CACHE_PUB_PATH') . '/' . Thumb::$THUMB_CACHE;
        $this->thumbs_href = $this->setup->get('CACHE_PUB_HREF') . Thumb::$THUMB_CACHE;

        if (!is_dir($this->thumbs_path)) {
            @mkdir($this->thumbs_path, 0755, true);
        }
    }

    public function thumb($type, $source_href, $width, $height) {
        $source_path = $this->context->to_path($source_href);
        if (!file_exists($source_path) || Util::starts_with($source_path, $this->setup->get('CACHE_PUB_PATH'))) {
            return null;
        }

        $extension = strtolower(pathinfo($source_path, PATHINFO_EXTENSION));
        $contain = $type === 'img' || in_array($extension, ['heic', 'heif'], true);
        $capture_path = $source_path;
        if ($type === 'img') {
            $capture_path = $source_path;
        } elseif ($type === 'mov') {
            if ($this->setup->get('HAS_CMD_AVCONV')) {
                $capture_path = $this->capture(Thumb::$AVCONV_CMDV, $source_path);
            } elseif ($this->setup->get('HAS_CMD_FFMPEG')) {
                $capture_path = $this->capture(Thumb::$FFMPEG_CMDV, $source_path);
            }
        } elseif ($type === 'doc') {
            if ($this->setup->get('HAS_CMD_CONVERT')) {
                $capture_path = $this->capture(Thumb::$CONVERT_CMDV, $source_path);
            } elseif ($this->setup->get('HAS_CMD_GM')) {
                $capture_path = $this->capture(Thumb::$GM_CONVERT_CMDV, $source_path);
            }
        }

        return $this->thumb_href($capture_path, $width, $height, $contain);
    }

    private function thumb_href($source_path, $width, $height, $contain = false) {
        if ($source_path === null || !file_exists($source_path)) {
            return null;
        }

        $mode = $contain ? 'contain-' : '';
        $format = $contain ? 'png' : 'jpg';
        $name = 'thumb-' . $mode . sha1($source_path) . '-' . $width . 'x' . $height . '.' . $format;
        $thumb_path = $this->thumbs_path . '/' . $name;
        $thumb_href = $this->thumbs_href . '/' . $name;

        if (!file_exists($thumb_path) || filemtime($source_path) >= filemtime($thumb_path)) {
            $image = new Image();

            $et = false;
            if ($this->setup->get('HAS_PHP_EXIF') && $this->context->query_option('thumbnails.exif', false) === true && $height != 0) {
                $et = @exif_thumbnail($source_path);
            }
            if($et !== false) {
                file_put_contents($thumb_path, $et);
                $image->set_source($thumb_path);
                $image->normalize_exif_orientation($source_path);
            } else {
                $image->set_source($source_path);
            }

            $image->thumb($width, $height, $contain);
            if ($contain) {
                $image->save_dest_png($thumb_path);
            } else {
                $image->save_dest_jpeg($thumb_path, 80);
            }
        }

        return file_exists($thumb_path) ? $thumb_href : null;
    }

    private function capture($cmdv, $source_path) {
        if (!file_exists($source_path)) {
            return null;
        }

        $capture_path = $this->thumbs_path . '/capture-' . sha1($source_path) . '.jpg';

        if (!file_exists($capture_path) || filemtime($source_path) >= filemtime($capture_path)) {
            foreach ($cmdv as &$arg) {
                $arg = str_replace('[SRC]', $source_path, $arg);
                $arg = str_replace('[DEST]', $capture_path, $arg);
            }

            Util::exec_cmdv($cmdv);
        }

        return file_exists($capture_path) ? $capture_path : null;
    }
}

class Image {
    private $source_file;
    private $source;
    private $width;
    private $height;
    private $type;
    private $dest;

    public function __construct($filename = null) {
        $this->source_file = null;
        $this->source = null;
        $this->width = null;
        $this->height = null;
        $this->type = null;

        $this->dest = null;

        $this->set_source($filename);
    }

    public function __destruct() {
        $this->release_source();
        $this->release_dest();
    }

    public function set_source($filename) {
        $this->release_source();
        $this->release_dest();

        if (is_null($filename)) {
            return;
        }

        $this->source_file = $filename;

        list($this->width, $this->height, $this->type) = @getimagesize($this->source_file);

        if (!$this->width || !$this->height) {
            $this->source_file = null;
            $this->width = null;
            $this->height = null;
            $this->type = null;
            return;
        }

        $this->source = imagecreatefromstring(file_get_contents($this->source_file));
    }

    public function save_dest_jpeg($filename, $quality = 80) {
        if (!is_null($this->dest)) {
            @imagejpeg($this->dest, $filename, $quality);
            @chmod($filename, 0775);
        }
    }

    public function save_dest_png($filename) {
        if (!is_null($this->dest)) {
            @imagepng($this->dest, $filename, 6);
            @chmod($filename, 0775);
        }
    }

    public function release_dest() {
        if (!is_null($this->dest)) {
            @imagedestroy($this->dest);
            $this->dest = null;
        }
    }

    public function release_source() {
        if (!is_null($this->source)) {
            @imagedestroy($this->source);
            $this->source_file = null;
            $this->source = null;
            $this->width = null;
            $this->height = null;
            $this->type = null;
        }
    }

    public function thumb($width, $height, $contain = false) {
        if (is_null($this->source)) {
            return;
        }

        $src_r = 1.0 * $this->width / $this->height;

        if ($contain && $height != 0) {
            $target_width = intval($width);
            $target_height = intval($height);
            $scale = min(1.0 * $target_width / $this->width, 1.0 * $target_height / $this->height);
            $scaled_width = max(1, intval(round($this->width * $scale)));
            $scaled_height = max(1, intval(round($this->height * $scale)));
            $dest_x = intval(($target_width - $scaled_width) / 2);
            $dest_y = intval(($target_height - $scaled_height) / 2);

            $this->dest = imagecreatetruecolor($target_width, $target_height);
            imagealphablending($this->dest, false);
            imagesavealpha($this->dest, true);
            $transparent = imagecolorallocatealpha($this->dest, 0, 0, 0, 127);
            imagefill($this->dest, 0, 0, $transparent);
            imagealphablending($this->dest, true);
            imagecopyresampled(
                $this->dest,
                $this->source,
                $dest_x,
                $dest_y,
                0,
                0,
                $scaled_width,
                $scaled_height,
                $this->width,
                $this->height
            );
            return;
        }

        if ($height == 0) {
            if ($src_r >= 1) {
                $height = 1.0 * $width / $src_r;
            } else {
                $height = $width;
                $width = 1.0 * $height * $src_r;
            }
            if ($width > $this->width) {
                $width = $this->width;
                $height = $this->height;
            }
        }

        $ratio = 1.0 * $width / $height;

        if ($src_r <= $ratio) {
            $src_w = $this->width;
            $src_h = $src_w / $ratio;
            $src_x = 0;
        } else {
            $src_h = $this->height;
            $src_w = $src_h * $ratio;
            $src_x = 0.5 * ($this->width - $src_w);
        }

        $width = intval($width);
        $height = intval($height);
        $src_x = intval($src_x);
        $src_w = intval($src_w);
        $src_h = intval($src_h);

        $this->dest = imagecreatetruecolor($width, $height);
        $icol = imagecolorallocate($this->dest, 255, 255, 255);
        imagefill($this->dest, 0, 0, $icol);
        imagecopyresampled($this->dest, $this->source, 0, 0, $src_x, 0, $width, $height, $src_w, $src_h);
    }

    public function rotate($angle) {
        if (is_null($this->source) || ($angle !== 90 && $angle !== 180 && $angle !== 270)) {
            return;
        }

        $this->source = imagerotate($this->source, $angle, 0);
        if ( $angle === 90 || $angle === 270 ) {
            list($this->width, $this->height) = [$this->height, $this->width];
        }
    }

    public function normalize_exif_orientation($exif_source_file = null) {
        if (is_null($this->source) || !function_exists('exif_read_data')) {
            return;
        }

        if ($exif_source_file === null) {
            $exif_source_file = $this->source_file;
        }

        $exif = exif_read_data($exif_source_file);
        switch (@$exif['Orientation']) {
            case 3:
                $this->rotate(180);
                break;
            case 6:
                $this->rotate(270);
                break;
            case 8:
                $this->rotate(90);
                break;
        }
    }
}
