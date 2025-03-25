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
const amqplib_1 = __importDefault(require("amqplib"));
const pg_1 = require("pg");
dotenv_1.default.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME_PRICE = process.env.QUEUE_NAME_PRICE || 'process_payment';
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2022-11-15',
});
// Consommateur RabbitMQ modifié
function startPriceConsumer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const connection = yield amqplib_1.default.connect(RABBITMQ_URL);
            const channel = yield connection.createChannel();
            yield channel.assertQueue(QUEUE_NAME_PRICE, { durable: true });
            console.log(`En attente de messages sur la file "${QUEUE_NAME_PRICE}"...`);
            channel.consume(QUEUE_NAME_PRICE, (msg) => __awaiter(this, void 0, void 0, function* () {
                if (msg) {
                    const messageContent = msg.content.toString();
                    console.log("Message reçu :", messageContent);
                    try {
                        const { ticketId, price } = JSON.parse(messageContent);
                        if (!ticketId || !price || isNaN(price)) {
                            console.error("Message invalide.");
                            channel.ack(msg);
                            return;
                        }
                        const session = yield stripe.checkout.sessions.create({
                            payment_method_types: ['card'],
                            line_items: [
                                {
                                    price_data: {
                                        currency: 'eur',
                                        product_data: { name: `Ticket ID: ${ticketId}` },
                                        unit_amount: Math.round(price * 100),
                                    },
                                    quantity: 1,
                                },
                            ],
                            mode: 'payment',
                            success_url: 'https://example.com/success',
                            cancel_url: 'https://example.com/cancel',
                        });
                        // Enregistrement BDD (optionnel)
                        const query = 'INSERT INTO payments (ticket_id, amount, session_id) VALUES ($1, $2, $3)';
                        yield pool.query(query, [ticketId, price, session.id]);
                        // 🔥 Affiche l'URL dans la console
                        console.log(`🎉 URL Stripe générée: ${session.url}`);
                    }
                    catch (error) {
                        console.error("Erreur traitement message :", error);
                    }
                    channel.ack(msg);
                }
            }));
        }
        catch (error) {
            console.error("Erreur de connexion à RabbitMQ :", error);
        }
    });
}
// Endpoint inchangé
app.post('/create-checkout-session', (req, res) => {
    const { price } = req.body;
    if (!price || isNaN(price)) {
        res.status(400).json({ error: 'Prix invalide' });
        return;
    }
    stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: { name: 'Paiement personnalisé' },
                    unit_amount: Math.round(price * 100),
                },
                quantity: 1,
            }],
        mode: 'payment',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
    }).then((session) => {
        pool.query('INSERT INTO payments (amount, session_id) VALUES ($1, $2) RETURNING id', [price, session.id]).then(result => {
            console.log('Paiement enregistré, ID:', result.rows[0].id);
            res.json({ url: session.url });
        }).catch(dbError => {
            console.error('Erreur enregistrement DB :', dbError);
            res.status(500).json({ error: 'Erreur de création de session' });
        });
    }).catch(error => {
        console.error('Erreur Stripe :', error);
        res.status(500).json({ error: 'Erreur de création de session' });
    });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
    startPriceConsumer();
});
