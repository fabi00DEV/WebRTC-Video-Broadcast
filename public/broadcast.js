const peerConnections = {};
const config = {
  iceServers: [
      { url: 'stun:18.220.202.114:5349' },
      { url: 'stun:stun.l.google.com:19302' },
      { url: 'stun:stun1.l.google.com:19302' },
      { url: 'stun:stun2.l.google.com:19302' },
      { url: 'stun:stun3.l.google.com:19302' },
      { url: 'stun:stun4.l.google.com:19302' },
      { url: 'stun:stun.services.mozilla.com' },
      { url: 'stun:meet-jit-si-turnrelay.jitsi.net:443' },
      {
        url: 'turn:18.220.202.114:5349',
        username: 'smash',
        credential: 'hc4qjVYChz3kBRhN',
      },
      { 
        url: 'turns:18.220.202.114:443?transport=tcp',
        username: 'meet.smash.cx',
        credential: '60xNNKDk1zLZSAZi', 
      },
      { 
        url: 'turn:18.220.202.114:4446?transport=udp',
        username: 'meet.smash.cx:443',
        credential: '60xNNKDk1zLZSAZi',
      }
  ]
};

const socket = io.connect(window.location.origin);

socket.on("answer", (id, description) => {
  peerConnections[id].setRemoteDescription(description);
});

socket.on("watcher", id => {
  const peerConnection = new RTCPeerConnection(config);
  peerConnections[id] = peerConnection;

  let stream = videoElement.srcObject;
  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("candidate", id, event.candidate);
    }
  };

  peerConnection
    .createOffer()
    .then(sdp => peerConnection.setLocalDescription(sdp))
    .then(() => {
      socket.emit("offer", id, peerConnection.localDescription);
    });
});

socket.on("candidate", (id, candidate) => {
  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("disconnectPeer", id => {
  peerConnections[id].close();
  delete peerConnections[id];
});

window.onunload = window.onbeforeunload = () => {
  socket.close();
};

// Get camera and microphone
const videoElement = document.querySelector("video");
const audioSelect = document.querySelector("select#audioSource");
const videoSelect = document.querySelector("select#videoSource");
const screenshareSelect = document.querySelector("select#screenshare");


audioSelect.onchange = getStream;
videoSelect.onchange = getStream;

getStream()
  .then(getDevices)
  .then(gotDevices);

function getDevices() {
  return navigator.mediaDevices.enumerateDevices();
}

function gotDevices(deviceInfos) {
  window.deviceInfos = deviceInfos;
  for (const deviceInfo of deviceInfos) {
    const option = document.createElement("option");
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === "audioinput") {
      option.text = deviceInfo.label || `Microphone ${audioSelect.length + 1}`;
      audioSelect.appendChild(option);
    } else if (deviceInfo.kind === "videoinput") {
      option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    }
  }
}

function getStream() {
  // if (window.stream) {
  //   window.stream.getTracks().forEach(track => {
  //     track.stop();
  //   });
  // }
  // const audioSource = audioSelect.value;
  // const videoSource = videoSelect.value;
  // const constraints = {
  //   audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
  //   video: { deviceId: videoSource ? { exact: videoSource } : undefined }
  // };


  if (navigator.getDisplayMedia) {
    getDisplayMedia = navigator.getDisplayMedia.bind(navigator);
  } else {
    // @ts-ignore
    getDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
  }

  return getDisplayMedia({ video:
    {
      width: {
        ideal: 1920,
        max: 1920,
      },
      height: {
        ideal: 1080,
        max: 1080
      },
      aspectRatio: 1.7777777777777777,
      displaySurface: 'monitor',
      logicalSurface: true,
      cursor: 'always',
      frameRate: {
        ideal: 60,
        max: 60
      }
    }
  }).then(gotStream).catch(handleError);
    
}

function gotStream(stream) {
  window.stream = stream;
  audioSelect.selectedIndex = [...audioSelect.options].findIndex(
    option => option.text === stream.getAudioTracks()[0].label
  );
  videoSelect.selectedIndex = [...videoSelect.options].findIndex(
    option => option.text === stream.getVideoTracks()[0].label
  );
  videoElement.srcObject = stream;
  socket.emit("broadcaster");
}

function handleError(error) {
  console.error("Error: ", error);
}