# StripePay

Backend Node.js + TypeScript pour effectuer des paiements en ligne via Stripe.

---

## Objectif

Ce projet permet de créer une session de paiement Stripe via le backend, en recevant dynamiquement un prix depuis le frontend ou un outil comme Postman.  
Les utilisateurs sont ensuite redirigés vers une page de paiement Stripe sécurisée.

---

## Technologies utilisées

- Node.js
- TypeScript
- Express
- Stripe SDK
- dotenv (pour les variables d'environnement)
- CORS

---

## Installation

Pour cloner le projet et installer les dépendances, exécutez :

git clone https://github.com/DuklinDonut/StripePay.git
cd StripePay
npm install
Configuration
Créez un fichier .env à la racine avec le contenu suivant (remplacez la clé par votre clé Stripe secrète) :

env
Copier
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxx
Lancer le projet
Pour démarrer le serveur, exécutez :

bash
Copier
npm run start
Le serveur démarre sur l'URL suivante : http://localhost:3000.

## Tester le paiement avec Stripe
Endpoint
bash
Copier
POST http://localhost:3000/create-checkout-session
Body (JSON)
json
Copier
{
  "price": 29.99
}
Réponse attendue
json
Copier
{
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}
Étapes de test
Envoyez une requête POST avec le champ price dans le body.

Récupérez le champ url dans la réponse.

Ouvrez cette URL dans votre navigateur.

Testez le paiement avec les informations de test suivantes :

yaml
Copier
Numéro : 4242 4242 4242 4242
Date   : 12/34
CVC    : 123
Structure du projet
bash
Copier
StripePay/
├── src/
│   └── index.ts           # Fichier principal du backend
├── .env                   # Clé Stripe (non versionnée)
├── package.json
├── tsconfig.json
└── README.md
## Instructions pour les contributeurs
Devise : Pour changer la devise, modifiez "currency": "eur" dans index.ts.

Produit : Pour modifier le nom ou la description du produit, modifiez "product_data.name" dans index.ts.

URLs de redirection : Pour personnaliser les URLs de succès et d'annulation, modifiez les valeurs de success_url et cancel_url.

Frontend : Pour connecter un frontend (HTML, React, etc.), utilisez l'URL renvoyée par le backend.

Base de données : Pour enregistrer les paiements, envisagez d'ajouter une base de données (PostgreSQL, MongoDB, etc.).
