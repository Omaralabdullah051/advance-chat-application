import { apiSlice } from "../api/apiSlice";
import { messagesApi } from "../messages/messagesApi";
import io from "socket.io-client";

export const conversationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getConversations: builder.query({
      query: (email) =>
        `/conversations?participants_like=${email}&_sort=timestamp&_order=desc&_page=1&_limit=${process.env.REACT_APP_CONVERSATIONS_PER_PAGE}`,
      transformResponse(apiResponse, meta) {
        const totalCount = meta.response.headers.get("X-Total-Count");
        console.log(totalCount);
        return {
          data: apiResponse,
          totalCount,
        };
      },

      async onCacheEntryAdded(
        arg,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        // create socket
        const socket = io("http://localhost:9000", {
          reconnectionDelay: 1000,
          reconnection: true,
          reconnectionAttempts: 10,
          transports: ["websocket"],
          agent: false,
          upgrade: false,
          rejectUnauthorized: false,
        });

        try {
          await cacheDataLoaded;
          socket.on("conversation", (data) => {
            // console.log(data);
            updateCachedData((draft) => {
              const conversation = draft.find((c) => c.id === data?.data?.id);

              if (conversation?.id) {
                conversation.message = data?.data?.message;
                conversation.timestamp = data?.data?.timestamp;
              } else {
                // do nothing
              }
            });
          });
        } catch (err) {}

        await cacheEntryRemoved;
        socket.close();
      },
    }),
    getMoreConversations: builder.query({
      query: ({ email, page }) =>
        `/conversations?participants_like=${email}&_sort=timestamp&_order=desc&_page=${page}&_limit=${process.env.REACT_APP_CONVERSATIONS_PER_PAGE}`,
      async onQueryStarted({ email }, { queryFulfilled, dispatch }) {
        try {
          const conversations = await queryFulfilled;
          // console.log(conversations);

          if (conversations?.data.length > 0) {
            //* update conversation cache pessimistically start
            dispatch(
              apiSlice.util.updateQueryData(
                "getConversations",
                email,
                (draft) => {
                  return {
                    data: [...draft.data, ...conversations.data],
                    totalCount: Number(draft.totalCount),
                  };
                }
              )
            );
            //* update messages cache pessimistically end
          }
        } catch (err) {}
      },
    }),
    // getAllConversations: builder.query({
    //   query: () => "/conversations",
    // }),
    getConversation: builder.query({
      query: ({ userEmail, participantEmail }) =>
        `/conversations?participants_like=${userEmail}-${participantEmail}&&participants_like=${participantEmail}-${userEmail}`,
    }),
    addConversation: builder.mutation({
      query: ({ sender, data }) => ({
        url: "/conversations",
        method: "POST",
        body: data,
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        //* optimistic cache update start
        // const patchResult2 = dispatch(
        //   apiSlice.util.updateQueryData(
        //     "getAllConversations",
        //     undefined,
        //     (draft) => {
        //       draft.push(arg.data);
        //     }
        //   )
        // );
        //* optimistic cache update end

        try {
          const conversation = await queryFulfilled;
          console.log(conversation);

          if (conversation?.data.id) {
            // silent entry to message table
            const users = arg.data.users;
            const senderUser = users.find((user) => user.email === arg.sender);
            const recieverUser = users.find(
              (user) => user.email !== arg.sender
            );
            dispatch(
              messagesApi.endpoints.addMessage.initiate({
                conversationId: conversation?.data.id,
                sender: senderUser,
                receiver: recieverUser,
                message: arg.data.message,
                timestamp: arg.data.timestamp,
              })
            );
          }
        } catch (err) {
          // patchResult2.undo();
        }
      },
    }),
    editConversation: builder.mutation({
      query: ({ id, data, sender }) => ({
        url: `/conversations/${id}`,
        method: "PATCH",
        body: data,
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        //* optimistic cache update start
        const patchResult1 = dispatch(
          apiSlice.util.updateQueryData(
            "getConversations",
            arg.sender,
            (draft) => {
              const draftConversation = draft.data.find((c) => c.id == arg.id);
              draftConversation.message = arg.data.message;
              draftConversation.timestamp = arg.data.timestamp;
            }
          )
        );
        //* optimistic cache update end

        try {
          const conversation = await queryFulfilled;
          console.log(conversation);

          if (conversation?.data.id) {
            // silent entry to message table
            const users = arg.data.users;
            const senderUser = users.find((user) => user.email === arg.sender);
            const recieverUser = users.find(
              (user) => user.email !== arg.sender
            );
            const res = await dispatch(
              messagesApi.endpoints.addMessage.initiate({
                conversationId: conversation?.data.id,
                sender: senderUser,
                receiver: recieverUser,
                message: arg.data.message,
                timestamp: arg.data.timestamp,
              })
            ).unwrap();
            // console.log(res)
            //* update messages cache pessimistically start
            dispatch(
              apiSlice.util.updateQueryData(
                "getMessages",
                res.conversationId.toString(),
                (draft) => {
                  draft.push(res);
                }
              )
            );
            //* update messages cache pessimistically end
          }
        } catch (err) {
          patchResult1.undo();
        }
      },
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetConversationQuery,
  useAddConversationMutation,
  useEditConversationMutation,
} = conversationsApi;
