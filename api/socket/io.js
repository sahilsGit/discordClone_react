import jwt from "jsonwebtoken";
import Profile from "../modals/profile.modals.js";
import { ConversationEventEnum } from "../utils/constants.js";

const mountJoinConversationEvent = (socket) => {
  socket.on(ConversationEventEnum.JOIN_CONVERSATION, async (conversationId) => {
    console.log(`User joined the conversation`, conversationId);
    socket.join(conversationId);
  });
};

const mountParticipantTypingEvent = (socket) => {
  socket.on(ConversationEventEnum.TYPING, async (conversationId) => {
    socket.in(conversationId).emit(ChatEventEnum.TYPING_EVENT, conversationId);
  });
};

const mountParticipantStoppedTypingEvent = (socket) => {
  socket.on(ConversationEventEnum.STOP_TYPING, async (conversationId) => {
    socket.in(conversationId).emit(ChatEventEnum.STOP_TYPING, conversationId);
  });
};

const initializeSocket = (io) => {
  return io.on("connection", async (socket) => {
    try {
      // Extract the access_token out of the auth header
      const access_token = socket.handshake.auth?.access_token;

      if (!access_token) {
        throw new Error("Un-authorized handshake. Token is missing");
      }

      const decodedToken = jwt.verify(access_token, process.env.JWT);
      const profile = await Profile.findById(decodedToken?.profileId).select(
        "-password -emailVerificationToken -emailVerificationExpiry"
      );

      if (!profile) {
        throw new Error("Un-authorized handshake. Token is invalid");
      }

      socket.profile = profile;

      socket.join(socket.profile._id.toString());
      socket.emit(ConversationEventEnum.CONNECTED); // Emit "connection successful" event to the client

      console.log("User connected. profileId: ", socket.profile._id.toString());

      mountJoinConversationEvent(socket);
      mountParticipantTypingEvent(socket);
      mountParticipantStoppedTypingEvent(socket);

      socket.on(ConversationEventEnum.DISCONNECT, () => {
        console.log("User has disconnected. profileId: " + socket.profile?._id);
        if (socket.profile?._id) {
          socket.leave(socket.profile._id);
        }
      });
    } catch (error) {
      socket.emit(
        ConversationEventEnum.SOCKET_ERROR,
        error?.message || "Something went wrong while connecting to the socket."
      );
    }
  });
};

const emitSocketEvent = (req, roomId, event, payload) => {
  req.app.get("io").in(roomId).emit(event, payload);
};

export { initializeSocket, emitSocketEvent };
