/**
 * Servicio para envío de Notificaciones Push a dispositivos móviles mediante Expo Push API
 */

const sendExpoPushNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken) {
    return { success: false, reason: "No push token provided" };
  }

  // Comprobar formato de token Expo
  if (!pushToken.startsWith("ExponentPushToken") && !pushToken.startsWith("ExpoPushToken")) {
    console.warn(`⚠️ Token de Expo con formato no estándar: ${pushToken}`);
  }

  const message = {
    to: pushToken,
    sound: "default",
    title: title,
    body: body,
    data: data,
    priority: "high",
    channelId: "emergency-alerts",
  };

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return { success: true, result };
  } catch (error) {
    console.error("❌ Error al enviar notificación Push con Expo:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendExpoPushNotification,
};
