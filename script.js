import { animate, inView, stagger } from "https://cdn.jsdelivr.net/npm/motion@11.11.13/+esm";
import { MEDIA_CONFIG } from "./media-config.js";

const mediaOrigins = new Set();

document.documentElement.classList.add("js-ready");

document.addEventListener("DOMContentLoaded", () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    initMedia();
    initHeroCarousel(prefersReducedMotion);
    initHeroGsap(prefersReducedMotion);
    initPortfolioGsap(prefersReducedMotion);
    initServicesMotion(prefersReducedMotion);
    initRisingForceGsap(prefersReducedMotion);
    initPricingMotion(prefersReducedMotion);
    initHowItWorks(prefersReducedMotion);
    initFaq();
    initContactForm();
    initContactMotion(prefersReducedMotion);
    initSectionMotion(prefersReducedMotion);
    initFooterAnimations(prefersReducedMotion);
});

function initMedia() {
    warmMediaOrigins();
    applyImageSources();
    applyBackgroundImages();
    initHeroMedia();
    initFooterMedia();
    applySpecAdEmbeds();
}

function warmMediaOrigins() {
    ensureOriginHint(buildHeroVideoUrl());
    ensureOriginHint(buildFooterVideoUrl());
    ensureOriginHint(buildImageSource("heroPoster"));
    ensureOriginHint("https://www.youtube-nocookie.com");

    Object.keys(MEDIA_CONFIG.images).forEach((key) => {
        ensureOriginHint(buildImageSource(key));
    });
}

function applyImageSources() {
    const images = Array.from(document.querySelectorAll("[data-image-key]"));

    images.forEach((image) => {
        const key = image.dataset.imageKey;
        if (!key) return;

        const source = buildImageSource(key);
        if (!source) return;

        image.src = source;
        image.decoding = "async";

        if (!image.hasAttribute("loading")) {
            image.loading = "lazy";
        }

        ensureOriginHint(source);
    });
}

function applyBackgroundImages() {
    const elements = Array.from(document.querySelectorAll("[data-bg-image-key]"));

    elements.forEach((element) => {
        const key = element.dataset.bgImageKey;
        if (!key) return;

        const source = buildImageSource(key);
        if (!source) return;

        element.style.backgroundImage = `url("${source}")`;
        ensureOriginHint(source);
    });
}

function initHeroMedia() {
    const hero = document.querySelector(".hero");
    if (!hero) return;

    const videoUrl = buildHeroVideoUrl();
    const posterUrl = buildImageSource("heroPoster");
    const currentMedia = hero.querySelector(".hero-media");

    if (posterUrl) {
        hero.style.setProperty("--hero-poster-image", `url("${posterUrl}")`);
    }

    currentMedia?.remove();

    if (!videoUrl) {
        hero.classList.remove("has-hero-video");
        return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "hero-media";
    wrapper.setAttribute("aria-hidden", "true");

    const video = document.createElement("video");
    video.className = "hero-video";
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";

    if (posterUrl) {
        video.poster = posterUrl;
    }

    video.src = videoUrl;
    wrapper.appendChild(video);
    hero.prepend(wrapper);
    hero.classList.add("has-hero-video");

    ensureOriginHint(videoUrl);
    ensureOriginHint(posterUrl);
}

function initFooterMedia() {
    const video = document.querySelector('[data-video-key="footerShowcase"]');
    if (!video) return;

    const videoUrl = buildFooterVideoUrl();
    if (!videoUrl) {
        video.removeAttribute("src");
        return;
    }

    const loadAndPlay = () => {
        if (video.dataset.loaded === "true") return;

        video.dataset.loaded = "true";
        video.src = videoUrl;
        ensureOriginHint(videoUrl);

        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {
                // Ignore autoplay rejections for decorative media.
            });
        }
    };

    if (!("IntersectionObserver" in window)) {
        loadAndPlay();
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            loadAndPlay();
            observer.unobserve(entry.target);
        });
    }, { rootMargin: "200px 0px" });

    observer.observe(video);
}

function applySpecAdEmbeds() {
    const wrappers = Array.from(document.querySelectorAll("[data-spec-key]"));

    wrappers.forEach((wrapper) => {
        const key = wrapper.dataset.specKey;
        if (!key) return;

        const config = MEDIA_CONFIG.specAds[key];
        const embedUrl = buildYouTubeEmbedUrl(config?.youtubeId);

        if (!embedUrl) {
            return;
        }

        const currentIframe = wrapper.querySelector("iframe");
        if (currentIframe) {
            currentIframe.src = embedUrl;
            return;
        }

        wrapper.querySelector("img")?.remove();

        const iframe = document.createElement("iframe");
        iframe.src = embedUrl;
        iframe.title = config?.title || "Spec ad video";
        iframe.loading = "lazy";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        iframe.allowFullscreen = true;

        wrapper.classList.add("is-video");
        wrapper.appendChild(iframe);
        ensureOriginHint(embedUrl);
    });
}

function buildImageSource(key) {
    const entry = MEDIA_CONFIG.images[key];
    if (!entry) return "";

    if (entry.url) {
        return entry.url;
    }

    if (entry.path) {
        return buildImageKitUrl(entry.path);
    }

    return entry.fallbackUrl || "";
}

function buildImageKitUrl(path) {
    if (!path) return "";
    if (isHttpUrl(path)) return path;

    const endpoint = (MEDIA_CONFIG.imagekit.urlEndpoint || "").replace(/\/$/, "");
    if (!endpoint) return "";

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const transformation = (MEDIA_CONFIG.imagekit.transformation || "").trim();

    if (!transformation) {
        return `${endpoint}${normalizedPath}`;
    }

    const separator = normalizedPath.includes("?") ? "&" : "?";
    return `${endpoint}${normalizedPath}${separator}${transformation}`;
}

function buildHeroVideoUrl() {
    const heroVideo = MEDIA_CONFIG.cloudinary?.heroVideo;
    if (!heroVideo) return "";

    if (heroVideo.url) {
        return heroVideo.url;
    }

    const cloudName = MEDIA_CONFIG.cloudinary?.cloudName?.trim();
    const publicId = heroVideo.publicId?.trim();
    if (!cloudName || !publicId) return "";

    const transformation = heroVideo.transformation?.trim();
    const parts = [
        "https://res.cloudinary.com",
        cloudName,
        "video",
        "upload"
    ];

    if (transformation) {
        parts.push(transformation);
    }

    parts.push(publicId.replace(/^\/+/, ""));

    return parts.join("/");
}

function buildFooterVideoUrl() {
    const footerVideo = MEDIA_CONFIG.videos?.footerShowcase;
    if (!footerVideo) return "";

    return footerVideo.url?.trim() || "";
}

function buildYouTubeEmbedUrl(value) {
    const youtubeId = extractYouTubeId(value);
    if (!youtubeId) return "";

    return `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`;
}

function extractYouTubeId(value) {
    if (!value) return "";

    const trimmedValue = value.trim();
    if (!trimmedValue) return "";

    if (!isHttpUrl(trimmedValue) && !trimmedValue.includes("/")) {
        return trimmedValue;
    }

    try {
        const parsedUrl = new URL(trimmedValue);

        if (parsedUrl.hostname.includes("youtu.be")) {
            return parsedUrl.pathname.replace(/\//g, "");
        }

        if (parsedUrl.searchParams.has("v")) {
            return parsedUrl.searchParams.get("v") || "";
        }

        const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
        const embedIndex = pathParts.findIndex((part) => part === "embed" || part === "shorts");

        if (embedIndex >= 0 && pathParts[embedIndex + 1]) {
            return pathParts[embedIndex + 1];
        }
    } catch (error) {
        return "";
    }

    return "";
}

function ensureOriginHint(url) {
    if (!url) return;

    try {
        const origin = new URL(url).origin;
        if (mediaOrigins.has(origin)) return;

        mediaOrigins.add(origin);

        const preconnect = document.createElement("link");
        preconnect.rel = "preconnect";
        preconnect.href = origin;
        preconnect.crossOrigin = "anonymous";
        document.head.appendChild(preconnect);

        const dnsPrefetch = document.createElement("link");
        dnsPrefetch.rel = "dns-prefetch";
        dnsPrefetch.href = origin;
        document.head.appendChild(dnsPrefetch);
    } catch (error) {
        // Ignore invalid or relative URLs.
    }
}

function isHttpUrl(value) {
    return /^https?:\/\//i.test(value);
}

function animateCounter(element, targetValue, duration) {
    let startTimestamp = null;

    const easeOutExpo = (value) => (
        value === 1 ? 1 : 1 - Math.pow(2, -10 * value)
    );

    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;

        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = easeOutExpo(progress);
        const currentValue = Math.floor(easeProgress * targetValue);

        element.innerText = `$${currentValue}`;

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.innerText = `$${targetValue}`;
        }
    };

    window.requestAnimationFrame(step);
}

function initHeroCarousel(prefersReducedMotion) {
    const track = document.getElementById("carouselTrack");
    if (!track) return;

    const originalItems = Array.from(track.children);
    if (!originalItems.length) return;

    if (prefersReducedMotion) {
        return;
    }

    for (let i = 0; i < 3; i += 1) {
        originalItems.forEach((item) => {
            track.appendChild(item.cloneNode(true));
        });
    }

    let currentX = 0;
    let wasMobile = window.innerWidth < 768;

    function getCarouselMetrics() {
        const firstItem = originalItems[0];
        const gap = parseInt(window.getComputedStyle(track).gap, 10) || 15;
        return firstItem.offsetWidth ? originalItems.length * (firstItem.offsetWidth + gap) : 0;
    }

    function animateCarousel() {
        const totalWidth = getCarouselMetrics();
        const isMobile = window.innerWidth < 768;
        const speed = isMobile ? 0.85 : 1.2;

        if (!totalWidth) {
            requestAnimationFrame(animateCarousel);
            return;
        }

        currentX -= speed;

        if (Math.abs(currentX) >= totalWidth) {
            currentX += totalWidth;
        }

        track.style.transform = `translate3d(${currentX}px, 0, 0)`;

        if (isMobile) {
            if (!wasMobile) {
                Array.from(track.children).forEach((thumb) => {
                    thumb.style.opacity = "1";
                    thumb.style.transform = "scale(1)";
                });
            }
            wasMobile = true;
            requestAnimationFrame(animateCarousel);
            return;
        }

        wasMobile = false;

        Array.from(track.children).forEach((thumb) => {
            if (isMobile) {
                thumb.style.opacity = "1";
                thumb.style.transform = "scale(1)";
                return;
            }

            const rect = thumb.getBoundingClientRect();
            const screenCenter = window.innerWidth / 2;
            const vanishStart = screenCenter + 100;
            const vanishEnd = screenCenter;
            const thumbLeftEdge = rect.left;

            if (thumbLeftEdge > vanishStart) {
                thumb.style.opacity = "1";
                thumb.style.transform = "scale(1)";
            } else if (thumbLeftEdge > vanishEnd) {
                const totalFadeDistance = vanishStart - vanishEnd;
                const progress = (vanishStart - thumbLeftEdge) / totalFadeDistance;
                thumb.style.opacity = (1 - progress).toFixed(2);
                thumb.style.transform = `scale(${1 - (progress * 0.15)})`;
            } else {
                thumb.style.opacity = "0";
            }
        });

        requestAnimationFrame(animateCarousel);
    }

    animateCarousel();
}

function initHeroGsap(prefersReducedMotion) {
    const gsapInstance = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const hero = document.querySelector(".hero");

    if (!gsapInstance || !hero) return;

    if (ScrollTrigger) {
        gsapInstance.registerPlugin(ScrollTrigger);
    }

    if (prefersReducedMotion) {
        return;
    }

    const headerElements = [
        document.querySelector(".logo-wrapper"),
        document.querySelector(".logo-tagline")
    ].filter(Boolean);
    const headline = document.querySelector(".main-content h1");
    const description = document.querySelector(".description");
    const button = document.querySelector(".btn-outline");
    const thumbnails = Array.from(document.querySelectorAll(".carousel-track .thumbnail")).slice(0, 4);
    const scrollIndicator = document.querySelector(".scroll-indicator");

    gsapInstance.set(headerElements, { opacity: 0, y: 20, filter: "blur(16px)" });
    gsapInstance.set([headline, description, button].filter(Boolean), { opacity: 0, y: 20, filter: "blur(18px)" });
    gsapInstance.set(thumbnails, { opacity: 0, y: 32 });

    if (scrollIndicator) {
        gsapInstance.set(scrollIndicator, { opacity: 0, y: 18 });
    }

    const intro = gsapInstance.timeline({
        defaults: {
            ease: "power3.out"
        }
    });

    intro
        .to(headerElements, {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.05,
            stagger: 0.06
        })
        .to(headline, {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.25
        }, "-=0.7")
        .to(description, {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.05
        }, "-=0.82")
        .to(button, {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.95
        }, "-=0.78")
        .to(thumbnails, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            stagger: 0.08
        }, "-=0.52");

    if (scrollIndicator) {
        intro.to(scrollIndicator, {
            opacity: 1,
            y: 0,
            duration: 0.8
        }, "-=0.55");
    }

    if (ScrollTrigger && window.innerWidth >= 769) {
        gsapInstance.to(hero, {
            "--hero-bg-scale": 1.12,
            "--hero-bg-y": "64px",
            "--hero-header-y": "20px",
            "--hero-content-y": "78px",
            "--hero-content-scale": 0.965,
            "--hero-content-opacity": 0.42,
            "--hero-carousel-y": "-28px",
            "--hero-carousel-opacity": 0.82,
            "--hero-scroll-y": "16px",
            "--hero-scroll-opacity": 0.18,
            ease: "none",
            scrollTrigger: {
                trigger: hero,
                start: "top top",
                end: "bottom top",
                scrub: 1
            }
        });
    }
}

function initPortfolioGsap(prefersReducedMotion) {
    const gsapInstance = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const cards = Array.from(document.querySelectorAll(".portfolio-item"));

    if (!gsapInstance || !cards.length) return;

    if (ScrollTrigger) {
        gsapInstance.registerPlugin(ScrollTrigger);
    }

    if (prefersReducedMotion) {
        return;
    }

    cards.forEach((card) => {
        const media = card.querySelector(".image-wrapper");
        const text = card.querySelector(".portfolio-text");

        if (media) {
            gsapInstance.fromTo(media, {
                opacity: 0,
                y: 42
            }, {
                opacity: 1,
                y: 0,
                duration: 0.95,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: card,
                    start: "top 84%",
                    once: true
                }
            });
        }

        if (text) {
            gsapInstance.fromTo(text, {
                opacity: 0,
                y: 22
            }, {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: card,
                    start: "top 80%",
                    once: true
                }
            });
        }
    });
}

function initServicesMotion(prefersReducedMotion) {
    const section = document.querySelector(".services-section");
    if (!section) return;

    const targets = Array.from(section.querySelectorAll(".anim-target"));
    if (!targets.length) return;

    if (prefersReducedMotion) {
        targets.forEach((target) => {
            target.style.opacity = "1";
            target.style.transform = "translateY(0)";
        });
        return;
    }

    inView(section, () => {
        if (section.dataset.motionPlayed === "true") return;

        section.dataset.motionPlayed = "true";

        animate(
            targets,
            {
                opacity: [0, 1],
                y: [40, 0]
            },
            {
                duration: 1.1,
                delay: stagger(0.15),
                easing: [0.16, 1, 0.3, 1]
            }
        );
    }, { margin: "-20% 0px" });
}

function initPricingMotion(prefersReducedMotion) {
    const pricingSection = document.querySelector(".pricing-section");
    if (!pricingSection) return;

    const headerTargets = Array.from(pricingSection.querySelectorAll(".anim-element"));
    const cardTargets = Array.from(pricingSection.querySelectorAll(".anim-card"));
    const counters = Array.from(pricingSection.querySelectorAll(".count-up[data-target]"));

    if (prefersReducedMotion) {
        [...headerTargets, ...cardTargets].forEach((target) => {
            target.style.opacity = "1";
            target.style.transform = "translateY(0)";
        });

        counters.forEach((counter) => {
            const target = parseInt(counter.getAttribute("data-target") || "0", 10);
            counter.innerText = `$${target}`;
        });
        return;
    }

    inView(pricingSection, () => {
        if (pricingSection.dataset.motionPlayed === "true") return;

        pricingSection.dataset.motionPlayed = "true";

        animate(
            headerTargets,
            {
                opacity: [0, 1],
                y: [30, 0]
            },
            {
                duration: 0.8,
                easing: [0.16, 1, 0.3, 1]
            }
        );

        animate(
            cardTargets,
            {
                opacity: [0, 1],
                y: [60, 0]
            },
            {
                duration: 1.2,
                delay: stagger(0.15, { startDelay: 0.2 }),
                easing: [0.16, 1, 0.3, 1]
            }
        );

        window.setTimeout(() => {
            counters.forEach((counter) => {
                const target = parseInt(counter.getAttribute("data-target") || "0", 10);
                animateCounter(counter, target, 1500);
            });
        }, 500);
    }, { margin: "-15% 0px" });
}

function initRisingForceGsap(prefersReducedMotion) {
    const gsapInstance = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const section = document.getElementById("intro-rising");

    if (!gsapInstance || !section) return;

    if (ScrollTrigger) {
        gsapInstance.registerPlugin(ScrollTrigger);
    }

    const label = section.querySelector(".anim-label");
    const headingOne = section.querySelector(".anim-heading-1");
    const headingTwo = section.querySelector(".anim-heading-2");
    const subtext = section.querySelector(".anim-subtext");
    const punchline = section.querySelector(".anim-punchline");
    const photoFrame = section.querySelector(".anim-photo-frame");
    const linkedIn = section.querySelector(".anim-li");
    const targets = [label, headingOne, headingTwo, subtext, punchline, photoFrame, linkedIn].filter(Boolean);

    if (prefersReducedMotion) {
        targets.forEach((target) => {
            target.style.opacity = "1";
            target.style.transform = "none";
            target.style.filter = "none";
        });
        return;
    }

    if (label) gsapInstance.set(label, { opacity: 0 });
    gsapInstance.set([headingOne, headingTwo].filter(Boolean), { opacity: 0, y: 30, filter: "blur(12px)" });
    if (subtext) gsapInstance.set(subtext, { opacity: 0, y: 24 });
    if (photoFrame) gsapInstance.set(photoFrame, { opacity: 0, scale: 0.98, y: 30 });
    if (punchline) gsapInstance.set(punchline, { opacity: 0, y: 24 });
    if (linkedIn) gsapInstance.set(linkedIn, { opacity: 0, scale: 0.9 });

    const timeline = gsapInstance.timeline({
        scrollTrigger: {
            trigger: "#intro-rising",
            start: "top 80%",
            once: true
        }
    });

    timeline
        .to(label, { opacity: 1, duration: 0.8 })
        .fromTo([headingOne, headingTwo].filter(Boolean),
            { opacity: 0, y: 30, filter: "blur(12px)" },
            { opacity: 1, y: 0, filter: "blur(0px)", duration: 1, stagger: 0.2, ease: "power4.out" },
            "-=0.4"
        )
        .to(subtext, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.6")
        .fromTo(photoFrame,
            { opacity: 0, scale: 0.98, y: 30 },
            { opacity: 1, scale: 1, y: 0, duration: 1, ease: "expo.out" },
            "-=0.8"
        )
        .to(punchline, { opacity: 1, y: 0, duration: 0.8 }, "-=0.5")
        .to(linkedIn, { opacity: 1, scale: 1, duration: 0.5 }, "-=0.3");
}

function initHowItWorks(prefersReducedMotion) {
    const hiwCards = document.querySelectorAll(".hiw-card");
    const hiwSection = document.querySelector(".hiw-section");

    if (!hiwCards.length && !hiwSection) return;

    hiwCards.forEach((card) => {
        const makeActive = function makeActive() {
            if (this.classList.contains("active")) return;
            hiwCards.forEach((item) => item.classList.remove("active"));
            this.classList.add("active");
        };

        card.addEventListener("mouseenter", makeActive);
        card.addEventListener("click", makeActive);
    });

    if (!hiwSection) return;

    const targets = Array.from(hiwSection.querySelectorAll(".anim-element"));

    if (prefersReducedMotion) {
        targets.forEach((target) => {
            target.style.opacity = "1";
            target.style.transform = "translateY(0)";
        });
        return;
    }

    inView(hiwSection, () => {
        if (hiwSection.dataset.motionPlayed === "true") return;

        hiwSection.dataset.motionPlayed = "true";

        animate(
            ".hiw-section .anim-element",
            { opacity: [0, 1], y: [40, 0] },
            {
                duration: 1.2,
                delay: stagger(0.15),
                easing: [0.16, 1, 0.3, 1]
            }
        );
    }, { margin: "-20% 0px" });
}

function initFaq() {
    const faqItems = document.querySelectorAll(".faq-item");
    if (!faqItems.length) return;

    faqItems.forEach((item) => {
        const button = item.querySelector(".faq-question");
        if (!button) return;

        button.addEventListener("click", () => {
            const isActive = item.classList.contains("active");
            faqItems.forEach((otherItem) => otherItem.classList.remove("active"));

            if (!isActive) {
                item.classList.add("active");
            }
        });
    });
}

function initContactForm() {
    const contactForm = document.getElementById("premium-contact-form");
    if (!contactForm) return;

    contactForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitBtn = document.getElementById("submitBtn");
        const btnText = document.getElementById("btn-text");

        if (!submitBtn || !btnText) return;

        btnText.innerText = "Securing your spot...";
        submitBtn.classList.add("loading");

        const formData = {
            name: document.getElementById("name")?.value ?? "",
            email: document.getElementById("email")?.value ?? "",
            website: document.getElementById("website")?.value.trim() ?? "",
            message: document.getElementById("message")?.value ?? ""
        };

        const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwoE7uZM0IRr8XSKwNaUKrgiA46-S_qAxcymN128xU0uiVB3TfpJdeK55J-H5jZcB-X/exec";
        const CALENDLY_LINK = "https://calendly.com/your-custom-link";

        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                body: JSON.stringify(formData)
            });

            window.setTimeout(() => {
                window.location.href = CALENDLY_LINK;
            }, 800);
        } catch (error) {
            console.error("Submission Error:", error);
            btnText.innerText = "Error. Please try again.";
            submitBtn.classList.remove("loading");
        }
    });
}

function initContactMotion(prefersReducedMotion) {
    const contactSection = document.querySelector(".contact-section");
    if (!contactSection) return;

    const targets = Array.from(contactSection.querySelectorAll(".anim-element"));

    if (prefersReducedMotion) {
        targets.forEach((target) => {
            target.style.opacity = "1";
            target.style.transform = "translateY(0)";
            target.style.filter = "blur(0px)";
        });
        return;
    }

    inView(contactSection, () => {
        if (contactSection.dataset.motionPlayed === "true") return;

        contactSection.dataset.motionPlayed = "true";

        animate(
            ".contact-section .anim-element",
            {
                opacity: [0, 1],
                y: [40, 0],
                filter: ["blur(15px)", "blur(0px)"]
            },
            {
                duration: 1.2,
                delay: stagger(0.2),
                easing: [0.16, 1, 0.3, 1]
            }
        );
    }, { margin: "-20% 0px" });
}

function initSectionMotion(prefersReducedMotion) {
    const sectionSelectors = [".faq-section"];

    sectionSelectors.forEach((selector) => {
        const section = document.querySelector(selector);
        if (!section) return;

        const targets = collectElements(section, ".anim-element");
        if (!targets.length) return;

        if (prefersReducedMotion) {
            targets.forEach((target) => {
                target.style.opacity = "1";
                target.style.transform = "translateY(0)";
            });
            return;
        }

        inView(section, () => {
            if (section.dataset.motionPlayed === "true") return;

            section.dataset.motionPlayed = "true";

            animate(
                targets,
                {
                    opacity: [0, 1],
                    y: [40, 0]
                },
                {
                    duration: 1.2,
                    delay: stagger(0.15),
                    easing: [0.16, 1, 0.3, 1]
                }
            );
        }, { margin: "-15% 0px" });
    });
}

function initFooterAnimations(prefersReducedMotion) {
    const footer = document.getElementById("animated-footer");
    if (!footer) return;

    const chars = document.querySelectorAll(".char");
    const lines = document.querySelectorAll(".line");
    const reveals = document.querySelectorAll(".reveal-element");

    if (prefersReducedMotion) {
        footer.classList.add("is-visible");
        chars.forEach((char) => { char.style.transform = "translateY(0)"; });
        lines.forEach((line) => { line.style.transform = "translateY(0)"; });
        reveals.forEach((element) => {
            element.style.opacity = "1";
            element.style.transform = "translateY(0)";
        });
        return;
    }

    chars.forEach((char, index) => {
        char.style.transitionDelay = `${index * 0.05}s`;
    });

    lines.forEach((line, index) => {
        line.style.transitionDelay = `${0.4 + (index * 0.15)}s`;
    });

    reveals.forEach((element, index) => {
        element.style.transitionDelay = `${index * 0.15}s`;
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                footer.classList.add("is-visible");
                observer.unobserve(footer);
            }
        });
    }, { threshold: 0.2 });

    observer.observe(footer);
}

function collectElements(root, selector) {
    const elements = [];

    if (root.matches(selector)) {
        elements.push(root);
    }

    elements.push(...root.querySelectorAll(selector));

    return elements;
}
