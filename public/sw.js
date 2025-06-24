
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "oraculo";
  const options = {
    body: data.message || "Você recebeu uma nova notificação!",
    icon: "/icon.png", // Optional: Add an icon in /public
    badge: "/badge.png", // Optional
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow("/dashboard") // Redirect to your app’s dashboard
  );
});
