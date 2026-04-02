#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

// ── WiFi + Server Config ────────────────────────────────
const char *WIFI_SSID = "SSIID";
const char *WIFI_PASSWORD = "Password";
const char *SERVER_URL = "http://10.66.247.81:8000/bin/update";

// ── Bin Config ──────────────────────────────────────────
const char *BIN_ID = "BIN_01";
float BIN_HEIGHT_CM = 40.0; // Dynamic after calibration

// ── Timing Config ───────────────────────────────────────
const int READ_INTERVAL = 2000; // Read every 2 sec
const int SEND_INTERVAL = 3000; // Send every 10 sec

// ── Pins ────────────────────────────────────────────────
const int TRIG_PIN = D1;
const int ECHO_PIN = D2;
const int BUTTON_PIN = D3;

// ── Globals ─────────────────────────────────────────────
WiFiClient wifiClient;

unsigned long lastReadTime = 0;
unsigned long lastSendTime = 0;

float lastDist = 0;
float lastFill = 0;
float prevFill = 0;

// ── Setup ───────────────────────────────────────────────
void setup()
{
    Serial.begin(115200);

    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
    pinMode(BUTTON_PIN, INPUT_PULLUP);

    Serial.println("\nConnecting to WiFi...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }

    Serial.println("\nWiFi connected!");
    Serial.println("Type 'cal' OR press button to calibrate");
}

// ── Read Distance ───────────────────────────────────────
float readDistanceCm()
{
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);

    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration = pulseIn(ECHO_PIN, HIGH, 30000);
    if (duration == 0)
        return -1;

    return (duration * 0.0343) / 2.0;
}

// ── Calibration ─────────────────────────────────────────
void calibrateBin()
{
    Serial.println("\nCalibrating... Keep bin EMPTY");
    delay(2000);

    float sum = 0;
    int count = 5;

    for (int i = 0; i < count; i++)
    {
        float d = readDistanceCm();
        if (d > 0)
        {
            sum += d;
            Serial.println("Reading: " + String(d));
        }
        delay(500);
    }

    float avg = sum / count;

    if (avg > 0)
    {
        BIN_HEIGHT_CM = avg;
        Serial.println("New bin height: " + String(BIN_HEIGHT_CM) + " cm");
    }
    else
    {
        Serial.println("Calibration failed");
    }
}

// ── Calculate Fill ──────────────────────────────────────
float calcFillPercent(float distanceCm)
{
    if (distanceCm < 0 || distanceCm > BIN_HEIGHT_CM)
        return 0.0;
    float fill = (1.0 - distanceCm / BIN_HEIGHT_CM) * 100.0;
    return constrain(fill, 0.0, 100.0);
}

// ── Send Data ───────────────────────────────────────────
void sendData(float fillPct, float distCm)
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println(" WiFi disconnected");
        return;
    }

    HTTPClient http;
    http.begin(wifiClient, SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;
    doc["bin_id"] = BIN_ID;
    doc["fill_pct"] = round(fillPct * 10) / 10.0;
    doc["distance_cm"] = round(distCm * 10) / 10.0;

    String payload;
    serializeJson(doc, payload);

    Serial.println("📡 Sending: " + payload);

    int httpCode = http.POST(payload);

    if (httpCode > 0)
    {
        Serial.println(" Response: " + String(httpCode));
    }
    else
    {
        Serial.println(" POST failed: " + http.errorToString(httpCode));
    }

    http.end();
}

// ── Serial Commands ─────────────────────────────────────
void handleSerial()
{
    if (Serial.available())
    {
        String input = Serial.readStringUntil('\n');
        input.trim();

        if (input == "cal")
        {
            calibrateBin();
        }
        else if (input.startsWith("set "))
        {
            float val = input.substring(4).toFloat();
            if (val > 0)
            {
                BIN_HEIGHT_CM = val;
                Serial.println(" Height manually set: " + String(val));
            }
        }
    }
}

// ── Main Loop ───────────────────────────────────────────
void loop()
{

    unsigned long now = millis();

    // 🔘 Button calibration
    if (digitalRead(BUTTON_PIN) == LOW)
    {
        calibrateBin();
        delay(2000); // debounce
    }

    // 💻 Serial input
    handleSerial();

    // 📏 Read sensor frequently
    if (now - lastReadTime >= READ_INTERVAL)
    {
        lastDist = readDistanceCm();
        lastFill = calcFillPercent(lastDist);

        Serial.printf("📏 Distance: %.1f cm | Fill: %.1f%%\n", lastDist, lastFill);

        lastReadTime = now;
    }

    // 📡 Send only if time passed OR big change
    if (now - lastSendTime >= SEND_INTERVAL || abs(lastFill - prevFill) > 5)
    {

        sendData(lastFill, lastDist);

        prevFill = lastFill;
        lastSendTime = now;
    }
}