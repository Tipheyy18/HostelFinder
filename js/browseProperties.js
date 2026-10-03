/**
 * browseProperties.js
 * Handles fetching, rendering, and applying filters to hostels via the backend endpoint.
 *
 * Supported endpoint parameters:
 * minPrice, maxPrice, maxDistanceKm, amenities, propertyType, availability, sort, page, limit
 * Example: {{baseUrl}}/properties?minPrice=50000&maxPrice=350000&maxDistanceKm=10&amenities=wifi,water&propertyType=self_contain&availability=available&sort=price_asc&page=1&limit=20
 */
(() => {
    const API_BASE_URL =
        typeof base_url !== "undefined"
            ? base_url
            : "https://hostelfinderbe.onrender.com";
    const PROPERTIES_ENDPOINT = `${API_BASE_URL}/properties`;
    const FALLBACK_IMAGE =
        "https://res.cloudinary.com/ospauzp7/image/upload/v1790627411/22404c7a9e7cce6b24a8f09f9f0a8e6f5544e648.png";

    let allProperties = [];
    let selectedPropertyType = "";

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
                                <span class="bg-[#ede8f8] text-[#7956C8] text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                    <svg class="w-3 h-3 text-[#7956C8]" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
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
                        href="/pages/property-detail.html?id=${encodeURIComponent(propId)}${prop.schoolId ? `&schoolId=${encodeURIComponent(prop.schoolId)}` : ""}" 
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

    function renderProperties(list, totalCount) {
        const grid = document.getElementById("properties-grid");
        const countEl = document.getElementById("results-count");
        if (!grid) return;

        const count =
            typeof totalCount === "number" && totalCount !== null
                ? totalCount
                : list.length;
        const sortSelect = document.getElementById("filter-sort");
        const sortLabel =
            sortSelect && sortSelect.value === "price_desc"
                ? "Price: High to Low"
                : "Price: Low to High";
        if (countEl) {
            countEl.textContent = `${count} result${count === 1 ? "" : "s"} found • Sorted by ${sortLabel}`;
        }

        if (list.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-16 bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                    <i class="bx bx-building-house text-5xl text-[#7956C8] mb-3"></i>
                    <h3 class="text-base font-bold text-gray-800">No hostels found</h3>
                    <p class="text-xs text-gray-500 mt-1 max-w-sm mx-auto">The property matching your filters was not found or may not exist. Try adjusting or resetting your filters.</p>
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
        if (retryBtn) retryBtn.addEventListener("click", () => applyFilters());
    }

    /**
     * Updates the top horizontal filter pills bar.
     * When filters are active, displays them as removable chips (with an '✕' button).
     * When no filters are active, displays 'All' as selected along with default category shortcuts.
     */
    function updateFilterPills() {
        const container = document.getElementById("applied-filters-container");
        const pillAll = document.getElementById("pill-all");
        const badge = document.getElementById("active-filters-badge");
        if (!container) return;

        const activeItems = [];

        // 1. Property Type
        if (selectedPropertyType) {
            activeItems.push({
                type: "propertyType",
                label: formatPropertyType(selectedPropertyType),
                value: selectedPropertyType,
            });
        }

        // 2. Amenities
        document
            .querySelectorAll("[data-filter-amenity]:checked")
            .forEach((cb) => {
                const val = cb.dataset.filterAmenity;
                const labels = {
                    wifi: "Wifi",
                    water: "Water",
                    security: "Security",
                    generator: "Power/Generator",
                    laundry: "Laundry",
                    light: "Light",
                };
                activeItems.push({
                    type: "amenity",
                    label: labels[val.toLowerCase()] || val,
                    value: val,
                });
            });

        // 3. Availability
        const availToggle = document.getElementById("filter-availability");
        if (availToggle && availToggle.checked) {
            activeItems.push({
                type: "availability",
                label: "Available Only",
                value: "available",
            });
        }

        // 4. Price
        const priceRange = document.getElementById("filter-price");
        if (priceRange) {
            const val = parseInt(priceRange.value, 10);
            const max = parseInt(priceRange.max, 10);
            if (val < max) {
                activeItems.push({
                    type: "price",
                    label: `≤ ₦${(val / 1000).toFixed(0)}k`,
                    value: String(val),
                });
            }
        }

        // 5. Distance
        const distRange = document.getElementById("filter-distance");
        if (distRange) {
            const val = parseFloat(distRange.value);
            const max = parseFloat(distRange.max);
            if (val < max) {
                activeItems.push({
                    type: "distance",
                    label: `≤ ${val}km`,
                    value: String(val),
                });
            }
        }

        // 6. Sort (if non-default)
        const sortSelect = document.getElementById("filter-sort");
        if (sortSelect && sortSelect.value === "price_desc") {
            activeItems.push({
                type: "sort",
                label: "Price: High to Low",
                value: "price_desc",
            });
        }

        // Update badge count on Filter toggle button
        if (badge) {
            if (activeItems.length > 0) {
                badge.textContent = activeItems.length;
                badge.classList.remove("hidden");
            } else {
                badge.classList.add("hidden");
            }
        }

        // Update "All" pill style
        if (pillAll) {
            if (activeItems.length === 0) {
                pillAll.className =
                    "border border-[#7956C8] bg-purple-50 text-[#7956C8] text-xs px-3.5 py-1.5 rounded-xl font-semibold transition flex-shrink-0 cursor-pointer";
            } else {
                pillAll.className =
                    "border border-gray-300 bg-white text-gray-500 text-xs px-3.5 py-1.5 rounded-xl hover:border-[#7956C8] hover:text-[#7956C8] transition flex-shrink-0 cursor-pointer font-normal";
            }
        }

        // Render chips or default categories
        if (activeItems.length === 0) {
            container.innerHTML = `
                <button data-category="verified" type="button" class="border border-gray-300 bg-white text-gray-600 text-xs px-3 py-1.5 rounded-xl hover:border-[#7956C8] hover:text-[#7956C8] transition cursor-pointer flex-shrink-0">Verified</button>
                <button data-category="location" type="button" class="border border-gray-300 bg-white text-gray-600 text-xs px-3 py-1.5 rounded-xl hover:border-[#7956C8] hover:text-[#7956C8] transition cursor-pointer flex-shrink-0">Location</button>
                <button data-category="propertyType" type="button" class="border border-gray-300 bg-white text-gray-600 text-xs px-3 py-1.5 rounded-xl hover:border-[#7956C8] hover:text-[#7956C8] transition cursor-pointer flex-shrink-0">Property Type</button>
                <button data-category="distance" type="button" class="border border-gray-300 bg-white text-gray-600 text-xs px-3 py-1.5 rounded-xl hover:border-[#7956C8] hover:text-[#7956C8] transition cursor-pointer flex-shrink-0">Distance</button>
                <button data-category="price" type="button" class="border border-gray-300 bg-white text-gray-600 text-xs px-3 py-1.5 rounded-xl hover:border-[#7956C8] hover:text-[#7956C8] transition cursor-pointer flex-shrink-0">Price</button>
                <button data-category="amenities" type="button" class="border border-gray-300 bg-white text-gray-600 text-xs px-3 py-1.5 rounded-xl hover:border-[#7956C8] hover:text-[#7956C8] transition cursor-pointer flex-shrink-0">Amenities</button>
            `;
            container.querySelectorAll("[data-category]").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const sidebar = document.getElementById("filter-sidebar");
                    const filterToggleBtn =
                        document.getElementById("filter-toggle-btn");
                    if (sidebar) {
                        sidebar.classList.remove("hidden");
                        if (filterToggleBtn)
                            filterToggleBtn.setAttribute(
                                "aria-expanded",
                                "true",
                            );
                        sidebar.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                        });
                    }
                });
            });
        } else {
            container.innerHTML = `
                ${activeItems
                    .map(
                        (item) => `
                    <button 
                        type="button" 
                        class="applied-filter-chip flex items-center gap-1.5 bg-[#ede8f8] border border-[#7956C8] text-[#7956C8] text-xs px-3 py-1.5 rounded-xl font-medium hover:bg-[#e2d8f7] transition cursor-pointer flex-shrink-0"
                        data-remove-type="${item.type}"
                        data-remove-value="${escapeHtml(item.value)}"
                        title="Remove filter"
                    >
                        <span>${escapeHtml(item.label)}</span>
                        <i class="bx bx-x text-sm font-bold"></i>
                    </button>
                `,
                    )
                    .join("")}
                ${
                    activeItems.length >= 2
                        ? `<button id="pill-clear-all" type="button" class="text-xs text-gray-400 hover:text-red-500 font-medium px-2 py-1 flex-shrink-0 cursor-pointer transition">Clear all</button>`
                        : ""
                }
            `;

            container
                .querySelectorAll(".applied-filter-chip")
                .forEach((btn) => {
                    btn.addEventListener("click", () => {
                        const type = btn.dataset.removeType;
                        const value = btn.dataset.removeValue;
                        removeFilter(type, value);
                    });
                });

            const clearAllBtn = document.getElementById("pill-clear-all");
            if (clearAllBtn) {
                clearAllBtn.addEventListener("click", resetFilters);
            }
        }
    }

    /**
     * Removes an active filter and re-queries the properties endpoint.
     */
    function removeFilter(type, value) {
        if (type === "propertyType") {
            selectedPropertyType = "";
            document.querySelectorAll("[data-filter-type]").forEach((btn) => {
                btn.classList.remove("bg-[#7956C8]", "text-white");
                btn.classList.add("border-gray-300", "text-gray-600");
            });
        } else if (type === "amenity") {
            const cb = document.querySelector(
                `[data-filter-amenity="${value}"]`,
            );
            if (cb) cb.checked = false;
        } else if (type === "availability") {
            const toggle = document.getElementById("filter-availability");
            if (toggle) toggle.checked = false;
        } else if (type === "price") {
            const priceRange = document.getElementById("filter-price");
            const priceLabel = document.getElementById("filter-price-val");
            if (priceRange) {
                priceRange.value = priceRange.max;
                if (priceLabel) {
                    priceLabel.textContent = `₦${(Number(priceRange.max) / 1000).toFixed(0)}k`;
                }
            }
        } else if (type === "distance") {
            const distRange = document.getElementById("filter-distance");
            const distLabel = document.getElementById("filter-distance-val");
            if (distRange) {
                distRange.value = distRange.max;
                if (distLabel) distLabel.textContent = `${distRange.max}km`;
            }
        } else if (type === "sort") {
            const sortSelect = document.getElementById("filter-sort");
            if (sortSelect) sortSelect.value = "price_asc";
        }

        applyFilters();
    }

    /**
     * Builds URLSearchParams with the expected parameters:
     * minPrice, maxPrice, maxDistanceKm, amenities, propertyType, availability, sort, page, limit
     * Example: {{baseUrl}}/properties?minPrice=50000&maxPrice=350000&maxDistanceKm=10&amenities=wifi,water&propertyType=self_contain&availability=available&sort=price_asc&page=1&limit=20
     *
     * Any filter not supported by the endpoint (e.g. Verification, Location text search)
     * is ignored until backend endpoints for them are provided.
     */
    function applyFilters() {
        const params = new URLSearchParams();

        // 1. Price Range (minPrice, maxPrice) - only send if customized
        const priceRange = document.getElementById("filter-price");
        if (priceRange) {
            const minPriceVal = parseInt(priceRange.min, 10) || 50000;
            const maxPriceVal = parseInt(priceRange.value, 10);
            const priceMax = parseInt(priceRange.max, 10) || 1000000;
            if (maxPriceVal < priceMax) {
                params.set("minPrice", String(minPriceVal));
                params.set("maxPrice", String(maxPriceVal));
            }
        }

        // 2. Distance from School (maxDistanceKm) - only send if customized
        const distRange = document.getElementById("filter-distance");
        if (distRange) {
            const maxDistVal = parseFloat(distRange.value);
            const distMax = parseFloat(distRange.max) || 250;
            if (maxDistVal < distMax) {
                params.set("maxDistanceKm", String(maxDistVal));
            }
        }

        // 3. Amenities (comma-separated list: e.g. wifi,water)
        const checkedAmenities = [
            ...document.querySelectorAll("[data-filter-amenity]:checked"),
        ]
            .map((cb) => cb.dataset.filterAmenity)
            .filter(Boolean);
        if (checkedAmenities.length > 0) {
            params.set("amenities", checkedAmenities.join(","));
        }

        // 4. Property Type (e.g. self_contain, single_room, 1_bedroom, 2_bedroom)
        if (selectedPropertyType) {
            params.set("propertyType", selectedPropertyType);
        }

        // 5. Availability (availability=available)
        const availToggle = document.getElementById("filter-availability");
        if (availToggle && availToggle.checked) {
            params.set("availability", "available");
        }

        // 6. Sort
        const sortSelect = document.getElementById("filter-sort");
        const sortVal = sortSelect ? sortSelect.value : "price_asc";
        params.set("sort", sortVal || "price_asc");

        // 7. Page and Limit
        params.set("page", "1");
        params.set("limit", "20");

        // Close sidebar on mobile after applying filters
        if (window.innerWidth < 1024) {
            const sidebar = document.getElementById("filter-sidebar");
            const filterToggleBtn =
                document.getElementById("filter-toggle-btn");
            if (sidebar) sidebar.classList.add("hidden");
            if (filterToggleBtn)
                filterToggleBtn.setAttribute("aria-expanded", "false");
        }

        // Update active filter pills
        updateFilterPills();

        fetchProperties(params);
    }

    function resetFilters() {
        selectedPropertyType = "";

        const availToggle = document.getElementById("filter-availability");
        if (availToggle) availToggle.checked = false;

        const verifiedToggle = document.getElementById("filter-verified");
        if (verifiedToggle) verifiedToggle.checked = false;

        const sortSelect = document.getElementById("filter-sort");
        if (sortSelect) sortSelect.value = "price_asc";

        const priceRange = document.getElementById("filter-price");
        const priceLabel = document.getElementById("filter-price-val");
        if (priceRange) {
            priceRange.value = priceRange.max;
            if (priceLabel) {
                priceLabel.textContent = `₦${(Number(priceRange.max) / 1000).toFixed(0)}k`;
            }
        }

        const distRange = document.getElementById("filter-distance");
        const distLabel = document.getElementById("filter-distance-val");
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

        const searchTop = document.getElementById("search-input");
        const searchSide = document.getElementById("sidebar-search-input");
        if (searchTop) searchTop.value = "";
        if (searchSide) searchSide.value = "";

        // Close sidebar on mobile
        if (window.innerWidth < 1024) {
            const sidebar = document.getElementById("filter-sidebar");
            const filterToggleBtn =
                document.getElementById("filter-toggle-btn");
            if (sidebar) sidebar.classList.add("hidden");
            if (filterToggleBtn)
                filterToggleBtn.setAttribute("aria-expanded", "false");
        }

        // Update filter pills back to default categories
        updateFilterPills();

        // Send default request without filter constraints
        fetchProperties();
    }

    async function fetchProperties(params = null) {
        renderSkeleton();
        try {
            const query = params
                ? `?${params.toString().replace(/%2C/g, ",")}`
                : `?page=1&limit=20`;
            const url = `${PROPERTIES_ENDPOINT}${query}`;
            console.log("Fetching properties from endpoint:", url);

            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) {
                    allProperties = [];
                    renderProperties(allProperties, 0);
                    return;
                }
                throw new Error("Failed to load hostels from server.");
            }
            const data = await response.json();
            allProperties = Array.isArray(data.properties)
                ? data.properties
                : [];
            renderProperties(allProperties, data.total ?? allProperties.length);
        } catch (error) {
            console.error("Error fetching properties:", error);
            renderError(error.message);
        }
    }

    function setupEventListeners() {
        // Mobile Filter Toggle Button
        const filterToggleBtn = document.getElementById("filter-toggle-btn");
        const filterSidebar = document.getElementById("filter-sidebar");
        const closeSidebarBtn = document.getElementById("close-sidebar-btn");

        if (filterToggleBtn && filterSidebar) {
            filterToggleBtn.addEventListener("click", () => {
                const isHidden = filterSidebar.classList.toggle("hidden");
                filterToggleBtn.setAttribute(
                    "aria-expanded",
                    String(!isHidden),
                );
                if (!isHidden && window.innerWidth < 1024) {
                    filterSidebar.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });
                }
            });
        }

        if (closeSidebarBtn && filterSidebar) {
            closeSidebarBtn.addEventListener("click", () => {
                filterSidebar.classList.add("hidden");
                if (filterToggleBtn)
                    filterToggleBtn.setAttribute("aria-expanded", "false");
            });
        }

        // "All" pill button
        const pillAll = document.getElementById("pill-all");
        if (pillAll) {
            pillAll.addEventListener("click", resetFilters);
        }

        // Apply filters button - ONLY here are filters sent to endpoint
        const applyBtn = document.getElementById("apply-filters-btn");
        if (applyBtn) {
            applyBtn.addEventListener("click", () => {
                applyFilters();
            });
        }

        // Reset and clear filters buttons
        const resetBtn = document.getElementById("reset-filters-btn");
        if (resetBtn) resetBtn.addEventListener("click", resetFilters);

        const clearBtn = document.getElementById("clear-filters-btn");
        if (clearBtn) clearBtn.addEventListener("click", resetFilters);

        // Distance range: updates local display ONLY (no fetch)
        const distRange = document.getElementById("filter-distance");
        const distLabel = document.getElementById("filter-distance-val");
        if (distRange) {
            distRange.addEventListener("input", (e) => {
                const val = parseFloat(e.target.value);
                if (distLabel) distLabel.textContent = `${val}km`;
            });
        }

        // Price range: updates local display ONLY (no fetch)
        const priceRange = document.getElementById("filter-price");
        const priceLabel = document.getElementById("filter-price-val");
        if (priceRange) {
            priceRange.addEventListener("input", (e) => {
                const val = parseInt(e.target.value, 10);
                if (priceLabel)
                    priceLabel.textContent = `₦${(val / 1000).toFixed(0)}k`;
            });
        }

        // Property type buttons: updates active styling ONLY (no fetch)
        document.querySelectorAll("[data-filter-type]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const type = btn.dataset.filterType;
                if (selectedPropertyType === type) {
                    selectedPropertyType = "";
                    btn.classList.remove("bg-[#7956C8]", "text-white");
                    btn.classList.add("border-gray-300", "text-gray-600");
                } else {
                    document
                        .querySelectorAll("[data-filter-type]")
                        .forEach((b) => {
                            b.classList.remove("bg-[#7956C8]", "text-white");
                            b.classList.add("border-gray-300", "text-gray-600");
                        });
                    selectedPropertyType = type;
                    btn.classList.add(
                        "bg-[#7956C8]",
                        "text-white",
                    );
                    btn.classList.remove("border-gray-300", "text-gray-600");
                }
            });
        });
    }

    // Initialize on DOM load with default page & limit
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            setupEventListeners();
            updateFilterPills();
            fetchProperties();
        });
    } else {
        setupEventListeners();
        updateFilterPills();
        fetchProperties();
    }
})();
