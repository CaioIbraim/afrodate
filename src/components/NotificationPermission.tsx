// components/NotificationPermission.tsx
"use client";

import { useEffect } from "react";
import { requestNotificationPermission } from "@/lib/requestNotificationPermission";

const NotificationPermission = () => {

  useEffect(() => {
    const subscribeUser = async () => {
        await requestNotificationPermission();
      };

    subscribeUser();
  }, []);

  return null;
};

export default NotificationPermission;
