"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const stripe_1 = __importDefault(require("stripe"));
const db_1 = __importDefault(require("./db"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2022-11-15',
});
function createCheckoutSession(req, res) {
    const { price } = req.body;
    if (!price || isNaN(price)) {
        res.status(400).json({ error: 'Prix invalide' });
        return;
    }
    stripe.checkout.sessions
        .create({
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
    })
        .then((session) => {
        // Enregistrer le paiement dans la base de données
        const queryText = 'INSERT INTO payments (amount, session_id) VALUES ($1, $2) RETURNING id';
        const values = [price, session.id];
        db_1.default
            .query(queryText, values)
            .then((result) => {
            console.log('Paiement enregistré, ID:', result.rows[0].id);
            res.json({ url: session.url });
        })
            .catch((dbError) => {
            console.error('Erreur enregistrement DB :', dbError);
            res.status(500).json({ error: 'Erreur de création de session' });
        });
    })
        .catch((error) => {
        console.error('Erreur Stripe :', error);
        res.status(500).json({ error: 'Erreur de création de session' });
    });
}
app.post('/create-checkout-session', createCheckoutSession);
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
