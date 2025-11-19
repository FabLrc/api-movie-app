# API Movie App

API REST haute performance pour la gestion d'un catalogue de films avec fonctionnalités sociales.

## 🛠 Stack Technique

*   **Core:** Node.js, TypeScript, Fastify (v5)
*   **Data:** PostgreSQL (Prisma ORM), Redis (Cache), Meilisearch (Recherche)
*   **Auth:** JWT, Bcrypt
*   **Docs:** Swagger / OpenAPI
*   **Infra:** Docker Compose

## ✨ Fonctionnalités

*   **Catalogue:** CRUD Films, Pagination, Casting.
*   **Recherche:** Full-text, tolérante aux fautes, instantanée (Meilisearch).
*   **Social:** Notes (moyenne auto), Commentaires, Favoris, Films vus.
*   **Auth:** Inscription, Login, Rôles (User/Admin).
*   **Performance:** Cache Redis (Cache-Aside), Rate Limiting.

## 🚀 Installation & Démarrage

### Prérequis
*   Node.js (v20+)
*   Docker & Docker Compose

### Étapes
1.  **Installer les dépendances :**
    ```bash
    npm install
    ```

2.  **Lancer l'infrastructure (DB, Redis, Meilisearch) :**
    ```bash
    docker-compose up -d
    ```

3.  **Configurer la base de données :**
    ```bash
    npm run prisma:migrate
    ```

4.  **Peupler la base (Optionnel) :**
    ```bash
    npm run seed
    ```

5.  **Synchroniser la recherche :**
    ```bash
    npm run sync:meilisearch
    ```

6.  **Démarrer le serveur :**
    ```bash
    npm run dev
    ```
    L'API est accessible sur `http://localhost:3000`.

## 📚 Documentation

Documentation Swagger complète disponible sur : **http://localhost:3000/doc**

## 🧪 Scripts Utiles

*   `npm run build` : Compiler le projet.
*   `npm run start` : Lancer en production.
*   `npm run lint` : Vérifier le code.
*   `npm run benchmark` : Tester les performances.
