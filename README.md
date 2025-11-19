# Movie API

API REST haute performance pour catalogue de films avec interactions communautaires.

## 🎬 Fonctionnalités

- ✅ **Gestion de films** : CRUD complet avec cast, crew et images
- ✅ **Recherche avancée** : Recherche full-text avec Meilisearch (tolérance aux fautes)
- ✅ **Authentification** : JWT avec rôles (USER/ADMIN)
- ✅ **Interactions sociales** : Favoris, notes (1-10), commentaires, historique de visionnage
- ✅ **Cache performant** : Redis pour optimiser les temps de réponse
- ✅ **Documentation API** : Swagger UI intégré
- ✅ **Données de démonstration** : 1000 films, 50 utilisateurs avec interactions complètes

## Stack Technologique

- **Runtime:** Node.js 20+
- **Framework:** Fastify
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Search Engine:** Meilisearch 1.10
- **ORM:** Prisma
- **Language:** TypeScript
- **Validation:** Zod

## 🚀 Installation

### 1. Cloner le repository

```bash
git clone <repo-url>
cd api-movie-app
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration de l'environnement

Copier le fichier `.env.example` vers `.env`:

```bash
cp .env.example .env
```

### 4. Lancer les services Docker

```bash
docker-compose up -d
```

### 5. Générer le client Prisma et exécuter les migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 6. Charger les données de test

```bash
npm run seed
```

Cette commande génère :
- **50 utilisateurs** (1 admin + 49 utilisateurs)
- **1000 films** avec cast, crew et images complètes
- **~1500 ratings** avec calcul automatique des moyennes
- **~650 favoris**
- **~3000 films vus** (historique)
- **~500 commentaires**

### 7. Lancer le serveur

```bash
npm run dev
```

Le serveur sera accessible sur `http://localhost:3000`

## 📚 Accès à la documentation

**Swagger UI :** [http://localhost:3000/doc](http://localhost:3000/doc)

La documentation interactive permet de :
- Voir tous les endpoints disponibles
- Tester l'API directement depuis le navigateur
- Consulter les schémas de données

## 🔐 Comptes de test

Après avoir exécuté le seed, vous pouvez utiliser ces comptes :

### Administrateur
```
Email: movie_buff0@example.com
Password: password123
```

### Utilisateurs
```
Email: cinema_lover1@example.com
Password: password123

Email: film_critic2@example.com
Password: password123
```

*Tous les utilisateurs ont le même mot de passe : `password123`*

## 📡 Scripts disponibles

- `npm run dev` - Lancer le serveur en mode développement avec hot-reload
- `npm run build` - Compiler le TypeScript
- `npm start` - Lancer le serveur en production
- `npm run lint` - Vérifier le code avec ESLint
- `npm run lint:fix` - Corriger automatiquement les erreurs ESLint
- `npm run format` - Formater le code avec Prettier
- `npm run prisma:generate` - Générer le client Prisma
- `npm run prisma:migrate` - Exécuter les migrations
- `npm run prisma:studio` - Ouvrir Prisma Studio (GUI pour la DB)
- `npm run seed` - Charger les données de test
- `npm run sync:meilisearch` - Synchroniser tous les films avec Meilisearch

## ✅ Vérification de l'installation

### Health Check

Une fois le serveur démarré, vérifiez que tout fonctionne:

```bash
curl http://localhost:3000/health
```

Réponse attendue:
```json
{
  "status": "ok",
  "timestamp": "2025-11-19T...",
  "db": "connected",
  "redis": "connected"
}
```

## 🏗️ Architecture

```
src/
├── config/          # Configuration de l'application
├── lib/             # Clients (Prisma, Redis, Meilisearch)
├── middlewares/     # Middleware d'authentification
├── repositories/    # Accès aux données (Prisma)
├── routes/          # Définition des routes API
├── schemas/         # Schémas de validation Zod
├── services/        # Logique métier
├── types/           # Types TypeScript
├── app.ts           # Configuration Fastify
└── index.ts         # Point d'entrée
```

**Pattern :** Controller-Service-Repository
- **Routes** : Définition des endpoints et validation
- **Services** : Logique métier et orchestration
- **Repositories** : Accès aux données via Prisma

## 🎯 Endpoints principaux

### Authentification
- `POST /register` - Créer un compte
- `POST /login` - Se connecter

### Films
- `GET /movies` - Liste des films (pagination)
- `GET /movies/:id` - Détails d'un film
- `POST /movies` - Créer un film (admin)
- `PUT /movies/:id` - Modifier un film (admin)
- `DELETE /movies/:id` - Supprimer un film (admin)

### Recherche
- `GET /search` - Recherche full-text avec Meilisearch

### Interactions (authentification requise)
- `POST /movies/:id/favorite` - Ajouter aux favoris
- `DELETE /movies/:id/favorite` - Retirer des favoris
- `GET /users/me/favorites` - Mes favoris

- `POST /movies/:id/rate` - Noter un film (1-10)
- `GET /movies/:id/ratings` - Voir les notes

- `POST /movies/:id/comments` - Commenter un film
- `GET /movies/:id/comments` - Voir les commentaires

- `POST /movies/:id/watched` - Marquer comme vu
- `GET /users/me/watched` - Mon historique

Consultez la [documentation Swagger](http://localhost:3000/doc) pour la liste complète.

## 📊 Statistiques de la base de données

Après le seed, vous aurez :
- **Users** : 50 (1 admin, 49 utilisateurs)
- **Movies** : 1000 films complets
- **Ratings** : ~1500 notes avec moyennes calculées
- **Favorites** : ~650 favoris
- **Comments** : ~500 commentaires réalistes
- **Watched** : ~3000 films vus

## 🚀 Optimisations

- **Cache Redis** : Les requêtes fréquentes sont mises en cache
- **Meilisearch** : Recherche ultra-rapide avec tolérance aux fautes
- **Indexation DB** : Index sur les colonnes critiques
- **Pagination** : Toutes les listes sont paginées

## 📝 License

MIT
