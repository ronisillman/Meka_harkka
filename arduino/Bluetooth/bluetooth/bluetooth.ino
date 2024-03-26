#include <ArduinoBLE.h>

BLEService kierrosmittari("19B10000-E8F2-537E-4F6C-D104768A1214"); // Bluetooth® Low Energy LED Service


BLEUnsignedShortCharacteristic tyhjakaynti("19B10001-E8F2-537E-4F6C-D104768A1214", BLERead | BLEWrite);
BLEUnsignedShortCharacteristic lahetakierros("19B10002-E8F2-537E-4F6C-D104768A1215", BLERead | BLEWrite); // New characteristic for sending data
BLEUnsignedShortCharacteristic tallennuspaalle("19B10002-E8F2-537E-4F6C-D104768A1214", BLERead | BLEWrite);

uint16_t receivedValue;

void setup() {
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

  // add service
  BLE.addService(kierrosmittari);

  // set the initial value for the characeristic:
  tallennuspaalle.writeValue(0);

  // start advertising
  BLE.advertise();

  Serial.println("Kierroslukumittari Peripheral");
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
      // Read the two bytes from the characteristic
      if (tyhjakaynti.written()) {
      receivedValue = tyhjakaynti.value();
      Serial.print("Received value: ");
      Serial.println(receivedValue);
      } 

      // Read the two bytes from the characteristic
      if (tallennuspaalle.written()) {
      receivedValue = tallennuspaalle.value();
      Serial.print("Received value: ");
      Serial.println(receivedValue);
      } 
      
      //send data
      if (Serial.available()) {
        uint16_t dataToSend = 1600;
        lahetakierros.writeValue(dataToSend);
        Serial.println("Data sent!");
      }
    }

    // when the central disconnects, print it out:
    Serial.print(F("Disconnected from central: "));
    Serial.println(central.address());
  }
}
