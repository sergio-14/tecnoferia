#!/usr/bin/env sh
set -e

if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
  echo "❌ ERROR: Debes definir DB_HOST y DB_PORT." >&2
  exit 1
fi

echo "🔄 Esperando la base de datos PostgreSQL en $DB_HOST:$DB_PORT..."
node <<EOF
const net = require('net');
const host = process.env.DB_HOST;
const port = process.env.DB_PORT;
let attempts = 0;
const maxAttempts = 30;

function tryConnect() {
  attempts++;
  const socket = net.createConnection(port, host);
  socket.once('connect', () => {
    console.log('✅ Base de datos disponible en ' + host + ':' + port);
    socket.end();
    process.exit(0);
  });
  socket.once('error', () => {
    socket.destroy();
    if (attempts >= maxAttempts) {
      console.error('❌ No se pudo conectar a la DB en 60s.');
      process.exit(1);
    }
    console.log('⏳ Esperando DB... (' + attempts + '/' + maxAttempts + ')');
    setTimeout(tryConnect, 2000);
  });
}
tryConnect();
EOF

echo "🚀 Iniciando backend Tecno Feria..."
exec node /app/backend-feria/server.js