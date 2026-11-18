
const Database = require("better-sqlite3");

// Open or create our database file
const db = new Database("livestock.db");

db.pragma("foreign_keys=ON");//foreign-key enforcement must be enabled on the database connection. Declaring a foreign key alone isn't enough.

// Users table - stores farmer account details.
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL COLLATE NOCASE UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`);

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
// Migration: Add user_id to existing animals table.
const animalColumns = db.prepare(
    "PRAGMA table_info(animals)"
).all();

const hasUserId = animalColumns.some(
    column => column.name === "user_id"
);

if (!hasUserId) {
    db.exec(`
        ALTER TABLE animals
        ADD COLUMN user_id INTEGER REFERENCES users(id)
    `);
}

// Index to make owner-based animal lookups faster.
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_animals_user_id
    ON animals(user_id)
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
