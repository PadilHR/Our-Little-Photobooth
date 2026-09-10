import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getDatabase,
    ref,
    set,
    get,
    onValue,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


// ========================================
// FIREBASE
// ========================================

const firebaseConfig = {
    apiKey: "AIzaSyDiYYQoV3XH8Ki1KU7Nqnrr2rRrNU-EcSg",
    authDomain: "photobooth-online-b50e6.firebaseapp.com",
    projectId: "photobooth-online-b50e6",
    storageBucket: "photobooth-online-b50e6.firebasestorage.app",
    messagingSenderId: "559532144208",
    appId: "1:559532144208:web:35ba8cc6815f1c62dd8355",
    measurementId: "G-TYDNBN8RBG"
};

const app = initializeApp(firebaseConfig);

const database = getDatabase(app);
const auth = getAuth(app);


// ========================================
// VARIABLES
// ========================================

let peer = null;
let connection = null;
let mediaConnection = null;

let localStream = null;
let remoteStream = null;

let myName = "";
let myRole = "";
let roomCode = "";

let currentPhotoIndex = 0;

let myPhotos = [];
let partnerPhotos = [];

let waitingForPartnerPhoto = false;


// ========================================
// PAGE ELEMENTS
// ========================================

const landingPage =
    document.getElementById("landingPage");

const namePage =
    document.getElementById("namePage");

const roomPage =
    document.getElementById("roomPage");

const createPage =
    document.getElementById("createPage");

const joinPage =
    document.getElementById("joinPage");

const connectedPage =
    document.getElementById("connectedPage");

const photoboothPage =
    document.getElementById("photoboothPage");

const resultPage =
    document.getElementById("resultPage");


const nameInput =
    document.getElementById("nameInput");

const roomInput =
    document.getElementById("roomInput");

const roomCodeDisplay =
    document.getElementById("roomCode");

const waitingText =
    document.getElementById("waitingText");

const joinError =
    document.getElementById("joinError");


const localVideo =
    document.getElementById("localVideo");

const remoteVideo =
    document.getElementById("remoteVideo");


const connectionStatus =
    document.getElementById("connectionStatus");

const connectedTitle =
    document.getElementById("connectedTitle");

const connectedSubtitle =
    document.getElementById("connectedSubtitle");

const remoteLabel =
    document.getElementById("remoteLabel");


const startExperienceBtn =
    document.getElementById(
        "startExperienceBtn"
    );


const photoLocalVideo =
    document.getElementById(
        "photoLocalVideo"
    );

const photoRemoteVideo =
    document.getElementById(
        "photoRemoteVideo"
    );

const photoTitle =
    document.getElementById(
        "photoTitle"
    );

const photoPrompt =
    document.getElementById(
        "photoPrompt"
    );

const countdown =
    document.getElementById(
        "countdown"
    );

const photoStatus =
    document.getElementById(
        "photoStatus"
    );

const takePhotoBtn =
    document.getElementById(
        "takePhotoBtn"
    );

const photostripCanvas =
    document.getElementById(
        "photostripCanvas"
    );

const downloadStripBtn =
    document.getElementById(
        "downloadStripBtn"
    );


// ========================================
// PAGE SYSTEM
// ========================================

function showPage(page) {

    const pages = [
        landingPage,
        namePage,
        roomPage,
        createPage,
        joinPage,
        connectedPage,
        photoboothPage,
        resultPage
    ];

    pages.forEach(p => {

        if (p) {
            p.classList.remove("active");
        }

    });

    page.classList.add("active");
}


// ========================================
// LANDING
// ========================================

document
    .getElementById("startBtn")
    .addEventListener(
        "click",
        () => {

            showPage(namePage);

        }
    );


// ========================================
// NAME
// ========================================

document
    .getElementById("continueBtn")
    .addEventListener(
        "click",
        () => {

            const name =
                nameInput.value.trim();

            if (!name) {

                alert(
                    "Masukkan nama kamu dulu ❤️"
                );

                return;
            }

            myName = name;

            showPage(roomPage);

        }
    );


// ========================================
// CREATE ROOM
// ========================================

document
    .getElementById("createRoomBtn")
    .addEventListener(
        "click",
        async () => {

            myRole = "host";

            showPage(createPage);

            waitingText.textContent =
                "Connecting to room server...";

            try {

                await signInAnonymously(auth);

                peer = new Peer({
                    debug: 3,
                    config: {
                        iceServers: [
                            {
                                urls: "stun:stun.l.google.com:19302"
                            },

                            {
                                urls: "turn:YOUR_TURN_SERVER",
                                username: "YOUR_USERNAME",
                                credential: "YOUR_PASSWORD"
                            }
                        ]
                    }
                });

                setupPeerEvents();

                peer.on(
                    "open",
                    async peerId => {

                        roomCode =
                            generateRoomCode();

                        roomCodeDisplay.textContent =
                            roomCode;

                        const roomRef =
                            ref(
                                database,
                                "rooms/" +
                                roomCode
                            );

                        await set(
                            roomRef,
                            {

                                hostName:
                                    myName,

                                hostPeerId:
                                    peerId,

                                guestName:
                                    "",

                                guestPeerId:
                                    "",

                                createdAt:
                                    Date.now()

                            }
                        );

                        onDisconnect(
                            roomRef
                        ).remove();

                        waitingText.textContent =
                            "Waiting for the other person... ❤️";

                        await startCamera();


                        onValue(
                            roomRef,
                            snapshot => {

                                const data =
                                    snapshot.val();

                                if (!data) {
                                    return;
                                }

                                if (
                                    data.guestPeerId &&
                                    !connection
                                ) {

                                    remoteLabel.textContent =
                                        data.guestName ||
                                        "Your person";

                                    connectedSubtitle.textContent =
                                        data.guestName +
                                        " is here. Connecting cameras...";

                                    waitingText.textContent =
                                        "Your person is here! ❤️";

                                    showPage(
                                        connectedPage
                                    );

                                    connectToPeer(
                                        data.guestPeerId
                                    );

                                }

                            }
                        );

                    }
                );

                peer.on(
                    "error",
                    error => {

                        console.error(
                            "PeerJS:",
                            error
                        );

                        waitingText.textContent =
                            "Connection error.";

                    }
                );

            } catch (error) {

                console.error(error);

                alert(
                    "Gagal membuat room."
                );

                showPage(roomPage);

            }

        }
    );


// ========================================
// JOIN ROOM
// ========================================

document
    .getElementById("joinRoomBtn")
    .addEventListener(
        "click",
        () => {

            showPage(joinPage);

        }
    );


document
    .getElementById("joinConfirmBtn")
    .addEventListener(
        "click",
        async () => {

            joinError.textContent = "";

            const code =
                roomInput.value
                    .trim()
                    .toUpperCase();

            if (
                !/^LOVE-[A-Z0-9]{4}$/.test(
                    code
                )
            ) {

                joinError.textContent =
                    "Format harus LOVE-ABCD";

                return;
            }

            roomCode = code;

            try {

                await signInAnonymously(auth);

                const roomRef =
                    ref(
                        database,
                        "rooms/" +
                        roomCode
                    );

                const snapshot =
                    await get(roomRef);

                if (
                    !snapshot.exists()
                ) {

                    joinError.textContent =
                        "Room tidak ditemukan 😭";

                    return;
                }

                const roomData =
                    snapshot.val();

                myRole = "guest";

                showPage(
                    connectedPage
                );

                connectedSubtitle.textContent =
                    "Connecting to " +
                    roomData.hostName +
                    "...";

                remoteLabel.textContent =
                    roomData.hostName;

                peer = new Peer({
                    debug: 3,
                    config: {
                        iceServers: [
                            {
                                urls: "stun:stun.l.google.com:19302"
                            },

                            {
                                urls: "turn:YOUR_TURN_SERVER",
                                username: "YOUR_USERNAME",
                                credential: "YOUR_PASSWORD"
                            }
                        ]
                    }
                });

                setupPeerEvents();

                peer.on(
                    "open",
                    async peerId => {

                        await set(
                            roomRef,
                            {

                                ...roomData,

                                guestName:
                                    myName,

                                guestPeerId:
                                    peerId

                            }
                        );

                        onDisconnect(
                            roomRef
                        ).remove();

                        await startCamera();

                        connectToPeer(
                            roomData.hostPeerId
                        );

                    }
                );

            } catch (error) {

                console.error(error);

                joinError.textContent =
                    "Gagal masuk ke room.";

            }

        }
    );


// ========================================
// COPY CODE
// ========================================

document
    .getElementById("copyCodeBtn")
    .addEventListener(
        "click",
        async () => {

            try {

                await navigator.clipboard.writeText(
                    roomCode
                );

                document.getElementById(
                    "copyCodeBtn"
                ).textContent =
                    "Copied ❤️";

            } catch {

                alert(
                    roomCode
                );

            }

        }
    );


// ========================================
// CAMERA
// ========================================

async function startCamera() {

    try {

        localStream =
            await navigator.mediaDevices
                .getUserMedia({

                    video: {
                        width: 1280,
                        height: 720
                    },

                    audio: true

                });

        localVideo.srcObject =
            localStream;

        photoLocalVideo.srcObject =
            localStream;

    } catch (error) {

        console.error(
            "Camera:",
            error
        );

        alert(
            "Camera tidak bisa dibuka."
        );

    }

}


// ========================================
// PEER EVENTS
// ========================================

function setupPeerEvents() {

        peer.on(
        "error",
        error => {

            console.error(
                "PEER ERROR:",
                error
            );

        }
    );

    peer.on(
        "connection",
        incomingConnection => {

            connection =
                incomingConnection;

            setupConnection(
                connection
            );

        }
    );


    peer.on("call", async incomingCall => {

        console.log("📞 Incoming camera call");

        try {

            // Pastikan kamera sudah tersedia
            if (!localStream) {

                console.log(
                    "⏳ Waiting for local camera..."
                );

                await startCamera();
            }

            if (!localStream) {

                console.error(
                    "❌ Local stream unavailable"
                );

                return;
            }

            console.log(
                "📤 Answering camera call..."
            );

            mediaConnection = incomingCall;

            incomingCall.answer(localStream);

            incomingCall.on("stream", stream => {

                console.log(
                    "🎥 REMOTE STREAM RECEIVED (ANSWER)"
                );

                remoteStream = stream;

                remoteVideo.srcObject = stream;
                photoRemoteVideo.srcObject = stream;

                remoteVideo.play().catch(err => {
                    console.error(
                        "Remote video play error:",
                        err
                    );
                });

                photoRemoteVideo.play().catch(err => {
                    console.error(
                        "Photo remote video play error:",
                        err
                    );
                });

                connectedTitle.textContent =
                    "You're together ❤️";

                connectedSubtitle.textContent =
                    "Both of you are here.";

                connectionStatus.textContent =
                    "Camera connected ❤️";

                startExperienceBtn.style.display =
                    "inline-block";

            });

            incomingCall.on("error", error => {

                console.error(
                    "❌ INCOMING MEDIA ERROR:",
                    error
                );

            });

            incomingCall.on("close", () => {

                console.log(
                    "📴 Incoming media connection closed"
                );

            });

        } catch (error) {

            console.error(
                "❌ Failed answering call:",
                error
            );

        }

    });

}


// ========================================
// CONNECT
// ========================================

function connectToPeer(remotePeerId) {

    if (!peer) {
        return;
    }

    console.log("🔗 Connecting data to:", remotePeerId);

    connection = peer.connect(
        remotePeerId,
        {
            reliable: true
        }
    );

    setupConnection(connection);

    waitForCameraThenCall(remotePeerId);
}


// ========================================
// DATA CONNECTION
// ========================================

function setupConnection(conn) {

    conn.on("open", () => {

        console.log("✅ DATA CONNECTION OPEN");

        connection = conn;

        connectionStatus.textContent =
            "Connected ❤️";

        conn.send({
            type: "hello",
            name: myName
        });

    });

    conn.on("data", data => {

        console.log("📨 DATA RECEIVED:", data);

        handleData(data);

    });

    conn.on("close", () => {

        console.warn(
            "⚠️ DATA CONNECTION CLOSED"
        );

        if (connection === conn) {
            connection = null;
        }

        connectionStatus.textContent =
            "Reconnecting... ❤️";

        // Coba sambungkan kembali
        setTimeout(() => {

            if (peer) {

                const remotePeerId =
                    myRole === "host"
                        ? getGuestPeerId()
                        : getHostPeerId();

                if (remotePeerId) {
                    connectDataOnly(remotePeerId);
                }

            }

        }, 1000);

    });

    conn.on("error", error => {

        console.error(
            "❌ DATA CONNECTION ERROR:",
            error
        );

    });

}


// ========================================
// CALL CAMERA
// ========================================

function waitForCameraThenCall(remotePeerId) {

    if (!peer || !localStream) {

        setTimeout(() => {
            waitForCameraThenCall(remotePeerId);
        }, 300);

        return;
    }

    console.log("📞 Calling peer:", remotePeerId);

    mediaConnection = peer.call(
        remotePeerId,
        localStream
    );

    mediaConnection.on("stream", stream => {

        console.log("🎥 REMOTE STREAM RECEIVED");

        remoteStream = stream;

        remoteVideo.srcObject = stream;
        photoRemoteVideo.srcObject = stream;

        remoteVideo.play().catch(err => {
            console.error("Remote video play error:", err);
        });

        photoRemoteVideo.play().catch(err => {
            console.error("Photo remote video play error:", err);
        });

        connectedTitle.textContent =
            "You're together ❤️";

        connectedSubtitle.textContent =
            "Both of you are here.";

        connectionStatus.textContent =
            "Camera connected ❤️";

        startExperienceBtn.style.display =
            "inline-block";

    });

    mediaConnection.on("error", error => {

        console.error(
            "❌ MEDIA CONNECTION ERROR:",
            error
        );

        connectionStatus.textContent =
            "Camera connection failed.";

    });

    mediaConnection.on("close", () => {

        console.log("📴 Media connection closed");

        remoteStream = null;

        remoteVideo.srcObject = null;
        photoRemoteVideo.srcObject = null;

    });

}


// ========================================
// DATA HANDLER
// ========================================

function handleData(data) {

    if (
        !data ||
        !data.type
    ) {
        return;
    }


    if (
        data.type === "hello"
    ) {

        connectedTitle.textContent =
            "You're together ❤️";

        connectedSubtitle.textContent =
            data.name +
            " is here.";

        connectionStatus.textContent =
            "Camera connected ❤️";

    }


    if (
        data.type ===
        "experience-start"
    ) {

        openPhotobooth();

    }


    if (
        data.type ===
        "photo-start"
    ) {

        beginRemotePhoto(
            data.photoIndex
        );

    }


    if (
        data.type ===
        "photo-data"
    ) {

        receivePartnerPhoto(
            data.photoIndex,
            data.image
        );

    }

}


// ========================================
// START EXPERIENCE
// ========================================

startExperienceBtn
    .addEventListener(
        "click",
        () => {

            if (!connection) {

                alert(
                    "Tunggu sampai kamera terhubung ❤️"
                );

                return;
            }

            connection.send({
                type:
                    "experience-start"
            });

            openPhotobooth();

        }
    );


function openPhotobooth() {

    currentPhotoIndex = 0;

    myPhotos = [];

    partnerPhotos = [];

    showPage(
        photoboothPage
    );

    // Kamera sendiri
    photoLocalVideo.srcObject =
        localStream;

    // Kamera pasangan
    if (remoteStream) {

        photoRemoteVideo.srcObject =
            remoteStream;

    }

    preparePhoto();

}


// ========================================
// PHOTO PROMPTS
// ========================================

const photoPrompts = [

    {
        title:
            "First picture.",

        prompt:
            "Just smile. ❤️"
    },

    {
        title:
            "Make a heart.",

        prompt:
            "Okay, now make a little heart together."
    },

    {
        title:
            "One last one…",

        prompt:
            "Look at each other. ❤️"
    }

];


function preparePhoto() {

    const prompt =
        photoPrompts[
            currentPhotoIndex
        ];

    photoTitle.textContent =
        prompt.title;

    photoPrompt.textContent =
        prompt.prompt;

    photoStatus.textContent =
        "Ready when you are.";

    countdown.textContent = "";

    takePhotoBtn.style.display =
        "inline-block";

}


// ========================================
// TAKE PHOTO
// ========================================

takePhotoBtn
    .addEventListener(
        "click",
        () => {

            if (!connection) {

                alert(
                    "Connection terputus."
                );

                return;
            }

            takePhotoBtn.style.display =
                "none";

            connection.send({

                type:
                    "photo-start",

                photoIndex:
                    currentPhotoIndex

            });

            beginRemotePhoto(
                currentPhotoIndex
            );

        }
    );


// ========================================
// COUNTDOWN
// ========================================

function beginRemotePhoto(
    photoIndex
) {

    if (
        photoIndex !==
        currentPhotoIndex
    ) {
        return;
    }

    runCountdown(
        () => {

            capturePhoto();

        }
    );

}


function runCountdown(
    callback
) {

    let number = 3;

    countdown.textContent =
        number;

    const timer =
        setInterval(
            () => {

                number--;

                if (number > 0) {

                    countdown.textContent =
                        number;

                } else {

                    clearInterval(timer);

                    countdown.textContent =
                        "📸";

                    callback();

                    setTimeout(
                        () => {

                            countdown.textContent =
                                "";

                        },
                        500
                    );

                }

            },
            1000
        );

}


// ========================================
// CAPTURE PHOTO
// ========================================

function capturePhoto() {

    console.log("📸 CAPTURE:", myName);

    if (
        !localVideo.srcObject
    ) {
        return;
    }

    const video =
        localVideo;

    const canvas =
        document.createElement(
            "canvas"
        );

    const width =
        640;

    const height =
        Math.round(
            video.videoHeight /
            video.videoWidth *
            width
        );

    canvas.width =
        width;

    canvas.height =
        height;

    const ctx =
        canvas.getContext(
            "2d"
        );

    ctx.drawImage(
        video,
        0,
        0,
        width,
        height
    );

    const image =
        canvas.toDataURL(
            "image/jpeg",
            0.7
        );

    myPhotos[
        currentPhotoIndex
    ] = image;

    photoStatus.textContent =
        "Captured ❤️";


    connection.send({

        type:
            "photo-data",

        photoIndex:
            currentPhotoIndex,

        image:
            image

    });


    checkPhotoComplete();

}


// ========================================
// RECEIVE PARTNER PHOTO
// ========================================

function receivePartnerPhoto(
    photoIndex,
    image
) {

    console.log(
        "📥 RECEIVED PARTNER PHOTO:",
        photoIndex
    );

    partnerPhotos[
        photoIndex
    ] = image;

    checkPhotoComplete();

}


// ========================================
// CHECK BOTH PHOTOS
// ========================================

function checkPhotoComplete() {

    const mine =
        myPhotos[
            currentPhotoIndex
        ];

    const partner =
        partnerPhotos[
            currentPhotoIndex
        ];


    if (
        mine &&
        partner
    ) {

        photoStatus.textContent =
            "You both got the shot! ❤️";

        setTimeout(
            () => {

                currentPhotoIndex++;

                if (
                    currentPhotoIndex <
                    photoPrompts.length
                ) {

                    preparePhoto();

                } else {

                    createPhotostrip();

                }

            },
            1200
        );

    }

}


// ========================================
// PHOTOSTRIP
// ========================================

// ========================================
// PHOTOSTRIP DESIGN SYSTEM
// ========================================

let selectedDesign = "classic";

const designCards =
    document.querySelectorAll(".design-card");

const downloadPhotosPdfBtn =
    document.getElementById(
        "downloadPhotosPdfBtn"
    );


// ========================================
// DESIGN SELECTION
// ========================================

designCards.forEach(card => {

    card.addEventListener("click", () => {

        designCards.forEach(item => {
            item.classList.remove("selected");
        });

        card.classList.add("selected");

        selectedDesign =
            card.dataset.design;

        createPhotostrip();

    });

});


// ========================================
// CREATE PHOTOSTRIP
// ========================================

async function createPhotostrip() {

    showPage(resultPage);

    const canvas =
        photostripCanvas;

    const ctx =
        canvas.getContext("2d");

    const images = [];

    console.log("MY PHOTOS:", myPhotos);
    console.log("PARTNER PHOTOS:", partnerPhotos);

    for (
        let i = 0;
        i < photoPrompts.length;
        i++
    ) {

        const mine =
            await loadImage(
                myPhotos[i]
            );

        const partner =
            await loadImage(
                partnerPhotos[i]
            );

        images.push({
            mine,
            partner
        });

    }

    const photoWidth = 700;
    const photoHeight = 260;
    const gap = 20;
    const headerHeight = 145;
    const footerHeight = 100;

    canvas.width = photoWidth;

    canvas.height =
        headerHeight +
        images.length * photoHeight +
        (images.length - 1) * gap +
        footerHeight;


    // ========================================
    // BACKGROUND
    // ========================================

    ctx.fillStyle =
        getDesignBackground();

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // ========================================
    // DESIGN DECORATION
    // ========================================

    drawDesignDecoration(
        ctx,
        canvas
    );


    // ========================================
    // HEADER
    // ========================================

    drawDesignHeader(
        ctx,
        canvas
    );


    // ========================================
    // PHOTOS
    // ========================================

    let y =
        headerHeight;

    images.forEach(
        ({ mine, partner }, index) => {

            const half =
                (photoWidth - 8) / 2;

            drawCoverImage(
                ctx,
                mine,
                0,
                y,
                half,
                photoHeight
            );

            drawCoverImage(
                ctx,
                partner,
                half + 8,
                y,
                half,
                photoHeight
            );


            // Photo number

            if (
                selectedDesign ===
                "film"
            ) {

                ctx.fillStyle =
                    "white";

                ctx.font =
                    "bold 12px Arial";

                ctx.textAlign =
                    "left";

                ctx.fillText(
                    `FRAME ${String(index + 1).padStart(2, "0")}`,
                    12,
                    y + 22
                );

            }


            y +=
                photoHeight +
                gap;

        }
    );


    // ========================================
    // FOOTER
    // ========================================

    drawDesignFooter(
        ctx,
        canvas
    );

}


// ========================================
// DESIGN BACKGROUND
// ========================================

function getDesignBackground() {

    const backgrounds = {

        classic:
            "#fffaf5",

        love:
            "#ffe8ed",

        y2k:
            "#e7e7eb",

        film:
            "#151515",

        sakura:
            "#fff0f6",

        dreamy:
            "#eaf5ff",

        strawberry:
            "#ffe7e7",

        teddy:
            "#ead9c5",

        midnight:
            "#171c35",

        newspaper:
            "#eee8d8"

    };

    return (
        backgrounds[
            selectedDesign
        ] ||
        backgrounds.classic
    );

}


// ========================================
// HEADER
// ========================================

function drawDesignHeader(
    ctx,
    canvas
) {

    const center =
        canvas.width / 2;


    const styles = {

        classic: {
            title: "Our Little Photobooth",
            subtitle: "A little memory for two ❤️",
            color: "#332d29"
        },

        love: {
            title: "Our Little Love Story",
            subtitle: "Made with love ❤️",
            color: "#a33b54"
        },

        y2k: {
            title: "★ OUR MEMORY ★",
            subtitle: "TOO CUTE TO FORGET ✦",
            color: "#333333"
        },

        film: {
            title: "FILM MEMORY",
            subtitle: "A MOMENT WORTH KEEPING",
            color: "#ffffff"
        },

        sakura: {
            title: "Just Us",
            subtitle: "Blooming memories 🌸",
            color: "#9b5b72"
        },

        dreamy: {
            title: "Dream Together",
            subtitle: "A little piece of today ☁",
            color: "#52738f"
        },

        strawberry: {
            title: "Sweet Memory",
            subtitle: "A berry special day 🍓",
            color: "#a83939"
        },

        teddy: {
            title: "Our Little Day",
            subtitle: "Warm memories together 🧸",
            color: "#684d3b"
        },

        midnight: {
            title: "YOU & ME",
            subtitle: "Under the same little sky ✦",
            color: "#ffffff"
        },

        newspaper: {
            title: "THE MEMORY POST",
            subtitle: "SPECIAL EDITION • 2026",
            color: "#292722"
        }

    };


    const style =
        styles[
            selectedDesign
        ] ||
        styles.classic;


    ctx.fillStyle =
        style.color;

    ctx.textAlign =
        "center";

    ctx.font =
        "bold 32px Arial";

    ctx.fillText(
        style.title,
        center,
        52
    );

    ctx.font =
        "17px Arial";

    ctx.fillText(
        style.subtitle,
        center,
        88
    );


    // Decorative line

    if (
        selectedDesign ===
        "classic" ||
        selectedDesign ===
        "newspaper"
    ) {

        ctx.strokeStyle =
            style.color;

        ctx.globalAlpha =
            0.25;

        ctx.beginPath();

        ctx.moveTo(
            80,
            112
        );

        ctx.lineTo(
            canvas.width - 80,
            112
        );

        ctx.stroke();

        ctx.globalAlpha =
            1;

    }

}


// ========================================
// DECORATIONS
// ========================================

function drawDesignDecoration(
    ctx,
    canvas
) {

    ctx.textAlign =
        "center";


    if (
        selectedDesign ===
        "love"
    ) {

        ctx.font =
            "30px Arial";

        ctx.fillStyle =
            "#c45c75";

        ctx.fillText(
            "♥",
            35,
            40
        );

        ctx.fillText(
            "♥",
            canvas.width - 35,
            40
        );

    }


    if (
        selectedDesign ===
        "y2k"
    ) {

        ctx.font =
            "25px Arial";

        ctx.fillStyle =
            "#555";

        ctx.fillText(
            "✦",
            35,
            40
        );

        ctx.fillText(
            "✧",
            canvas.width - 35,
            40
        );

    }


    if (
        selectedDesign ===
        "sakura"
    ) {

        ctx.font =
            "28px Arial";

        ctx.fillStyle =
            "#d48aa5";

        ctx.fillText(
            "🌸",
            35,
            42
        );

        ctx.fillText(
            "🌸",
            canvas.width - 35,
            42
        );

    }


    if (
        selectedDesign ===
        "dreamy"
    ) {

        ctx.font =
            "30px Arial";

        ctx.fillText(
            "☁",
            35,
            42
        );

        ctx.fillText(
            "☁",
            canvas.width - 35,
            42
        );

    }


    if (
        selectedDesign ===
        "midnight"
    ) {

        ctx.font =
            "30px Arial";

        ctx.fillStyle =
            "#ffffff";

        ctx.fillText(
            "☾",
            35,
            42
        );

        ctx.fillText(
            "✦",
            canvas.width - 35,
            42
        );

    }

}


// ========================================
// FOOTER
// ========================================

function drawDesignFooter(
    ctx,
    canvas
) {

    const footerText = {

        classic:
            "Made together ❤️",

        love:
            "With love, always ❤️",

        y2k:
            "MEMORIES NEVER GO OUT OF STYLE ✦",

        film:
            "KEEP THIS MOMENT FOREVER",

        sakura:
            "Until we meet again 🌸",

        dreamy:
            "Some moments feel like dreams ☁",

        strawberry:
            "Sweet moments, sweeter memories 🍓",

        teddy:
            "A tiny memory to keep 🧸",

        midnight:
            "Same sky. Same memory. ✦",

        newspaper:
            "END OF TODAY'S SPECIAL EDITION"

    };


    ctx.fillStyle =
        selectedDesign === "film" ||
        selectedDesign === "midnight"
            ? "#ffffff"
            : getDesignTextColor();


    ctx.font =
        "16px Arial";

    ctx.textAlign =
        "center";

    ctx.fillText(
        footerText[
            selectedDesign
        ],
        canvas.width / 2,
        canvas.height - 42
    );

}

// ========================================
// LOAD IMAGE
// ========================================

function loadImage(src) {

    return new Promise((resolve, reject) => {

        const image = new Image();

        image.onload = () => {
            resolve(image);
        };

        image.onerror = () => {
            reject(
                new Error("Gagal memuat foto.")
            );
        };

        image.src = src;

    });

}

// ========================================
// DRAW COVER IMAGE
// ========================================

function drawCoverImage(
    ctx,
    image,
    x,
    y,
    width,
    height
) {

    const imageRatio =
        image.width / image.height;

    const targetRatio =
        width / height;

    let sourceWidth =
        image.width;

    let sourceHeight =
        image.height;

    let sourceX = 0;
    let sourceY = 0;


    // Crop kiri-kanan
    if (
        imageRatio > targetRatio
    ) {

        sourceWidth =
            image.height *
            targetRatio;

        sourceX =
            (image.width -
                sourceWidth) / 2;

    }

    // Crop atas-bawah
    else {

        sourceHeight =
            image.width /
            targetRatio;

        sourceY =
            (image.height -
                sourceHeight) / 2;

    }


    ctx.drawImage(
        image,

        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,

        x,
        y,
        width,
        height
    );

}


// ========================================
// TEXT COLOR
// ========================================

function getDesignTextColor() {

    const colors = {

        classic: "#332d29",
        love: "#a33b54",
        y2k: "#333333",
        film: "#ffffff",
        sakura: "#9b5b72",
        dreamy: "#52738f",
        strawberry: "#a83939",
        teddy: "#684d3b",
        midnight: "#ffffff",
        newspaper: "#292722"

    };

    return (
        colors[
            selectedDesign
        ] ||
        colors.classic
    );

}


// ========================================
// USE DESIGN
// ========================================


// ========================================
// DOWNLOAD RAW PHOTOS
// ========================================

// ========================================
// DOWNLOAD ALL PHOTOS PDF
// ========================================

// ========================================
// DOWNLOAD ALL PHOTOS PDF
// ========================================

downloadPhotosPdfBtn.addEventListener(
    "click",
    async () => {

        try {

            if (
                myPhotos.length === 0 ||
                partnerPhotos.length === 0
            ) {

                alert(
                    "Foto belum tersedia ❤️"
                );

                return;

            }


            const {
                jsPDF
            } = window.jspdf;


            // A4 portrait

            const pdf =
                new jsPDF({
                    orientation: "portrait",
                    unit: "mm",
                    format: "a4"
                });


            const pageWidth =
                pdf.internal.pageSize.getWidth();

            const pageHeight =
                pdf.internal.pageSize.getHeight();


            // ========================================
            // COMBINE ALL PHOTOS
            // ========================================

            const allPhotos = [];


            for (
                let i = 0;
                i < photoPrompts.length;
                i++
            ) {

                allPhotos.push(
                    myPhotos[i]
                );

                allPhotos.push(
                    partnerPhotos[i]
                );

            }


            // ========================================
            // ONE PHOTO PER PAGE
            // ========================================

            for (
                let i = 0;
                i < allPhotos.length;
                i++
            ) {

                if (i > 0) {

                    pdf.addPage();

                }


                const image =
                    await loadImage(
                        allPhotos[i]
                    );


                const imageRatio =
                    image.width /
                    image.height;

                const pageRatio =
                    pageWidth /
                    pageHeight;


                let x = 0;
                let y = 0;

                let width =
                    pageWidth;

                let height =
                    pageHeight;


                // ========================================
                // FIT IMAGE TO PAGE
                // ========================================

                if (
                    imageRatio >
                    pageRatio
                ) {

                    // Image lebih lebar

                    height =
                        pageWidth /
                        imageRatio;

                    y =
                        (pageHeight -
                            height) / 2;

                }

                else {

                    // Image lebih tinggi

                    width =
                        pageHeight *
                        imageRatio;

                    x =
                        (pageWidth -
                            width) / 2;

                }


                pdf.addImage(
                    allPhotos[i],
                    "JPEG",
                    x,
                    y,
                    width,
                    height
                );

            }


            // ========================================
            // DOWNLOAD
            // ========================================

            pdf.save(
                "our-little-photos.pdf"
            );


        } catch (error) {

            console.error(
                "PDF ERROR:",
                error
            );

            alert(
                "Gagal membuat PDF. Coba lagi ya ❤️"
            );

        }

    }
);


// ========================================
// BIRTHDAY LETTER
// ========================================


// ========================================
// DOWNLOAD PHOTOSTRIP
// ========================================

downloadStripBtn
    .addEventListener(
        "click",
        () => {

            const link =
                document.createElement(
                    "a"
                );

            link.download =
                "our-little-photobooth.png";

            link.href =
                photostripCanvas.toDataURL(
                    "image/png"
                );

            link.click();

        }
    );


// ========================================
// ROOM CODE
// ========================================

function generateRoomCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code =
        "LOVE-";

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        code +=
            chars[
                Math.floor(
                    Math.random() *
                    chars.length
                )
            ];

    }

    return code;

}


// ========================================
// CLEANUP
// ========================================

window.addEventListener(
    "beforeunload",
    () => {

        if (localStream) {

            localStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

        }

    }
);