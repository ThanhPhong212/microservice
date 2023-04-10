const amqp = require('amqplib');

async function connect() {
  const amqpServer = 'amqp://localhost:5672';
  const connection = await amqp.connect(amqpServer);
  // const channel = await connection.createChannel();
  // await channel.assertQueue('FILE');
  return connection;
}

module.exports = connect();
