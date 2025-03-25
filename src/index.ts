import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import amqp from 'amqplib';
import { Pool } from 'pg';

dotenv.config();

// Configuration de la connexion à la base PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // En production, activez SSL si nécessaire
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Configuration du consommateur RabbitMQ
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME_PRICE = process.env.QUEUE_NAME_PRICE || 'priceQueue';

async function startPriceConsumer(): Promise<void> {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME_PRICE, { durable: true });
    console.log(`En attente de messages sur la file "${QUEUE_NAME_PRICE}"...`);

    channel.consume(QUEUE_NAME_PRICE, (msg) => {
      if (msg) {
        const messageContent = msg.content.toString();
        console.log("Message reçu :", messageContent);
        try {
          const data = JSON.parse(messageContent);
          const price = data.price;
          console.log("Prix reçu depuis RabbitMQ :", price);
          // Ici, vous pouvez appeler une fonction qui déclenche la création d'une session Stripe,
          // par exemple : createCheckoutSessionFromPrice(price);
          // Vous pouvez aussi réutiliser la logique de création de session existante.
        } catch (error) {
          console.error("Erreur lors du traitement du message :", error);
        }
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("Erreur de connexion à RabbitMQ :", error);
  }
}

// Initialisation du serveur Express
const app = express();
app.use(cors());
app.use(express.json());

// Initialisation de Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2022-11-15',
});

// Fonction de création d'une session de paiement Stripe et enregistrement en base
function createCheckoutSession(req: Request, res: Response): void {
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
      pool
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

// Démarrer le serveur et le consommateur RabbitMQ
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
  startPriceConsumer();
});
