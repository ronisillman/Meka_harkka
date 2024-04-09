#include <mbed.h>
#include <rtos.h>

rtos::Thread t1;

#define a_pin = A0;

int value;
int number;
float revs;
unsigned long a = 0;
unsigned long b;


void readData {
  while(true){
    value = analogRead();
    if (value < 75) {
      number++;
    }
  }
}


void setup() {
  pinMode(a_pin, INPUT);
  Serial.begin(9600);
  t1.start(readData);

}

void loop() {
  number = 0;
  delay(500);
  b = millis();
  revs = 1000/((b-a)/number)*120;
  a = millis();
  Serial.print(revs);
}
