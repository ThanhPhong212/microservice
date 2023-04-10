const amqp = require('amqplib');

async function connect() {
  const amqpServer = 'amqp://localhost:5672';
  const connection = await amqp.connect(amqpServer);
  return connection;
}

module.exports = connect();
