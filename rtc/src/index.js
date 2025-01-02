import * as mediasoup from 'mediasoup';
import WebSocket, { WebSocketServer } from 'ws';

import os from 'os'



async function startUp() {

    const worker = await mediasoup.createWorker({
        logLevel: "debug",
        logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
        rtcMinPort: 10000,
        rtcMaxPort: 10100,
    });
    console.log("Worker Created:", worker);

    const router = await worker.createRouter({
        mediaCodecs: [
            { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
            { kind: 'video', mimeType: 'video/VP8', clockRate: 90000, parameters: { 'x-google-start-bitrate': 1000 } },
        ],
    });

    console.log("Router Created:", router);

    const transports = new Map();
    let consumerTransport, producerTransport;


    function getLocalIPv4Address() {
        const networkInterfaces = os.networkInterfaces();
        for (const interfaceName in networkInterfaces) {
          const interfaces = networkInterfaces[interfaceName];
          if (interfaces) {
            for (const iface of interfaces) {
              if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
              }
            }
          }
        }
        return null;
      }

    const wss = new WebSocketServer({ port: 8080 });

    wss.on('connection', (socket) => {
        console.log("New WebSocket connection");

        socket.on('message', async (data) => {
            try {
                const msg = JSON.parse(data);
                console.log(msg);
                
                switch (msg.type) {

                    case "getRtpCap":
                        socket.send(JSON.stringify({
                            type: "rtpCap",
                            rtp: router.rtpCapabilities
                        }))
                        break;
                    
                    case "createTransport":
                        producerTransport = await router.createWebRtcTransport({
                            listenIps: [
                                {ip: '0.0.0.0', announcedIp: getLocalIPv4Address()}
                            ],
                            enableUdp: true,
                            enableTcp: true,
                            preferUdp: true,
                            initialAvailableOutgoingBitrate: 1000000
                        });

                        consumerTransport = await router.createWebRtcTransport({
                            listenIps: [
                                {ip: '0.0.0.0', announcedIp: getLocalIPv4Address()}
                            ],
                            enableUdp: true,
                            enableTcp: true,
                            preferUdp: true,
                            initialAvailableOutgoingBitrate: 1000000
                        });


                        socket.send(JSON.stringify({
                            type: "serverTransportCreated",
                            producerTransport: {
                                id: producerTransport.id,
                                iceParameters: producerTransport.iceParameters,
                                iceCandidates: producerTransport.iceCandidates,
                                dtlsParameters: producerTransport.dtlsParameters

                            },
                            consumerTransport: {
                                id: consumerTransport.id,
                                iceParameters: consumerTransport.iceParameters,
                                iceCandidates: consumerTransport.iceCandidates,
                                dtlsParameters: consumerTransport.dtlsParameters
                            }
                        }))
                        
                        break;

                    case "connectProducerTransport":
                        try {
                            const check = await producerTransport.connect({dtlsParameters: msg.dtlsParameters})
                            console.log("done", check);
                            
                            
                        } catch (error) {
                            console.log(error, "sdff");
                            
                        }
                        break;
                        case "connectConsumerTransport":
                            await consumerTransport.connect({dtlsParameters: msg.dtlsParameters})
                            break;
    
                    case 'produce':

                        const producer = await producerTransport.produce({
                            kind: msg.kind,
                            rtpParameters: msg.rtpParameters

                        })

                        socket.send(JSON.stringify({
                            type: "newProducer",
                            producerId: producer.id,
                            kind: producer.kind,
                            rtpParameters: producer.rtpParameters
                        }))
                        break

                    case 'consume':
                        console.log("fdsf");
                        console.log(msg);
                        try {
                            const consumer = await consumerTransport.consume({
                                producerId: msg.producerId,
                                kind: msg.kind,
                                rtpCapabilities: msg.rtpCapabilities,
                            })
                            console.log("Consumer",consumer);
                            
                            socket.send(JSON.stringify({
                                type: "consumerCreated",
                                id: consumer.id,
                                producerId: msg.producerId,
                                rtpParameters: consumer.rtpParameters,
                                kind: consumer.kind,
                            }))
                            
                        } catch (error) {
                            console.log(error, "asfaf");
                            
                        }
                        
                    default:
                        break;
                }

            } catch (error) {
                console.error("Error handling message:", error);
            }
        });

        socket.on('close', () => {
            console.log("WebSocket connection closed");
        });
    });

    console.log("WebSocket server running on ws://localhost:8080");
}

startUp();
