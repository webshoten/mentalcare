import { useEffect, useRef, useState, useCallback } from "react";
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
} from "amazon-chime-sdk-js";
import { joinChimeMeeting } from "../graphql/appointment";

export function useChimeAudio(sessionId: string | null) {
  const [muted, setMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const meetingSessionRef = useRef<DefaultMeetingSession | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!sessionId || joinedRef.current) return;
    joinedRef.current = true;

    let cancelled = false;

    async function connect() {
      console.log("[ChimeAudio] joinChimeMeeting 呼び出し...", { sessionId });
      const result = await joinChimeMeeting(sessionId!);
      const data = result.joinChimeMeeting;

      if (cancelled) return;

      console.log("[ChimeAudio] MeetingSession 構築中...");
      const logger = new ConsoleLogger("ChimeAudio", LogLevel.INFO);
      const deviceController = new DefaultDeviceController(logger);

      const configuration = new MeetingSessionConfiguration(
        {
          MeetingId: data.meeting.meetingId,
          MediaRegion: data.meeting.mediaRegion,
          MediaPlacement: {
            AudioHostUrl: data.meeting.mediaPlacement.audioHostUrl,
            AudioFallbackUrl: data.meeting.mediaPlacement.audioFallbackUrl,
            SignalingUrl: data.meeting.mediaPlacement.signalingUrl,
            TurnControlUrl: data.meeting.mediaPlacement.turnControlUrl,
          },
        },
        {
          AttendeeId: data.attendee.attendeeId,
          ExternalUserId: data.attendee.externalUserId,
          JoinToken: data.attendee.joinToken,
        },
      );

      const meetingSession = new DefaultMeetingSession(configuration, logger, deviceController);
      meetingSessionRef.current = meetingSession;

      const audioVideo = meetingSession.audioVideo;

      // 接続状態の監視
      const observer = {
        audioVideoDidStart: () => {
          console.log("[ChimeAudio] AudioVideoDidStart — 音声接続開始");
          if (!cancelled) setIsConnected(true);
        },
        audioVideoDidStop: () => {
          console.log("[ChimeAudio] AudioVideoDidStop — 音声接続終了");
          if (!cancelled) setIsConnected(false);
        },
      };
      audioVideo.addObserver(observer);

      // 参加者の監視
      audioVideo.realtimeSubscribeToAttendeeIdPresence(
        (attendeeId: string, present: boolean) => {
          console.log(
            `[ChimeAudio] AttendeePresenceChanged: ${attendeeId} ${present ? "joined" : "left"}`,
          );
          if (!cancelled) {
            setAttendeeCount((prev) => (present ? prev + 1 : Math.max(0, prev - 1)));
          }
        },
      );

      // マイクデバイスを選択して音声開始
      const audioInputDevices = await audioVideo.listAudioInputDevices();
      if (audioInputDevices.length > 0) {
        await audioVideo.startAudioInput(audioInputDevices[0].deviceId);
        console.log(`[ChimeAudio] マイク選択: ${audioInputDevices[0].label}`);
      } else {
        console.warn("[ChimeAudio] マイクが見つかりません");
      }

      const audioOutputDevices = await audioVideo.listAudioOutputDevices();
      if (audioOutputDevices.length > 0) {
        await audioVideo.chooseAudioOutput(audioOutputDevices[0].deviceId);
        console.log(`[ChimeAudio] スピーカー選択: ${audioOutputDevices[0].label}`);
      }

      // audio 要素をバインド
      const audioElement = document.createElement("audio");
      audioElement.id = "chime-audio-element";
      audioElement.style.display = "none";
      document.body.appendChild(audioElement);
      audioVideo.bindAudioElement(audioElement);

      console.log("[ChimeAudio] audioVideo.start()");
      audioVideo.start();
    }

    connect().catch((err) => {
      console.error("[ChimeAudio] 接続エラー:", err);
    });

    return () => {
      cancelled = true;
      const session = meetingSessionRef.current;
      if (session) {
        console.log("[ChimeAudio] クリーンアップ: audioVideo.stop()");
        session.audioVideo.stop();
        meetingSessionRef.current = null;
      }
      const audioEl = document.getElementById("chime-audio-element");
      if (audioEl) audioEl.remove();
      joinedRef.current = false;
    };
  }, [sessionId]);

  // 双方向通話可能の検出
  useEffect(() => {
    if (isConnected && attendeeCount >= 2) {
      console.log("[ChimeAudio] 双方向通話可能");
    }
  }, [isConnected, attendeeCount]);

  const toggleMute = useCallback(() => {
    const av = meetingSessionRef.current?.audioVideo;
    if (!av) return;
    if (muted) {
      av.realtimeUnmuteLocalAudio();
      console.log("[ChimeAudio] ミュート解除");
    } else {
      av.realtimeMuteLocalAudio();
      console.log("[ChimeAudio] ミュート");
    }
    setMuted((v) => !v);
  }, [muted]);

  const toggleSpeaker = useCallback(() => {
    const audioEl = document.getElementById("chime-audio-element") as HTMLAudioElement | null;
    if (!audioEl) return;
    audioEl.muted = !audioEl.muted;
    console.log(`[ChimeAudio] スピーカー ${audioEl.muted ? "OFF" : "ON"}`);
  }, []);

  return { muted, toggleMute, toggleSpeaker, isConnected, attendeeCount };
}
