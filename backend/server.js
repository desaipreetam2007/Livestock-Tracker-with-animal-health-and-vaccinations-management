const db = require("./database");//importing the database.js file
const express = require("express");//importing express framework from web
const cors = require("cors");//

const app = express();//loading express onto app variable so we can use app word instead of using 'express'
const PORT = 3000;

app.use(cors({
    origin: ["http://127.0.0.1:3001", "http://127.0.0.1:3000", "http://127.0.0.1:8080","http://192.168.0.159:8080","http://10.123.9.1:8080"],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());


//To get all the animals
app.get("/api/animals", (req, res) => {
    const animals = db.prepare(`Select * FROM animals WHERE is_active=1`).all();
    res.json(animals);
});
//To get specific animal using id
app.get("/api/animals/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "Invalid animal ID."
        });
    }

    const animal = db.prepare(
        `SELECT * FROM animals WHERE id = ? AND is_active=1`
    ).get(id);

    if (!animal) {
        return res.status(404).json({
            message: "Animal not found."
        });
    }

    res.json(animal);
});


//To Add a animal
app.post("/api/animals", (req, res) => {

    const { name, type, breed } = req.body;

    // Basic validation
    if (
        typeof name !== "string" || !name.trim() ||
        typeof type !== "string" || !type.trim() ||
        typeof breed !== "string" || !breed.trim()
    ) {
        return res.status(400).json({
            message: "Name, type and breed are required"
        });
    }

    // Create a new animal
    const result = db.prepare(`
        INSERT INTO animals(name,type,breed)
        VALUES (?,?,?)
        `).run(name.trim(), type.trim(), breed.trim());

    res.status(201).json({
        message: "Animal added sucessfully!",
        id: result.lastInsertRowid
    });
});


//To update the existing animal
app.patch("/api/animals/:id", (req, res) => {
    const id = Number(req.params.id);
    const { name, type, breed } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "Invalid animal ID."
        });
    }

    if (
        typeof name !== "string" || !name.trim() ||
        typeof type !== "string" || !type.trim() ||
        typeof breed !== "string" || !breed.trim()
    ) {
        return res.status(400).json({
            message: "Please provide valid animal details."
        });
    }

    const result = db.prepare(`
        UPDATE animals
        SET name = ?, type = ?, breed = ?
        WHERE id = ? AND is_active=1
    `).run(name.trim(), type.trim(), breed.trim(), id);

    if (result.changes === 0) {
        return res.status(404).json({
            message: "Animal not found."
        });
    }

    res.json({
        message: "Animal updated successfully!"
    });
});


//To delete a animal
app.delete("/api/animals/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "Invalid animal ID."
        });
    }

    const result = db.prepare(`
        UPDATE animals
        SET is_active = 0
        WHERE id = ? AND is_active = 1
    `).run(id);

    if (result.changes === 0) {
        return res.status(404).json({
            message: "Active animal not found."
        });
    }

    res.json({
        message: "Animal marked as inactive."
    });
});

//Adding healh records for each animal
app.post("/api/animals/:id/health-records", (req, res) => {
    // 1. Get the animal ID from the URL
    const animalId = Number(req.params.id);

    // 2. Validate the ID
    if (!Number.isInteger(animalId) || animalId <= 0) {
        return res.status(400).json({
            message: "Invalid animal ID."
        });
    }

    // 3. Check whether the animal exists and is active
    const animal = db.prepare(`
    SELECT id FROM animals
    WHERE id = ? AND is_active = 1
  `).get(animalId);

    if (!animal) {
        return res.status(404).json({
            message: "Active animal not found."
        });
    }

    // 4. Get health record details
    const {
        record_date,
        symptoms,
        diagnosis,
        treatment,
        vet_name
    } = req.body;

    // 5. Validate required fields
    if (
        typeof record_date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(record_date) ||
        typeof symptoms !== "string" ||
        !symptoms.trim()
    ) {
        return res.status(400).json({
            message: "Please provide a valid date and symptoms."
        });
    }

    // Check that the date actually exists
    const date = new Date(`${record_date}T00:00:00.000Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== record_date
    ) {
        return res.status(400).json({
            message: "Invalid calendar date."
        });
    }

    // 6. Validate optional text fields
    for (const field of [diagnosis, treatment, vet_name]) {
        if (field !== undefined && typeof field !== "string") {
            return res.status(400).json({
                message: "Optional fields must be text."
            });
        }
    }

    // 7. Insert the health record
    const result = db.prepare(`
    INSERT INTO health_records
    (animal_id, record_date, symptoms, diagnosis, treatment, vet_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
        animalId,
        record_date,
        symptoms.trim(),
        diagnosis?.trim() || null,
        treatment?.trim() || null,
        vet_name?.trim() || null
    );

    // 8. Send the response
    res.status(201).json({
        message: "Health record added successfully!",
        id: result.lastInsertRowid,
        animal_id: animalId
    });
});
//To get/retrieve the animal heath records
app.get("/api/animals/:id/health-records", (req, res) => {
    const animalId = Number(req.params.id);

    if (!Number.isInteger(animalId) || animalId <= 0) {
        return res.status(400).json({
            message: "Invalid animal ID."
        });
    }

    const animal = db.prepare(`
        SELECT id FROM animals
        WHERE id = ? AND is_active = 1
    `).get(animalId);

    if (!animal) {
        return res.status(404).json({
            message: "Active animal not found."
        });
    }

    const records = db.prepare(`
        SELECT *
        FROM health_records
        WHERE animal_id = ?
        AND is_active=1
        ORDER BY record_date DESC, id DESC
    `).all(animalId);

    res.status(200).json(records);
});

//to input vaccination records
app.post("/api/animals/:id/vaccinations", (req, res) => {
    // 1. Get animal ID
    const animalId = Number(req.params.id);

    // 2. Validate animal ID
    if (!Number.isInteger(animalId) || animalId <= 0) {
        return res.status(400).json({
            message: "Invalid animal ID."
        });
    }

    // 3. Check if animal exists and is active
    const animal = db.prepare(`
        SELECT id FROM animals
        WHERE id = ? AND is_active = 1
    `).get(animalId);

    if (!animal) {
        return res.status(404).json({
            message: "Active animal not found."
        });
    }

    // 4. Get vaccination details
    const {
        vaccine_name,
        vaccination_date,
        next_due_date,
        vet_name,
        notes
    } = req.body;

    // 5. Validate required fields
    if (
        typeof vaccine_name !== "string" ||
        !vaccine_name.trim() ||
        typeof vaccination_date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(vaccination_date)
    ) {
        return res.status(400).json({
            message: "Please provide a vaccine name and valid vaccination date."
        });
    }

    // 6. Validate calendar dates
    function isValidDate(dateString) {
        if (typeof dateString !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return false;
        }

        const date = new Date(`${dateString}T00:00:00.000Z`);

        return !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === dateString;
    }

    if (!isValidDate(vaccination_date)) {
        return res.status(400).json({
            message: "Invalid vaccination calendar date."
        });
    }

    // 7. Validate optional due date
    if (next_due_date !== undefined &&
        next_due_date !== null &&
        next_due_date !== "") {

        if (!isValidDate(next_due_date)) {
            return res.status(400).json({
                message: "Invalid next due date."
            });
        }

        if (next_due_date < vaccination_date) {
            return res.status(400).json({
                message: "Next due date cannot be before vaccination date."
            });
        }
    }

    // 8. Validate optional text fields
    for (const field of [vet_name, notes]) {
        if (field !== undefined && field !== null &&
            typeof field !== "string") {
            return res.status(400).json({
                message: "Optional fields must be text."
            });
        }
    }

    // 9. Insert vaccination record
    const result = db.prepare(`
        INSERT INTO vaccination_records
        (animal_id, vaccine_name, vaccination_date,
         next_due_date, vet_name, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        animalId,
        vaccine_name.trim(),
        vaccination_date,
        next_due_date || null,
        vet_name?.trim() || null,
        notes?.trim() || null
    );

    // 10. Send response
    res.status(201).json({
        message: "Vaccination record added successfully!",
        id: result.lastInsertRowid,
        animal_id: animalId
    });
});


//To get/retrieve vaccination records
app.get("/api/animals/:id/vaccinations", (req, res) => {
    // 1. Get animal ID
    const animalId = Number(req.params.id);

    // 2. Validate ID
    if (!Number.isInteger(animalId) || animalId <= 0) {
        return res.status(400).json({
            message: "Invalid animal ID."
        });
    }

    // 3. Check whether animal exists and is active
    const animal = db.prepare(`
        SELECT id FROM animals
        WHERE id = ? AND is_active = 1
    `).get(animalId);

    if (!animal) {
        return res.status(404).json({
            message: "Active animal not found."
        });
    }

    // 4. Fetch vaccination history
    const records = db.prepare(`
        SELECT *
        FROM vaccination_records
        WHERE animal_id = ?
        AND is_active=1
        ORDER BY vaccination_date DESC, id DESC
    `).all(animalId);

    // 5. Return records
    res.status(200).json(records);
});

//to update existing health-records
app.patch("/api/health-records/:id", (req, res) => {

    const recordId = Number(req.params.id);

    if (!Number.isInteger(recordId) || recordId <= 0) {
        return res.status(400).json({
            message: "Invalid health record ID."
        });
    }

    const existingRecord = db.prepare(`
    SELECT health_records.id
    FROM health_records
    JOIN animals
    ON health_records.animal_id = animals.id
    WHERE health_records.id = ?
    AND animals.is_active = 1
`).get(recordId);

    if (!existingRecord) {
        return res.status(404).json({
            message: "Health record not found or animal is inactive."
        });
    }

    const {
        record_date,
        symptoms,
        diagnosis,
        treatment,
        vet_name
    } = req.body;

    if (
        typeof record_date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(record_date) ||
        typeof symptoms !== "string" ||
        !symptoms.trim()
    ) {
        return res.status(400).json({
            message: "Valid record date and symptoms are required."
        });
    }

    const result = db.prepare(`
        UPDATE health_records
        SET record_date = ?,
            symptoms = ?,
            diagnosis = ?,
            treatment = ?,
            vet_name = ?
        WHERE id = ?
    `).run(
        record_date,
        symptoms.trim(),
        diagnosis?.trim() || null,
        treatment?.trim() || null,
        vet_name?.trim() || null,
        recordId
    );

    res.json({
        message: "Health record updated successfully.",
        id: recordId
    });
});

//To delete an animal's health record
app.delete("/api/health-records/:id", (req, res) => {

    // 1. Get health record ID
    const recordId = Number(req.params.id);

    // 2. Validate ID
    if (!Number.isInteger(recordId) || recordId <= 0) {
        return res.status(400).json({
            message: "Invalid health record ID."
        });
    }

    // 3. Check whether record exists and its animal is active
    const existingRecord = db.prepare(`
        SELECT health_records.id
        FROM health_records
        JOIN animals
        ON health_records.animal_id = animals.id
        WHERE health_records.id = ?
        AND animals.is_active = 1
    `).get(recordId);

    if (!existingRecord) {
        return res.status(404).json({
            message: "Health record not found or animal is inactive."
        });
    }

    // 4. Delete the health record
    db.prepare(`
        UPDATE health_records
        SET is_active=0
        WHERE id = ?
    `).run(recordId);

    // 5. Send response
    res.json({
        message: "Health record deleted successfully.",
        id: recordId
    });
});
//to delete vaccination records
app.delete("/api/vaccinations/:id", (req, res) => {
    const recordId = Number(req.params.id);

    if (!Number.isInteger(recordId) || recordId <= 0) {
        return res.status(400).json({
            message: "Invalid Health Record ID."
        });
    }
    //getting the recordidt
    const existingRecord = db.prepare(`
        SELECT vaccination_records.id
        FROM vaccination_records
        JOIN animals
        ON vaccination_records.animal_id=animal_id
        WHERE vaccination_records.id=?
        AND animals.is_active=1
    `).get(recordId);
    //checking if record exists
    if (!existingRecord) {
        return res.status(404).json({
            message: "Vaccination Record not Found"
        });
    }
    //delete record
    db.prepare(`
        UPDATE vaccination_records
        SET is_active=0
        WHERE id=?
    `).run(recordId);
    //response
    res.json({
        message: "Vaccination Record Deleted Successfully!",
        id: recordId

    });
});

//to update existing vacination records
app.patch("/api/vaccinations/:id", (req, res) => {

    // 1. Get vaccination record ID
    const recordId = Number(req.params.id);

    if (!Number.isInteger(recordId) || recordId <= 0) {
        return res.status(400).json({
            message: "Invalid vaccination record ID."
        });
    }

    // 2. Check whether record exists and animal is active
    const existingRecord = db.prepare(`
        SELECT vaccination_records.id
        FROM vaccination_records
        JOIN animals
        ON vaccination_records.animal_id = animals.id
        WHERE vaccination_records.id = ?
        AND animals.is_active = 1
    `).get(recordId);

    if (!existingRecord) {
        return res.status(404).json({
            message: "Vaccination record not found or animal is inactive."
        });
    }

    // 3. Get updated details
    const {
        vaccine_name,
        vaccination_date,
        next_due_date,
        vet_name,
        notes
    } = req.body;

    // 4. Validate required fields
    if (
        typeof vaccine_name !== "string" ||
        !vaccine_name.trim() ||
        typeof vaccination_date !== "string"
    ) {
        return res.status(400).json({
            message: "Vaccine name and vaccination date are required."
        });
    }

    // 5. Validate calendar dates
    function isValidDate(dateString) {
        if (
            typeof dateString !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(dateString)
        ) {
            return false;
        }

        const date = new Date(`${dateString}T00:00:00.000Z`);

        return !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === dateString;
    }

    if (!isValidDate(vaccination_date)) {
        return res.status(400).json({
            message: "Invalid vaccination date."
        });
    }

    if (
        next_due_date !== undefined &&
        next_due_date !== null &&
        next_due_date !== ""
    ) {
        if (!isValidDate(next_due_date)) {
            return res.status(400).json({
                message: "Invalid next due date."
            });
        }

        if (next_due_date < vaccination_date) {
            return res.status(400).json({
                message: "Next due date cannot be before vaccination date."
            });
        }
    }

    // 6. Validate optional text fields
    for (const field of [vet_name, notes]) {
        if (
            field !== undefined &&
            field !== null &&
            typeof field !== "string"
        ) {
            return res.status(400).json({
                message: "Optional fields must be text."
            });
        }
    }

    // 7. Update vaccination record
    db.prepare(`
        UPDATE vaccination_records
        SET vaccine_name = ?,
            vaccination_date = ?,
            next_due_date = ?,
            vet_name = ?,
            notes = ?
        WHERE id = ?
    `).run(
        vaccine_name.trim(),
        vaccination_date,
        next_due_date || null,
        vet_name?.trim() || null,
        notes?.trim() || null,
        recordId
    );

    // 8. Send response
    res.json({
        message: "Vaccination record updated successfully.",
        id: recordId
    });
});

//to move an animal's health record to trash
app.get("/api/animals/:id/health-records/trash", (req, res) => {
    const animalId = Number(req.params.id);

    if (!Number.isInteger(animalId) || animalId <= 0) {
        return res.status(400).json({
            message: "Invalid animal ID."
        });
    }

    const animal = db.prepare(`
        SELECT id FROM animals
        WHERE id = ? AND is_active = 1
    `).get(animalId);

    if (!animal) {
        return res.status(404).json({
            message: "Active animal not found."
        });
    }

    const records = db.prepare(`
        SELECT *
        FROM health_records
        WHERE animal_id = ?
        AND is_active = 0
        ORDER BY record_date DESC, id DESC
    `).all(animalId);

    res.status(200).json(records);
});

//to move an  animal's vaccination record to trash
app.get("/api/animals/:id/vaccinations/trash", (req, res) => {
    const animalID = Number(req.params.id);

    if (!Number.isInteger(animalID) || animalID <= 0) {
        return res.status(400).json({
            message: "Invalid Animal ID"
        });
    }
    const animal = db.prepare(`
        SELECT id FROM animals
        WHERE id=? AND is_active=1
    `).get(animalID);

    if (!animal) {
        return res.status(404).json({
            message: "Active animal not found"
        });
    }

    const records = db.prepare(`
        SELECT * FROM vaccination_records
        WHERE animal_id=?
        AND is_active=0
        ORDER BY vaccination_date DESC, id DESC    
    `).all(animalID);

    res.status(200).json(records);

});
//to restore an animal's health record
app.patch("/api/health-records/:id/restore", (req, res) => {
    const recordId = Number(req.params.id);

    if (!Number.isInteger(recordId) || recordId <= 0) {
        return res.status(400).json({
            message: "Invalid Health Record ID."
        });
    }

    const existingRecord = db.prepare(`
        SELECT health_records.id
        FROM health_records
        JOIN animals
        ON health_records.animal_id = animals.id
        WHERE health_records.id = ?
        AND animals.is_active = 1
        AND health_records.is_active = 0
    `).get(recordId);

    if (!existingRecord) {
        return res.status(404).json({
            message: "Deleted health record not found or animal is inactive."
        });
    }

    db.prepare(`
        UPDATE health_records
        SET is_active = 1
        WHERE id = ?
    `).run(recordId);

    res.json({
        message: "Health Record Restored Successfully!",
        id: recordId
    });
});
//to restore animal's vaccination records
app.patch("/api/vaccination_records/:id/restore", (req, res) => {
    const recordId = Number(req.params.id);

    if (!Number.isInteger(recordId) || recordId <= 0) {
        return res.status(400).json({
            message: "Invalid Vaccination record ID"
        });

    }
    const existingRecord = db.prepare(`
            SELECT vaccination_records.id
            FROM vaccination_records
            JOIN animals
            ON vaccination_records.animal_id=animals.id
            WHERE vaccination_records.id=?
            AND animals.is_active=1
            AND vaccination_records.is_active=0
            `).get(recordId);

    if (!existingRecord) {
        return res.status(404).json({
            message: "Deleted Vaccination Record not found or animal is inactive"
        });
    }
    db.prepare(`
        UPDATE vaccination_records
        SET is_active=1
        WHERE id=?
        `).run(recordId);
    
        res.json({
            message:"Record restored Succesfully",
                    id:recordId
        });

});
//vaccination overview of all the animals
app.get("/api/vaccinations/overview", (req, res) => {

    const animals = db.prepare(`
        WITH ranked AS (
            SELECT
                vr.*,
                ROW_NUMBER() OVER (
                    PARTITION BY
                        vr.animal_id,
                        LOWER(TRIM(vr.vaccine_name))
                    ORDER BY
                        vr.vaccination_date DESC,
                        vr.id DESC
                ) AS rn
            FROM vaccination_records vr
            JOIN animals a ON a.id = vr.animal_id
            WHERE a.is_active = 1
        ),

        latest AS (
            SELECT *
            FROM ranked
            WHERE rn = 1
        )

        SELECT
            a.id,
            a.name,
            a.type,
            a.breed,

            COALESCE(SUM(
                CASE
                    WHEN l.next_due_date IS NOT NULL
                    AND l.next_due_date < date('now', 'localtime')
                    THEN 1 ELSE 0
                END
            ), 0) AS overdue,

            COALESCE(SUM(
                CASE
                    WHEN l.next_due_date = date('now', 'localtime')
                    THEN 1 ELSE 0
                END
            ), 0) AS due_today,

            COALESCE(SUM(
                CASE
                    WHEN l.next_due_date >
                        date('now', 'localtime')
                    AND l.next_due_date <=
                        date('now', 'localtime', '+30 days')
                    THEN 1 ELSE 0
                END
            ), 0) AS upcoming,


            COALESCE(SUM(
                CASE
             \      WHEN l.next_due_date >
                        date('now', 'localtime', '+30 days')
                    THEN 1 ELSE 0
                END
            ), 0) AS later,


            COALESCE(SUM(
                CASE
                    WHEN l.next_due_date IS NULL
                    THEN 1 ELSE 0
                END
            ), 0) AS not_scheduled

        FROM animals a

        LEFT JOIN latest l
            ON a.id = l.animal_id

        WHERE a.is_active = 1

        GROUP BY a.id, a.name, a.type, a.breed

        ORDER BY a.id
    `).all();

    res.status(200).json(animals);
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
