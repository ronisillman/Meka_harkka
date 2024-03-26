/*
  SD card read/write

  This example shows how to read and write data to and from an SD card file
  The circuit:
   SD card attached to SPI bus as follows:
 ** MOSI - pin 11
 ** MISO - pin 12
 ** CLK - pin 13
 ** CS - pin 4 (for MKRZero SD: SDCARD_SS_PIN)

  created   Nov 2010
  by David A. Mellis
  modified 9 Apr 2012
  by Tom Igoe

  This example code is in the public domain.

*/

#include <SPI.h>
#include <SD.h>
#include <Arduino_LSM9DS1.h>

File myFile;

float rate;

void setup() {
  Serial.begin(9600);
  while (!Serial) {
    ; 
  }


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
    Serial.print("Writing headers to file...");
    rate = IMU.accelerationSampleRate();
    myFile.print("New data set, acceleration in m/s, IMU sample rate:");
    myFile.print(rate);
    myFile.print(", so data should be every ");
    myFile.print(1/rate);
    myFile.println(" seconds.");
    myFile.println("Seconds from boot;x[m/s];y[m/s];z[m/s]");
    // close the file:
    myFile.close();
    Serial.println("done.");
  } else {
    // if the file didn't open, print an error:
    Serial.println("error opening file");
  }
  Serial.println("Beginning data collection and writing to SD card.");
}

void loop() {
  float x, y, z, time;

  if (IMU.accelerationAvailable()) {
    IMU.readAcceleration(x, y, z);
    time = millis()/1000.0;
  } 

  myFile = SD.open("data.txt", FILE_WRITE);
  if (myFile) {
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
}


