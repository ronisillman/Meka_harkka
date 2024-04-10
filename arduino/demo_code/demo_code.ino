#include <mbed.h>
#include <ArduinoBLE.h>
#include <SPI.h>
#include <SD.h>
#include <Arduino_LSM9DS1.h>
#include <rtos.h>
#include <Adafruit_NeoPixel.h>
#include <TimeLib.h>

rtos::Thread t1;
rtos::Thread t2;
rtos::Thread t3;
//rtos::Thread t4;  NOT NEEDED FOR DEMO

// Bluetooth **************
BLEService kierrosmittari("19B10000-E8F2-537E-4F6C-D104768A1214"); // Bluetooth® Low Energy LED Service
BLEUnsignedShortCharacteristic tyhjakaynti("19B10001-E8F2-537E-4F6C-D104768A1214", BLERead | BLEWrite);
BLEUnsignedShortCharacteristic tallennuspaalle("19B10002-E8F2-537E-4F6C-D104768A1214", BLERead | BLEWrite);
BLEUnsignedShortCharacteristic lahetakierros("19B10003-E8F2-537E-4F6C-D104768A1214", BLERead | BLEWrite | BLENotify); // New characteristic for sending data
BLEUnsignedLongCharacteristic RGB("19B10004-E8F2-537E-4F6C-D104768A1214", BLERead | BLEWrite);
BLEStringCharacteristic aika("19B10005-E8F2-537E-4F6C-D104768A1214", BLERead | BLEWrite, 20);
BLEUnsignedShortCharacteristic maxkierrokset("19B10006-E8F2-537E-4F6C-D104768A1214", BLERead | BLEWrite);
BLEUnsignedShortCharacteristic kirkkaus("19B10007-E8F2-537E-4F6C-D104768A1214", BLERead | BLEWrite);


uint16_t tyhjakierrokset;
uint16_t tallennus;
bool prev_tallennus = 0;
volatile bool runThread = false;
uint32_t RGB_data;
uint16_t kierrokset_max;
uint16_t kirkkaus_data = 128;

// SD  **************
File myFile;
float rate;

// aika ja paivays
bool aika_saatu = false;
String aika_arvo;

// LED **************
#define PIN 2     // input pin Neopixel is attached to
#define NUMPIXELS 16 // number of neopixels in strip
Adafruit_NeoPixel pixels = Adafruit_NeoPixel(NUMPIXELS, PIN, NEO_GRB + NEO_KHZ800);

int redColor = 0;
int greenColor = 255;
int blueColor = 0;

// Interrupt ja revs *********
#define pin_interrupt 6

volatile int pulses;
float revs;
unsigned long a = 0;
unsigned long b;

void readData() {
  pulses++;
}

void calculate_revs() {
  while (true) {
    pulses = 0;  
    delay(500);  
    b = millis();  
    detachInterrupt(digitalPinToInterrupt(pin_interrupt)); 
    if (pulses > 0) { 
      revs = 1000/((b-a)/pulses)*120;  
    }  
    else { 
      revs = 0; 
    } 
    attachInterrupt(digitalPinToInterrupt(pin_interrupt), readData, RISING);  
    a = millis();  
  }
}

void sendData() {
  while(true) {
    BLEDevice central = BLE.central();
    if (central) {
      while (central.connected()) {
          lahetakierros.writeValue(revs);
          delay(500);
      }
    }
  }
}

void led() {
  while(true) {
    pixels.setBrightness(kirkkaus_data);
    if (tyhjakierrokset > kierrokset_max) { 
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
        if (tyhjakierrokset >= (kierrokset_max / NUMPIXELS * i)) { 
          pixels.setPixelColor(i, pixels.Color(redColor, greenColor, blueColor));
        } else {
          pixels.setPixelColor(i, pixels.Color(0, 0, 0));
        }
      }
      pixels.show();
    } 
  }
}

void sd() {
  while(true) {
    if (tallennus != prev_tallennus) {
      if (tallennus) {
        Serial.println("Started data collection.");
        initialize();
        collectData();
      } else {
        Serial.println("Stopped data collection.");
      }
    } else if (tallennus) {
      collectData();
    }
    prev_tallennus = tallennus;
  }
}

void initialize() {
  Serial.print("Initializing SD card and IMU...");

  if (!SD.begin(4)) {
    Serial.println("Failed to initialize SD card");
    while (1);
  }

  if (!IMU.begin()) {
    Serial.println("Failed to initialize IMU!");
    while (1);
  }
  Serial.println("initialization done.");

  myFile = SD.open("data.txt", FILE_WRITE);

  if (myFile) {
    Serial.print("Writing headers to file with date:");
    Serial.print(day());
    Serial.print("/");
    Serial.print(month());
    Serial.print("/");
    Serial.print(year());
    Serial.print("...");
    rate = IMU.accelerationSampleRate();
    myFile.print("New data set, date:");
    myFile.print(day());
    myFile.print("/");
    myFile.print(month());
    myFile.print("/");
    myFile.print(year());
    myFile.print(", acceleration in m/s, IMU sample rate:");
    myFile.print(rate);
    myFile.print(", so data should be every ");
    myFile.print(1/rate);
    myFile.println(" seconds.");
    myFile.println("Time, seconds from boot;x[m/s^2];y[m/s^2];z[m/s^2]");
    // close the file:
    myFile.close();
    Serial.println("done.");
  } else {
    // if the file didn't open, print an error:
    Serial.println("error opening file");
  }
  Serial.println("Beginning data collection and writing to SD card.");
  }

  void collectData() {
  //while (tallennus) {
    float x, y, z, time;

    if (IMU.accelerationAvailable()) {
      IMU.readAcceleration(x, y, z);
      time = millis()/1000.0;
    } 

    myFile = SD.open("data.txt", FILE_WRITE);
    if (myFile) {
      myFile.print(hour());
      myFile.print(":");
      myFile.print(minute());
      myFile.print(":");
      myFile.print(second());
      myFile.print(";");
      myFile.print(time);
      myFile.print(";");
      myFile.print(x*9.81);
      myFile.print(";");
      myFile.print(y*9.81);
      myFile.print(";");
      myFile.println(z*9.81);
      myFile.close();
    } else {
      // if the file didn't open, print an error:
      Serial.println("Error opening file!");
    }
  //}
  Serial.println("Data is being written");
}

void setup() {
  // Bluetooth **************
  Serial.begin(9600);
  while (!Serial);

  // begin initialization
  if (!BLE.begin()) {
    Serial.println("starting Bluetooth® Low Energy module failed!");

    while (1);
  }

  // set advertised local name and service UUID:
  BLE.setLocalName("Kierroslukumittari");
  BLE.setAdvertisedService(kierrosmittari);

  // add the characteristic to the service
  kierrosmittari.addCharacteristic(tyhjakaynti);
  kierrosmittari.addCharacteristic(lahetakierros);
  kierrosmittari.addCharacteristic(tallennuspaalle);
  kierrosmittari.addCharacteristic(RGB);
  kierrosmittari.addCharacteristic(aika);
  kierrosmittari.addCharacteristic(maxkierrokset);
  kierrosmittari.addCharacteristic(kirkkaus);

  // add service
  BLE.addService(kierrosmittari);

  // set the initial value for the characeristic:
  tallennuspaalle.writeValue(0);

  // start advertising
  BLE.advertise();

  Serial.println("Kierroslukumittari Peripheral");

  t1.start(sendData);

  //// LED **************
  pixels.begin();
  //pinMode(pot_pin, INPUT); 
  t2.start(led);

  // Interupt 
  pinMode(pin_interrupt, INPUT);
  attachInterrupt(digitalPinToInterrupt(pin_interrupt), readData, RISING);
  //t4.start(calculate_revs); NOT NEEDED FOR DEMO
}

void loop() {
    // listen for Bluetooth® Low Energy peripherals to connect:
  BLEDevice central = BLE.central();

  // if a central is connected to peripheral:
  if (central) {
    Serial.print("Connected to central: ");
    // print the central's MAC address:
    Serial.println(central.address());

    // while the central is still connected to peripheral:
    while (central.connected()) {

      if (aika.written() && !aika_saatu) {
        Serial.println(aika.value());
        aika_arvo = aika.value();
        Serial.println(aika_arvo);

        int day_v, month_v, year_v, hour_v, minute_v, second_v;
        sscanf(aika_arvo.c_str(), "%d.%d.%d %d:%d:%d", &day_v, &month_v, &year_v, &hour_v, &minute_v, &second_v);

        setTime(hour_v, minute_v, second_v, day_v, month_v, year_v);
        Serial.print("Current time: ");
        Serial.print(hour());
        Serial.print(":");
        Serial.print(minute());
        Serial.print(":");
        Serial.println(second());

        aika_saatu = true;
      }

      if (tyhjakaynti.written()) {
      tyhjakierrokset = tyhjakaynti.value();
      Serial.print("Tyhjäkierrokset: ");
      Serial.println(tyhjakierrokset);
      } 

      if (maxkierrokset.written()) {
      kierrokset_max = maxkierrokset.value();
      Serial.print("Maxkierrokset: ");
      Serial.println(kierrokset_max);
      } 

      // Read the two bytes from the characteristic
      if (tallennuspaalle.written()) {
        tallennus = tallennuspaalle.value();
        Serial.print("Tallennus arvo: ");
        Serial.println(tallennus);
        if (tallennus == 1 && !runThread) {
          runThread = true;
          t3.start(sd);
        }
      } 

      if(RGB.written()) {
        RGB_data = RGB.value();
        redColor = (RGB_data >> 16) & 0xFF; 
        greenColor = (RGB_data >> 8) & 0xFF; 
        blueColor = RGB_data & 0xFF; 
        Serial.print("Red, green and blue values:");
        Serial.print(redColor);
        Serial.print(",");
        Serial.print(greenColor);
        Serial.print(",");
        Serial.println(blueColor);
      }

      if (kirkkaus.written()) {
        kirkkaus_data = kirkkaus.value();
        Serial.print("Kirkkaus: ");
        Serial.println(kirkkaus_data);
      } 

    }

    // when the central disconnects, print it out:
    Serial.print(F("Disconnected from central: "));
    Serial.println(central.address());
  }
}