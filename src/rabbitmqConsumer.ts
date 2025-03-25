import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { Pool } from 'pg';
import amqp from 'amqplib';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connexion à PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialisation de Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2022-11-15',
});

// Fonction commune (définie ci-dessus)
async function createCheckoutSessionFromPrice(price: number): Promise<string> {
  const session = await stripe.checkout.sessions.create({
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
  const result = await pool.query(queryText, values);
  console.log('Paiement enregistré, ID:', result.rows[0].id);
  return session.url!;
}

// Endpoint POST pour créer une session de paiement
const createCheckoutSession: RequestHandler = async (req, res) => {
  const { price } = req.body;
  if (!price || isNaN(price)) {
    res.status(400).json({ error: 'Prix invalide' });
    return;
  }
  try {
    const url = await createCheckoutSessionFromPrice(price);
    res.json({ url });
  } catch (error) {
    console.error('Erreur lors de la création de session:', error);
    res.status(500).json({ error: 'Erreur de création de session' });
    return;
  }
};

app.post('/create-checkout-session', createCheckoutSession);
