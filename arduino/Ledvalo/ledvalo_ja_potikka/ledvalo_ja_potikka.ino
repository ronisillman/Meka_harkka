#include <Adafruit_NeoPixel.h>

#define PIN 2     // input pin Neopixel is attached to

#define NUMPIXELS 8 // number of neopixels in strip

Adafruit_NeoPixel pixels = Adafruit_NeoPixel(NUMPIXELS, PIN, NEO_GRB + NEO_KHZ800);

int pot_pin = A0;
int pot_value;

int redColor = 255;
int greenColor = 0;
int blueColor = 0;

void setup() {
  pixels.begin();
  pinMode(pot_pin, INPUT); 
  Serial.begin(9600);
}

void loop() {

  pot_value = analogRead(pot_pin);
  //a = map(a, 0, 1023, 0, 180);
  //Serial.println(pot_value);

  if (pot_value > 1000) { 
    for (int i = 0; i < NUMPIXELS; i++) {
      pixels.setPixelColor(i, pixels.Color(255, 0, 0));
    }
    pixels.show();
    delay(200);
    for (int i = 0; i < NUMPIXELS; i++) {
      pixels.setPixelColor(i, pixels.Color(0, 0, 0));
    }
    pixels.show();
    delay(200);
  } else {
    for (int i = 0; i < NUMPIXELS; i++) {
      if (a > 900 / 8 * (i + 1)) { 
        if (i < 4) {
          pixels.setPixelColor(i, pixels.Color(0, 255, 0));
        } else if (i < 6) {
          pixels.setPixelColor(i, pixels.Color(255, 165, 0));
        } else {
          pixels.setPixelColor(i, pixels.Color(255, 0, 0));
        }
        pixels.show();
      } else {
        pixels.setPixelColor(i, pixels.Color(0, 0, 0));
        pixels.show();
      }
    }
  }
}