// Importer le module express
const express = require('express');
// Importer le module mongoose
const mongoose = require('mongoose');
// Importer le module uuidv4
const { v4: uuidv4 } = require("uuid");

// ================================================
// Instancier un serveur et autoriser envokie json
// ================================================
// Instancier le server grace à express
const app = express();

// AUTORISER LE BACK A RECEVOIR DES DONNEES DANS LE BODY
app.use(express.json());

// ================================================
// Connexion à la base de données
// ================================================
// Quand je suis connecté à la bdd (evenementiel)
mongoose.connection.once('open', () => {
    console.log("Connexion à la base de données effectué");
});

// Quand la bdd aura des erreurs
mongoose.connection.on('error', () => {
    console.log("Erreur dans la BDD");
});

// Se connecter sur mongodb (async)
// Ca prend x temps à s'executer
mongoose.connect("mongodb://localhost:27017/db_article");
// Crée le modèle article :
// Définir le schéma
const articleSchema = new mongoose.Schema({
    id: {
        type: String, // Utilisez uiid.v4() pour les entiers
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    }
});

// Créer le modèle
const Article = mongoose.model('Article', articleSchema, 'articles');

// ================================================
// Crée une route
// ================================================
// Exemple de route :
app.get('/todo', async (request, response) => {
    return response.json({ message : "Ceci est juste un exemple"}); 
});

// RG-001 Route qui retourne la liste des articles 
app.get("/articles", async (request, response) => { 
    // Récuperer tout les produits dans mongo
    const articles = await Article.find();
  
    // Si les produits sont vide , retourner un code 701  
    if (articles.length == 0){
      return response.json({
        code : "701",
        message: "Impossible de récupérer les articles."
        });
    }

    // CODE metier
    return response.json({
            code: "200",
            message: "La liste des articles a été récupérée avec succès",
            data: articles
        });
  });

// RG-002 Route qui retourne un article via son ID
app.get("/article/:id", async (request, response) => {
    /// Récupérer le param de l'url
    const idParam = request.params.id;

    // Sélectionner le produit avec l'id associé
    const foundArticle = await Article.findOne({'id' : idParam});

    // RG-003 : Si l'id n'existe pas en base code 705
    if (!foundArticle){
        return response.json({
          code : "702",
          message: `Impossible de récupérer un article avec l'UID ${idParam}`,
          data : null
        });
    }
    // RG-004 : Sinon on retourne le produit trouvé 
    return response.json({
        code: "200",
        message: "Article récupéré avec succès",
        data: foundArticle
    });
});

// RG-003 - Ajouter un article - Route qui sauvegarde un article (POST)
app.post("/save-article", async (request, response) => {
    // Récupérer le body de la requete
    let articleJson = request.body
    let erreurs = []; // Tableau pour stocker les erreurs

    // Vérification des champs obligatoires
    if (!articleJson.title) {
        erreurs.push("Le titre est requis.");
    }
    if (!articleJson.content) {
        erreurs.push("Le contenu est requis.");
    }
    if (!articleJson.author) {
        erreurs.push("L'auteur est requis.");
    }
    // Si contrôle de surface invalide
    // 710 | Contrôle de surface non valide | La liste des erreurs en JSON
    if (!articleJson.title || !articleJson.content || !articleJson.author) {
        return response.json({
            code: "710",
            message: "Contrôle de surface non valide",
            errors : erreurs
        });
    }

    // Vérifier que le titre de l'article n'existe pas déjà en BDD
    const titreExistant = await Article.findOne({'title' : articleJson.title});
    console.log(titreExistant)
    if (titreExistant !== null){
        // 701 | Impossible d'ajouter un article avec un titre déjà existant | Null
        return response.json({
            code: "701",
            message: "Impossible d'ajouter un article avec un titre déjà existant",
            data: null
        });
    }

    // Generate a UUID v4
    const uuid = uuidv4();

    // Ajouter l'uuid à la requete 
    articleJson.id = uuid;

    // Envoyer le productJson dans mongodb
    // -- Instancier le modele product avec les données
    const article = new Article(articleJson);
    // Données objet => langage de prog (js, java, python)
    // Données physique => Stockage de la données (sql, nosql, excel)
    // -- Persister en base (envoyer dans la BDD)
    await article.save();

    // Retourner un json
    return response.json({
        code: "200",
        message: "Article ajouté avec succès",
        data: article
    });
});

app.patch("/modify-article/:id", async (request, response) => {
    // récup l'id
    const idParam = request.params.id;
    // Récupérer le body de la requête
    let articleJson = request.body;
    let erreurs = []; // Tableau pour stocker les erreurs

    // Vérification des champs obligatoires
    if (!articleJson.title) {
        erreurs.push("Le titre est requis.");
    }
    if (!articleJson.content) {
        erreurs.push("Le contenu est requis.");
    }
    if (!articleJson.author) {
        erreurs.push("L'auteur est requis.");
    }

    // Si contrôle de surface invalide
    if (erreurs.length > 0) {
        return response.status(400).json({
            code: "710",
            message: "Contrôle de surface non valide",
            errors: erreurs
        });
    }

    // Vérifier que l'article existe en BDD
    const articleExistant = await Article.findOne({'id' : idParam});
    if (!articleExistant) {
        return response.status(404).json({
            code: "404",
            message: "Article non trouvé.",
            data: null
        });
    }

    // Vérifier que le titre de l'article n'existe pas déjà en BDD, sauf pour l'article en cours de modification
    const titreExistant = await Article.findOne({ 'title': articleJson.title });
    console.log(titreExistant)
    if (titreExistant !== null){
        // 701 | Impossible d'ajouter un article avec un titre déjà existant | Null
        return response.json({
            code: "701",
            message: "Impossible d'ajouter un article avec un titre déjà existant",
            data: null
        });
    }
    

    // Mettre à jour l'article
    articleExistant.title = articleJson.title;
    articleExistant.content = articleJson.content;
    articleExistant.author = articleJson.author;

    // Persister les modifications en base
    await articleExistant.save();

    // Retourner un json
    return response.status(200).json({
        code: "200",
        message: "Article modifié avec succès",
        data: articleExistant
    });
});


// Route pour supprimer un article :
app.delete("/article/:id", async (request, response) => {
    // Récup du param de l'url
    const idParam = request.params.id;

    // Séléctionner le produit avec l'id associé 
    const foundArticle = await Article.findOne({'id' : idParam});

    // 702 | Impossible de supprimer un article dont l'UID n'existe pas | Null
    if (!foundArticle){
        return response.json({
            code : "702",
            message : "Impossible de supprimer un article dont l'UID n'existe pas",
            data : null
        })
    }

    // RG-004 : Sinon on delete le produit trouvé et on renvoit le code 200
    await foundArticle.deleteOne();
    return response.json({
        code: "200",
        message: `L'article ${idParam} a été supprimé avec succès`, 
        data : foundArticle
    });
});

// Dernière Ligne 
// ================================================
// Lancer le serveur
// ================================================
app.listen(3000, () => {
    console.log("Le serveur a démarré");
});