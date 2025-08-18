// public/sw.js

// Evento 'push': disparado quando uma notificação chega do servidor.
self.addEventListener('push', function(event) {
  // Os dados enviados pelo backend estão em event.data
  const data = event.data.json(); // Assumimos que o backend envia JSON

  const title = data.title || "Nova Notificação";
  const options = {
    body: data.body || "Você tem uma nova mensagem.",
    icon: data.icon || "/images/icon-192x192.png", // Ícone padrão
    badge: data.badge || "/images/badge-72x72.png",
    data: {
      url: data.url || "/", // URL para abrir ao clicar
    },
  };

  // Exibe a notificação
  event.waitUntil(self.registration.showNotification(title, options));
});

// Evento 'notificationclick': disparado quando o usuário clica na notificação.
self.addEventListener('notificationclick', function(event) {
  // Fecha a notificação
  event.notification.close();

  // Abre a URL especificada ou a página principal
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});