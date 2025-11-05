#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// ====== CONFIGURACIÓN Wi-Fi ======
#define WIFI_SSID     "SD"
#define WIFI_PASSWORD "1105371238"

// ====== CONFIGURACIÓN Firebase ======
#define API_KEY       "AIzaSyC4c1jjaxiZeGgJHQXnqN-1aLgG9nAVKTw"
#define DATABASE_URL  "https://timeac-2025-default-rtdb.firebaseio.com/"

// ====== CONFIGURACIÓN LED ======
#define LED_PIN 2  // LED que simula el timbre

// ====== Objetos Firebase ======
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ====== FUNCIONES ======
void conectarWiFi() {
  Serial.print("Conectando a Wi-Fi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint8_t intentos = 0;

  while (WiFi.status() != WL_CONNECTED && intentos++ < 40) {
    Serial.print(".");
    delay(300);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✅ Wi-Fi conectado. IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n⚠️ No se pudo conectar a Wi-Fi.");
  }
}

void inicializarFirebase() {
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  Serial.print("🔐 Autenticando anónimamente... ");
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("✅ Ok.");
  } else {
    Serial.printf("\n❌ Error: %s\n", config.signer.signupError.message.c_str());
  }

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  fbdo.setResponseSize(1024);
  Firebase.RTDB.setReadTimeout(&fbdo, 10000);
  Firebase.RTDB.setwriteSizeLimit(&fbdo, "small");

  // ====== SUSCRIPCIÓN A bell/isRinging ======
  if (Firebase.RTDB.beginStream(&fbdo, "/bell/isRinging")) {
    Serial.println("🔊 Escuchando cambios en /bell/isRinging ...");

    Firebase.RTDB.setStreamCallback(
      &fbdo,
      [](FirebaseStream data) {
        Serial.println("\n=== 🔔 Cambio detectado ===");
        Serial.printf("Ruta: %s\n", data.streamPath().c_str());
        Serial.printf("Tipo: %s\n", data.dataType().c_str());

        if (data.dataTypeEnum() == fb_esp_rtdb_data_type_boolean) {
          bool isRinging = data.boolData();
          Serial.printf("Nuevo estado: %s\n", isRinging ? "TRUE (Encendido)" : "FALSE (Apagado)");

          digitalWrite(LED_PIN, isRinging ? HIGH : LOW);
        } else {
          Serial.printf("Valor inesperado: %s\n", data.stringData().c_str());
        }
      },
      [](bool timeout) {
        if (timeout) Serial.println("⏳ Stream timeout, reconectando...");
      }
    );
  } else {
    Serial.printf("❌ Error iniciando stream: %s\n", fbdo.errorReason().c_str());
  }
}

void reconectarStream() {
  if (!Firebase.RTDB.beginStream(&fbdo, "/bell/isRinging")) {
    Serial.printf("❌ Error reintentando stream: %s\n", fbdo.errorReason().c_str());
  } else {
    Serial.println("✅ Stream reconectado correctamente.");
  }
}

// ====== SETUP ======
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n===== 🔌 INICIANDO ESP32 =====");
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  conectarWiFi();

  Serial.print("⏳ Sincronizando hora...");
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) Serial.println("✅ Hora sincronizada.");
  else Serial.println("⚠️ No se pudo sincronizar hora.");

  inicializarFirebase();
}

// ====== LOOP ======
void loop() {
  // Si se pierde la conexión HTTP con Firebase, se reintenta el stream
  if (!fbdo.httpConnected()) {
    Serial.println("⚠️ Conexión perdida con Firebase, reintentando...");
    reconectarStream();
  }

  delay(5000);
}