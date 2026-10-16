// const { jsx } = require("react/jsx-runtime");

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
    let currentPropertyId = null;
    let currentProperty = null;
    let bookingInProgress = false;
    let isRescheduling = false;

    function getBookingStorageKey(propertyId) {
        const userId = localStorage.getItem("hostelFinderUserId") || "current-user";
        return `hostelFinderInspectionBooked:${userId}:${propertyId}`;
    }

    function getInspectionDetailsStorageKey(propertyId) {
        const userId = localStorage.getItem("hostelFinderUserId") || "current-user";
        return `hostelFinderInspectionDetails:${userId}:${propertyId}`;
    }

    function hasBookedInspection(propertyId) {
        return localStorage.getItem(getBookingStorageKey(propertyId)) === "true";
    }

    function setBookingFormVisible(visible) {
        const dateSection = document.getElementById("inspection-date-section");
        const timeSection = document.getElementById("inspection-time-section");
        if (dateSection) dateSection.classList.toggle("hidden", !visible);
        if (timeSection) timeSection.classList.toggle("hidden", !visible);
        const confirmButton = document.getElementById("confirm-inspection");
        if (confirmButton) confirmButton.classList.toggle("hidden", !visible);
    }

    function showPreviouslyBookedState() {
        setBookingFormVisible(false);
        showSlotStatus(
            "You have already booked an inspection for this property. Choose reschedule to request another time.",
        );
        const rescheduleButton = document.getElementById("reschedule-inspection");
        if (rescheduleButton) rescheduleButton.hidden = false;
    }

    function getAuthHeaders(includeJsonContentType = false) {
        const headers = {};
        if (includeJsonContentType) {
            headers["Content-Type"] = "application/json";
        }

        const token = localStorage.getItem("hostelFinderToken");
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    }

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
                divider.className =
                    "hidden text-sm text-[#3157D5]/40 sm:inline";
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
                "flex items-center gap-1.5 text-[11px] font-medium text-[#3157D5]";

            const icon = document.createElement("i");
            icon.className = `bx ${AMENITY_ICONS[value.toLowerCase()] || "bx-check-circle"} text-sm`;
            item.append(icon, document.createTextNode(` ${label}`));
            container.appendChild(item);
        });
    }

    function getSlotsFromResponse(payload) {
        const candidates = [
            payload,
            payload && payload.slots,
            payload && payload.availableSlots,
            payload && payload.data,
            payload && payload.data && payload.data.slots,
            payload && payload.data && payload.data.availableSlots,
        ];
        const slots = candidates.find(Array.isArray);
        if (!slots) {
            throw new Error("The slots response did not contain a list of slots.");
        }
        return slots;
    }

    function getSlotDate(slot) {
        const value =
            slot.date ||
            slot.startDate ||
            slot.startAt ||
            slot.startsAt ||
            slot.start ||
            slot.startDateTime ||
            slot.startTime ||
            slot.datetime;
        if (!value) return null;

        if (typeof value === "string") {
            const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (dateOnly) {
                return new Date(
                    Number(dateOnly[1]),
                    Number(dateOnly[2]) - 1,
                    Number(dateOnly[3]),
                );
            }
        }

        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatSlotTime(value) {
        if (value === undefined || value === null || value === "") return "";
        if (typeof value === "string") {
            const timeOnly = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
            if (timeOnly) {
                const date = new Date();
                date.setHours(Number(timeOnly[1]), Number(timeOnly[2]), 0, 0);
                return date.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                });
            }
        }

        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return date.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
            });
        }
        return String(value);
    }

    function getSlotLabel(slot) {
        const start =
            slot.startTime || slot.startAt || slot.startsAt || slot.startDateTime || slot.start;
        const end =
            slot.endTime || slot.endAt || slot.endsAt || slot.endDateTime || slot.end;
        if (start && end) {
            return `${formatSlotTime(start)} – ${formatSlotTime(end)}`;
        }
        return String(slot.time || slot.label || slot.timeRange || "Available");
    }

    function showSlotStatus(message, isError = false) {
        const status = document.getElementById("booking-slot-status");
        if (!status) return;
        status.textContent = message;
        status.classList.toggle("text-red-700", isError);
        status.classList.toggle("text-gray-600", !isError);
    }

    function renderSlots(slots) {
        const datePicker = document.getElementById("date-picker");
        const timePicker = document.getElementById("time-picker");
        const confirmButton = document.getElementById("confirm-inspection");
        if (!datePicker || !timePicker || !confirmButton) return;

        const groupedSlots = new Map();
        slots.forEach((slot) => {
            if (!slot || typeof slot !== "object") return;
            if (
                slot.available === false ||
                slot.isAvailable === false ||
                slot.isBooked === true ||
                slot.booked === true
            ) {
                return;
            }

            const slotId = slot._id || slot.id || slot.slotId;
            const date = getSlotDate(slot);
            if (!slotId || !date) return;

            const dateKey = [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, "0"),
                String(date.getDate()).padStart(2, "0"),
            ].join("-");
            if (!groupedSlots.has(dateKey)) groupedSlots.set(dateKey, []);
            groupedSlots.get(dateKey).push({
                id: String(slotId),
                label: getSlotLabel(slot),
            });
        });

        datePicker.replaceChildren();
        timePicker.replaceChildren();
        confirmButton.disabled = true;

        if (groupedSlots.size === 0) {
            showSlotStatus("There are no available inspection slots for this property.");
            return;
        }

        const dateKeys = Array.from(groupedSlots.keys()).sort();
        dateKeys.forEach((dateKey) => {
            const [year, month, day] = dateKey.split("-").map(Number);
            const date = new Date(year, month - 1, day);
            const dateButton = document.createElement("button");
            dateButton.type = "button";
            dateButton.setAttribute("aria-pressed", "false");
            dateButton.className =
                "date-btn flex min-w-0 flex-col items-center rounded-lg bg-[#e8edfc] px-1 py-2 text-xs text-[#3157D5] transition hover:bg-[#dce5fb]";

            const weekday = document.createElement("span");
            weekday.className = "text-[11px] font-medium";
            weekday.textContent = date.toLocaleDateString([], { weekday: "short" });
            const dateLabel = document.createElement("span");
            dateLabel.className = "mt-0.5 font-bold";
            dateLabel.textContent = date.toLocaleDateString([], {
                day: "numeric",
                month: "short",
            });
            const dot = document.createElement("span");
            dot.className = "dot w-1.5 h-1.5 rounded-full bg-gray-300 mt-1";
            dateButton.append(weekday, dateLabel, dot);
            dateButton.addEventListener("click", () => {
                window.selectDate(dateButton);
                timePicker.replaceChildren();
                groupedSlots.get(dateKey).forEach((slot) => {
                    const timeButton = document.createElement("button");
                    timeButton.type = "button";
                    timeButton.dataset.slotId = slot.id;
                    timeButton.dataset.slotDate = dateKey;
                    timeButton.setAttribute("aria-pressed", "false");
                    timeButton.className =
                        "time-btn flex min-h-12 items-center justify-center rounded-md border border-[#b8c8f8] bg-white px-3 py-2 text-sm text-[#3157D5] text-center transition hover:bg-[#f5f7ff]";
                    timeButton.textContent = slot.label;
                    timeButton.addEventListener("click", () =>
                        window.selectTime(timeButton),
                    );
                    timePicker.appendChild(timeButton);
                });

                const firstTimeButton = timePicker.querySelector(".time-btn");
                if (firstTimeButton) window.selectTime(firstTimeButton);
                confirmButton.disabled = !firstTimeButton;
            });
            datePicker.appendChild(dateButton);
        });

        showSlotStatus("Choose an available date and time to continue.");
        datePicker.querySelector(".date-btn").click();
    }

    async function loadSlots(propertyId) {
        const datePicker = document.getElementById("date-picker");
        const timePicker = document.getElementById("time-picker");
        const confirmButton = document.getElementById("confirm-inspection");
        const rescheduleButton = document.getElementById("reschedule-inspection");
        if (hasBookedInspection(propertyId) && !isRescheduling) {
            showPreviouslyBookedState();
            return;
        }
        setBookingFormVisible(true);
        if (rescheduleButton) rescheduleButton.hidden = true;
        if (datePicker) datePicker.replaceChildren();
        if (timePicker) timePicker.replaceChildren();
        if (confirmButton) confirmButton.disabled = true;
        showSlotStatus(
            isRescheduling
                ? "Choose a new available date and time."
                : "Loading available inspection slots...",
        );

        try {
            const headers = getAuthHeaders();
            if (!headers.Authorization) {
                throw new Error(
                    "Your login session is missing its authentication token. Please log in again.",
                );
            }
            const response = await fetch(
                `${API_BASE_URL}/slots/property/${encodeURIComponent(propertyId)}`,
                { headers },
            );
            if (!response.ok) {
                throw new Error(`Unable to load inspection slots (HTTP ${response.status}).`);
            }
            const slots = getSlotsFromResponse(await response.json());
            renderSlots(slots);
        } catch (error) {
            console.error("Failed to load inspection slots:", error);
            const message =
                error.message || "Unable to load inspection slots. Please try again.";
            showSlotStatus(message, true);
            window.showToast(message, "error");
        }
    }

    async function bookInspection() {
        const confirmButton = document.getElementById("confirm-inspection");
        const selectedTime = document.querySelector("#time-picker .time-btn.selected");
        const slotId = selectedTime && selectedTime.dataset.slotId;
        if (!currentPropertyId || !slotId || bookingInProgress) {
            showSlotStatus("Choose an available inspection time before continuing.", true);
            return;
        }

        bookingInProgress = true;
        if (confirmButton) {
            confirmButton.disabled = true;
            confirmButton.textContent = isRescheduling
                ? "Submitting Reschedule..."
                : "Booking...";
        }
        showSlotStatus(
            isRescheduling
                ? "Submitting your reschedule request..."
                : "Booking your inspection...",
        );

        try {
            const headers = getAuthHeaders(true);
            if (!headers.Authorization) {
                throw new Error(
                    "Your login session is missing its authentication token. Please log in again.",
                );
            }
            const response = await fetch(`${API_BASE_URL}/inspections`, {
                method: "POST",
                headers,
                body: JSON.stringify({ propertyId: currentPropertyId, slotId }),
            });
            if (!response.ok) {
                const details = (await response.text()).trim();
                let errorMessage = details;
                try {
                    const errorPayload = JSON.parse(details);
                    if (
                        typeof errorPayload.message === "string" &&
                        errorPayload.message.trim()
                    ) {
                        errorMessage = errorPayload.message.trim();
                    }
                } catch {
                    // The API may return a plain-text error instead of JSON.
                }
                throw new Error(
                    errorMessage ||
                        `Unable to book inspection (HTTP ${response.status}).`,
                );
            }
            try {
                saveInspectionDetails(currentPropertyId, slotId, selectedTime);
            } catch (storageError) {
                console.error(
                    "Inspection booked, but appointment details could not be saved:",
                    storageError,
                );
                showSlotStatus(
                    "Your inspection was booked, but the appointment details could not be saved in this browser. Please do not submit another booking.",
                    true,
                );
                window.showToast(
                    "Inspection booked, but its details could not be saved.",
                    "error",
                );
                return;
            }
            if (!isRescheduling) {
                try {
                    localStorage.setItem(
                        getBookingStorageKey(currentPropertyId),
                        "true",
                    );
                } catch (storageError) {
                    console.error(
                        "Inspection booked, but the booking restriction could not be saved:",
                        storageError,
                    );
                    setBookingFormVisible(false);
                    showSlotStatus(
                        "Your inspection was booked, but this browser could not save the booking status. Please avoid submitting another request for this property.",
                        true,
                    );
                    return;
                }
            }
            window.showToast(
                isRescheduling
                    ? "Inspection request submitted successfully."
                    : "Inspection booked successfully.",
                "success",
            );
            await new Promise((resolve) => window.setTimeout(resolve, 1200));
            window.location.href = `/pages/your-inspection.html?propertyId=${encodeURIComponent(currentPropertyId)}`;
        } catch (error) {
            console.error("Failed to book inspection:", error);
            const message =
                error.message || "Unable to book your inspection. Please try again.";
            showSlotStatus(message, true);
            window.showToast(message, "error");
        } finally {
            bookingInProgress = false;
            if (confirmButton) {
                confirmButton.disabled = !document.querySelector(
                    "#time-picker .time-btn.selected",
                );
                confirmButton.textContent = isRescheduling
                    ? "Submit Reschedule Request"
                    : "Confirm Inspection";
            }
        }
    }

    function saveInspectionDetails(propertyId, slotId, selectedTime) {
        let property = currentProperty;
        if (!property || String(property._id) !== String(propertyId)) {
            try {
                property = JSON.parse(
                    sessionStorage.getItem("selectedProperty") || "null",
                );
            } catch (error) {
                console.error(
                    "Unable to read selected property for inspection details:",
                    error,
                );
            }
        }
        if (!property || String(property._id) !== String(propertyId)) {
            throw new Error("The selected property details are unavailable.");
        }

        const photo =
            Array.isArray(property.photos) && property.photos.length
                ? typeof property.photos[0] === "string"
                    ? property.photos[0]
                    : property.photos[0].url
                : property.coverPhoto || "";
        const slotDate = selectedTime.dataset.slotDate;
        let dateTime = selectedTime.textContent.trim();
        if (slotDate) {
            const [year, month, day] = slotDate.split("-").map(Number);
            const date = new Date(year, month - 1, day);
            const dateLabel = date.toLocaleDateString([], {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
            });
            dateTime = `${dateLabel} · ${dateTime}`;
        }

        const distance = property.distanceFromSchoolKm;
        const drivingTime = property.drivingTimeMinutes;
        const schoolName = KNOWN_SCHOOLS[property.schoolId] || "Campus Area";
        const proximity =
            drivingTime > 0
                ? `~${drivingTime} mins from ${schoolName}`
                : distance > 0
                  ? `~${distance} km from ${schoolName}`
                  : "";
        const booking = {
            propertyId: String(propertyId),
            slotId,
            propertyTitle: property.title || "Property",
            propertyType: formatPropertyType(property.propertyType),
            address: property.address || "",
            proximity,
            photo,
            dateTime,
            updatedAt: new Date().toISOString(),
        };

        localStorage.setItem(
            getInspectionDetailsStorageKey(propertyId),
            JSON.stringify(booking),
        );
        sessionStorage.setItem(
            "hostelFinderLastInspectionBooking",
            JSON.stringify(booking),
        );
    }

    function renderProperty(property, extraData = {}) {
        currentProperty = property;
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
            availability.classList.toggle("bg-green-100", isAvailable);
            availability.classList.toggle("bg-gray-400", !isAvailable);
            availability.classList.toggle("text-green-800", isAvailable);
            availability.classList.toggle("text-white", !isAvailable);
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
            ratingElement.classList.toggle("flex", rating !== null);
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

        currentPropertyId = propertyId;
        loadSlots(propertyId);

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
            errorElement.textContent = JSON.stringify(message);
            errorElement.classList.remove("hidden");
        }
    }

    const confirmButton = document.getElementById("confirm-inspection");
    if (confirmButton) confirmButton.addEventListener("click", bookInspection);
    const rescheduleButton = document.getElementById("reschedule-inspection");
    if (rescheduleButton) {
        rescheduleButton.addEventListener("click", () => {
            isRescheduling = true;
            rescheduleButton.hidden = true;
            confirmButton.textContent = "Submit Reschedule Request";
            loadSlots(currentPropertyId);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadProperty);
    } else {
        loadProperty();
    }
})();
