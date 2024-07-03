"use strict";

//----------------Required modules----------------------
const express = require('express');
const mustache = require('mustache-express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { NodeSSH } = require('node-ssh');
const session = require('express-session');
const path = require('path');
const model = require('../Model/model'); 
const fs = require('fs');
const ping = require('ping'); 

//----------------Configuration of the server ----------------------
const app = express();
const port = process.env.PORT || 4000;
app.use(express.static(path.join(__dirname, '../CSS')));
app.use(express.static(path.join(__dirname, '../public')));
app.engine('html', mustache());
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '../Views'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

const ssh = new NodeSSH();

// Configurer la session
app.use(session({
  secret: 'secret_key', // Changez cette clé pour quelque chose de plus sécurisé
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Middleware pour définir les variables de session dans les vues
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.admin ? true : false;
  res.locals.username = req.session.admin ? req.session.admin.username : null;
  res.locals.path = req.path;
  res.locals.activeHome = req.path === '/' ? 'active' : '';
  res.locals.activeDashboard = req.path === '/dashboard' ? 'active' : '';
  res.locals.activeConfigure = req.path.startsWith('/configure') ? 'active' : '';
  next();
});

// Route pour la page d'accueil (page de connexion)
app.get("/", (req, res) => {
  res.render("homepage", { title: "Home" });
});

// Route pour la connexion
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const admin = model.authenticateAdmin(username, password);
  if (admin) {
    req.session.admin = admin;
    res.redirect("/dashboard");
  } else {
    res.render("homepage", { title: "Home", error: "Nom d'utilisateur ou mot de passe incorrect" });
  }
});

// Fonction pour lire les Raspberry Pi depuis le fichier JSON
const readRaspberryPis = () => {
  const data = fs.readFileSync(path.join(__dirname, '../public/JSON/raspberryPis.json'));
  return JSON.parse(data);
};

// Fonction pour écrire les Raspberry Pi dans le fichier JSON
const writeRaspberryPis = (raspberryPis) => {
  fs.writeFileSync(path.join(__dirname, '../public/JSON/raspberryPis.json'), JSON.stringify(raspberryPis, null, 2));
};

// Route pour le tableau de bord
app.get("/dashboard", async (req, res) => {
  if (req.session.admin) {
    const raspberryPis = readRaspberryPis();

    const checkStatus = async (raspberryPi) => {
      try {
        const res = await ping.promise.probe(raspberryPi.ip);
        raspberryPi.status = res.alive ? 'Active' : 'Inactive';
        raspberryPi.isActive = res.alive;
        raspberryPi.isInactive = !res.alive;
      } catch (error) {
        raspberryPi.status = 'Inactive';
        raspberryPi.isActive = false;
        raspberryPi.isInactive = true;
      }
    };

    await Promise.all(raspberryPis.map(checkStatus));

    res.render("dashboard", { 
      title: "Dashboard", 
      username: req.session.admin.username,
      raspberryPis: raspberryPis // Passez les données des Raspberry Pi à la vue
    });
  } else {
    res.redirect("/");
  }
});

// Route pour la configuration d'un Raspberry Pi existant
app.get("/configure/:id", (req, res) => {
  if (req.session.admin) {
    const raspberryPis = readRaspberryPis();
    const raspberryPi = raspberryPis.find(pi => pi.id === parseInt(req.params.id));
    if (raspberryPi) {
      res.render("configure", { 
        title: "Configure Raspberry Pi",
        id: raspberryPi.id,
        ip: raspberryPi.ip
      });
    } else {
      res.redirect("/dashboard");
    }
  } else {
    res.redirect("/");
  }
});

// Route pour la configuration d'un nouveau Raspberry Pi
app.get("/configure", (req, res) => {
  if (req.session.admin) {
    res.render("configure_new", { 
      title: "Configure New Raspberry Pi"
    });
  } else {
    res.redirect("/");
  }
});

app.post("/configure", async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/");
  }

  const { ip_address, username, password } = req.body;

  try {
    // Connect to the Raspberry Pi via SSH
    await ssh.connect({
      host: ip_address,
      username: username,
      password: password
    });

    // Transfer files
    // await ssh.putFile(path.join(__dirname, '../public/scripts/player.py'), '/home/admin/project/player.py');
    // await ssh.putFile(path.join(__dirname, '../public/scripts/display_media.sh'), '/home/admin/display_media.sh');
    // await ssh.putFile(path.join(__dirname, '../public/scripts/setup_display.sh'), '/home/admin/setup_display.sh');

    // Execute setup script
    // const result = await ssh.execCommand('sudo bash /home/admin/setup_display.sh');
    // ssh.dispose();

    // Lire les Raspberry Pi actuels
    const raspberryPis = readRaspberryPis();

    // Ajouter le nouveau Raspberry Pi avec un identifiant unique
    const newId = raspberryPis.length > 0 ? raspberryPis[raspberryPis.length - 1].id + 1 : 1;
    raspberryPis.push({
      id: newId,
      ip: ip_address,
      status: 'Pending', // Initial status before ping
      isActive: false,
      isInactive: true,
      image: '/images/raspberry_pi.png'
    });

    // Écrire les Raspberry Pi mis à jour dans le fichier JSON
    writeRaspberryPis(raspberryPis);

    // Rediriger vers le tableau de bord
    res.redirect("/dashboard");
  } catch (error) {
    res.render("result", { title: "Configuration Result", output: "", error: error.message });
  }
});

// Route pour gérer un Raspberry Pi
app.get("/manage/:id", (req, res) => {
  if (req.session.admin) {
    const raspberryPis = readRaspberryPis();
    const raspberryPi = raspberryPis.find(pi => pi.id === parseInt(req.params.id));
    if (raspberryPi) {
      res.render("manage", { 
        title: "Manage Raspberry Pi",
        id: raspberryPi.id,
        ip: raspberryPi.ip
      });
    } else {
      res.redirect("/dashboard");
    }
  } else {
    res.redirect("/");
  }
});

// Route pour supprimer un Raspberry Pi
app.post("/delete/:id", (req, res) => {
  if (req.session.admin) {
    let raspberryPis = readRaspberryPis();
    raspberryPis = raspberryPis.filter(pi => pi.id !== parseInt(req.params.id));

    // Écrire les Raspberry Pi mis à jour dans le fichier JSON
    writeRaspberryPis(raspberryPis);

    // Rediriger vers le tableau de bord
    res.redirect("/dashboard");
  } else {
    res.redirect("/");
  }
});

// Route pour la déconnexion
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

//----------------END-------------------------------------------->
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
