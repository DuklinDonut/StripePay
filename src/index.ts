import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2022-11-15',
});

// Fonction séparée pour créer la session Stripe
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
      //à faire au niveau du front
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
    })
    .then((session) => {
      res.json({ url: session.url });
    })
    .catch((error) => {
      console.error('Erreur Stripe :', error);
      res.status(500).json({ error: 'Erreur de création de session' });
    });
}

// Et ici, on appelle juste la fonction (aucun async dans app.post)
app.post('/create-checkout-session', createCheckoutSession);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
