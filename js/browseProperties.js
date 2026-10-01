/**
 * browseProperties.js
 * Handles fetching, rendering, searching, and filtering of hostels on the Browse page.
 */
(() => {
    const API_BASE_URL =
        typeof base_url !== "undefined"
            ? base_url
            : "https://group16-be-capstone-project-ochf.onrender.com";
    const PROPERTIES_ENDPOINT = `${API_BASE_URL}/properties`;
    const FALLBACK_IMAGE =
        "https://res.cloudinary.com/ospauzp7/image/upload/v1790627411/22404c7a9e7cce6b24a8f09f9f0a8e6f5544e648.png";

    let allProperties = [];
    let activeFilters = {
        keyword: "",
        verifiedOnly: false,
        propertyType: "",
        maxDistance: null,
        maxPrice: null,
        amenities: [],
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

    function formatDistanceTime(prop) {
        const time = prop.drivingTimeMinutes;
        const km = prop.distanceFromSchoolKm;
        if (time != null && time > 0) {
            return `~${time} mins from school`;
        }
        if (km != null && km > 0) {
            return `~${km} km from school`;
        }
        return "Near campus";
    }

    function renderSkeleton() {
        const grid = document.getElementById("properties-grid");
        if (!grid) return;
        grid.innerHTML = Array(4)
            .fill(0)
            .map(
                () => `
            <div class="bg-white rounded-2xl shadow-[0_2px_16px_rgba(121,86,200,0.10)] border border-[#ede8f8] overflow-hidden animate-pulse flex flex-col justify-between">
                <div class="flex">
                    <div class="w-[140px] h-[130px] bg-purple-100 flex-shrink-0"></div>
                    <div class="flex-1 p-3 flex flex-col justify-between">
                        <div class="space-y-2">
                            <div class="h-4 bg-purple-100 rounded w-3/4"></div>
                            <div class="h-3 bg-purple-50 rounded w-1/2"></div>
                            <div class="h-3 bg-purple-50 rounded w-2/3"></div>
                        </div>
                        <div class="h-3 bg-purple-100 rounded w-1/3 mt-2"></div>
                    </div>
                </div>
                <div class="flex justify-between items-center px-4 py-3 border-t border-gray-100">
                    <div class="h-4 bg-purple-100 rounded w-1/4"></div>
                    <div class="h-7 bg-purple-200 rounded w-1/3"></div>
                </div>
            </div>
        `,
            )
            .join("");
    }

    function renderPropertyCard(prop) {
        const title = escapeHtml(
            prop.title ? prop.title.trim() : "Hostel Space",
        );
        const address = escapeHtml(prop.address || "Campus area");
        const coverPhoto = prop.coverPhoto || FALLBACK_IMAGE;
        const isAvailable =
            (prop.availabilityStatus || "").toLowerCase() === "available";
        const isVerified =
            (prop.verificationStatus || "").toLowerCase() === "verified" ||
            (prop.providerId &&
                (prop.providerId.verificationStatus || "").toLowerCase() ===
                    "verified");
        const propType = escapeHtml(formatPropertyType(prop.propertyType));
        const priceFormatted = formatPrice(prop.price);
        const distInfo = escapeHtml(formatDistanceTime(prop));
        const propId = prop._id || "";

        return `
            <div class="bg-[#FFFFFF] rounded-2xl shadow-[0_2px_16px_rgba(121,86,200,0.10)] border border-[#ede8f8] overflow-hidden hover:shadow-[0_6px_28px_rgba(121,86,200,0.20)] transition-shadow duration-200 flex flex-col justify-between" data-property-id="${escapeHtml(propId)}">
                <div class="flex">
                    <div class="relative w-[140px] flex-shrink-0 bg-purple-50">
                        <img 
                            src="${coverPhoto}" 
                            alt="${title}" 
                            class="w-full h-full object-cover min-h-[130px]"
                            onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"
                        >
                        <span class="absolute bottom-2 left-2 ${isAvailable ? "bg-[#6FCF97]" : "bg-gray-400"} text-[#FFFFFF] text-[9px] font-semibold px-2 py-0.5 rounded-full leading-tight">
                            ${isAvailable ? "Available" : "Unavailable"}
                        </span>
                    </div>
                    <div class="flex-1 px-3 pt-2 pb-1 flex flex-col min-w-0">
                        <div class="flex justify-end mb-1 min-h-[16px]">
                            ${
                                isVerified
                                    ? `
                                <span class="text-[#7956C8] text-[9px] font-semibold flex items-center gap-0.5">
                                    <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                    </svg> Verified
                                </span>
                            `
                                    : ""
                            }
                        </div>
                        <p class="font-bold text-[13px] text-gray-900 leading-snug mb-1 truncate" title="${title}">
                            ${title}
                        </p>
                        <p class="text-[10px] text-[#7956C8] flex items-center gap-1 mb-0.5 truncate" title="${address}">
                            <i class="bx bx-map text-[11px] shrink-0"></i>
                            <span class="truncate">${address}</span>
                        </p>
                        <p class="text-[10px] text-[#7956C8] flex items-center gap-1 mb-0.5">
                            <i class="bx bx-time text-[11px] shrink-0"></i>
                            <span>${distInfo}</span>
                        </p>
                        <p class="text-[9px] font-bold text-[#7956C8] uppercase tracking-wider mt-auto pt-1">
                            ${propType}
                        </p>
                    </div>
                </div>
                <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <span class="text-[#7956C8] font-bold text-sm">${priceFormatted}</span>
                    <a 
                        href="/pages/property-detail.html?id=${encodeURIComponent(propId)}" 
                        data-action="view-details" 
                        data-id="${escapeHtml(propId)}"
                        class="bg-[#7956C8] hover:bg-[#4a2f82] text-[#FFFFFF] text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer"
                    >
                        View details →
                    </a>
                </div>
            </div>
        `;
    }

    function renderProperties(list) {
        const grid = document.getElementById("properties-grid");
        const countEl = document.getElementById("results-count");
        if (!grid) return;

        if (countEl) {
            const count = list.length;
            countEl.textContent = `${count} result${count === 1 ? "" : "s"} found • Sorted by Recommended`;
        }

        if (list.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-16 bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                    <i class="bx bx-building-house text-5xl text-[#7956C8] mb-3"></i>
                    <h3 class="text-base font-bold text-gray-800">No hostels found</h3>
                    <p class="text-xs text-gray-500 mt-1 max-w-sm mx-auto">We couldn't find any accommodation matching your current search or filter criteria. Try resetting your filters.</p>
                    <button id="empty-reset-btn" class="mt-4 bg-[#7956C8] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#4a2f82] transition cursor-pointer">
                        Reset Filters
                    </button>
                </div>
            `;
            const emptyResetBtn = document.getElementById("empty-reset-btn");
            if (emptyResetBtn) {
                emptyResetBtn.addEventListener("click", resetFilters);
            }
            return;
        }

        grid.innerHTML = list.map(renderPropertyCard).join("");

        // Cache selected property into sessionStorage when clicked
        grid.querySelectorAll('[data-action="view-details"]').forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                const found = allProperties.find((p) => p._id === id);
                if (found) {
                    try {
                        sessionStorage.setItem(
                            "selectedProperty",
                            JSON.stringify(found),
                        );
                    } catch (e) {
                        console.error(
                            "Failed to save selectedProperty to sessionStorage",
                            e,
                        );
                    }
                }
            });
        });
    }

    function renderError(message) {
        const grid = document.getElementById("properties-grid");
        const countEl = document.getElementById("results-count");
        if (countEl) countEl.textContent = "Error loading properties";
        if (!grid) return;
        grid.innerHTML = `
            <div class="col-span-full py-12 bg-white rounded-2xl border border-red-100 p-8 text-center shadow-sm">
                <i class="bx bx-error-circle text-5xl text-red-500 mb-3"></i>
                <h3 class="text-base font-bold text-gray-800">Unable to load properties</h3>
                <p class="text-xs text-gray-500 mt-1 max-w-sm mx-auto mb-4">${escapeHtml(message || "Please check your network connection and try again.")}</p>
                <button id="retry-fetch-btn" class="bg-[#7956C8] hover:bg-[#4a2f82] text-white text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer">
                    Retry
                </button>
            </div>
        `;
        const retryBtn = document.getElementById("retry-fetch-btn");
        if (retryBtn) retryBtn.addEventListener("click", fetchProperties);
    }

    function applyFilters() {
        let filtered = [...allProperties];

        // Search keyword (matches title or address)
        if (activeFilters.keyword) {
            const kw = activeFilters.keyword.toLowerCase();
            filtered = filtered.filter((p) => {
                const title = (p.title || "").toLowerCase();
                const address = (p.address || "").toLowerCase();
                return title.includes(kw) || address.includes(kw);
            });
        }

        // Verified toggle
        if (activeFilters.verifiedOnly) {
            filtered = filtered.filter((p) => {
                const v1 =
                    (p.verificationStatus || "").toLowerCase() === "verified";
                const v2 =
                    p.providerId &&
                    (p.providerId.verificationStatus || "").toLowerCase() ===
                        "verified";
                return v1 || v2;
            });
        }

        // Property type
        if (activeFilters.propertyType) {
            const desired = activeFilters.propertyType.toLowerCase();
            filtered = filtered.filter((p) => {
                const types = Array.isArray(p.propertyType)
                    ? p.propertyType
                    : [p.propertyType || ""];
                return types.some((t) => {
                    const norm = String(t).toLowerCase().replace(/[_-]/g, " ");
                    return norm.includes(desired) || desired.includes(norm);
                });
            });
        }

        // Max price
        if (
            typeof activeFilters.maxPrice === "number" &&
            !isNaN(activeFilters.maxPrice)
        ) {
            filtered = filtered.filter(
                (p) =>
                    typeof p.price === "number" &&
                    p.price <= activeFilters.maxPrice,
            );
        }

        // Max distance
        if (
            typeof activeFilters.maxDistance === "number" &&
            !isNaN(activeFilters.maxDistance)
        ) {
            filtered = filtered.filter((p) => {
                if (typeof p.distanceFromSchoolKm === "number") {
                    return p.distanceFromSchoolKm <= activeFilters.maxDistance;
                }
                return true;
            });
        }

        // Amenities
        if (activeFilters.amenities.length > 0) {
            filtered = filtered.filter((p) => {
                const amList = Array.isArray(p.amenities)
                    ? p.amenities.map((a) => String(a).toLowerCase())
                    : [];
                return activeFilters.amenities.every((req) =>
                    amList.includes(req.toLowerCase()),
                );
            });
        }

        renderProperties(filtered);
    }

    function resetFilters() {
        activeFilters = {
            keyword: "",
            verifiedOnly: false,
            propertyType: "",
            maxDistance: null,
            maxPrice: null,
            amenities: [],
        };

        const searchTop = document.getElementById("search-input");
        const searchSide = document.getElementById("sidebar-search-input");
        const verifiedToggle = document.getElementById("filter-verified");
        const priceRange = document.getElementById("filter-price");
        const priceLabel = document.getElementById("filter-price-val");
        const distRange = document.getElementById("filter-distance");
        const distLabel = document.getElementById("filter-distance-val");

        if (searchTop) searchTop.value = "";
        if (searchSide) searchSide.value = "";
        if (verifiedToggle) verifiedToggle.checked = false;
        if (priceRange) {
            priceRange.value = priceRange.max;
            if (priceLabel)
                priceLabel.textContent = `₦${(Number(priceRange.max) / 1000).toFixed(0)}k`;
        }
        if (distRange) {
            distRange.value = distRange.max;
            if (distLabel) distLabel.textContent = `${distRange.max}km`;
        }

        document.querySelectorAll("[data-filter-type]").forEach((btn) => {
            btn.classList.remove("bg-[#7956C8]", "text-white");
            btn.classList.add("border-gray-300", "text-gray-600");
        });

        document.querySelectorAll("[data-filter-amenity]").forEach((cb) => {
            cb.checked = false;
        });

        applyFilters();
    }

    async function fetchProperties() {
        renderSkeleton();
        try {
            const response = await fetch(PROPERTIES_ENDPOINT);
            if (!response.ok) {
                throw new Error(
                    `Failed to load hostels from server (HTTP ${response.status})`,
                );
            }
            const data = await response.json();
            allProperties = Array.isArray(data.properties)
                ? data.properties
                : [];
            applyFilters();
        } catch (error) {
            console.error("Error fetching properties:", error);
            renderError(error.message);
        }
    }

    function setupEventListeners() {
        // Search inputs
        const searchTop = document.getElementById("search-input");
        const searchSide = document.getElementById("sidebar-search-input");

        const handleSearch = (e) => {
            activeFilters.keyword = e.target.value.trim();
            if (searchTop && e.target !== searchTop)
                searchTop.value = e.target.value;
            if (searchSide && e.target !== searchSide)
                searchSide.value = e.target.value;
            applyFilters();
        };

        if (searchTop) searchTop.addEventListener("input", handleSearch);
        if (searchSide) searchSide.addEventListener("input", handleSearch);

        // Clear filters pill
        const clearBtn = document.getElementById("clear-filters-btn");
        if (clearBtn) clearBtn.addEventListener("click", resetFilters);

        // Reset button in sidebar
        const resetBtn = document.getElementById("reset-filters-btn");
        if (resetBtn) resetBtn.addEventListener("click", resetFilters);

        // Apply filters button in sidebar
        const applyBtn = document.getElementById("apply-filters-btn");
        if (applyBtn) applyBtn.addEventListener("click", applyFilters);

        // Verified toggle
        const verifiedToggle = document.getElementById("filter-verified");
        if (verifiedToggle) {
            verifiedToggle.addEventListener("change", (e) => {
                activeFilters.verifiedOnly = e.target.checked;
                applyFilters();
            });
        }

        // Distance range
        const distRange = document.getElementById("filter-distance");
        const distLabel = document.getElementById("filter-distance-val");
        if (distRange) {
            distRange.addEventListener("input", (e) => {
                const val = parseFloat(e.target.value);
                if (distLabel) distLabel.textContent = `${val}km`;
                activeFilters.maxDistance = val;
                applyFilters();
            });
        }

        // Price range
        const priceRange = document.getElementById("filter-price");
        const priceLabel = document.getElementById("filter-price-val");
        if (priceRange) {
            priceRange.addEventListener("input", (e) => {
                const val = parseInt(e.target.value, 10);
                if (priceLabel)
                    priceLabel.textContent = `₦${(val / 1000).toFixed(0)}k`;
                activeFilters.maxPrice = val;
                applyFilters();
            });
        }

        // Property type buttons
        document.querySelectorAll("[data-filter-type]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const type = btn.dataset.filterType;
                if (activeFilters.propertyType === type) {
                    activeFilters.propertyType = "";
                    btn.classList.remove("bg-[#7956C8]", "text-white");
                    btn.classList.add("border-gray-300", "text-gray-600");
                } else {
                    document
                        .querySelectorAll("[data-filter-type]")
                        .forEach((b) => {
                            b.classList.remove("bg-[#7956C8]", "text-white");
                            b.classList.add("border-gray-300", "text-gray-600");
                        });
                    activeFilters.propertyType = type;
                    btn.classList.add("bg-[#7956C8]", "text-white");
                    btn.classList.remove("border-gray-300", "text-gray-600");
                }
                applyFilters();
            });
        });

        // Amenities checkboxes
        document.querySelectorAll("[data-filter-amenity]").forEach((cb) => {
            cb.addEventListener("change", () => {
                const amenity = cb.dataset.filterAmenity;
                if (cb.checked) {
                    if (!activeFilters.amenities.includes(amenity)) {
                        activeFilters.amenities.push(amenity);
                    }
                } else {
                    activeFilters.amenities = activeFilters.amenities.filter(
                        (a) => a !== amenity,
                    );
                }
                applyFilters();
            });
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            setupEventListeners();
            fetchProperties();
        });
    } else {
        setupEventListeners();
        fetchProperties();
    }
})();
