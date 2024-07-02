"use strict";
const Sqlite = require('better-sqlite3');
const path = require('path');

// Chemin vers le fichier de la base de données
const dbPath = path.join(__dirname, 'db.sqlite');

// Initialiser la base de données
const db = new Sqlite(dbPath);

// Supprimer les tables existantes si elles existent
db.prepare("DROP TABLE IF EXISTS admin").run();

// Créer la table admin
db.prepare(`
  CREATE TABLE admin (
    idAdmin INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`).run();

// Insérer un compte admin par défaut
db.prepare(`
  INSERT INTO admin (username, password)
  VALUES ('admin', 'password')
`).run();

module.exports = db;
