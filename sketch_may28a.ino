#include <WiFi.h>
#include <Wire.h>
#include <ArduinoWebsockets.h>
#include <time.h>
#include "Adafruit_SHT31.h"

using namespace websockets;

const char* ssid       = "WiFi_Mesh-869486";
const char* password   = "C4YCcEhf";
const char* serverIP   = "192.168.1.17";
const int   serverPort = 8080;
#define LED_PIN 2

struct Sensor {
  const char* id;
  uint8_t     addr;
  Adafruit_SHT31 sht31;
};

Sensor sensors[] = {
  { "sensor-01", 0x44, Adafruit_SHT31() },
  { "sensor-02", 0x45, Adafruit_SHT31() },
};
WebsocketsClient client;

void blinkLED(int times, int intervalMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(intervalMs);
    digitalWrite(LED_PIN, LOW);
    delay(intervalMs);
  }
}

void syncNTP() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  struct tm timeinfo;
  Serial.print("Waiting for NTP sync");
  while (!getLocalTime(&timeinfo)) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nNTP synced!");
}

void connectWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    blinkLED(1, 100); // fast blink while WiFi reconnecting
  }
  Serial.println("\nWiFi connected!");
  digitalWrite(LED_PIN, LOW);
  syncNTP();
}

void connectWS() {
  Serial.print("Connecting to WebSocket");
  while (!client.connect(serverIP, serverPort, "/")) {
    Serial.print(".");
    blinkLED(1, 500); // slow blink while WebSocket reconnecting
  }
  Serial.println("\nWebSocket connected!");
  digitalWrite(LED_PIN, LOW);
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  for (int i = 0; i < 2; i++) {
    if (!sensors[i].sht31.begin(sensors[i].addr)) {
      Serial.print("SHT31 not found at 0x");
      Serial.println(sensors[i].addr, HEX);
      while (1);
    }
  }

  connectWiFi();
  connectWS();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost, reconnecting...");
    connectWiFi();
    connectWS();
    return;
  }

  if (!client.available()) {
    Serial.println("WebSocket lost, reconnecting...");
    connectWS();
    return;
  }

  time_t now;
  time(&now);

  bool anyFail = false;
  for (int i = 0; i < 2; i++) {
    float temp = sensors[i].sht31.readTemperature();
    float hum  = sensors[i].sht31.readHumidity();

    if (isnan(temp) || isnan(hum)) {
      Serial.print("SHT31 read failed for ");
      Serial.println(sensors[i].id);
      anyFail = true;
      continue;
    }

    String payload = "{\"sensor_id\":\"" + String(sensors[i].id) + "\""
                     ",\"temperature\":" + String(temp, 2) +
                     ",\"humidity\":"    + String(hum, 2)  +
                     ",\"timestamp\":"   + String((unsigned long)now) + "}";

    client.send(payload);
    Serial.println("Sent: " + payload);
  }

  digitalWrite(LED_PIN, anyFail ? HIGH : LOW);

  client.poll();
  delay(30000); // currently 30 seconds delay.
}
