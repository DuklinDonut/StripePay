"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const stripe_1 = __importDefault(require("stripe"));
const pg_1 = require("pg");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Connexion à PostgreSQL
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
// Initialisation de Stripe
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2022-11-15',
});
// Fonction commune (définie ci-dessus)
function createCheckoutSessionFromPrice(price) {
    return __awaiter(this, void 0, void 0, function* () {
        const session = yield stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: { name: 'Paiement personnalisé' },
                        unit_amount: Math.round(price * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: 'https://example.com/success',
            cancel_url: 'https://example.com/cancel',
        });
        const queryText = 'INSERT INTO payments (amount, session_id) VALUES ($1, $2) RETURNING id';
        const values = [price, session.id];
        const result = yield pool.query(queryText, values);
        console.log('Paiement enregistré, ID:', result.rows[0].id);
        return session.url;
    });
}
// Endpoint POST pour créer une session de paiement
const createCheckoutSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { price } = req.body;
    if (!price || isNaN(price)) {
        res.status(400).json({ error: 'Prix invalide' });
        return;
    }
    try {
        const url = yield createCheckoutSessionFromPrice(price);
        res.json({ url });
    }
    catch (error) {
        console.error('Erreur lors de la création de session:', error);
        res.status(500).json({ error: 'Erreur de création de session' });
        return;
    }
});
app.post('/create-checkout-session', createCheckoutSession);
