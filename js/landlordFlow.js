(() => {
    const API_BASE_URL = window.hostelFinderApiBaseUrl;
    const STORAGE_KEYS = {
        landlord: "hostelfinder_landlord_details",
        property: "hostelfinder_property_details",
        propertyId: "hostelfinder_property_id",
        schedule: "hostelfinder_inspection_schedule",
    };

    function getToken() {
        const token = localStorage.getItem("hostelFinderToken");
        if (!token) {
            throw new Error("Please log in as a landlord before listing a property.");
        }
        return token;
    }

    async function requestJson(path, { method = "GET", body, authenticated = true } = {}) {
        if (!API_BASE_URL) {
            throw new Error("The API base URL is not configured.");
        }

        const headers = new Headers();
        if (authenticated) {
            headers.set("Authorization", `Bearer ${getToken()}`);
        }
        if (body && !(body instanceof FormData)) {
            headers.set("Content-Type", "application/json");
        }

        const response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers,
            body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
        });
        const responseText = await response.text();
        let result = {};

        if (responseText) {
            try {
                result = JSON.parse(responseText);
            } catch {
                throw new Error(`The API returned an invalid response (HTTP ${response.status}).`);
            }
        }

        if (!response.ok) {
            throw new Error(
                result.message ||
                    result.error ||
                    `The API request failed (HTTP ${response.status}).`,
            );
        }

        return result;
    }

    function reportError(error, messageElement) {
        const message = error instanceof Error ? error.message : "The request failed.";
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.classList.add("text-red-700");
        }
        window.showToast(message, "error");
    }

    function setStatus(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.remove("text-red-700", "text-green-700");
        }
    }

    function setWorking(button, working, label) {
        if (!button) return;
        if (!button.dataset.originalLabel) {
            button.dataset.originalLabel = button.textContent;
        }
        button.disabled = working;
        button.textContent = working ? label : button.dataset.originalLabel;
    }

    function getStoredObject(key) {
        const raw = localStorage.getItem(key);
        if (!raw) return {};
        try {
            return JSON.parse(raw);
        } catch {
            throw new Error(`Saved landlord-flow data is invalid. Restart the property listing.`);
        }
    }

    async function uploadSingle(file) {
        const formData = new FormData();
        formData.append("file", file);
        const result = await requestJson("/upload/single", {
            method: "POST",
            body: formData,
        });
        if (typeof result.url !== "string" || !result.url) {
            throw new Error("The document upload response did not include a file URL.");
        }
        return result.url;
    }

    function initializeLandlordDetails() {
        const form = document.getElementById("landlord-form");
        if (!form) return;

        const fileInput = document.getElementById("govid-file");
        const fileDrop = document.getElementById("drop-govid");
        const fileLabel = document.getElementById("govid-label");
        const message = document.getElementById("landlord-form-message");
        const submitButton = form.querySelector("button[type='submit']");

        fileDrop.addEventListener("click", (event) => {
            if (event.target !== fileInput) fileInput.click();
        });
        fileInput.addEventListener("change", () => {
            const file = fileInput.files?.[0];
            if (file) fileLabel.textContent = file.name;
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!form.reportValidity()) return;
            setStatus(message, "Uploading your government ID...");
            setWorking(submitButton, true, "Uploading...");

            try {
                const file = fileInput.files?.[0];
                if (!file) throw new Error("Select your government ID to continue.");

                const verificationDocUrl = await uploadSingle(file);
                const landlordData = {
                    fullName: form.elements.fullName.value.trim(),
                    email: form.elements.email.value.trim(),
                    phone: form.elements.phone.value.trim(),
                    meansOfIdentification: form.elements.idType.value,
                    idNumber: form.elements.idNumber.value.trim(),
                    accountNumber: form.elements.accountNumber.value.trim(),
                    bankName: form.elements.bankName.value.trim(),
                    verificationDocUrl,
                };
                localStorage.setItem(STORAGE_KEYS.landlord, JSON.stringify(landlordData));
                localStorage.removeItem(STORAGE_KEYS.property);
                localStorage.removeItem(STORAGE_KEYS.propertyId);
                localStorage.removeItem(STORAGE_KEYS.schedule);
                window.location.href = "/pages/property-information.html";
            } catch (error) {
                reportError(error, message);
            } finally {
                setWorking(submitButton, false);
            }
        });
    }

    async function loadSchools(select, message) {
        select.disabled = true;
        select.replaceChildren(new Option("Loading campuses...", ""));
        const result = await requestJson("/schools?q=", { authenticated: false });
        if (!Array.isArray(result.schools)) {
            throw new Error("The campus list response is missing its schools array.");
        }

        const schools = result.schools.filter((school) => {
            return (school._id || school.id) && (school.name || school.title);
        });
        select.replaceChildren(new Option("Choose a nearby campus", ""));
        for (const school of schools) {
            const schoolId = school._id || school.id;
            const schoolName = school.name || school.title;
            select.add(new Option(schoolName, schoolId));
        }
        select.disabled = schools.length === 0;
        if (schools.length === 0) {
            throw new Error("No campuses are available. Please try again later.");
        }
        setStatus(message, "");
    }

    function initializePropertyInformation() {
        const form = document.getElementById("property-info-form");
        if (!form) return;

        const schoolSelect = document.getElementById("nearbySchool");
        const message = document.getElementById("property-info-message");
        const submitButton = form.querySelector("button[type='submit']");
        const ownershipInput = document.getElementById("ownership-input");
        const ownershipDrop = document.getElementById("drop-ownership");
        const ownershipLabel = document.getElementById("ownership-label");
        const dropZone = document.getElementById("drop-zone");
        const mediaInput = document.getElementById("media-input");
        const previewContainer = document.getElementById("media-preview-container");
        const addMoreButton = document.getElementById("add-more-btn");
        const selectedPhotos = [];

        ownershipDrop.addEventListener("click", (event) => {
            if (event.target !== ownershipInput) ownershipInput.click();
        });
        ownershipInput.addEventListener("change", () => {
            const file = ownershipInput.files?.[0];
            if (file) ownershipLabel.textContent = file.name;
        });

        function addPhotoPreview(file) {
            if (!file.type.startsWith("image/")) {
                window.showToast(`${file.name} is not an image.`, "error");
                return;
            }

            selectedPhotos.push(file);
            const objectUrl = URL.createObjectURL(file);
            const card = document.createElement("div");
            card.className =
                "relative aspect-[4/3] rounded-xl overflow-hidden border border-[#E2DBF0] bg-gray-100";

            const image = document.createElement("img");
            image.src = objectUrl;
            image.alt = file.name;
            image.className = "w-full h-full object-cover";

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className =
                "absolute top-1.5 right-1.5 bg-black/60 hover:bg-black text-white w-5 h-5 rounded-full flex items-center justify-center text-xs cursor-pointer transition";
            removeButton.setAttribute("aria-label", `Remove ${file.name}`);
            removeButton.innerHTML = '<i class="bx bx-x" aria-hidden="true"></i>';
            removeButton.addEventListener("click", () => {
                const index = selectedPhotos.indexOf(file);
                if (index >= 0) selectedPhotos.splice(index, 1);
                URL.revokeObjectURL(objectUrl);
                card.remove();
            });

            card.append(image, removeButton);
            previewContainer.insertBefore(card, addMoreButton);
        }

        function addPhotos(files) {
            Array.from(files).forEach(addPhotoPreview);
        }

        dropZone.addEventListener("click", (event) => {
            if (event.target !== mediaInput) mediaInput.click();
        });
        addMoreButton.addEventListener("click", () => mediaInput.click());
        dropZone.addEventListener("dragover", (event) => {
            event.preventDefault();
            dropZone.classList.add("bg-[#E8EDFC]");
        });
        dropZone.addEventListener("dragleave", () => {
            dropZone.classList.remove("bg-[#E8EDFC]");
        });
        dropZone.addEventListener("drop", (event) => {
            event.preventDefault();
            dropZone.classList.remove("bg-[#E8EDFC]");
            if (event.dataTransfer?.files.length) addPhotos(event.dataTransfer.files);
        });
        mediaInput.addEventListener("change", () => {
            addPhotos(mediaInput.files);
            mediaInput.value = "";
        });

        loadSchools(schoolSelect, message).catch((error) => {
            schoolSelect.replaceChildren(new Option("Unable to load campuses", ""));
            reportError(error, message);
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!form.reportValidity()) return;
            setStatus(message, "Uploading property documents...");
            setWorking(submitButton, true, "Uploading...");

            try {
                const landlordData = getStoredObject(STORAGE_KEYS.landlord);
                if (!landlordData.verificationDocUrl) {
                    throw new Error("Complete the landlord details step before continuing.");
                }
                if (!schoolSelect.value || schoolSelect.disabled) {
                    throw new Error("Choose a campus before continuing.");
                }

                const ownershipFile = ownershipInput.files?.[0];
                if (!ownershipFile) throw new Error("Select proof of ownership to continue.");
                if (selectedPhotos.length === 0) {
                    throw new Error("Add at least one property photo to continue.");
                }

                const ownershipUrl = await uploadSingle(ownershipFile);
                let photoUrls = [];
                if (selectedPhotos.length) {
                    const formData = new FormData();
                    selectedPhotos.forEach((file) => formData.append("files", file));
                    const uploadResult = await requestJson("/upload/multiple", {
                        method: "POST",
                        body: formData,
                    });
                    if (!Array.isArray(uploadResult.urls)) {
                        throw new Error("The photo upload response did not include a URLs array.");
                    }
                    photoUrls = uploadResult.urls;
                }

                const propertyData = {
                    name: form.elements.propertyName.value.trim(),
                    location: form.elements.location.value.trim(),
                    school: schoolSelect.selectedOptions[0].textContent,
                    schoolId: schoolSelect.value,
                    latitude: Number(form.elements.latitude.value),
                    longitude: Number(form.elements.longitude.value),
                    propertyType: form.elements.propertyType.value,
                    rent: Number(form.elements.monthlyRent.value),
                    description: form.elements.description.value.trim(),
                    amenities: Array.from(
                        form.querySelectorAll('input[name="amenities"]:checked'),
                        (input) => input.value.toLowerCase(),
                    ),
                    availability: document.getElementById("availability").checked,
                    proofOfOwnershipUrl: ownershipUrl,
                    photos: photoUrls.map((url, order) => ({ url, order })),
                };
                localStorage.setItem(STORAGE_KEYS.property, JSON.stringify(propertyData));
                window.location.href = "/pages/inspection-availability.html";
            } catch (error) {
                reportError(error, message);
            } finally {
                setWorking(submitButton, false);
            }
        });
    }

    function initializeAvailability() {
        const form = document.getElementById("availability-form");
        if (!form) return;

        const message = document.getElementById("availability-message");
        const submitButton = form.querySelector("button[type='submit']");
        const modal = document.getElementById("verification-modal");
        const modalCard = document.getElementById("modal-card");

        document.querySelectorAll(".day-card").forEach((card) => {
            const toggle = card.querySelector(".day-toggle");
            const label = card.querySelector(".day-status-label");
            const fields = card.querySelector(".time-fields");
            if (!toggle) return;

            function applyState() {
                const available = toggle.checked;
                label.textContent = available ? "Available" : "Unavailable";
                label.classList.toggle("text-[#3157D5]", available);
                label.classList.toggle("text-[#A098AE]", !available);
                card.classList.toggle("opacity-60", !available);
                if (fields) fields.classList.toggle("hidden", !available);
                card.querySelectorAll('input[type="time"]').forEach((input) => {
                    input.disabled = !available;
                });
            }

            toggle.addEventListener("change", applyState);
            applyState();
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            setStatus(message, "");
            setWorking(submitButton, true, "Submitting...");

            try {
                const landlordData = getStoredObject(STORAGE_KEYS.landlord);
                const propertyData = getStoredObject(STORAGE_KEYS.property);
                if (!landlordData.verificationDocUrl || !propertyData.schoolId) {
                    throw new Error("Complete the landlord and property details before submitting.");
                }

                const weeklySchedule = Array.from(
                    document.querySelectorAll(".day-card"),
                    (card) => {
                        const [from, to] = card.querySelectorAll('input[type="time"]');
                        const isAvailable = card.querySelector(".day-toggle").checked;
                        return {
                            day: card.dataset.day,
                            isAvailable,
                            ...(isAvailable ? { from: from.value, to: to.value } : {}),
                        };
                    },
                );
                const availableDays = weeklySchedule.filter((day) => day.isAvailable);
                if (availableDays.length === 0) {
                    throw new Error("Choose at least one day for property inspections.");
                }
                if (
                    availableDays.some(
                        (day) => !day.from || !day.to || day.from >= day.to,
                    )
                ) {
                    throw new Error("For each available day, set an end time later than its start time.");
                }
                localStorage.setItem(STORAGE_KEYS.schedule, JSON.stringify(weeklySchedule));

                let propertyId = localStorage.getItem(STORAGE_KEYS.propertyId);
                if (!propertyId) {
                    setStatus(message, "Creating your property listing...");
                    const createResult = await requestJson("/properties", {
                        method: "POST",
                        body: {
                            title: propertyData.name,
                            description: propertyData.description,
                            price: propertyData.rent,
                            address: propertyData.location,
                            latitude: propertyData.latitude,
                            longitude: propertyData.longitude,
                            propertyType: propertyData.propertyType,
                            schoolId: propertyData.schoolId,
                            availabilityStatus: propertyData.availability ? "available" : "unavailable",
                            amenities: propertyData.amenities,
                            proofOfOwnershipUrl: propertyData.proofOfOwnershipUrl,
                            photos: propertyData.photos,
                            inspectionAvailability: weeklySchedule,
                        },
                    });
                    propertyId = createResult.property?._id || createResult.property?.id;
                    if (!propertyId) {
                        throw new Error("The property was created but its ID was missing from the API response.");
                    }
                    localStorage.setItem(STORAGE_KEYS.propertyId, propertyId);
                }

                setStatus(message, "Saving your inspection schedule...");
                await requestJson("/slots", {
                    method: "POST",
                    body: {
                        propertyId,
                        slotMinutes: 60,
                        weeksAhead: 2,
                        weeklySchedule: availableDays,
                    },
                });

                localStorage.setItem("hostelfinder_landlord_approval_status", "pending");
                const adminLandlords = getStoredObject("hostelfinder_admin_landlords");
                if (Array.isArray(adminLandlords)) {
                    const newLandlord = {
                        id: "landlord_current",
                        name: landlordData.fullName,
                        email: landlordData.email,
                        phone: landlordData.phone,
                        property: propertyData.name,
                        location: propertyData.location,
                        rent: propertyData.rent,
                        avatar: "/images/male1.png",
                        status: "pending",
                        idType: landlordData.meansOfIdentification,
                        idNumber: landlordData.idNumber,
                        accountNumber: landlordData.accountNumber,
                        bankName: landlordData.bankName,
                        submittedAt: new Date().toLocaleDateString(),
                    };
                    const index = adminLandlords.findIndex(
                        (landlord) =>
                            landlord.id === "landlord_current" ||
                            landlord.email === landlordData.email,
                    );
                    if (index >= 0) adminLandlords[index] = newLandlord;
                    else adminLandlords.unshift(newLandlord);
                    localStorage.setItem(
                        "hostelfinder_admin_landlords",
                        JSON.stringify(adminLandlords),
                    );
                }

                setStatus(message, "Property and inspection schedule submitted successfully.");
                modal.classList.remove("hidden");
                requestAnimationFrame(() => {
                    modal.classList.remove("opacity-0");
                    modalCard.classList.remove("scale-95");
                    modalCard.classList.add("scale-100");
                });
            } catch (error) {
                reportError(error, message);
            } finally {
                setWorking(submitButton, false);
            }
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        initializeLandlordDetails();
        initializePropertyInformation();
        initializeAvailability();
    });
})();
