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
function sendTestPrice() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const RABBITMQ_URL = 'amqp://localhost';
            const QUEUE_NAME_PRICE = 'priceQueue';
            const connection = yield amqplib_1.default.connect(RABBITMQ_URL);
            const channel = yield connection.createChannel();
            yield channel.assertQueue(QUEUE_NAME_PRICE, { durable: true });
            const message = JSON.stringify({ price: 29.99 });
            channel.sendToQueue(QUEUE_NAME_PRICE, Buffer.from(message));
            console.log("Message envoyé:", message);
            yield channel.close();
            yield connection.close();
        }
        catch (error) {
            console.error("Erreur lors de l'envoi du prix :", error);
        }
    });
}
sendTestPrice();
