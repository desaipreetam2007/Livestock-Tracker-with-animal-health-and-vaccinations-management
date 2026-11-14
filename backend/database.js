
const Database = require("better-sqlite3");

// Open or create our database file
const db = new Database("livestock.db");

db.pragma("foreign_keys=ON");//foreign-key enforcement must be enabled on the database connection. Declaring a foreign key alone isn't enough.

// Main table which stores Animals
db.exec(`
    CREATE TABLE IF NOT EXISTS animals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        breed TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
    )
`);

//health records table for animals connected to animals table using animal id
db.exec(`
    CREATE TABLE IF NOT EXISTS health_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        animal_id INTEGER NOT NULL,
        record_date TEXT NOT NULL,
        symptoms TEXT NOT NULL,
        diagnosis TEXT,
        treatment TEXT,
        vet_name TEXT,

        FOREIGN KEY (animal_id)
        REFERENCES animals(id)
    )
`);

//vaccination tracker table 
db.exec(`
  CREATE TABLE IF NOT EXISTS vaccination_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    animal_id INTEGER NOT NULL,
    vaccine_name TEXT NOT NULL,
    vaccination_date TEXT NOT NULL,
    next_due_date TEXT,
    vet_name TEXT,
    notes TEXT,
    FOREIGN KEY (animal_id) REFERENCES animals(id)
  )
`);



module.exports = db;
