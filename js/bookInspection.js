(() => {
    const API_BASE_URL =
        typeof base_url !== "undefined"
            ? base_url
            : "https://hostelfinderbe.onrender.com";
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
        water: "bx-droplet",
        light: "bx-bulb",
        wifi: "bx-wifi",
        security: "bx-shield",
        generator: "bx-bolt-circle",
        cctv: "bx-video",
        laundry: "bx-closet",
    };

    function formatPropertyType(types) {
        if (!types) return "Hostel Space";
        const values = Array.isArray(types) ? types : [types];
        if (values.length === 0) return "Hostel Space";

        return values
            .map((type) => {
                const value = String(type).trim();
                const labels = {
                    self_contain: "Self Contain",
                    single_room: "Single Room",
                    "1_bedroom": "1-Bedroom",
                    "2_bedroom": "2-Bedroom",
                    shared_apartment: "Shared Apartment",
                    flat: "Flat",
                    studio: "Studio",
                };
                return (
                    labels[value.toLowerCase()] ||
                    value
                        .split(/[_-]/)
                        .map(
                            (word) =>
                                word.charAt(0).toUpperCase() +
                                word.slice(1).toLowerCase(),
                        )
                        .join(" ")
                );
            })
            .join(", ");
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function renderAmenities(amenities) {
        const container = document.getElementById("booking-property-amenities");
        if (!container) return;

        const values = Array.isArray(amenities) ? amenities : [];
        container.replaceChildren();
        container.classList.toggle("hidden", values.length === 0);

        values.forEach((amenity, index) => {
            if (index > 0) {
                const divider = document.createElement("span");
                divider.className = "hidden sm:inline text-white opacity-40 text-sm";
                divider.textContent = "|";
                container.appendChild(divider);
            }

            const value = String(amenity).trim();
            const label = value
                .split(/[_-]/)
                .map(
                    (word) =>
                        word.charAt(0).toUpperCase() +
                        word.slice(1).toLowerCase(),
                )
                .join(" ");
            const item = document.createElement("span");
            item.className =
                "text-white text-[11px] font-medium flex items-center gap-1.5";

            const icon = document.createElement("i");
            icon.className = `bx ${AMENITY_ICONS[value.toLowerCase()] || "bx-check-circle"} text-sm`;
            item.append(icon, document.createTextNode(` ${label}`));
            container.appendChild(item);
        });
    }

    function renderProperty(property, extraData = {}) {
        const title = property.title || "Hostel Space";
        const titleElement = document.getElementById("booking-property-title");
        if (titleElement) titleElement.textContent = title;
        document.title = `Book Inspection | ${title} | HostelFinder`;

        const photoElement = document.getElementById("booking-property-photo");
        const photos =
            Array.isArray(property.photos) && property.photos.length > 0
                ? property.photos
                      .map((photo) =>
                          typeof photo === "string" ? photo : photo.url,
                      )
                      .filter(Boolean)
                : property.coverPhoto
                  ? [property.coverPhoto]
                  : [FALLBACK_IMAGE];
        if (photoElement) {
            photoElement.src = photos[0];
            photoElement.alt = title;
            photoElement.onerror = () => {
                photoElement.src = FALLBACK_IMAGE;
            };
        }

        setText("booking-property-address", property.address || "Campus area");
        const schoolName =
            KNOWN_SCHOOLS[property.schoolId] || "Campus Area";
        const drivingTime =
            extraData.drivingTimeMinutes ?? property.drivingTimeMinutes;
        const distance =
            extraData.distanceKm ?? property.distanceFromSchoolKm;
        const proximity =
            drivingTime > 0
                ? `~${drivingTime} mins away from ${schoolName}`
                : distance > 0
                  ? `~${distance} km away from ${schoolName}`
                  : `Conveniently near ${schoolName}`;
        setText("booking-property-proximity", proximity);
        setText("booking-property-type", formatPropertyType(property.propertyType));
        setText(
            "booking-property-price",
            typeof property.price === "number"
                ? `₦ ${property.price.toLocaleString()}/year`
                : "₦ --",
        );

        const isAvailable =
            (property.availabilityStatus || "").toLowerCase() === "available";
        const availability = document.getElementById(
            "booking-property-availability",
        );
        if (availability) {
            availability.textContent = isAvailable ? "Available" : "Unavailable";
            availability.classList.remove("hidden");
            availability.classList.toggle("bg-green-500", isAvailable);
            availability.classList.toggle("bg-gray-400", !isAvailable);
        }

        const isVerified =
            (property.verificationStatus || "").toLowerCase() === "verified" ||
            (property.providerId &&
                (property.providerId.verificationStatus || "").toLowerCase() ===
                    "verified");
        const verified = document.getElementById("booking-property-verified");
        if (verified) verified.classList.toggle("hidden", !isVerified);

        const rating =
            typeof property.rating === "number"
                ? property.rating
                : typeof property.averageRating === "number"
                  ? property.averageRating
                  : null;
        const reviewCount =
            typeof property.reviewCount === "number" ? property.reviewCount : null;
        const ratingElement = document.getElementById("booking-property-rating");
        if (ratingElement) {
            ratingElement.classList.toggle("hidden", rating === null);
            const ratingText = ratingElement.querySelector("span");
            if (ratingText) {
                ratingText.textContent =
                    rating === null
                        ? ""
                        : `${rating.toFixed(1)}${reviewCount === null ? "" : ` · ${reviewCount} Reviews`}`;
            }
        }

        renderAmenities(property.amenities);

        const detailsLink = document.getElementById(
            "booking-property-details-link",
        );
        if (detailsLink) {
            const query = new URLSearchParams({ id: property._id });
            if (property.schoolId) query.set("schoolId", property.schoolId);
            detailsLink.href = `/pages/property-detail.html?${query.toString()}`;
        }
    }

    async function loadProperty() {
        const params = new URLSearchParams(window.location.search);
        let propertyId = params.get("id") || params.get("propertyId");
        let schoolId = params.get("schoolId");
        let cached = null;

        try {
            const stored = sessionStorage.getItem("selectedProperty");
            if (stored) cached = JSON.parse(stored);
        } catch (error) {
            console.warn("Could not parse cached selectedProperty", error);
        }

        if (!propertyId && cached && cached._id) {
            propertyId = cached._id;
            schoolId = schoolId || cached.schoolId;
        }

        if (!propertyId) {
            showError(
                "No property was selected. Please choose a property before booking an inspection.",
            );
            return;
        }

        if (cached && cached._id === propertyId) renderProperty(cached);

        try {
            let endpointUrl = `${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}`;
            if (schoolId) {
                endpointUrl += `?schoolId=${encodeURIComponent(schoolId)}`;
            }

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
            });
            try {
                sessionStorage.setItem(
                    "selectedProperty",
                    JSON.stringify(data.property),
                );
            } catch (error) {
                console.warn("Could not cache selectedProperty", error);
            }
        } catch (error) {
            console.error("Failed to fetch booking property details:", error);
            showError(
                cached && cached._id === propertyId
                    ? "Unable to refresh property details. Showing the saved property information."
                    : "Unable to load property details. Please check your internet connection and try again.",
            );
        }
    }

    function showError(message) {
        const errorElement = document.getElementById("booking-property-error");
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove("hidden");
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadProperty);
    } else {
        loadProperty();
    }
})();
