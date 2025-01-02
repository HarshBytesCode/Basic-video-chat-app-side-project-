import { Device } from 'mediasoup-client';


export async function connectWs() {
    let device;
    let transport;
    const socket = new WebSocket('ws://localhost:8080');
    let deviceLoaded = false;
    let sendTransport, recvTransport;

    
    
    async function produceVideo() {
            console.log("started");
        
        const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true})
        const videoStream = stream.getVideoTracks()[0];
        const videoR = document.createElement('video')
        videoR.srcObject = new MediaStream([videoStream])
        videoR.autoplay = true;
        videoR.playsInline = true;
        videoR.style.border = "2px solid blue"
        document.body.appendChild(videoR)
        await sendTransport.produce({ track: videoStream })
    }

    socket.onopen = () => {
        socket.send(JSON.stringify({ type: "getRtpCap" }));
        console.log("Requested RTP capabilities.");
    };

    socket.onmessage = async (event) => {
        try {
            const msg = JSON.parse(event.data);
            console.log(msg);
            
            if(msg.type == "rtpCap") {
                try {
                    device = new Device();
                    
                    const device2 = device.load({routerRtpCapabilities: msg.rtp}).then(() => {
                        if(device.loaded) {
                            console.log("loaded");
        
                            socket.send(JSON.stringify({
                                type: "createTransport"
                            }))
                            
                        }

                    })
                    
                    
                } catch (error) {
                    console.log("Error", error);
                    
                }

            }

            if(msg.type == 'serverTransportCreated') {
                try {
                    
                    sendTransport = await device.createSendTransport({
                        id: msg.producerTransport.id,
                        iceParameters: msg.producerTransport.iceParameters,
                        iceCandidates: msg.producerTransport.iceCandidates,
                        dtlsParameters: msg.producerTransport.dtlsParameters
                    })

                    recvTransport = await device.createRecvTransport({
                        id: msg.consumerTransport.id,
                        iceParameters: msg.consumerTransport.iceParameters,
                        iceCandidates: msg.consumerTransport.iceCandidates,
                        dtlsParameters: msg.consumerTransport.dtlsParameters
                    })
    
                    console.log("transportt",sendTransport);
    
                    sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                        try {
                            console.log("dsd");
                            
                            socket.send(JSON.stringify({
                                type: "connectProducerTransport",
                                dtlsParameters
                            }))

                            callback()
                            
                        } catch (error) {
                            console.log("Errororor", error);
                            errback()
                        }
    
                    })

                    recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                        try {
                            console.log("receuive");
                            
                            socket.send(JSON.stringify({
                                type: "connectConsumerTransport",
                                dtlsParameters
                            }))

                            callback()
                            
                        } catch (error) {
                            console.log("Errororor", error);
                            errback()
                        }
    
                    })
                    sendTransport.on("connectionstatechange", (state) => {
                        console.log("Sstate", state);
                        // if(state == "connected") {
                        //     console.log("stream");
                        //     produceVideo()
                            
                        // }
                        
                    })

                    recvTransport.on("connectionstatechange", (state) => {
                        console.log("state", state);
                        
                    })

                    sendTransport.on('produce', async({ kind, rtpParameters }, callback, errback ) => {
                        try {
                            console.log("prod");
                            
                            socket.send(JSON.stringify({
                                type: "produce",
                                transportId: sendTransport.id,
                                kind,
                                rtpParameters
                            }))
                            callback()
                        } catch (error) {
                            console.log(error);
                            errback()
                        }
                    })

                    
                } catch (error) {
                    console.log("dsd", error);
                    
                }

                
            }

            if(msg.type == 'newProducer') {

                socket.send(JSON.stringify({
                    type: "consume",
                    producerId: msg.producerId,
                    kind: msg.kind,
                    rtpCapabilities: device.rtpCapabilities
                }))
            }

            if(msg.type == 'consumerCreated') {
                console.log(msg);
                try {
                    const consumer = await recvTransport.consume({
                        id: msg.id,
                        kind: msg.kind,
                        producerId: msg.producerId,
                        rtpParameters: msg.rtpParameters
                    })

                    const video = document.createElement('video')
                    video.srcObject = new MediaStream([consumer.track])
                    video.autoplay = true;
                    video.playsInline = true;
                    video.style.border = "2px solid black"
                    document.body.appendChild(video)
    
                    console.log("consumer", consumer);
                    
                } catch (error) {
                    console.log("error", error);
                    
                }
                
            }
                
        } catch (error) {
            console.error("Error handling message:", error);
        }
    };

    socket.onerror = (error) => console.error("WebSocket error:", error);
    socket.onclose = () => console.log("WebSocket connection closed.");
}
