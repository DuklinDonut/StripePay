import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Utilisez l'URL externe pour le développement local
  ssl: {
    rejectUnauthorized: false, // Permet d'éviter de vérifier le certificat (pour les environnements de test)
  },
});

export default pool;
