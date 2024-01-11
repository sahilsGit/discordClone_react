import React, { useEffect, useRef, useState } from "react";
import { MsWelcome } from "./MsWelcome";
import { get } from "@/services/api-service";
import useAuth from "@/hooks/useAuth";
import { handleError, handleResponse } from "@/lib/response-handler";
import useServer from "@/hooks/useServer";
import useSocket from "@/hooks/useSocket";
import MessageItem from "./MessageItem";

const ChannelMessages = () => {
  const channelDetails = useServer("channelDetails");
  const name = channelDetails?.name;
  const authDispatch = useAuth("dispatch");
  const access_token = useAuth("token");
  const memberId = useServer("serverDetails").myMembership._id;
  const channelId = useServer("channelDetails")._id;
  const [error, setError] = useState(false);
  const observerRef = useRef();
  const messages = useServer("channelDetails").messages;
  const lastItemRef = useRef();
  const serverDispatch = useServer("dispatch");
  const { socket } = useSocket();
  const [isConnected, setIsConnected] = useState(false);

  console.log(socket);

  const CONNECTED_EVENT = "connected";
  const DISCONNECT_EVENT = "disconnect";
  const TYPING_EVENT = "typing";
  const STOP_TYPING_EVENT = "stopTyping";
  const MESSAGE_RECEIVED_EVENT = "messageReceived";

  const fetchMessages = async () => {
    try {
      const response = await get(
        `/messages/fetch?memberId=${memberId}&channelId=${channelId}&cursor=${messages.cursor}`,
        access_token
      );

      const messageData = await handleResponse(response, authDispatch);

      serverDispatch({
        type: "SET_CUSTOM",
        payload: {
          channelDetails: {
            ...channelDetails,
            messages: {
              data: [...channelDetails.messages.data, ...messageData.messages],
              cursor: messageData.newCursor,
              hasMoreMessages: messageData.hasMoreMessages,
            },
          },
        },
      });
    } catch (error) {
      handleError(error, authDispatch);
      setError(true);
    }
  };

  /**
   * Handles the event when a new message is received.
   */
  const onMessageReceived = (message) => {
    if (message.channelId === channelId) {
      messages.data.length
        ? serverDispatch({
            type: "SET_CUSTOM",
            payload: {
              channelDetails: {
                ...channelDetails,
                messages: {
                  data: [message, ...channelDetails.messages.data],
                  cursor: channelDetails.messages.cursor,
                  hasMoreMessages: channelDetails.messages.hasMoreMessages,
                },
              },
            },
          })
        : serverDispatch({
            type: "SET_CUSTOM",
            payload: {
              channelDetails: {
                ...channelDetails,
                messages: {
                  data: [message, ...channelDetails.messages.data],
                  cursor: message.createdAt,
                  hasMoreMessages: false,
                },
              },
            },
          });
    }
  };

  /**
   * Handles the "typing" event on the socket.
   */
  const handleOnSocketTyping = () => {
    setIsTyping(true);
  };

  const handleOnSocketStopTyping = () => {
    setIsTyping(false);
  };

  const onConnect = () => {
    setIsConnected(true);
  };

  const onDisconnect = () => {
    setIsConnected(false);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      async (entries) => {
        console.log(entries[0]);
        if (entries[0].isIntersecting) {
          fetchMessages();
        }
      },
      { threshold: 1 }
    );

    observerRef.current = observer;

    if (lastItemRef.current) {
      observerRef?.current?.observe(lastItemRef.current);
    }

    return () => {
      observerRef?.current?.disconnect();
    };
  }, [messages?.data?.length]);

  useEffect(() => {
    if (!socket) return;
    // Set up event listeners for various socket events:

    // Listener for when the socket connects.
    socket.on(CONNECTED_EVENT, onConnect);
    // Listener for when the socket disconnects.
    socket.on(DISCONNECT_EVENT, onDisconnect);
    // Listener for when a user is typing.
    socket.on(TYPING_EVENT, handleOnSocketTyping);
    // Listener for when a user stops typing.
    socket.on(STOP_TYPING_EVENT, handleOnSocketStopTyping);
    // Listener for when a new message is received.
    socket.on(MESSAGE_RECEIVED_EVENT, onMessageReceived);

    return () => {
      // Remove all the event listeners to avoid memory leaks.
      socket.off(CONNECTED_EVENT, onConnect);
      socket.off(DISCONNECT_EVENT, onDisconnect);
      socket.off(TYPING_EVENT, handleOnSocketTyping);
      socket.off(STOP_TYPING_EVENT, handleOnSocketStopTyping);
      socket.off(MESSAGE_RECEIVED_EVENT, onMessageReceived);
    };
  }, [socket]);

  const renderMessageItem = (message, index) => (
    <div
      className="group"
      key={message._id}
      ref={(element) => {
        if (index === messages.data.length - 1) {
          lastItemRef.current = element;
        }
      }}
    >
      {/* <div className="h-[100px]">{message.content}</div> */}
      <MessageItem message={message} member={message.member} />
    </div>
  );

  if (error) {
    return <p>Something went wrong!</p>;
  }

  return (
    <div className="flex-1 flex flex-col-reverse overflow-y-auto">
      {messages?.data?.length && (
        <div className="flex flex-col-reverse">
          {messages.data.map((message, index) =>
            renderMessageItem(message, index)
          )}
        </div>
      )}
      {(!messages?.data?.length || !messages.hasMoreMessages) && (
        <div className="flex flex-col pt-3">
          <div className="flex-1" />
          <MsWelcome type="channel" name={name} />
        </div>
      )}
    </div>
  );
};

export default ChannelMessages;
