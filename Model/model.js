"use strict";

const db = require('./database');

// Fonction pour vérifier les informations d'authentification de l'admin
function authenticateAdmin(username, password) {
  const admin = db.prepare("SELECT * FROM admin WHERE username = ? AND password = ?").get(username, password);
  return admin;
}

module.exports = {
  authenticateAdmin,
};
