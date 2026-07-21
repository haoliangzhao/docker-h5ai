FROM nginx:1.27-alpine3.19
LABEL maintainer="Deokgyu Yang <secugyu@gmail.com>" \
      description="Lightweight h5ai 0.30.0 container with Nginx 1.27 & PHP 8.2 based on Alpine Linux."

RUN apk update
RUN apk add --no-cache \
    bash bash-completion supervisor tzdata shadow \
    php82 php82-fpm php82-session php82-json php82-xml php82-mbstring php82-exif \
    php82-intl php82-gd php82-pecl-imagick php82-zip php82-opcache \
    ffmpeg imagemagick imagemagick-heic zip apache2-utils patch

# Alpine 3.19 ships libheif 1.17.6, which cannot decode HEIC images created by
# iOS 18. Build a newer, security-patched decoder while keeping the existing
# Nginx and PHP runtime unchanged.
ARG ALPINE_MIRROR=https://dl-cdn.alpinelinux.org/alpine
ARG LIBHEIF_VERSION=1.19.8
ARG LIBHEIF_SHA256=0d67481c2b3d855b27b162e21b39152100346098f75cb5da31db4003d9077680
RUN sed -i "s#https://dl-cdn.alpinelinux.org/alpine#${ALPINE_MIRROR}#g" /etc/apk/repositories \
    && apk add --no-cache --virtual .libheif-build-deps \
        cmake g++ libde265-dev ninja pkgconf \
    && wget -O /tmp/libheif.tar.gz \
        "https://codeload.github.com/strukturag/libheif/tar.gz/refs/tags/v${LIBHEIF_VERSION}" \
    && echo "${LIBHEIF_SHA256}  /tmp/libheif.tar.gz" | sha256sum -c - \
    && mkdir /tmp/libheif-source \
    && tar -xzf /tmp/libheif.tar.gz -C /tmp/libheif-source --strip-components=1 \
    && cmake -S /tmp/libheif-source -B /tmp/libheif-build -G Ninja \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_INSTALL_PREFIX=/usr \
        -DCMAKE_INSTALL_LIBDIR=lib \
        -DWITH_LIBDE265=ON \
        -DWITH_LIBDE265_PLUGIN=OFF \
        -DWITH_X265=OFF \
        -DWITH_AOM_DECODER=OFF \
        -DWITH_AOM_ENCODER=OFF \
        -DWITH_OpenH264_DECODER=OFF \
        -DWITH_DAV1D=OFF \
        -DWITH_SvtEnc=OFF \
        -DWITH_RAV1E=OFF \
        -DWITH_EXAMPLES=OFF \
        -DWITH_GDK_PIXBUF=OFF \
        -DWITH_LIBSHARPYUV=OFF \
        -DBUILD_TESTING=OFF \
        -DENABLE_PLUGIN_LOADING=OFF \
    && cmake --build /tmp/libheif-build --parallel \
    && cmake --install /tmp/libheif-build \
    && rm -rf /tmp/libheif.tar.gz /tmp/libheif-source /tmp/libheif-build \
    && apk del .libheif-build-deps

# Environments
ENV PUID=911
ENV PGID=911
ENV TZ='Asia/Seoul'
ENV HTPASSWD='false'
ENV HTPASSWD_USER='guest'
ENV HTPASSWD_PW=''

# Copy configuration files
COPY config/h5ai.conf /etc/nginx/conf.d/h5ai.conf
COPY config/php_set_timezone.ini /etc/php82/conf.d/00_timezone.ini
COPY config/php_set_jit.ini /etc/php82/conf.d/00_jit.ini
COPY config/php_set_memory_limit.ini /etc/php82/conf.d/00_memlimit.ini
COPY config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy h5ai
COPY config/_h5ai /usr/share/h5ai/_h5ai

# Configure Nginx server
RUN sed --in-place=.bak 's/worker_processes  1/worker_processes  auto/g' /etc/nginx/nginx.conf
RUN mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak

# Add shell script, patch files
ADD config/init.sh /
ADD config/h5ai.conf.htpasswd.patch /
# Set entry point file permission
RUN chmod a+x /init.sh

EXPOSE 80
VOLUME [ "/config", "/h5ai" ]
ENTRYPOINT [ "/init.sh" ]
