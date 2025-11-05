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
FirebaseData fbdoBell;   // para stream timbre
FirebaseData fbdoAlias;  // para stream alias
FirebaseData fbdoTemp;   // para lecturas puntuales (inicio)
FirebaseAuth auth;
FirebaseConfig config;

// ====== Estado local para evitar duplicados ======
bool lastIsRinging = false;
bool hasLastIsRinging = false;
int lastAlias = 0;
bool hasLastAlias = false;

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

void iniciarStreams(); // forward

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

  // Ajustes de tamaño/timeout
  fbdoBell.setResponseSize(1024);
  fbdoAlias.setResponseSize(1024);
  fbdoTemp.setResponseSize(1024);

  Firebase.RTDB.setReadTimeout(&fbdoBell, 10000);
  Firebase.RTDB.setReadTimeout(&fbdoAlias, 10000);
  Firebase.RTDB.setReadTimeout(&fbdoTemp, 10000);

  Firebase.RTDB.setwriteSizeLimit(&fbdoBell, "small");
  Firebase.RTDB.setwriteSizeLimit(&fbdoAlias, "small");
  Firebase.RTDB.setwriteSizeLimit(&fbdoTemp, "small");

  // ====== LECTURAS INICIALES (con fbdoTemp) ======
  Serial.println("\n===== 🔍 LEYENDO VALORES INICIALES =====");

  if (Firebase.RTDB.getBool(&fbdoTemp, "/bell/isRinging")) {
    bool isRinging = fbdoTemp.boolData();
    lastIsRinging = isRinging;
    hasLastIsRinging = true;
    Serial.printf("Estado inicial del timbre: %s\n", isRinging ? "TRUE (Encendido)" : "FALSE (Apagado)");
    digitalWrite(LED_PIN, isRinging ? HIGH : LOW);
  } else {
    Serial.printf("⚠️ Error leyendo timbre inicial: %s\n", fbdoTemp.errorReason().c_str());
  }

  // Intentamos leer currentAlias (puede ser int o string que contenga número)
  if (Firebase.RTDB.getInt(&fbdoTemp, "/status/display/currentAlias")) {
    int alias = fbdoTemp.intData();
    lastAlias = alias;
    hasLastAlias = true;
    Serial.printf("Alias actual inicial: %d\n", alias);
  } else {
    // Si no es int, intentamos leer como string y parsear
    String reason = fbdoTemp.errorReason();
    // intentar string:
    if (Firebase.RTDB.getString(&fbdoTemp, "/status/display/currentAlias")) {
      String s = fbdoTemp.stringData();
      int alias = s.toInt();
      lastAlias = alias;
      hasLastAlias = true;
      Serial.printf("Alias actual inicial (string): %s -> %d\n", s.c_str(), alias);
    } else {
      Serial.printf("⚠️ Error leyendo currentAlias inicial: %s\n", reason.c_str());
    }
  }
  Serial.println("========================================\n");

  // ====== AHORA iniciamos los streams (después de haber leído) ======
  iniciarStreams();
}

void iniciarStreams() {
  // ====== SUSCRIPCIÓN A bell/isRinging ======
  if (Firebase.RTDB.beginStream(&fbdoBell, "/bell/isRinging")) {
    Serial.println("🔔 Escuchando /bell/isRinging ...");
    Firebase.RTDB.setStreamCallback(
      &fbdoBell,
      [](FirebaseStream data) {
        // sólo reaccionamos si hay booleano y cambió respecto a lastIsRinging
        if (data.dataTypeEnum() == fb_esp_rtdb_data_type_boolean) {
          bool isRinging = data.boolData();
          if (!hasLastIsRinging || isRinging != lastIsRinging) {
            Serial.println("\n=== 🔔 Cambio detectado en timbre ===");
            Serial.printf("Nuevo estado del timbre: %s\n", isRinging ? "TRUE (Encendido)" : "FALSE (Apagado)");
            digitalWrite(LED_PIN, isRinging ? HIGH : LOW);
            lastIsRinging = isRinging;
            hasLastIsRinging = true;
          } // else: es el valor inicial repetido -> ignorar
        } else {
          Serial.printf("Stream timbre: valor inesperado: %s\n", data.stringData().c_str());
        }
      },
      [](bool timeout) {
        if (timeout) Serial.println("⏳ Stream timbre timeout, reconectando...");
      }
    );
  } else {
    Serial.printf("❌ Error iniciando stream timbre: %s\n", fbdoBell.errorReason().c_str());
  }

  // ====== SUSCRIPCIÓN A status/display/currentAlias ======
  if (Firebase.RTDB.beginStream(&fbdoAlias, "/status/display/currentAlias")) {
    Serial.println("📟 Escuchando /status/display/currentAlias ...");
    Firebase.RTDB.setStreamCallback(
      &fbdoAlias,
      [](FirebaseStream data) {
        // soportar int o string que represente número
        int alias = 0;
        bool parsed = false;

        if (data.dataTypeEnum() == fb_esp_rtdb_data_type_integer) {
          alias = data.intData();
          parsed = true;
        } else if (data.dataTypeEnum() == fb_esp_rtdb_data_type_string) {
          String s = data.stringData();
          alias = s.toInt();
          parsed = true;
        }

        if (parsed) {
          if (!hasLastAlias || alias != lastAlias) {
            Serial.println("\n=== 🧩 Cambio detectado en currentAlias ===");
            Serial.printf("Nuevo currentAlias: %d\n", alias);
            lastAlias = alias;
            hasLastAlias = true;
          } // else: mismo valor inicial -> ignorar
        } else {
          Serial.printf("Stream alias: valor inesperado: %s\n", data.stringData().c_str());
        }
      },
      [](bool timeout) {
        if (timeout) Serial.println("⏳ Stream alias timeout, reconectando...");
      }
    );
  } else {
    Serial.printf("❌ Error iniciando stream alias: %s\n", fbdoAlias.errorReason().c_str());
  }
}

void reconectarStreams() {
  if (!fbdoBell.httpConnected()) {
    Serial.println("⚠️ Conexión perdida con stream timbre, reintentando...");
    Firebase.RTDB.beginStream(&fbdoBell, "/bell/isRinging");
  }

  if (!fbdoAlias.httpConnected()) {
    Serial.println("⚠️ Conexión perdida con stream alias, reintentando...");
    Firebase.RTDB.beginStream(&fbdoAlias, "/status/display/currentAlias");
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
  reconectarStreams();
  delay(5000);
}