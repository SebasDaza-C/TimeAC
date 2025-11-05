#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// ====== CONFIGURACIÓN Wi-Fi ======
#define WIFI_SSID     "SD"
#define WIFI_PASSWORD "1105371238"

// ====== CONFIGURACIÓN Firebase ======
#define API_KEY       "AIzaSyC4c1jjaxiZeGgJHQXnqN-1aLgG9nAVKTw"
#define DATABASE_URL  "https://timeac-2025-default-rtdb.firebaseio.com/"

// ====== CONFIGURACIÓN LED (timbre simulado) ======
#define LED_PIN 2

// ====== CONFIGURACIÓN PINES DEL DISPLAY DE 7 SEGMENTOS (ÁNODO COMÚN) ======
#define SEG_A 23
#define SEG_B 22
#define SEG_C 21
#define SEG_D 19
#define SEG_E 18
#define SEG_F 5
#define SEG_G 4

// ====== Objetos Firebase ======
FirebaseData fbdoBell;
FirebaseData fbdoAlias;
FirebaseData fbdoTemp;
FirebaseAuth auth;
FirebaseConfig config;

// ====== Estado local ======
bool lastIsRinging = false;
bool hasLastIsRinging = false;
char lastAliasChar = ' ';
bool hasLastAlias = false;

// ====== Mapeo de caracteres a segmentos ======
struct SegmentPattern {
  char character;
  bool segments[7]; // a,b,c,d,e,f,g
};

SegmentPattern patterns[] = {
  {'0', {false, false, false, false, false, false, true}},
  {'1', {true, false, false, true, true, true, true}},
  {'2', {false, false, true, false, false, true, false}},
  {'3', {false, false, false, false, true, true, false}},
  {'4', {true, false, false, true, true, false, false}},
  {'5', {false, true, false, false, true, false, false}},
  {'6', {false, true, false, false, false, false, false}},
  {'7', {false, false, false, true, true, true, true}},
  {'8', {false, false, false, false, false, false, false}},
  {'9', {false, false, false, false, true, false, false}},
  {'A', {false, false, false, true, false, false, false}},
  {'F', {false, true, true, true, false, false, false}},
  {'d', {true, false, false, false, false, true, false}}
};
const int NUM_PATTERNS = sizeof(patterns) / sizeof(patterns[0]);

// ====== FUNCIONES ======
void mostrarSegmentos(char c);
void aplicarSegmentos(char c);

void conectarWiFi() {
  Serial.print("Conectando a Wi-Fi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint8_t intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos++ < 40) {
    Serial.print(".");
    delay(300);
  }
  if (WiFi.status() == WL_CONNECTED)
    Serial.printf("\n✅ Wi-Fi conectado. IP: %s\n", WiFi.localIP().toString().c_str());
  else
    Serial.println("\n⚠️ No se pudo conectar a Wi-Fi.");
}

void iniciarStreams(); // forward

void inicializarFirebase() {
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  Serial.print("🔐 Autenticando anónimamente... ");
  if (Firebase.signUp(&config, &auth, "", ""))
    Serial.println("✅ Ok.");
  else
    Serial.printf("\n❌ Error: %s\n", config.signer.signupError.message.c_str());

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  fbdoBell.setResponseSize(1024);
  fbdoAlias.setResponseSize(1024);
  fbdoTemp.setResponseSize(1024);

  Serial.println("\n===== 🔍 LEYENDO VALORES INICIALES =====");

  if (Firebase.RTDB.getBool(&fbdoTemp, "/bell/isRinging")) {
    bool isRinging = fbdoTemp.boolData();
    lastIsRinging = isRinging;
    hasLastIsRinging = true;
    Serial.printf("Estado inicial del timbre: %s\n", isRinging ? "TRUE (Encendido)" : "FALSE (Apagado)");
    digitalWrite(LED_PIN, isRinging ? HIGH : LOW);
  }

  if (Firebase.RTDB.getString(&fbdoTemp, "/status/display/currentAlias")) {
    String s = fbdoTemp.stringData();
    char c = s.charAt(0);
    lastAliasChar = c;
    hasLastAlias = true;
    Serial.printf("Alias actual inicial: %c\n", c);
    mostrarSegmentos(c);
    aplicarSegmentos(c);
  }

  Serial.println("========================================\n");
  iniciarStreams();
}

void iniciarStreams() {
  // === Stream timbre ===
  if (Firebase.RTDB.beginStream(&fbdoBell, "/bell/isRinging")) {
    Firebase.RTDB.setStreamCallback(
      &fbdoBell,
      [](FirebaseStream data) {
        if (data.dataTypeEnum() == fb_esp_rtdb_data_type_boolean) {
          bool isRinging = data.boolData();
          if (!hasLastIsRinging || isRinging != lastIsRinging) {
            Serial.println("\n=== 🔔 Cambio detectado en timbre ===");
            Serial.printf("Nuevo estado del timbre: %s\n", isRinging ? "TRUE (Encendido)" : "FALSE (Apagado)");
            digitalWrite(LED_PIN, isRinging ? HIGH : LOW);
            lastIsRinging = isRinging;
            hasLastIsRinging = true;
          }
        }
      },
      nullptr
    );
  }

  // === Stream alias ===
  if (Firebase.RTDB.beginStream(&fbdoAlias, "/status/display/currentAlias")) {
    Firebase.RTDB.setStreamCallback(
      &fbdoAlias,
      [](FirebaseStream data) {
        String s = data.stringData();
        char c = s.charAt(0);
        if (!hasLastAlias || c != lastAliasChar) {
          Serial.println("\n=== 🧩 Cambio detectado en currentAlias ===");
          Serial.printf("Nuevo currentAlias: %c\n", c);
          mostrarSegmentos(c);
          aplicarSegmentos(c);
          lastAliasChar = c;
          hasLastAlias = true;
        }
      },
      nullptr
    );
  }
}

void mostrarSegmentos(char c) {
  bool found = false;
  for (int i = 0; i < NUM_PATTERNS; i++) {
    if (patterns[i].character == c) {
      found = true;
      Serial.printf("Segmentos para '%c':\n", c);
      Serial.printf("a = %s\n", patterns[i].segments[0] ? "true" : "false");
      Serial.printf("b = %s\n", patterns[i].segments[1] ? "true" : "false");
      Serial.printf("c = %s\n", patterns[i].segments[2] ? "true" : "false");
      Serial.printf("d = %s\n", patterns[i].segments[3] ? "true" : "false");
      Serial.printf("e = %s\n", patterns[i].segments[4] ? "true" : "false");
      Serial.printf("f = %s\n", patterns[i].segments[5] ? "true" : "false");
      Serial.printf("g = %s\n", patterns[i].segments[6] ? "true" : "false");
      break;
    }
  }
  if (!found) Serial.printf("⚠️ Carácter '%c' no soportado.\n", c);
}

void aplicarSegmentos(char c) {
  bool found = false;
  for (int i = 0; i < NUM_PATTERNS; i++) {
    if (patterns[i].character == c) {
      found = true;
      digitalWrite(SEG_A, !patterns[i].segments[0]);
      digitalWrite(SEG_B, !patterns[i].segments[1]);
      digitalWrite(SEG_C, !patterns[i].segments[2]);
      digitalWrite(SEG_D, !patterns[i].segments[3]);
      digitalWrite(SEG_E, !patterns[i].segments[4]);
      digitalWrite(SEG_F, !patterns[i].segments[5]);
      digitalWrite(SEG_G, !patterns[i].segments[6]);
      break;
    }
  }
  if (!found) {
    // Si no se reconoce, apagamos todos
    digitalWrite(SEG_A, HIGH);
    digitalWrite(SEG_B, HIGH);
    digitalWrite(SEG_C, HIGH);
    digitalWrite(SEG_D, HIGH);
    digitalWrite(SEG_E, HIGH);
    digitalWrite(SEG_F, HIGH);
    digitalWrite(SEG_G, HIGH);
  }
}

void reconectarStreams() {
  if (!fbdoBell.httpConnected())
    Firebase.RTDB.beginStream(&fbdoBell, "/bell/isRinging");
  if (!fbdoAlias.httpConnected())
    Firebase.RTDB.beginStream(&fbdoAlias, "/status/display/currentAlias");
}

// ====== SETUP ======
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n===== 🔌 INICIANDO ESP32 =====");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Pines de los segmentos
  pinMode(SEG_A, OUTPUT);
  pinMode(SEG_B, OUTPUT);
  pinMode(SEG_C, OUTPUT);
  pinMode(SEG_D, OUTPUT);
  pinMode(SEG_E, OUTPUT);
  pinMode(SEG_F, OUTPUT);
  pinMode(SEG_G, OUTPUT);
  aplicarSegmentos(' '); // apagar al inicio

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