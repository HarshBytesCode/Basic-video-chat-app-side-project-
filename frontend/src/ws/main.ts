'use client'
import * as mediasoup from 'mediasoup-client'

export async function connectWs() {
    let device: mediasoup.Device;
    let transport: mediasoup.types.Transport;
    const socket = new WebSocket('ws://localhost:8080');

    let deviceLoaded = false;

    socket.onopen = () => {

        socket.send(JSON.stringify({
            type: "getRtp"
        }));
        console.log("get rtp sended");
        
    };


    socket.onmessage = async (data: any) => {
        const msg = await JSON.parse(data.data);
        console.log(msg, "message");

        if (msg.type === 'rtp') {
            device = new mediasoup.Device();

            try {
                device.load({ routerRtpCapabilities: msg.rtp }).then(() => {
                    deviceLoaded = true;
                    console.log(device, "Device loaded");
    
                    socket.send(JSON.stringify({
                        type: "createTransport",
                    }));

                })

            } catch (error) {
                console.error("Error loading device:", error);
            }
        }

        // Handle transport creation
        if (msg.type === 'transportCreated' && deviceLoaded) {
            try {
                console.log("Transport created:", msg);

                transport = device.createSendTransport({
                    id: msg.transportInfo.transportId,
                    iceCandidates: msg.transportInfo.iceCandidates,
                    iceParameters: msg.transportInfo.iceParameters,
                    dtlsParameters: msg.transportInfo.dtls
                });

                console.log("Transport created");

                transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
                    try {
                        console.log("Connecting transport");

                        socket.send(JSON.stringify({
                            type: "transd",
                            transportId: transport.id,
                            dtlsParameters
                        }));

                        callback(); // Notify MediaSoup that connection is successful
                    } catch (error: any) {
                        console.error("Error during transport connect:", error);
                        errback(error); // Notify MediaSoup that connection failed
                    }
                });

                // Handle produce event
                transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
                    try {
                        console.log("Producing media");

                        socket.send(JSON.stringify({
                            type: "produce",
                            transportId: transport.id,
                            kind,
                            rtpParameters
                        }));

                        // callback(); // Notify MediaSoup that production is successful
                    } catch (error: any) {
                        console.error("Error during production:", error);
                        errback(error); // Notify MediaSoup that production failed
                    }
                });

                // Handle connection state change
                transport.on('connectionstatechange', (state) => {
                    console.log(`Transport connection state changed: ${state}`);
                    switch (state) {
                        case 'connected':
                            console.log("Transport connected");
                            break;
                        case 'failed':
                            console.error("Transport failed");
                            transport.close(); // Close transport on failure
                            break;
                        case 'disconnected':
                            console.log("Transport disconnected");
                            break;
                        default:
                            console.log(`Unhandled connection state: ${state}`);
                            break;
                    }
                });

            } catch (error) {
                console.error("Error creating transport:", error);
            }
        }
    };

    // Handle socket errors
    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
    };

    // Handle socket close
    socket.onclose = () => {
        console.log("WebSocket closed");
    };
}
