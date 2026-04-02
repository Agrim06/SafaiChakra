#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

// ───────── CONFIG ─────────
const char *WIFI_SSID = "ERROR_net";
const char *WIFI_PASSWORD = "korou1121.,.,";

// ⚠️ Replace with your laptop IP
const char *SERVER_URL = "http://192.168.1.100:8000/bin/update";

const char *BIN_ID = "BIN_01";
const char *BIN_TYPE = "dry"; // change to "wet" if needed

// ───────── PINS ─────────
#define TRIG D1
#define ECHO D2
#define BUTTON D3 // calibration button (optional)

// ───────── VARIABLES ─────────
float BIN_HEIGHT = 40.0; // will update after calibration

// ───────── SETUP ─────────
void setup()
{
    Serial.begin(115200);

    pinMode(TRIG, OUTPUT);
    pinMode(ECHO, INPUT);
    pinMode(BUTTON, INPUT_PULLUP);

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }

    Serial.println("\nConnected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());

    Serial.println("Press 'c' OR button to CALIBRATE when bin is EMPTY");
}

// ───────── DISTANCE FUNCTION ─────────
float getDistance()
{
    digitalWrite(TRIG, LOW);
    delayMicroseconds(2);

    digitalWrite(TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG, LOW);

    long duration = pulseIn(ECHO, HIGH, 30000);

    if (duration == 0)
        return -1;

    float distance = duration * 0.034 / 2;
    return distance;
}

// ───────── CALIBRATION ─────────
void calibrateBin()
{
    Serial.println("\nCalibrating... Keep bin EMPTY!");

    float sum = 0;
    int count = 0;

    for (int i = 0; i < 10; i++)
    {
        float d = getDistance();
        if (d > 0)
        {
            sum += d;
            count++;
        }
        delay(200);
    }

    if (count > 0)
    {
        BIN_HEIGHT = sum / count;

        Serial.print("Calibrated BIN HEIGHT: ");
        Serial.print(BIN_HEIGHT);
        Serial.println(" cm");
    }
    else
    {
        Serial.println("Calibration failed!");
    }
}

// ───────── FILL CALCULATION ─────────
float getFill(float distance)
{
    if (distance < 0 || distance > BIN_HEIGHT)
        return 0;

    float fill = (1 - distance / BIN_HEIGHT) * 100;
    return constrain(fill, 0, 100);
}

// ───────── SEND DATA ─────────
void sendData(float fill, float distance)
{
    if (WiFi.status() != WL_CONNECTED)
        return;

    WiFiClient client;
    HTTPClient http;

    http.begin(client, SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;

    doc["bin_id"] = BIN_ID;
    doc["fill_pct"] = round(fill * 10) / 10.0;
    doc["distance_cm"] = round(distance * 10) / 10.0;
    doc["bin_type"] = BIN_TYPE;
    doc["timestamp"] = millis(); // uptime-based timestamp

    String payload;
    serializeJson(doc, payload);

    Serial.println("Sending: " + payload);

    int code = http.POST(payload);

    Serial.print("Response: ");
    Serial.println(code);

    http.end();
}

// ───────── LOOP ─────────
void loop()
{

    // 🔧 SERIAL CALIBRATION
    if (Serial.available())
    {
        char input = Serial.read();
        if (input == 'c')
        {
            calibrateBin();
        }
    }

    // 🔧 BUTTON CALIBRATION
    if (digitalRead(BUTTON) == LOW)
    {
        delay(200); // debounce
        calibrateBin();
    }

    float distance = getDistance();
    float fill = getFill(distance);

    Serial.print("Distance: ");
    Serial.print(distance);
    Serial.print(" cm | Fill: ");
    Serial.print(fill);
    Serial.println(" %");

    sendData(fill, distance);

    delay(10000); // send every 10 sec
}