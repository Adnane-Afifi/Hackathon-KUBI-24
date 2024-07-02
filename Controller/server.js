"use strict";

//----------------Required modules----------------------
const express = require('express');
const mustache = require('mustache-express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { NodeSSH } = require('node-ssh');
const session = require('express-session');
const path = require('path');
const model = require('../Model/model'); // Charger les fonctions du modèle

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
  res.locals.activeConfigure = req.path === '/configure' ? 'active' : '';
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

// Route pour le tableau de bord
app.get("/dashboard", (req, res) => {
  if (req.session.admin) {
    const raspberryPis = [
      {
        ip: '192.168.1.101',
        status: 'Active',
        isActive: true,
        isInactive: false,
        image: '/images/raspberry_pi.png'
      },
      {
        ip: '192.168.1.102',
        status: 'Inactive',
        isActive: false,
        isInactive: true,
        image: '/images/raspberry_pi.png'
      },
      {
        ip: '192.168.1.103',
        status: 'Active',
        isActive: true,
        isInactive: false,
        image: '/images/raspberry_pi.png'
      }
    ];
    res.render("dashboard", { 
      title: "Dashboard", 
      username: req.session.admin.username,
      raspberryPis: raspberryPis // Passez les données des Raspberry Pi à la vue
    });
  } else {
    res.redirect("/");
  }
});


// Route pour la configuration du Raspberry Pi
app.get("/configure", (req, res) => {
  if (req.session.admin) {
    res.render("configure", { title: "Configure Raspberry Pi" });
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
    await ssh.putFile(path.join(__dirname, 'player.py'), '/home/admin/project/player.py');
    await ssh.putFile(path.join(__dirname, 'run_player.sh'), '/home/admin/run_player.sh');
    await ssh.putFile(path.join(__dirname, 'setup_display.sh'), '/home/admin/setup_display.sh');

    // Execute setup script
    const result = await ssh.execCommand('sudo bash /home/admin/setup_display.sh');
    ssh.dispose();

    res.render("result", { title: "Configuration Result", output: result.stdout, error: result.stderr });
  } catch (error) {
    res.render("result", { title: "Configuration Result", output: "", error: error.message });
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
