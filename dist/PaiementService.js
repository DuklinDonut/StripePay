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
const amqplib_1 = __importDefault(require("amqplib"));
const stripe_1 = __importDefault(require("stripe"));
const db_1 = __importDefault(require("./db"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2022-11-15',
});
function processPayment(message) {
    return __awaiter(this, void 0, void 0, function* () {
        const { ticketId, unitPrice, quantity, totalAmount } = message;
        try {
            const session = yield stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'eur',
                            product_data: { name: `Billet ID: ${ticketId}` },
                            unit_amount: Math.round(unitPrice * 100),
                        },
                        quantity: quantity,
                    },
                ],
                mode: 'payment',
                success_url: 'https://example.com/success',
                cancel_url: 'https://example.com/cancel',
            });
            const queryText = `INSERT INTO payments (ticket_id, unit_price, quantity, total_amount, session_id) 
                       VALUES ($1, $2, $3, $4, $5) RETURNING id`;
            const values = [ticketId, unitPrice, quantity, totalAmount, session.id];
            const result = yield db_1.default.query(queryText, values);
            console.log(`Paiement enregistré en BDD, ID: ${result.rows[0].id}`);
        }
        catch (error) {
            console.error(" Erreur de paiement:", error);
        }
    });
}
function consumeQueue() {
    return __awaiter(this, void 0, void 0, function* () {
        const connection = yield amqplib_1.default.connect(process.env.RABBITMQ_URL || "amqp://localhost");
        const channel = yield connection.createChannel();
        yield channel.assertQueue("paiement_queue", { durable: true });
        console.log("🎧 En attente de messages dans 'paiement_queue'...");
        channel.consume("paiement_queue", (msg) => __awaiter(this, void 0, void 0, function* () {
            if (msg !== null) {
                const message = JSON.parse(msg.content.toString());
                console.log(" Message reçu:", message);
                yield processPayment(message);
                channel.ack(msg);
            }
        }));
    });
}
consumeQueue().catch(console.error);
