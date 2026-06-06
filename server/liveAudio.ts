/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Server } from "http";
import { GoogleGenAI, Modality } from "@google/genai";
import { WebSocketServer, WebSocket } from "ws";

type ClientMessage =
  | {
      type: "audio";
      data: string;
      mimeType: string;
    }
  | {
      type: "stop";
    };

const sendJson = (socket: WebSocket, payload: unknown) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
};

export const installLiveAudioSocket = (server: Server, ai: GoogleGenAI) => {
  const wss = new WebSocketServer({ server, path: "/live-audio" });

  wss.on("connection", async (socket) => {
    let liveSession: Awaited<ReturnType<typeof ai.live.connect>> | null = null;
    let audioChunkCount = 0;

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      sendJson(socket, {
        type: "error",
        message: "GEMINI_API_KEY is required for Gemini Live transcription.",
      });
      socket.close();
      return;
    }

    try {
      liveSession = await ai.live.connect({
        model: process.env.GEMINI_LIVE_MODEL || "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction:
            "You are a transcription bridge for live meeting notes. Keep responses minimal; the application uses input transcriptions to update notes.",
        },
        callbacks: {
          onopen: () => {
            console.log("[live-audio] Gemini Live connected");
            sendJson(socket, { type: "status", status: "gemini_live_connected" });
          },
          onmessage: (message) => {
            const text = message.serverContent?.inputTranscription?.text;
            if (text) {
              console.log("[live-audio] Transcript:", text);
              sendJson(socket, {
                type: "transcript",
                text,
                timestamp: new Date().toISOString(),
              });
            }

            if (message.serverContent?.turnComplete) {
              sendJson(socket, { type: "status", status: "turn_complete" });
            }

            if (message.usageMetadata) {
              sendJson(socket, {
                type: "usage",
                totalTokenCount: message.usageMetadata.totalTokenCount,
              });
            }
          },
          onerror: (event) => {
            console.error("[live-audio] Gemini Live error:", event.message);
            sendJson(socket, {
              type: "error",
              message: event.message || "Gemini Live socket error.",
            });
          },
          onclose: (event) => {
            console.log("[live-audio] Gemini Live closed:", {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean,
            });
            sendJson(socket, {
              type: "status",
              status: "gemini_live_closed",
              code: event.code,
              reason: event.reason,
            });
          },
        },
      });

      sendJson(socket, { type: "status", status: "ready_for_audio" });
    } catch (error: any) {
      sendJson(socket, {
        type: "error",
        message: error?.message || "Unable to connect to Gemini Live API.",
      });
      socket.close();
      return;
    }

    socket.on("message", (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString()) as ClientMessage;

        if (message.type === "audio") {
          audioChunkCount += 1;
          liveSession?.sendRealtimeInput({
            audio: {
              data: message.data,
              mimeType: message.mimeType,
            },
          });
          if (audioChunkCount === 1 || audioChunkCount % 10 === 0) {
            console.log(`[live-audio] Forwarded ${audioChunkCount} audio chunks (${message.mimeType})`);
            sendJson(socket, {
              type: "audio_ack",
              chunkCount: audioChunkCount,
            });
          }
          return;
        }

        if (message.type === "stop") {
          liveSession?.sendRealtimeInput({ audioStreamEnd: true });
        }
      } catch (error: any) {
        sendJson(socket, {
          type: "error",
          message: error?.message || "Invalid live audio message.",
        });
      }
    });

    socket.on("close", () => {
      try {
        liveSession?.sendRealtimeInput({ audioStreamEnd: true });
        liveSession?.close();
      } catch {
        // The socket may already be closed by the remote side.
      }
    });
  });
};
