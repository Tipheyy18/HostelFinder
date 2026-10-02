/**
 * propertyDetail.js
 * Handles fetching and dynamically rendering property details from:
 * {{baseUrl}}/properties/{{propertyId}}?schoolId={{schoolId}}
 */
(() => {
    const API_BASE_URL =
        typeof base_url !== "undefined"
            ? base_url
            : "https://group16-be-capstone-project-ochf.onrender.com";
    const FALLBACK_IMAGE =
        "https://res.cloudinary.com/ospauzp7/image/upload/v1790627411/22404c7a9e7cce6b24a8f09f9f0a8e6f5544e648.png";

    const KNOWN_SCHOOLS = {
        "6abd1e667434ce241906fe2b": "FUTA (Akure)",
        "6abd1e657434ce241906fe28": "LASU (Lagos)",
        "6abd1e667434ce241906fe2a": "OAU (Ile-Ife)",
        "6abd1e657434ce241906fe29": "University of Ibadan (UI)",
        "6abd1e647434ce241906fe26": "UNILAG (Lagos)",
        "6abd1e657434ce241906fe27": "YABATECH (Lagos)",
    };

    const AMENITY_ICONS = {
        water: { icon: "bx-droplet", label: "Water" },
        light: { icon: "bx-bulb", label: "Light" },
        wifi: { icon: "bx-wifi", label: "Wifi" },
        security: { icon: "bx-shield", label: "Security" },
        generator: { icon: "bx-bolt-circle", label: "Generator" },
        cctv: { icon: "bx-video", label: "CCTV" },
        laundry: { icon: "bx-closet", label: "Laundry" },
    };

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatPropertyType(types) {
        if (!types) return "Hostel Space";
        const arr = Array.isArray(types) ? types : [types];
        if (arr.length === 0) return "Hostel Space";
        return arr
            .map((t) => {
                const raw = String(t).trim();
                const map = {
                    self_contain: "Self Contain",
                    single_room: "Single Room",
                    "1_bedroom": "1-Bedroom",
                    "2_bedroom": "2-Bedroom",
                    shared_apartment: "Shared Apartment",
                    flat: "Flat",
                    studio: "Studio",
                };
                if (map[raw.toLowerCase()]) return map[raw.toLowerCase()];
                return raw
                    .split(/[_-]/)
                    .map(
                        (w) =>
                            w.charAt(0).toUpperCase() +
                            w.slice(1).toLowerCase(),
                    )
                    .join(" ");
            })
            .join(", ");
    }

    function formatPrice(price) {
        if (typeof price !== "number" || isNaN(price)) return "₦ --";
        return `₦ ${price.toLocaleString()}/year`;
    }

    function getSchoolName(schoolId) {
        if (!schoolId) return "Campus";
        return KNOWN_SCHOOLS[schoolId] || "Campus Area";
    }

    function renderProperty(prop, extraData = {}) {
        const skeleton = document.getElementById("property-skeleton");
        const content = document.getElementById("property-content");
        const errorEl = document.getElementById("property-error");

        if (skeleton) skeleton.classList.add("hidden");
        if (errorEl) errorEl.classList.add("hidden");
        if (content) content.classList.remove("hidden");

        // Document Title
        document.title = `${prop.title || "Property Details"} | HostelFinder`;

        // 1. Photos
        const mainImg = document.getElementById("main-photo");
        const thumbsGrid = document.getElementById("sub-photos-grid");
        const photos =
            Array.isArray(prop.photos) && prop.photos.length > 0
                ? prop.photos
                      .map((p) => (typeof p === "string" ? p : p.url))
                      .filter(Boolean)
                : prop.coverPhoto
                ? [prop.coverPhoto]
                : [FALLBACK_IMAGE];

        if (mainImg) {
            mainImg.src = photos[0];
            mainImg.alt = prop.title || "Hostel exterior";
            mainImg.onerror = () => {
                mainImg.src = FALLBACK_IMAGE;
            };
        }

        if (thumbsGrid) {
            if (photos.length > 1) {
                const subPhotos = photos.slice(1, 3);
                thumbsGrid.innerHTML = subPhotos
                    .map(
                        (url, index) => `
                    <div class="rounded-2xl overflow-hidden cursor-pointer group bg-purple-50 border border-gray-100 h-44">
                        <img 
                            src="${url}" 
                            alt="Property photo ${index + 2}" 
                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            onerror="this.src='${FALLBACK_IMAGE}'"
                        >
                    </div>
                `,
                    )
                    .join("");

                // Allow clicking thumbnails to swap into the main view
                thumbsGrid.querySelectorAll("img").forEach((thumb) => {
                    thumb.addEventListener("click", () => {
                        const currentMain = mainImg.src;
                        mainImg.src = thumb.src;
                        thumb.src = currentMain;
                    });
                });
                thumbsGrid.classList.remove("hidden");
            } else {
                thumbsGrid.classList.add("hidden");
            }
        }

        // 2. Badges
        const isAvailable =
            (prop.availabilityStatus || "").toLowerCase() === "available";
        const availBadge = document.getElementById("badge-availability");
        if (availBadge) {
            availBadge.textContent = isAvailable ? "Available" : "Unavailable";
            availBadge.className = `${
                isAvailable ? "bg-green-500" : "bg-gray-400"
            } text-[#FFFFFF] text-[10px] font-semibold px-3 py-0.5 rounded-full`;
        }

        const isVerified =
            (prop.verificationStatus || "").toLowerCase() === "verified" ||
            (prop.providerId &&
                (prop.providerId.verificationStatus || "").toLowerCase() ===
                    "verified");
        const verifiedBadge = document.getElementById("badge-verified");
        if (verifiedBadge) {
            verifiedBadge.style.display = isVerified ? "flex" : "none";
        }

        // 3. Name & Location
        const titleEl = document.getElementById("prop-title");
        if (titleEl) titleEl.textContent = prop.title || "Hostel Space";

        const addressEl = document.getElementById("prop-address");
        if (addressEl) {
            addressEl.innerHTML = `
                <i class="bx bx-map text-[13px] text-[#7956C8] shrink-0"></i>
                <span>${escapeHtml(prop.address || "Campus area")}</span>
            `;
        }

        const proximityEl = document.getElementById("prop-proximity");
        const distKm = extraData.distanceKm ?? prop.distanceFromSchoolKm;
        const driveMins = extraData.drivingTimeMinutes ?? prop.drivingTimeMinutes;
        const schoolName = getSchoolName(prop.schoolId);

        if (proximityEl) {
            if (driveMins != null && driveMins > 0) {
                proximityEl.textContent = `~${driveMins} mins away from ${schoolName}`;
            } else if (distKm != null && distKm > 0) {
                proximityEl.textContent = `~${distKm} km away from ${schoolName}`;
            } else {
                proximityEl.textContent = `Conveniently near ${schoolName}`;
            }
        }

        // 4. Rating & Price
        const priceEl = document.getElementById("prop-price");
        if (priceEl) priceEl.textContent = formatPrice(prop.price);

        // 5. Property Type
        const typeEl = document.getElementById("prop-type");
        if (typeEl) typeEl.textContent = formatPropertyType(prop.propertyType);

        // 6. Description
        const descEl = document.getElementById("prop-description");
        if (descEl) {
            descEl.textContent =
                prop.description ||
                "Comfortable accommodation designed for student living with modern amenities, reliable utilities, and easy access to campus.";
        }

        // 7. Details Grid
        const availDetail = document.getElementById("detail-availability");
        if (availDetail) {
            availDetail.textContent = isAvailable ? "Available Immediately" : "Occupied";
        }

        const schoolDetail = document.getElementById("detail-school");
        if (schoolDetail) {
            schoolDetail.textContent = schoolName;
        }

        const timeDetail = document.getElementById("detail-time");
        if (timeDetail) {
            if (driveMins != null && driveMins > 0) {
                timeDetail.textContent = `~${driveMins} minutes`;
            } else if (distKm != null && distKm > 0) {
                timeDetail.textContent = `~${distKm} km`;
            } else {
                timeDetail.textContent = "Near campus";
            }
        }

        // Additional Charges (if any)
        const chargesContainer = document.getElementById("additional-charges-grid");
        if (chargesContainer) {
            if (
                Array.isArray(prop.additionalCharges) &&
                prop.additionalCharges.length > 0
            ) {
                chargesContainer.innerHTML = prop.additionalCharges
                    .map(
                        (c) => `
                    <div class="flex items-center gap-4">
                        <span class="text-xs text-[#7956C8] w-28 flex-shrink-0">${escapeHtml(c.name || "Fee")}</span>
                        <span class="text-xs font-semibold text-gray-700">₦ ${Number(c.amount || 0).toLocaleString()}</span>
                    </div>
                `,
                    )
                    .join("");
                chargesContainer.classList.remove("hidden");
            } else {
                chargesContainer.classList.add("hidden");
            }
        }

        // 8. Amenities Bar
        const amenitiesEl = document.getElementById("prop-amenities");
        if (amenitiesEl) {
            const rawAmenities = Array.isArray(prop.amenities) ? prop.amenities : [];
            const list = rawAmenities.length > 0 ? rawAmenities : ["water", "security"];

            const itemsMarkup = list.map((item) => {
                const key = String(item).toLowerCase().trim();
                const config = AMENITY_ICONS[key] || {
                    icon: "bx-check-circle",
                    label: key.charAt(0).toUpperCase() + key.slice(1),
                };
                return `
                    <span class="text-[#FFFFFF] text-[11px] font-medium flex items-center gap-1.5 whitespace-nowrap">
                        <i class="bx ${config.icon} text-sm"></i> ${escapeHtml(config.label)}
                    </span>
                `;
            });

            // Join with translucent vertical bars as per design
            amenitiesEl.innerHTML = itemsMarkup.join(
                `<span class="text-[#FFFFFF] opacity-40 text-sm">|</span>`,
            );
        }

        // 9. Book Inspection Button Link
        const bookLink = document.getElementById("book-inspection-link");
        if (bookLink) {
            const propId = prop._id || "";
            bookLink.href = `/pages/book-inspection.html?id=${encodeURIComponent(propId)}`;
        }
    }

    function renderError(message) {
        const skeleton = document.getElementById("property-skeleton");
        const content = document.getElementById("property-content");
        const errorEl = document.getElementById("property-error");
        const errorMsg = document.getElementById("error-message");

        if (skeleton) skeleton.classList.add("hidden");
        if (content) content.classList.add("hidden");
        if (errorEl) errorEl.classList.remove("hidden");
        if (errorMsg)
            errorMsg.textContent =
                message || "Property could not be loaded.";
    }

    async function loadPropertyDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        let propertyId = urlParams.get("id") || urlParams.get("propertyId");
        let schoolId = urlParams.get("schoolId");

        // Attempt fallback from sessionStorage.selectedProperty
        let cached = null;
        try {
            const stored = sessionStorage.getItem("selectedProperty");
            if (stored) cached = JSON.parse(stored);
        } catch (e) {
            console.warn("Could not parse cached selectedProperty", e);
        }

        if (!propertyId && cached && cached._id) {
            propertyId = cached._id;
            if (!schoolId && cached.schoolId) {
                schoolId = cached.schoolId;
            }
        }

        if (!propertyId) {
            renderError(
                "No property was selected. Please choose a property from the browse page.",
            );
            return;
        }

        // Instant render from cache while fetching fresh details
        if (cached && cached._id === propertyId) {
            renderProperty(cached);
        }

        // Fetch fresh details from backend
        try {
            let endpointUrl = `${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}`;
            if (schoolId) {
                endpointUrl += `?schoolId=${encodeURIComponent(schoolId)}`;
            }

            console.log("Fetching property details:", endpointUrl);
            const response = await fetch(endpointUrl);
            if (!response.ok) {
                throw new Error(`Server returned HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!data || !data.property) {
                throw new Error("Property information not found");
            }

            renderProperty(data.property, {
                distanceKm: data.distanceKm,
                drivingTimeMinutes: data.drivingTimeMinutes,
                protectedInfo: data.protectedInfo,
            });

            // Update cache
            try {
                sessionStorage.setItem(
                    "selectedProperty",
                    JSON.stringify(data.property),
                );
            } catch (e) {}
        } catch (error) {
            console.error("Failed to fetch property details:", error);
            // If cache was already rendered, don't show full-page error
            if (!cached) {
                renderError(
                    "Unable to load hostel details. Please check your internet connection.",
                );
            }
        }
    }

    // Initialize on DOM load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadPropertyDetails);
    } else {
        loadPropertyDetails();
    }
})();
