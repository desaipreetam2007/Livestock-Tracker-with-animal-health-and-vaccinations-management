

// ============================================================
// 1. ANIMAL REGISTRATION
// Handles registration form submission and sends new animal data to the API.
// ============================================================
// To register an animal
const animalForm = document.querySelector("#animalForm");
const message = document.querySelector("#message");
// Express backend address. Update this IP if the Mac joins a different network.
const API_BASE_URL = "http://192.168.0.159:3000";

// Intercept submission to send JSON to the backend without reloading the page.
animalForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const name = document.querySelector("#name").value.trim();
    const type = document.querySelector("#type").value;
    const breed = document.querySelector("#breed").value.trim();

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/animals`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: name,
                    type: type,
                    breed: breed
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Something went wrong");
        }

        message.textContent = data.message;

        console.log("Created animal:", data.animal);

        animalForm.reset();

    } catch (error) {
        message.textContent = error.message;
    }
});

// ============================================================
// 2. VACCINATION OVERVIEW
// Loads and displays vaccination status totals across active animals.
// ============================================================
// Refresh vaccination page button
const refreshVaccinations = document.querySelector("#refreshVaccinations");
const vaccinationMessage = document.querySelector("#vaccinationMessage");
const vaccinationSummary = document.querySelector("#vaccinationSummary");
const vaccinationList = document.querySelector("#vaccinationList");
//executes when we click refresh overview button
// Load the overview when the user clicks Refresh Overview.
refreshVaccinations.addEventListener("click", loadVaccinationOverview);

// Fetches the overview, calculates totals, and renders one summary card per animal.
async function loadVaccinationOverview() {
    vaccinationMessage.textContent = "Loading vaccination overview...";
    vaccinationSummary.replaceChildren();
    vaccinationList.replaceChildren();

    refreshVaccinations.disabled = true;

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/vaccinations/overview`
        );

        const animals = await response.json();

        if (!response.ok) {
            throw new Error("Failed to load vaccination overview");
        }

        if (!Array.isArray(animals)) {
            throw new Error("Unexpected API response");
        }

        vaccinationMessage.textContent =
            `Loaded ${animals.length} animals.`;

        let overdue = 0;
        let dueToday = 0;
        let upcoming = 0;
        let later = 0;
        let notScheduled = 0;

        for (const animal of animals) {
            overdue += animal.overdue;
            dueToday += animal.due_today;
            upcoming += animal.upcoming;
            later += animal.later;
            notScheduled += animal.not_scheduled;
        }

        const summaryItems = [
            ["Overdue", overdue],
            ["Due Today", dueToday],
            ["Upcoming", upcoming],
            ["Later", later],
            ["Not Scheduled", notScheduled]
        ];

        for (const [label, count] of summaryItems) {
            const item = document.createElement("p");
            item.textContent = `${label}: ${count}`;
            vaccinationSummary.append(item);
        }

        if (animals.length === 0) {
            vaccinationMessage.textContent = "No active animals found.";
            return;
        }

        for (const animal of animals) {
            const card = document.createElement("div");

            const heading = document.createElement("h3");
            heading.textContent = animal.name;

            const details = document.createElement("p");
            details.textContent =
                `${animal.type} | ${animal.breed} | ID: ${animal.id}`;

            const status = document.createElement("p");
            status.textContent =
                `Overdue: ${animal.overdue} | ` +
                `Due Today: ${animal.due_today} | ` +
                `Upcoming: ${animal.upcoming} | ` +
                `Later: ${animal.later} | ` +
                `Not Scheduled: ${animal.not_scheduled}`;

            card.append(heading, details, status);
            vaccinationList.append(card);
        }

    } catch (error) {
        vaccinationMessage.textContent =
            `Error: ${error.message}`;

    } finally {
        refreshVaccinations.disabled = false;
    }
}

// ============================================================
// 3. ANIMAL LIST AND ANIMAL CARD ACTIONS
// Loads active animals and builds the controls/forms for each animal.
// ============================================================
// Refresh Animal details button
const refreshAnimals = document.querySelector("#refreshAnimals");
const animalListMessage = document.querySelector("#animalListMessage");
const animalList = document.querySelector("#animalList");
// Elements used for displaying and managing deleted animals.
const showAnimalTrash = document.querySelector("#showAnimalTrash");
const animalTrashContainer = document.querySelector("#animalTrashContainer");

// Reload the active animal list when the user clicks Refresh Animals.
refreshAnimals.addEventListener("click", loadAnimals);
// Show or hide the recently deleted animals section.
showAnimalTrash.addEventListener("click", async () => {
    console.log("Recently Deleted button clicked!");
    if (!animalTrashContainer.hidden) {
        animalTrashContainer.hidden = true;
        showAnimalTrash.textContent = "Recently Deleted Animals";
        return;
    }

    animalTrashContainer.hidden = false;
    showAnimalTrash.textContent = "Hide Deleted Animals";

    await loadAnimalTrash();
});

// Fetches active animals and creates an interactive card for each result.
async function loadAnimals() {
    console.log("loadanimals() called");
    animalListMessage.textContent = "Loading animals...";
    animalList.replaceChildren();
    refreshAnimals.disabled = true;

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/animals`
        );

        const animals = await response.json();

        if (!response.ok) {
            throw new Error("Failed to load animals");
        }

        if (!Array.isArray(animals)) {
            throw new Error("Unexpected API response");
        }

        if (animals.length === 0) {
            animalListMessage.textContent = "No active animals found.";
            return;
        }

        animalListMessage.textContent =
            `Loaded ${animals.length} active animals.`;

        for (const animal of animals) {
            const card = document.createElement("div");

            const heading = document.createElement("h3");
            heading.textContent = animal.name;

            const details = document.createElement("p");
            details.textContent =
                `Type: ${animal.type} | ` +
                `Breed: ${animal.breed} | ` +
                `ID: ${animal.id}`;


            const viewButton = document.createElement("button");
            viewButton.type = "button";
            viewButton.textContent = "View Details";

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Delete";

            // Deletes an animal using soft deletion.
            // The confirmation is shown before disabling the button.
            deleteButton.addEventListener("click", async event => {
                event.preventDefault();

                const confirmed = confirm(
                    `Are you sure you want to delete ${animal.name}?`
                );

                if (!confirmed) {
                    return;
                }

                deleteButton.disabled = true;
                deleteButton.textContent = "Deleting...";

                try {
                    const response = await fetch(
                        `${API_BASE_URL}/api/animals/${animal.id}`,
                        {
                            method: "DELETE"
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.message || "Could not delete the animal"
                        );
                    }

                    alert(`${animal.name} deleted successfully.`);

                    await loadAnimals();

                } catch (error) {
                    console.error(error);
                    alert(error.message);

                    deleteButton.disabled = false;
                    deleteButton.textContent = "Delete";
                }
            });

            const healthButton = document.createElement("button");
            healthButton.type = "button";
            healthButton.textContent = "View Health Records";

            const healthContainer = document.createElement("div");
            healthContainer.hidden = true;

            const addHealthButton = document.createElement("button");
            addHealthButton.type = "button";
            addHealthButton.textContent = "Add Health Record";

            const addHealthContainer = document.createElement("div");
            addHealthContainer.hidden = true;

            const vaccinationButton = document.createElement("button");
            vaccinationButton.type = "button";
            vaccinationButton.textContent = "View Vaccination History";

            const vaccinationContainer = document.createElement("div");
            vaccinationContainer.hidden = true;

            const addVaccinationButton = document.createElement("button");
            addVaccinationButton.type = "button";
            addVaccinationButton.textContent = "Add Vaccination Record";

            const addVaccinationContainer = document.createElement("div");
            addVaccinationContainer.hidden = true;

            // Form used to enter a new health record for this animal.
            const healthForm = document.createElement("form");

            healthForm.innerHTML = `
                 <h4>Add Health Record</h4>

                <label>
                Record Date:
                 <input type="date" name="record_date" required>
                         </label>

                 <label>
                    Symptoms:
                 <input type="text" name="symptoms" required>
                </label>

                 <label>
                    Diagnosis:
                <input type="text" name="diagnosis">
                 </label>

                <label>
                 Treatment:
                 <textarea name="treatment"></textarea>
                </label>

                <label>
                Vet Name:
                <input type="text" name="vet_name">
                 </label>

                 <button type="submit">Save Health Record</button>
                    `;

            addHealthContainer.append(healthForm);

            // Form used to enter a new vaccination record for this animal.
            const VaccinationForm = document.createElement("form");

            VaccinationForm.innerHTML = `
                 <h4>Add Vaccination Record</h4>

                <label>
                Vaccine:
                 <input type="text" name="vaccine_name" required>
                         </label>

                 <label>
                    Vaccination Date:
                 <input type="date" name="vaccination_date" required>
                </label>

                 <label>
                    Next Due Date:
                <input type="date" name="next_due_date">
                 </label>

                <label>
                Vet Name:
                <input type="text" name="vet_name">
                 </label>

                <label>
                 Notes:
                 <textarea name="notes"></textarea>
                </label>

                 <button type="submit">Save Vaccination Record</button>
                    `;

            addVaccinationContainer.append(VaccinationForm);

            // Show or hide the Add Health Record form.
            addHealthButton.addEventListener("click", () => {
                if (!addHealthContainer.hidden) {
                    addHealthContainer.hidden = true;
                    addHealthButton.textContent = "Add Health Record";
                    return;
                }

                addHealthContainer.hidden = false;
                addHealthButton.textContent = "Cancel";
            });

            // Show or hide the Add Vaccination Record form.
            addVaccinationButton.addEventListener("click", () => {
                if (!addVaccinationContainer.hidden) {
                    addVaccinationContainer.hidden = true;
                    addVaccinationButton.textContent = "Add Vaccination Record";
                    return;
                }

                addVaccinationContainer.hidden = false;
                addVaccinationButton.textContent = "Cancel";
            });

            // Show or hide vaccination history for the selected animal.
            vaccinationButton.addEventListener("click", async () => {
                if (!vaccinationContainer.hidden) {
                    vaccinationContainer.hidden = true;
                    vaccinationButton.textContent = "View Vaccination History";
                    return;
                }

                vaccinationContainer.hidden = false;
                vaccinationButton.textContent = "Hide Vaccination History";

                await loadVaccinationRecords(animal.id, vaccinationContainer);
            });

            // Show or hide health records for the selected animal.
            healthButton.addEventListener("click", async () => {
                if (!healthContainer.hidden) {
                    healthContainer.hidden = true;
                    healthButton.textContent = "View Health Records";
                    return;
                }

                healthContainer.hidden = false;
                healthButton.textContent = "Hide Health Records";

                await loadHealthRecords(animal.id, healthContainer);
            });

            // Handle submission of a new health record.
            healthForm.addEventListener("submit", async (event) => {
                event.preventDefault();

                const formData = new FormData(healthForm);

                const healthRecord = {
                    record_date: formData.get("record_date"),
                    symptoms: formData.get("symptoms"),
                    diagnosis: formData.get("diagnosis"),
                    treatment: formData.get("treatment"),
                    vet_name: formData.get("vet_name")
                };

                try {
                    const response = await fetch(
                        `${API_BASE_URL}/api/animals/${animal.id}/health-records`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(healthRecord)
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.message || "Failed to save Health record"
                        );
                    }

                    alert("Health record saved successfully!");

                    healthForm.reset();

                    if (!healthContainer.hidden) {
                        await loadHealthRecords(animal.id, healthContainer);
                    }

                } catch (error) {
                    console.error(error);
                    alert(error.message);
                }
            });

            // Handle submission of a new vaccination record.
            VaccinationForm.addEventListener("submit", async (event) => {
                event.preventDefault();

                const form1Data = new FormData(VaccinationForm);

                const vaccinationRecord = {
                    vaccine_name: form1Data.get("vaccine_name"),
                    vaccination_date: form1Data.get("vaccination_date"),
                    next_due_date: form1Data.get("next_due_date"),
                    vet_name: form1Data.get("vet_name"),
                    notes: form1Data.get("notes")
                };

                try {
                    const response = await fetch(
                        `${API_BASE_URL}/api/animals/${animal.id}/vaccinations`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(vaccinationRecord)
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.message || "Failed to save vaccination record"
                        );
                    }

                    alert("Vaccination record saved successfully!");

                    VaccinationForm.reset();

                    if (!vaccinationContainer.hidden) {
                        await loadVaccinationRecords(animal.id, vaccinationContainer);
                    }

                } catch (error) {
                    console.error(error);
                    alert(error.message);
                }
            });
            // Button and container for editing the animal's details.
            const editButton = document.createElement("button");
            editButton.textContent = "Edit";

            const editContainer = document.createElement("div");
            editContainer.hidden = true;

            const editMessage = document.createElement("p");
            editMessage.setAttribute("aria-live", "polite");

            // Create and display the animal edit form when Edit is clicked.
            editButton.addEventListener("click", () => {
                // Toggle the edit form.
                if (!editContainer.hidden) {
                    editContainer.hidden = true;
                    return;
                }

                editContainer.replaceChildren();

                const editForm = document.createElement("form");

                // Name
                const nameLabel = document.createElement("label");
                nameLabel.textContent = "Animal Name: ";

                const nameInput = document.createElement("input");
                nameInput.type = "text";
                nameInput.value = animal.name;
                nameInput.required = true;

                nameLabel.append(nameInput);

                // Type
                const typeLabel = document.createElement("label");
                typeLabel.textContent = "Animal Type: ";

                const typeSelect = document.createElement("select");
                typeSelect.required = true;

                const animalTypes = [
                    "Cow",
                    "Buffalo",
                    "Goat",
                    "Sheep"
                ];

                for (const type of animalTypes) {
                    const option = document.createElement("option");
                    option.value = type;
                    option.textContent = type;

                    if (type === animal.type) {
                        option.selected = true;
                    }

                    typeSelect.append(option);
                }

                typeLabel.append(typeSelect);

                // Breed
                const breedLabel = document.createElement("label");
                breedLabel.textContent = "Breed: ";

                const breedInput = document.createElement("input");
                breedInput.type = "text";
                breedInput.value = animal.breed;
                breedInput.required = true;

                breedLabel.append(breedInput);

                // Buttons
                const saveButton = document.createElement("button");
                saveButton.type = "submit";
                saveButton.textContent = "Save Changes";

                const cancelButton = document.createElement("button");
                cancelButton.type = "button";
                cancelButton.textContent = "Cancel";

                cancelButton.addEventListener("click", () => {
                    editContainer.hidden = true;
                });

                editForm.append(
                    nameLabel,
                    document.createElement("br"),
                    typeLabel,
                    document.createElement("br"),
                    breedLabel,
                    document.createElement("br"),
                    saveButton,
                    cancelButton
                );

                // Prevent the browser from reloading the page on submission.
                editForm.addEventListener("submit", async (event) => {
                    event.preventDefault();

                    const updatedAnimal = {
                        name: nameInput.value.trim(),
                        type: typeSelect.value,
                        breed: breedInput.value.trim()
                    };

                    saveButton.disabled = true;
                    saveButton.textContent = "Saving...";

                    try {
                        const response = await fetch(
                            `${API_BASE_URL}/api/animals/${animal.id}`,
                            {
                                method: "PATCH",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify(updatedAnimal)
                            }
                        );

                        const data = await response.json();

                        if (!response.ok) {
                            throw new Error(
                                data.message || "Failed to update animal"
                            );
                        }

                        // Update the displayed card with the saved values.
                        animal.name = updatedAnimal.name;
                        animal.type = updatedAnimal.type;
                        animal.breed = updatedAnimal.breed;

                        heading.textContent = animal.name;

                        details.textContent =
                            `Type: ${animal.type} | ` +
                            `Breed: ${animal.breed} | ` +
                            `ID: ${animal.id}`;

                        editContainer.hidden = true;

                        // Refresh the details if they are already open.
                        if (!detailsContainer.hidden) {
                            await loadAnimalDetails(animal.id, detailsContainer);
                        }

                        editButton.textContent = "Edit";

                        // Display success feedback.
                        editMessage.textContent = "Animal updated successfully.";

                    } catch (error) {
                        alert(error.message);

                    } finally {
                        saveButton.disabled = false;
                        saveButton.textContent = "Save Changes";
                    }
                });

                editContainer.append(editForm);
                editContainer.hidden = false;
            });

            // Container where the selected animal's details will appear.
            const detailsContainer = document.createElement("div");
            detailsContainer.hidden = true;

            // Show or hide the selected animal's details.
            viewButton.addEventListener("click", async () => {

                // If details are already open, close them.
                if (!detailsContainer.hidden) {
                    detailsContainer.hidden = true;
                    viewButton.textContent = "View Details";
                    return;
                }

                // Otherwise, open the details and fetch them from the API.
                viewButton.textContent = "Hide Details";
                await loadAnimalDetails(animal.id, detailsContainer);
            });

            // Add all buttons and their corresponding content containers
            // to the animal card.
            card.append(
                heading,
                details,

                // Buttons
                viewButton,
                editButton,
                deleteButton,
                healthButton,
                vaccinationButton,
                addHealthButton,
                addVaccinationButton,

                // Containers used to display information and forms
                detailsContainer,
                healthContainer,
                vaccinationContainer,
                addHealthContainer,
                addVaccinationContainer,
                editContainer,
                editMessage
            );

            animalList.append(card);

        }

    } catch (error) {
        animalListMessage.textContent =
            `Error: ${error.message}`;

    } finally {
        refreshAnimals.disabled = false;
    }
}
// Fetch and display all deleted animals.
async function loadAnimalTrash() {
    animalTrashContainer.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = "Recently Deleted Animals";

    const message = document.createElement("p");
    message.textContent = "Loading deleted animals...";

    animalTrashContainer.append(heading, message);

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/animals/trash`
        );

        const animals = await response.json();

        if (!response.ok) {
            throw new Error(
                "Failed to load deleted animals."
            );
        }

        if (!Array.isArray(animals)) {
            throw new Error("Unexpected API response.");
        }

        message.remove();

        if (animals.length === 0) {
            message.textContent = "No deleted animals found.";
            animalTrashContainer.append(message);
            return;
        }

        for (const animal of animals) {
            const card = document.createElement("div");

            const animalName = document.createElement("h4");
            animalName.textContent = animal.name;

            const animalDetails = document.createElement("p");
            animalDetails.textContent =
                `Type: ${animal.type} | ` +
                `Breed: ${animal.breed} | ` +
                `ID: ${animal.id}`;

            // Button used to restore the deleted animal.
            const restoreButton = document.createElement("button");
            restoreButton.type = "button";
            restoreButton.textContent = "Restore";

            // Restore the animal when the button is clicked.
            restoreButton.addEventListener("click", async () => {
                const confirmed = confirm(
                    `Are you sure you want to restore ${animal.name}?`
                );

                if (!confirmed) {
                    return;
                }
                restoreButton.disabled = true;
                restoreButton.textContent = "Restoring...";

                try {
                    const response = await fetch(
                        `${API_BASE_URL}/api/animals/${animal.id}/restore`,
                        {
                            method: "PATCH"
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.message || "Failed to restore animal."
                        );
                    }

                    alert(`${animal.name} restored successfully!`);

                    // Refresh both active and deleted animal lists.
                    await loadAnimals();
                    await loadAnimalTrash();

                } catch (error) {
                    console.error(error);
                    alert(error.message);

                    restoreButton.disabled = false;
                    restoreButton.textContent = "Restore";
                }
            });

            card.append(animalName, animalDetails, restoreButton);
            animalTrashContainer.append(card);
        }

    } catch (error) {
        console.error(error);
        message.textContent = `Error: ${error.message}`;
    }
}
// ============================================================
// 4. LOAD INDIVIDUAL ANIMAL DETAILS
// Fetches and displays details for one animal using its ID.
// ============================================================
async function loadAnimalDetails(id, detailsContainer) {
    detailsContainer.hidden = false;
    detailsContainer.textContent = "Loading animal details...";

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/animals/${id}`
        );

        const animal = await response.json();

        if (!response.ok) {
            throw new Error(
                animal.message || "Failed to load animal details"
            );
        }

        const heading = document.createElement("h4");
        heading.textContent = "Animal Details";

        const name = document.createElement("p");
        name.textContent = `Name: ${animal.name}`;

        const type = document.createElement("p");
        type.textContent = `Type: ${animal.type}`;

        const breed = document.createElement("p");
        breed.textContent = `Breed: ${animal.breed}`;

        const idText = document.createElement("p");
        idText.textContent = `ID: ${animal.id}`;

        detailsContainer.replaceChildren(
            heading,
            name,
            type,
            breed,
            idText
        );

    } catch (error) {
        detailsContainer.textContent =
            `Error: ${error.message}`;
    }
}

// ============================================================
// 5. HEALTH RECORDS
// Loads active health records belonging to a selected animal.
// ============================================================
async function loadHealthRecords(animalId, healthContainer) {
    healthContainer.textContent = "Loading health records...";

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/animals/${animalId}/health-records`
        );

        const records = await response.json();

        if (!response.ok) {
            throw new Error("Failed to load health records");
        }

        healthContainer.replaceChildren();

        const heading = document.createElement("h4");
        heading.textContent = "Health Records";
        healthContainer.append(heading);

        const trashButton = document.createElement("button");
        trashButton.type = "button";
        trashButton.textContent = "Recently Deleted";

        const trashContainer = document.createElement("div");
        trashContainer.hidden = true;

        // Toggle the recently deleted health records section.
        trashButton.addEventListener("click", async () => {
            if (!trashContainer.hidden) {
                trashContainer.hidden = true;
                trashButton.textContent = "Recently Deleted";
                return;
            }

            trashContainer.hidden = false;
            trashButton.textContent = "Hide Recently Deleted";

            await loadHealthTrash(animalId, trashContainer, healthContainer);
        });

        if (records.length === 0) {
            const message = document.createElement("p");
            message.textContent = "No health records found for this animal.";
            healthContainer.append(message);

        } else {
            for (const record of records) {
                const recordCard = document.createElement("div");

                const date = document.createElement("p");
                date.textContent = `Date: ${record.record_date}`;

                const symptoms = document.createElement("p");
                symptoms.textContent = `Symptoms: ${record.symptoms}`;

                const diagnosis = document.createElement("p");
                diagnosis.textContent = `Diagnosis: ${record.diagnosis || "Not provided"}`;

                const treatment = document.createElement("p");
                treatment.textContent = `Treatment: ${record.treatment || "Not provided"}`;

                const vet = document.createElement("p");
                vet.textContent = `Vet: ${record.vet_name || "Not provided"}`;

                // Button for moving a health record to Recently Deleted.
                const deleteButton = document.createElement("button");

                deleteButton.type = "button";
                deleteButton.textContent = "Delete Record";

                // Soft-delete this health record after confirmation.
                deleteButton.addEventListener("click", async () => {

                    const confirmed = confirm(
                        "Are you sure you want to delete this health record?"
                    );

                    if (!confirmed) {
                        return;
                    }

                    try {
                        const response = await fetch(
                            `${API_BASE_URL}/api/health-records/${record.id}`,
                            {
                                method: "DELETE"
                            }
                        );

                        const result = await response.json();

                        if (!response.ok) {
                            throw new Error(
                                result.message || "Failed to delete health record"
                            );
                        }

                        alert("Health record deleted successfully!");

                        await loadHealthRecords(animalId, healthContainer);

                    } catch (error) {
                        console.error(error);
                        alert(error.message);
                    }
                });

                // Button and container for editing this health record.
                const editButton = document.createElement("button");
                editButton.type = "button";
                editButton.textContent = "Edit Record";

                const editContainer = document.createElement("div");
                editContainer.hidden = true;

                // Pre-fill the form with the existing health record values.
                const editForm = document.createElement("form");

                editForm.innerHTML = `
    <h4>Edit Health Record</h4>

    <label>
        Record Date:
        <input type="date" name="record_date"
            value="${record.record_date}" required>
    </label>

    <label>
        Symptoms:
        <input type="text" name="symptoms"
            value="${record.symptoms}" required>
    </label>

    <label>
        Diagnosis:
        <input type="text" name="diagnosis"
            value="${record.diagnosis || ""}">
    </label>

    <label>
        Treatment:
        <textarea name="treatment">${record.treatment || ""}</textarea>
    </label>

    <label>
        Vet Name:
        <input type="text" name="vet_name"
            value="${record.vet_name || ""}">
    </label>

    <button type="submit">Save Changes</button>
</form>
`;

                editContainer.append(editForm);

                // Toggle the health record edit form.
                editButton.addEventListener("click", () => {
                    if (!editContainer.hidden) {
                        editContainer.hidden = true;
                        editButton.textContent = "Edit Record";
                        return;
                    }

                    editContainer.hidden = false;
                    editButton.textContent = "Cancel";
                });

                // Send updated health record data to the backend.
                editForm.addEventListener("submit", async (event) => {
                    event.preventDefault();

                    const formData = new FormData(editForm);

                    const updatedRecord = {
                        record_date: formData.get("record_date"),
                        symptoms: formData.get("symptoms"),
                        diagnosis: formData.get("diagnosis"),
                        treatment: formData.get("treatment"),
                        vet_name: formData.get("vet_name")
                    };

                    try {
                        const response = await fetch(
                            `${API_BASE_URL}/api/health-records/${record.id}`,
                            {
                                method: "PATCH",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify(updatedRecord)
                            }
                        );

                        const result = await response.json();

                        if (!response.ok) {
                            throw new Error(
                                result.message || "Failed to update health record"
                            );
                        }

                        alert("Health record updated successfully!");

                        await loadHealthRecords(animalId, healthContainer);

                    } catch (error) {
                        console.error(error);
                        alert(error.message);
                    }
                });

                recordCard.append(
                    date,
                    symptoms,
                    diagnosis,
                    treatment,
                    vet,
                    editButton,
                    deleteButton,
                    editContainer
                );

                healthContainer.append(recordCard);
            }
        }

        healthContainer.append(trashButton, trashContainer);

    } catch (error) {
        healthContainer.textContent = `Error: ${error.message}`;
    }
}

// ============================================================
// 6. HEALTH RECORD TRASH
// Loads deleted health records and allows the user to restore them.
// ============================================================
async function loadHealthTrash(animalId, trashContainer, healthContainer) {
    trashContainer.textContent = "Loading deleted health records...";

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/animals/${animalId}/health-records/trash`
        );

        const records = await response.json();

        if (!response.ok) {
            throw new Error(
                records.message || "Failed to load deleted health records"
            );
        }

        trashContainer.replaceChildren();

        const heading = document.createElement("h4");
        heading.textContent = "Recently Deleted Health Records";
        trashContainer.append(heading);

        if (records.length === 0) {
            const message = document.createElement("p");
            message.textContent = "Trash is empty.";
            trashContainer.append(message);
            return;
        }

        for (const record of records) {
            const recordCard = document.createElement("div");

            const date = document.createElement("p");
            date.textContent = `Date: ${record.record_date}`;

            const symptoms = document.createElement("p");
            symptoms.textContent = `Symptoms: ${record.symptoms}`;

            const diagnosis = document.createElement("p");
            diagnosis.textContent = `Diagnosis: ${record.diagnosis || "Not provided"}`;

            const treatment = document.createElement("p");
            treatment.textContent = `Treatment: ${record.treatment || "Not provided"}`;

            const vet = document.createElement("p");
            vet.textContent = `Vet: ${record.vet_name || "Not provided"}`;

            const restoreButton = document.createElement("button");
            restoreButton.type = "button";
            restoreButton.textContent = "Restore";

            // Restore the selected health record after confirmation.
            restoreButton.addEventListener("click", async () => {
                const confirmed = confirm(
                    "Are you sure you want to restore this health record?"
                );

                if (!confirmed) {
                    return;
                }

                try {
                    const response = await fetch(
                        `${API_BASE_URL}/api/health-records/${record.id}/restore`,
                        {
                            method: "PATCH"
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.message || "Failed to restore health record"
                        );
                    }

                    alert("Health record restored successfully!");

                    // Refresh active health records after restoring.
                    await loadHealthRecords(animalId, healthContainer);

                } catch (error) {
                    console.error(error);
                    alert(error.message);
                }
            });

            recordCard.append(
                date,
                symptoms,
                diagnosis,
                treatment,
                vet,
                restoreButton
            );

            trashContainer.append(recordCard);

            if (record !== records[records.length - 1]) {
                const separator = document.createElement("hr");
                trashContainer.append(separator);
            }
        }

    } catch (error) {
        console.error(error);
        trashContainer.textContent = `Error: ${error.message}`;
    }
}

// ============================================================
// 7. VACCINATION RECORDS
// Loads active vaccination records for a selected animal.
// ============================================================
async function loadVaccinationRecords(animalId, vaccinationContainer) {
    vaccinationContainer.textContent = "Loading vaccination records...";

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/animals/${animalId}/vaccinations`
        );

        const records = await response.json();

        if (!response.ok) {
            throw new Error("Failed to load vaccination records");
        }

        vaccinationContainer.replaceChildren();

        const heading = document.createElement("h4");
        heading.textContent = "Vaccination History";
        vaccinationContainer.append(heading);

        const trashButton = document.createElement("button");
        trashButton.type = "button";
        trashButton.textContent = "Recently Deleted";

        const trashContainer = document.createElement("div");
        trashContainer.hidden = true;

        // Show or hide deleted vaccination records.
        trashButton.addEventListener("click", async () => {
            if (!trashContainer.hidden) {
                trashContainer.hidden = true;
                trashButton.textContent = "Recently Deleted";
                return;
            }

            trashContainer.hidden = false;
            trashButton.textContent = "Hide Recently Deleted";

            await loadVaccinationTrashRecords(
                animalId,
                trashContainer,
                vaccinationContainer
            );
        });

        if (records.length === 0) {
            const message = document.createElement("p");
            message.textContent = "No vaccination records found for this animal.";
            vaccinationContainer.append(message);

        } else {
            for (const record of records) {
                const recordCard = document.createElement("div");

                const vaccine = document.createElement("p");
                vaccine.textContent = `Vaccine: ${record.vaccine_name}`;

                const date = document.createElement("p");
                date.textContent = `Vaccination Date: ${record.vaccination_date}`;

                const dueDate = document.createElement("p");
                dueDate.textContent =
                    `Next Due Date: ${record.next_due_date || "Not specified"}`;

                const vet = document.createElement("p");
                vet.textContent = `Vet: ${record.vet_name || "Not provided"}`;

                const notes = document.createElement("p");
                notes.textContent = `Notes: ${record.notes || "None"}`;

                // Button for moving a vaccination record to Recently Deleted.
                const deleteButton = document.createElement("button");
                deleteButton.type = "button";
                deleteButton.textContent = "Delete Record";

                // Soft-delete the selected vaccination record.
                deleteButton.addEventListener("click", async event => {
                    event.preventDefault();

                    const confirmed = confirm(
                        "Are you sure you want to delete this vaccination record?"
                    );

                    if (!confirmed) {
                        return;
                    }

                    try {
                        const response = await fetch(
                            `${API_BASE_URL}/api/vaccinations/${record.id}`,
                            {
                                method: "DELETE"
                            }
                        );

                        const result = await response.json();

                        if (!response.ok) {
                            throw new Error(
                                result.message || "Failed to delete vaccination record"
                            );
                        }

                        alert("Vaccination record deleted successfully!");

                        await loadVaccinationRecords(
                            animalId,
                            vaccinationContainer
                        );

                    } catch (error) {
                        console.error(error);
                        alert(error.message);
                    }
                });

                // Button and container for editing this vaccination record.
                const editvButton = document.createElement("button");
                editvButton.type = "button";
                editvButton.textContent = "Edit Vaccination Record";

                const editvcontainer = document.createElement("div");
                editvcontainer.hidden = true;

                // Pre-fill the form with the existing vaccination details.
                const editvForm = document.createElement("form");

                editvForm.innerHTML = `
                    <h4>Edit Vaccination Record</h4>

                    <label>
                        Vaccine:
                        <input type="text" name="vaccine_name"
                            value="${record.vaccine_name}" required>
                    </label>

                    <label>
                        Vaccination Date:
                        <input type="date" name="vaccination_date"
                            value="${record.vaccination_date}" required>
                    </label>

                    <label>
                        Next Due Date:
                        <input type="date" name="next_due_date"
                            value="${record.next_due_date || ""}">
                    </label>

                    <label>
                        Vet Name:
                        <input type="text" name="vet_name"
                            value="${record.vet_name || ""}">
                    </label>

                    <label>
                        Notes:
                        <input type="text" name="notes"
                            value="${record.notes || ""}">
                    </label>

                    <button type="submit">Save Changes</button>
                `;

                editvcontainer.append(editvForm);

                // Toggle the vaccination edit form.
                editvButton.addEventListener("click", () => {
                    if (!editvcontainer.hidden) {
                        editvButton.textContent = "Edit Vaccination Record";
                        editvcontainer.hidden = true;
                        return;
                    }

                    editvButton.textContent = "Cancel";
                    editvcontainer.hidden = false;
                });

                // Send updated vaccination data to the backend.
                editvForm.addEventListener("submit", async event => {
                    event.preventDefault();

                    const formData = new FormData(editvForm);

                    const updatedrecords = {
                        vaccine_name: formData.get("vaccine_name"),
                        vaccination_date: formData.get("vaccination_date"),
                        next_due_date: formData.get("next_due_date"),
                        vet_name: formData.get("vet_name"),
                        notes: formData.get("notes")
                    };

                    try {
                        const response = await fetch(
                            `${API_BASE_URL}/api/vaccinations/${record.id}`,
                            {
                                method: "PATCH",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify(updatedrecords)
                            }
                        );

                        const result = await response.json();

                        if (!response.ok) {
                            throw new Error(
                                result.message || "Failed to update vaccination record"
                            );
                        }

                        alert("Vaccination record updated successfully!");

                        await loadVaccinationRecords(
                            animalId,
                            vaccinationContainer
                        );

                    } catch (error) {
                        console.error(error);
                        alert(error.message);
                    }
                });

                recordCard.append(
                    vaccine,
                    date,
                    dueDate,
                    vet,
                    notes,
                    editvButton,
                    deleteButton,
                    editvcontainer
                );

                vaccinationContainer.append(recordCard);
            }
        }

        vaccinationContainer.append(trashButton, trashContainer);

    } catch (error) {
        vaccinationContainer.textContent = `Error: ${error.message}`;
    }
}

// ============================================================
// 8. VACCINATION TRASH
// Loads deleted vaccination records and allows the user to restore them.
// ============================================================
async function loadVaccinationTrashRecords(
    animalID,
    trashContainer,
    vaccinationContainer
) {
    trashContainer.textContent = "Loading Deleted Vaccination Records...";

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/animals/${animalID}/vaccinations/trash`
        );

        const records = await response.json();

        if (!response.ok) {
            throw new Error(
                records.message || "Failed to load deleted vaccination records"
            );
        }

        trashContainer.replaceChildren();

        const heading = document.createElement("h4");
        heading.textContent = "Recently Deleted Vaccination Records";
        trashContainer.append(heading);

        if (records.length === 0) {
            const message = document.createElement("p");
            message.textContent = "Trash is empty.";
            trashContainer.append(message);
            return;
        }

        for (const record of records) {
            const recordCard = document.createElement("div");

            const vaccine_name = document.createElement("p");
            vaccine_name.textContent = `Vaccine Name: ${record.vaccine_name}`;

            const vaccination_date = document.createElement("p");
            vaccination_date.textContent =
                `Vaccination Date: ${record.vaccination_date}`;

            const next_due_date = document.createElement("p");
            next_due_date.textContent =
                `Next Due Date: ${record.next_due_date || "Not provided"}`;

            const vet_name = document.createElement("p");
            vet_name.textContent =
                `Vet Name: ${record.vet_name || "Not provided"}`;

            const notes = document.createElement("p");
            notes.textContent = `Notes: ${record.notes || "Not provided"}`;

            const restoreButton = document.createElement("button");
            restoreButton.type = "button";
            restoreButton.textContent = "Restore";

            // Restore the selected vaccination record after confirmation.
            restoreButton.addEventListener("click", async () => {
                const confirmed = confirm(
                    "Are you sure you want to restore this vaccination record?"
                );

                if (!confirmed) {
                    return;
                }

                try {
                    const response = await fetch(
                        `${API_BASE_URL}/api/vaccination_records/${record.id}/restore`,
                        {
                            method: "PATCH"
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.message || "Failed to restore vaccination record"
                        );
                    }

                    alert("Vaccination record restored successfully!");

                    // Refresh active vaccination records after restoring.
                    await loadVaccinationRecords(
                        animalID,
                        vaccinationContainer
                    );

                } catch (error) {
                    console.error(error);
                    alert(error.message);
                }
            });

            recordCard.append(
                vaccine_name,
                vaccination_date,
                next_due_date,
                vet_name,
                notes,
                restoreButton
            );

            trashContainer.append(recordCard);

            if (record !== records[records.length - 1]) {
                const separator = document.createElement("hr");
                trashContainer.append(separator);
            }
        }

    } catch (error) {
        console.error(error);
        trashContainer.textContent = `Error: ${error.message}`;
    }
}