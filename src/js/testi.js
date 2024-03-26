import { BleClient } from '@capacitor-community/bluetooth-le';
import iro from '@jaames/iro';

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
                console.log("Value received: ", receivedValue);
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
})

const button2 = document.getElementById("button2");
button2.addEventListener('click', () => {
    disConnect();
})

var colorPicker = new iro.ColorPicker(".colorPicker", {
    // color picker options
    // Option guide: https://iro.js.org/guide.html#color-picker-options
    width: 120,
    color: "rgb(0, 255, 0)",
    borderWidth: 1,
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
let throttledWriteData3 = throttle(writeData3, 300); // Adjust the delay as needed

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

    // Check if the input is a valid integer
    if (Number.isInteger(inputValue) && inputValue < 65535) {
        // Input is a valid integer, call the writeData1 function with the input value
        try {
            await writeData1(inputValue);
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