import { BleClient } from '@capacitor-community/bluetooth-le';

let isConnected = false;
function updateConnectionStatus() {
    const connectionStatusElement = document.getElementById('connectionStatus');
    if (isConnected) {
        connectionStatusElement.textContent = "Yhdistetty"
    } else {
        connectionStatusElement.textContent = "Ei yhdistettyä laitetta"
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

        // Subscribe to notifications from the characteristic where data is being sent
        /*
        await BleClient.startNotifications(
            deviceObject.deviceId,
            "19B10000-E8F2-537E-4F6C-D104768A1214", // Service UUID
            "19B10003-E8F2-537E-4F6C-D104768A1214", // Characteristic UUID
            handleReceivedData
        ); */
    } catch (error) {
        console.error(error);
        connectionStatusElement.textContent = "Yhtyeden muodostus epäonnistui";
    }
}

const char1value = document.getElementById("char1");
async function startListen() {
    await BleClient.startNotifications(
        deviceObject.deviceId,
        "19B10000-E8F2-537E-4F6C-D104768A1214", // Service UUID
        "19B10003-E8F2-537E-4F6C-D104768A1214", // Characteristic UUID
        (value) => {
            console.log("Value received: ", value.getUint16(0, true));
            char1value.innerHTML = value.getUint16(0, true).toString();
        }
    )
}

// Function to handle received data
function handleReceivedData(buffer) {
    const dataView = new DataView(buffer);
    const receivedValue = dataView.getUint16(0, false); // Read uint16 data from buffer
    console.log("Received value:", receivedValue);

    // Display received data below the toggle switch
    const receivedDataElement = document.getElementById('dataValue');
    receivedDataElement.textContent = receivedValue;

    // Call the callback function with the received value
    if (receivedValueCallback) {
        receivedValueCallback(receivedValue);
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

    console.log("Calling BleClient.write with value:", value);

    await BleClient.write(
        deviceObject.deviceId,
        "19B10000-E8F2-537E-4F6C-D104768A1214",
        "19B10002-E8F2-537E-4F6C-D104768A1214",
        byteArray
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
    startListen();
    console.log("listen button pressed");
})


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
