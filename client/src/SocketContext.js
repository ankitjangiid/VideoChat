import React, { createContext, useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const SocketContext = createContext();

// link of our server
// const socket = io("http://localhost:5000");

const socket = io("ENTER_THE_ADDRESS_WHERE_SERVER_FILE_IS_SAVED");

const ContextProvider = ({ children }) => {
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState();
  const [name, setName] = useState("");
  const [call, setCall] = useState({});
  // this state is used to store the id
  const [me, setMe] = useState("");

  const myVideo = useRef(); // for our video
  const userVideo = useRef(); // for other person's video
  const connectionRef = useRef();

  // useEffect is used to load program as soon as the page load
  useEffect(() => {
    // this is to ask the user for camera and audio permission
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);

        // stream for our call
        myVideo.current.srcObject = currentStream;
      });

    //   socket.on is used to listen to something
    // here we listen to 'me' which we have setup in server file(index.js) where it'll give us the id as soon as we have connection
    // here user receive the id
    socket.on("me", (id) => setMe(id));

    // this is the socket when we call the user
    socket.on("callUser", ({ from, name: callerName, signal }) => {
      // here we set all the data about the call like who is calling, what is the signal strength and are we receiving the call or we answering the call
      setCall({ isReceivingCall: true, from, name: callerName, signal });
    });
  }, []);

  const answerCall = () => {
    setCallAccepted(true);

    // here initiator means the person who is calling, here its false because we're receiving the call
    const peer = new Peer({ initiator: false, trickle: false, stream });

    // this is when we receive a call what should happen
    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: call.from });
    });

    peer.on("stream", (currentStream) => {
      // stream for the other person
      userVideo.current.srcObject = currentStream;
    });

    peer.signal(call.signal);

    // this means the our current connection is equal to the current peer which is inside of this connection
    connectionRef.current = peer;
  };

  const callUser = (id) => {
    //   here initiator is true because we're the person who is calling
    const peer = new Peer({ initiator: true, trickle: false, stream });

    // this is when we make a call what should happen
    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name,
      });
    });

    peer.on("stream", (currentStream) => {
      // stream for the other person
      userVideo.current.srcObject = currentStream;
    });

    //   this is when user accept our call
    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);

      peer.signal(signal);
    });

    // this means the our current connection is equal to the current peer which is inside of this connection
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);

    //   once call ended we destroy that connection ref
    connectionRef.current.destroy();

    //   this reload the page once the call ended and provides user new id
    window.location.reload();
  };

  return (
    //   this is a socket component, here whatever we pass in value will be accessable to all the components
    // as you can see we pass all the info so that we can use them else where
    <SocketContext.Provider
      value={{
        call,
        callAccepted,
        myVideo,
        userVideo,
        stream,
        name,
        setName,
        callEnded,
        me,
        callUser,
        leaveCall,
        answerCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export { ContextProvider, SocketContext };
