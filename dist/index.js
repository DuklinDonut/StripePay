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
const amqplib_1 = __importDefault(require("amqplib"));
const stripe_1 = __importDefault(require("stripe"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2022-11-15',
});
const PORT = process.env.PORT || 4000;
function sendToQueue(queue, message) {
    return __awaiter(this, void 0, void 0, function* () {
        const connection = yield amqplib_1.default.connect(process.env.RABBITMQ_URL || "amqp://localhost");
        const channel = yield connection.createChannel();
        yield channel.assertQueue(queue, { durable: true });
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
        console.log(` Message envoyé à ${queue}:`, message);
        setTimeout(() => connection.close(), 500);
    });
}
app.post('/create-checkout-session', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ticketId, unitPrice, quantity } = req.body;
        if (!ticketId || isNaN(unitPrice) || isNaN(quantity) || quantity <= 0) {
            res.status(400).json({ error: 'Données invalides' });
            return;
        }
        const totalAmount = unitPrice * quantity;
        const message = { ticketId, unitPrice, quantity, totalAmount };
        yield sendToQueue("paiement_queue", message);
        res.json({ message: "Paiement en attente de traitement" });
    }
    catch (error) {
        console.error("Erreur:", error);
        res.status(500).json({ error: "Erreur lors de l'envoi du paiement" });
    }
}));
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
