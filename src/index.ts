import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import pool from './db';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2022-11-15',
});

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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
