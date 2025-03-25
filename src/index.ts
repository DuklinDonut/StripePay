import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import amqp from 'amqplib';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});


const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME_PRICE = process.env.QUEUE_NAME_PRICE || 'process_payment';


const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2022-11-15',
});

// Consommateur RabbitMQ modifié
async function startPriceConsumer(): Promise<void> {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME_PRICE, { durable: true });
    console.log(`En attente de messages sur la file "${QUEUE_NAME_PRICE}"...`);

    channel.consume(QUEUE_NAME_PRICE, async (msg) => {
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

          const session = await stripe.checkout.sessions.create({
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
          await pool.query(query, [ticketId, price, session.id]);

          // 🔥 Affiche l'URL dans la console
          console.log(`🎉 URL Stripe générée: ${session.url}`);

        } catch (error) {
          console.error("Erreur traitement message :", error);
        }
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("Erreur de connexion à RabbitMQ :", error);
  }
}


// Endpoint inchangé
app.post('/create-checkout-session', (req: Request, res: Response): void => {
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
    pool.query(
      'INSERT INTO payments (amount, session_id) VALUES ($1, $2) RETURNING id',
      [price, session.id]
    ).then(result => {
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