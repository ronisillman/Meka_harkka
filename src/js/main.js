import { BleClient } from '@capacitor-community/bluetooth-le';
import iro from '@jaames/iro';
import { Geolocation } from '@capacitor/geolocation';
import OSM from 'ol/source/OSM';
import TileLayer from 'ol/layer/Tile';
import { Map, View } from 'ol';
import { fromLonLat } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import { Capacitor } from '@capacitor/core';
import { Attribution, defaults as defaultControls } from 'ol/control.js';
import LineString from 'ol/geom/LineString';
import Stroke from 'ol/style/Stroke';

let previousLocation = null;
let map = null;
let vectorSource = null;
let iconFeature;

function drawLine(source, start, end) {
    const lineFeature = new Feature(new LineString([start, end]));
    lineFeature.setStyle(new Style({
        stroke: new Stroke({
            color: '#00e1ff',
            width: 6
        })
    }));
    source.addFeature(lineFeature);
}

const attribution = new Attribution({
    collapsible: false,
});

const initializeMap = async () => {
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    const { latitude, longitude } = position.coords;

    console.log('Current latitude:', latitude);
    console.log('Current longitude:', longitude);

    iconFeature = new Feature({
        geometry: new Point(fromLonLat([longitude, latitude])),
        name: 'Sijaintisi',
    });

    const iconStyle = new Style({
        image: new Icon({
            anchor: [0.5, 1],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            src: Capacitor.convertFileSrc('marker_transparent.png'),
            scale: 0.15,
        }),
    });

    iconFeature.setStyle(iconStyle);

    vectorSource = new VectorSource({
        features: [iconFeature],
    });

    const vectorLayer = new VectorLayer({
        source: vectorSource,
    });

    map = new Map({
        target: document.getElementById('map'),
        controls: defaultControls({ attribution: false }).extend([attribution]),
        layers: [
            new TileLayer({
                source: new OSM(),
            }),
            vectorLayer,
        ],
        view: new View({
            center: fromLonLat([longitude, latitude]),
            zoom: 10,
        }),
    });

    previousLocation = fromLonLat([longitude, latitude]);

    function checkSize() {
        const small = map.getSize()[0] < 600;
        attribution.setCollapsible(small);
        attribution.setCollapsed(small);
    }

    map.on('change:size', checkSize);
    checkSize();

};

initializeMap().then(() => {
    let watchId = null;
    const message2 = document.getElementById('message2');
    const mapDiv = document.getElementById('map');
    mapDiv.style.display = "none"; // Hide the map initially

    document.getElementById('button5').addEventListener('click', () => {
        if (watchId === null) {
            // Start watching position
            Geolocation.watchPosition({ enableHighAccuracy: true }, async (position, error) => {
                if (error) {
                    message2.textContent = `Virhe: ${error.message}`;
                    return;
                }

                const { latitude, longitude } = position.coords;
                const currentLocation = fromLonLat([longitude, latitude]);

                const velocity = position.coords.speed;

                const char4value = document.getElementById("char4");
                if (velocity !== null) {
                    char4value.innerHTML = (velocity * 3.6).toFixed(1);
                } else {
                    char4value.innerHTML = "null";
                }

                drawLine(vectorSource, previousLocation, currentLocation);

                // Update the icon position
                iconFeature.setGeometry(new Point(currentLocation));

                previousLocation = currentLocation;

                message2.textContent = "Kartta avattu.";
                mapDiv.style.display = "block"; // Show the map
            }).then(id => {
                watchId = id;
            }).catch(error => {
                message2.textContent = `Virhe: ${error.message}`;
            });
        } else {
            // Stop watching position
            Geolocation.clearWatch({ id: watchId }).then(() => {
                watchId = null;
                message2.textContent = "Kartta suljettu.";
                mapDiv.style.display = "none"; // Hide the map
            }).catch(error => {
                message2.textContent = `Virhe: ${error.message}`;
            });
        }
    });
});

let isConnected = false;
function updateConnectionStatus() {
    const connectionStatusElement = document.getElementById('connectionStatus');
    if (isConnected) {
        connectionStatusElement.textContent = "Yhdistetty laitteeseen: " + deviceObject.name;
    } else {
        connectionStatusElement.textContent = "Ei yhdistettyä laitetta";
    }

}

updateConnectionStatus();

let deviceObject;
export async function connect() {
    try {
        await BleClient.initialize();

        const device = await BleClient.requestDevice({

        });

        // connect to device, the onDisconnect callback is optional
        await BleClient.connect(device.deviceId, (deviceId) => onDisconnect(deviceId));
        console.log('connected to device', device);
        deviceObject = device;
        isConnected = true; // Update connection status
        updateConnectionStatus(); // Update UI

        const char1value = document.getElementById("char1");
        const char2value = document.getElementById("char2");
        const char3value = document.getElementById("char3");

        let min = Infinity;
        let max = -Infinity;

        await BleClient.startNotifications(
            deviceObject.deviceId,
            "19B10000-E8F2-537E-4F6C-D104768A1214", // Service UUID
            "19B10003-E8F2-537E-4F6C-D104768A1214", // Characteristic UUID
            (value) => {
                const receivedValue = value.getUint16(0, true);
                //console.log("Value received: ", receivedValue);
                min = Math.min(min, receivedValue);
                max = Math.max(max, receivedValue);
                char1value.innerHTML = receivedValue.toString();
                char2value.innerHTML = min.toString();
                char3value.innerHTML = max.toString();
            }
        )


        let currentDateTime = new Date();
        let date = currentDateTime.getDate();
        let month = currentDateTime.getMonth() + 1; // Months are zero based
        let year = currentDateTime.getFullYear();
        let hours = currentDateTime.getHours();
        let minutes = currentDateTime.getMinutes();
        let seconds = currentDateTime.getSeconds();

        let formattedDateTime = `${date}.${month}.${year} ${hours}:${minutes}:${seconds}`;

        console.log("Formatted Date and Time: " + formattedDateTime);

        // Create a buffer and a DataView
        const bufferSize = 20;
        const buffer = new ArrayBuffer(bufferSize);
        const dataView = new DataView(buffer);

        // Use TextEncoder to encode the string into the buffer
        new TextEncoder().encodeInto(formattedDateTime, new Uint8Array(buffer));

        await BleClient.write(
            deviceObject.deviceId,
            "19B10000-E8F2-537E-4F6C-D104768A1214", // Service UUID
            "19B10005-E8F2-537E-4F6C-D104768A1214", // Characteristic UUID
            dataView
        );

    } catch (error) {
        console.error(error);
        connectionStatusElement.textContent = "Virhe yhdistämisessä: " + error.message;
    }
}

async function disConnect() {
    if (deviceObject) {
        try {
            await BleClient.disconnect(deviceObject.deviceId);
            console.log('Disconnected from device', deviceObject);
            deviceObject = null;
            isConnected = false; // Update connection status
            updateConnectionStatus(); // Update UI
        } catch (error) {
            console.error('Error disconnecting from device', error);
        }
    } else {
        console.log('No device to disconnect');
    }
}

// Function to set the callback for received values
export function setReceivedValueCallback(callback) {
    receivedValueCallback = callback;
}

async function writeData1(value) {
    const bufferSize = 20;
    const buffer = new ArrayBuffer(bufferSize);
    const dataView = new DataView(buffer);

    dataView.setUint16(0, value, true);

    let byte1 = dataView.getUint8(0);
    let byte2 = dataView.getUint8(1);

    console.log("Sending bytes:", byte1, byte2);

    const byteArray = new Uint8Array([byte1, byte2]);

    await BleClient.write(
        deviceObject.deviceId,
        "19B10000-E8F2-537E-4F6C-D104768A1214",
        "19B10001-E8F2-537E-4F6C-D104768A1214",
        byteArray
    );
}

async function writeData2(value) {
    const bufferSize = 20;
    const buffer = new ArrayBuffer(bufferSize);
    const dataView = new DataView(buffer);

    dataView.setUint16(0, value, true);

    let byte1 = dataView.getUint8(0);
    let byte2 = dataView.getUint8(1);

    console.log("Sending bytes:", byte1, byte2);

    const byteArray = new Uint8Array([byte1, byte2]);

    await BleClient.write(
        deviceObject.deviceId,
        "19B10000-E8F2-537E-4F6C-D104768A1214",
        "19B10002-E8F2-537E-4F6C-D104768A1214",
        byteArray
    );
}

async function writeData3(red, green, blue) {
    const bufferSize = 20;
    const buffer = new ArrayBuffer(bufferSize);
    const dataView = new DataView(buffer);

    const rgb = (red << 16) | (green << 8) | blue;
    dataView.setUint32(0, rgb, true);
    console.log("Sending RGB:", rgb);

    await BleClient.write(
        deviceObject.deviceId,
        "19B10000-E8F2-537E-4F6C-D104768A1214",
        "19B10004-E8F2-537E-4F6C-D104768A1214",
        dataView
    );
}

async function writeData4(value) {
    const bufferSize = 20;
    const buffer = new ArrayBuffer(bufferSize);
    const dataView = new DataView(buffer);

    dataView.setUint16(0, value, true);

    let byte1 = dataView.getUint8(0);
    let byte2 = dataView.getUint8(1);

    console.log("Sending bytes:", byte1, byte2);

    const byteArray = new Uint8Array([byte1, byte2]);

    await BleClient.write(
        deviceObject.deviceId,
        "19B10000-E8F2-537E-4F6C-D104768A1214",
        "19B10006-E8F2-537E-4F6C-D104768A1214",
        byteArray
    );
}

async function writeData5(value) {
    const bufferSize = 20;
    const buffer = new ArrayBuffer(bufferSize);
    const dataView = new DataView(buffer);

    dataView.setUint16(0, value, true);

    console.log("Sending data:", dataView.getUint8(0));

    await BleClient.write(
        deviceObject.deviceId,
        "19B10000-E8F2-537E-4F6C-D104768A1214",
        "19B10007-E8F2-537E-4F6C-D104768A1214",
        dataView
    );
}

function onDisconnect(deviceId) {
    console.log(`device ${deviceId} disconnected`);
    isConnected = false; // Update connection status on error
    updateConnectionStatus(); // Update UI
}

const toggle1 = document.getElementById("toggle1");
toggle1.addEventListener('change', () => {
    if (toggle1.checked == true) {
        console.log("Toggle on");
        writeData2(1);
    } else {
        console.log("Toggle off");
        writeData2(0);
    }
});

const button1 = document.getElementById("button1");
button1.addEventListener('click', () => {
    connect();
});

const button2 = document.getElementById("button2");
button2.addEventListener('click', () => {
    disConnect();
});

const button3 = document.getElementById('button3');
const infoBox = document.getElementById('infoBox');
button3.addEventListener('click', (event) => {
    console.log('Tietoa clicked');
    infoBox.classList.add('visible');
    event.stopPropagation(); // Prevents the event from bubbling up to the document
});

infoBox.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevents the event from bubbling up to the document
});

document.addEventListener('click', () => {
    infoBox.classList.remove('visible');
});

// Get the slider and char5 elements
const slider = document.getElementById('rangeslider');
const char5 = document.getElementById('char5');

// Add an input event listener to the slider
slider.addEventListener('input', function() {
    const mappedValue = Math.round((this.value / 255) * 100);
    char5.textContent = mappedValue;
    throttledWriteData5(this.value);
});

slider.dispatchEvent(new Event('input'));

const lightIcon = document.getElementById("light-icon");
const darkIcon = document.getElementById("dark-icon");
document.getElementById('button4').addEventListener('click', toggleDarkMode);

// Check if dark mode is preferred
const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
let darkMode = darkModeMediaQuery.matches;

// Set dark-mode class on body if darkMode is true and pick icon
if (darkMode) {
  document.body.classList.add("dark-mode");
  darkIcon.setAttribute("display", "none");
} else {
  lightIcon.setAttribute("display", "none");
}

// Toggle dark mode on button click
function toggleDarkMode() {
    // Toggle darkMode variable
    darkMode = !darkMode;
  
    // Toggle dark-mode class on body
    document.body.classList.toggle("dark-mode");
  
    // Toggle light and dark icons
    if (darkMode) {
      lightIcon.setAttribute("display", "block");
      darkIcon.setAttribute("display", "none");
    } else {
      lightIcon.setAttribute("display", "none");
      darkIcon.setAttribute("display", "block");
    }
  }

var colorPicker = new iro.ColorPicker(".colorPicker", {
    // color picker options
    // Option guide: https://iro.js.org/guide.html#color-picker-options
    width: 120,
    color: "rgb(0, 255, 0)",
    borderWidth: 0,
    borderColor: "#fff",
});

var values = document.getElementById("values");
var hexInput = document.getElementById("hexInput");

let red;
let green;
let blue;

function throttle(func, limit) {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

let throttledWriteData3 = throttle(writeData3, 100); // Adjust the delay as needed
let throttledWriteData5 = throttle(writeData5, 50);

// https://iro.js.org/guide.html#color-picker-events
colorPicker.on(["color:init", "color:change"], function (color) {
    // Show the current color in different formats
    // Using the selected color: https://iro.js.org/guide.html#selected-color-api
    values.innerHTML = [
        //"hex: " + color.hexString,
        color.rgbString,
    ].join("<br>");
    hexInput.value = color.hexString;

    red = color.rgb.r;
    green = color.rgb.g;
    blue = color.rgb.b;
    throttledWriteData3(red, green, blue);
});

hexInput.addEventListener('change', function () {
    const isValidHex = /^#[0-9A-F]{6}$/i.test(this.value);
    const validationMessage = document.getElementById('validationMessage');
    if (isValidHex) {
        // If the input value is valid, clear the validation message
        validationMessage.textContent = '';
        colorPicker.color.hexString = this.value;
    } else {
        // If the input value is not valid, set the validation message
        validationMessage.textContent = 'Syötä heksadesimaali.';
    }
});

document.getElementById("myForm").addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent the default form submission

    // Get the value from the input field
    var inputValue = parseInt(document.getElementById("numberInput").value);
    var inputValue2 = parseInt(document.getElementById("maxkierrokset").value);

    // Check if the input is a valid integer
    if (Number.isInteger(inputValue) && inputValue < 65535 && Number.isInteger(inputValue2) && inputValue2 < 65535) {
        // Input is a valid integer, call the writeData1 function with the input value
        try {
            await writeData1(inputValue);
            await writeData4(inputValue2);
            document.getElementById("message").textContent = "Kierrokset kirjoitettu onnistuneesti.";
        } catch (error) {
            document.getElementById("message").textContent = "Virhe datan kirjoittamisessa: " + error.message;
        }
    } else {
        // Input is not a valid integer, display an error message below the input box
        document.getElementById("message").textContent = "Syötä numero, joka on pienempi kuin 65535!";
    }
});

// Example of how to use the received data callback
setReceivedValueCallback((value) => {
    // Do something with the received value
    console.log("Received value callback:", value);
});

//ÄLÄ LISÄÄ TÄNNE MITÄÄN, ei jostain syystä toimi ollekaan