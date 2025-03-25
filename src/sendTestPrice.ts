import amqp from 'amqplib';

async function sendTestPrice() {
  try {
    const RABBITMQ_URL = 'amqp://localhost';
    const QUEUE_NAME_PRICE = 'priceQueue';
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME_PRICE, { durable: true });
    const message = JSON.stringify({ price: 29.99 });
    channel.sendToQueue(QUEUE_NAME_PRICE, Buffer.from(message));
    console.log("Message envoyé:", message);
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("Erreur lors de l'envoi du prix :", error);
  }
}

sendTestPrice();
